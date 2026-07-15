const CONTEXTUAL_COMPANION_PART_KEYS = new Set(["filter", "furniture-front"]);

function sourceKeyForComponent(component = {}) {
  return String(component.sourceComponentKey || component.componentKey || "").trim();
}

function isContextualCompanion(component = {}) {
  return Boolean(component.isCompanionOption)
    || CONTEXTUAL_COMPANION_PART_KEYS.has(String(component.claimPartKey || "").trim());
}

function findTriggerComponent(components, companion) {
  const companionPartKey = String(companion.claimPartKey || "").trim();

  if (companionPartKey === "furniture-front") {
    return components.find((component) => component.claimPartKey === "dishwasher");
  }

  const regularComponent = components.find(
    (component) => !component.claimPartKey && !component.isCompanionOption,
  );
  if (regularComponent) return regularComponent;

  // Some bundled source cabinets have already been split into claim-only
  // identities. Prefer the structural/visible part as the shared-area trigger.
  const structuralPartKeys = ["sink-cabinet", "dishwasher", "oven-drawer"];
  return structuralPartKeys
    .map((partKey) => components.find((component) => component.claimPartKey === partKey))
    .find(Boolean);
}

/**
 * Parts which occupy the same drawing area are presented as a contextual
 * choice after that area is clicked. The returned group always starts with
 * the visible cabinet/appliance followed by its hidden companion part(s).
 */
export function buildServiceClaimComponentChoiceGroups(
  selectableComponents = [],
  { includeLinearSharedParts = false } = {},
) {
  const componentsBySource = new Map();

  for (const component of selectableComponents || []) {
    const sourceKey = sourceKeyForComponent(component);
    if (!sourceKey) continue;
    const components = componentsBySource.get(sourceKey) || [];
    components.push(component);
    componentsBySource.set(sourceKey, components);
  }

  const groups = [];
  for (const [sourceComponentKey, components] of componentsBySource) {
    const companions = components.filter(isContextualCompanion);
    if (!companions.length) continue;

    const trigger = findTriggerComponent(components, companions[0]);
    if (!trigger) continue;

    const options = [
      trigger,
      ...companions.filter((component) => component.componentId !== trigger.componentId),
    ];
    if (options.length < 2) continue;

    groups.push({
      sourceComponentKey,
      triggerComponentId: trigger.componentId,
      options,
    });
  }

  if (includeLinearSharedParts) {
    const componentByPartKey = new Map(
      (selectableComponents || [])
        .filter((component) => component?.claimPartKey)
        .map((component) => [component.claimPartKey, component]),
    );

    for (const definition of [
      {
        sourceComponentKey: "claim-choice-oven-cooktop",
        triggerPartKey: "oven",
        optionPartKeys: ["oven", "cooktop"],
      },
      {
        sourceComponentKey: "claim-choice-sink-cabinet-sink",
        triggerPartKey: "sink-cabinet",
        optionPartKeys: ["sink-cabinet", "sink"],
      },
    ]) {
      const trigger = componentByPartKey.get(definition.triggerPartKey);
      const options = definition.optionPartKeys
        .map((partKey) => componentByPartKey.get(partKey))
        .filter(Boolean);
      if (!trigger || options.length !== definition.optionPartKeys.length) continue;

      groups.push({
        sourceComponentKey: definition.sourceComponentKey,
        triggerComponentId: trigger.componentId,
        options,
      });
    }
  }

  return groups;
}

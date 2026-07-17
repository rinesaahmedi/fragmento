const CONTEXTUAL_COMPANION_PART_KEYS = new Set(["blende", "filter", "furniture-front"]);

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
 * Related claim parts are presented as a contextual choice after any option
 * in the group is clicked. Shared drawing areas start with their visible
 * cabinet/appliance, followed by the related fixture or companion parts.
 */
export function buildServiceClaimComponentChoiceGroups(selectableComponents = []) {
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

  const componentByPartKey = new Map(
    (selectableComponents || [])
      .filter((component) => component?.claimPartKey)
      .map((component) => [component.claimPartKey, component]),
  );
  const hoodFilter = componentByPartKey.get("filter");
  const hoodExtractor = (selectableComponents || []).find(
    (component) => component?.componentId === "component-extractor-hood",
  );
  const hoodSourceComponents = componentsBySource.get(sourceKeyForComponent(hoodFilter)) || [];
  const hoodCabinet = hoodFilter
    ? findTriggerComponent(hoodSourceComponents, hoodFilter)
    : null;

  if (hoodCabinet && hoodExtractor && hoodFilter) {
    const hoodOptions = [hoodCabinet, hoodExtractor, hoodFilter];
    const hoodOptionIds = new Set(hoodOptions.map((option) => option.componentId));
    const existingGroupIndex = groups.findIndex(
      (group) => group.triggerComponentId === hoodCabinet.componentId,
    );

    if (existingGroupIndex >= 0) {
      const existingGroup = groups[existingGroupIndex];
      groups[existingGroupIndex] = {
        ...existingGroup,
        options: [
          ...hoodOptions,
          ...existingGroup.options.filter((option) => !hoodOptionIds.has(option.componentId)),
        ],
      };
    } else {
      groups.push({
        sourceComponentKey: "claim-choice-hood-cabinet-extractor-filter",
        triggerComponentId: hoodCabinet.componentId,
        options: hoodOptions,
      });
    }
  }

  const sharedPartDefinitions = [
    {
      sourceComponentKey: "claim-choice-oven-cooktop-drawer",
      triggerPartKey: "oven",
      optionPartKeys: ["oven", "cooktop", "oven-drawer"],
    },
    {
      sourceComponentKey: "claim-choice-sink-cabinet-sink-faucet",
      triggerPartKey: "sink-cabinet",
      optionPartKeys: ["sink-cabinet", "sink", "faucet"],
    },
  ];

  for (const definition of sharedPartDefinitions) {
    const trigger = componentByPartKey.get(definition.triggerPartKey);
    const options = definition.optionPartKeys
      .map((partKey) => componentByPartKey.get(partKey))
      .filter(Boolean);
    if (!trigger || options.length !== definition.optionPartKeys.length) continue;

    const existingGroupIndex = groups.findIndex(
      (group) => group.triggerComponentId === trigger.componentId,
    );
    if (existingGroupIndex >= 0) {
      const existingGroup = groups[existingGroupIndex];
      const sharedOptionIds = new Set(options.map((option) => option.componentId));
      groups[existingGroupIndex] = {
        ...existingGroup,
        options: [
          ...options,
          ...existingGroup.options.filter((option) => !sharedOptionIds.has(option.componentId)),
        ],
      };
      continue;
    }

    groups.push({
      sourceComponentKey: definition.sourceComponentKey,
      triggerComponentId: trigger.componentId,
      options,
    });
  }

  const worktopEndPanel = componentByPartKey.get("worktop-end-panel");
  if (worktopEndPanel) {
    const triggerPartKey = String(
      worktopEndPanel.contextualChoiceTriggerPartKey || "",
    ).trim();
    const trigger = triggerPartKey === "worktop"
      ? (selectableComponents || []).find((component) => (
          !component?.claimPartKey
          && sourceKeyForComponent(component) === sourceKeyForComponent(worktopEndPanel)
        ))
      : componentByPartKey.get(triggerPartKey);

    if (trigger) {
      groups.push({
        sourceComponentKey: `claim-choice-${triggerPartKey}-worktop-end-panel`,
        triggerComponentId: trigger.componentId,
        options: [trigger, worktopEndPanel],
      });
    }
  }

  return groups;
}

/** Collapse every contextual choice group to its single plan trigger. */
export function normalizeServiceClaimComponentChoiceSelection(
  componentIds = [],
  choiceGroups = [],
) {
  const groupByOptionId = new Map(
    (choiceGroups || []).flatMap((group) => (
      group.options.map((option) => [option.componentId, group])
    )),
  );
  const seenSelectionKeys = new Set();
  const normalizedIds = [];

  for (const componentId of componentIds || []) {
    const group = groupByOptionId.get(componentId);
    const normalizedId = group?.triggerComponentId || componentId;
    const selectionKey = group ? `group:${group.sourceComponentKey}` : `component:${normalizedId}`;
    if (seenSelectionKeys.has(selectionKey)) continue;

    seenSelectionKeys.add(selectionKey);
    normalizedIds.push(normalizedId);
  }

  return normalizedIds;
}

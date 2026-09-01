"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  componentIdForItem,
  componentIdForKey,
  normalizeColor,
} from "./kitchen-selection-utils";
import {
  PLAN_VIEWPORT_BY_SLUG,
  applyPlanViewportToMarkup,
  refreshKitchenPlanSelection,
  syncKitchenPlan,
} from "./kitchen-svg-plan-utils";
import {
  PLAN_IMAGE_SOURCE_HEIGHT,
  PLAN_IMAGE_SOURCE_WIDTH,
  cropPlanHotspot,
  getPlanDisplayCrop,
  withBasePlinthExtension,
  withCornerBlendeExtensions,
  withDerivedSinkFaucet,
  withHotspotSourceBounds,
} from "./kitchen-svg-stage";
import {
  PLAN_HOTSPOTS_BY_SLUG,
  PLAN_IMAGE_BY_SLUG,
} from "../lib/kitchen-plan-preview-data";
import {
  getServiceClaimLinkedComponentIds,
  SERVICE_CLAIM_PART_COMPONENT_IDS,
} from "../lib/service-claim-kitchen-plan-selection";
import {
  buildServiceClaimBlendeHotspots,
  buildServiceClaimPartHotspots,
  isLShapedClaimKitchen,
} from "../lib/service-claim-kitchen-hotspots";
import { buildServiceClaimComponentChoiceGroups } from "../lib/service-claim-component-choices";
import styles from "./kitchen-configurator.module.css";

const SERVICE_CLAIM_CLICK_BOUNDS_BY_SLUG = {
  "kitchen-model-b": [
    {
      componentId: "component-extractor-hood",
      x: 488,
      y: 314,
      width: 84,
      height: 18,
    },
  ],
};

function getSvgPoint(svg, event) {
  if (!svg || typeof svg.createSVGPoint !== "function") return null;

  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;

  return point.matrixTransform(matrix.inverse());
}

function resolveClaimClickComponentId({ svg, event, kitchenSlug, selectableComponentIds }) {
  const point = getSvgPoint(svg, event);
  const clickBounds = SERVICE_CLAIM_CLICK_BOUNDS_BY_SLUG[kitchenSlug] || [];

  if (point) {
    const matchedBounds = clickBounds.find((bounds) => (
      selectableComponentIds.includes(bounds.componentId)
      && point.x >= bounds.x
      && point.x <= bounds.x + bounds.width
      && point.y >= bounds.y
      && point.y <= bounds.y + bounds.height
    ));
    if (matchedBounds) {
      return matchedBounds.componentId;
    }
  }

  const group = event.target.closest("[data-component-id]");
  return group?.dataset?.componentId || "";
}

function toggleClaimComponentSelection({ currentIds, componentId, selectableComponentIds, kitchenSlug }) {
  const selectable = new Set(selectableComponentIds || []);
  const ids = getServiceClaimLinkedComponentIds(kitchenSlug, componentId).filter((id) => selectable.has(id));
  const current = new Set(currentIds);
  const shouldRemove = ids.some((id) => current.has(id));

  ids.forEach((id) => {
    if (shouldRemove) {
      current.delete(id);
    } else {
      current.add(id);
    }
  });

  return [...current].filter((id) => selectable.has(id));
}

function toSvgClipPathId(value) {
  return `service-claim-plan-clip-${String(value || "").replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function getHotspotSvgPolygonPoints(hotspot) {
  const match = String(hotspot?.clipPath || "").match(/^polygon\((.*)\)$/);
  if (!match) {
    return "";
  }

  return match[1]
    .split(",")
    .map((point) => {
      const [rawX, rawY] = point.trim().split(/\s+/);
      const localX = Number.parseFloat(String(rawX || "").replace("%", ""));
      const localY = Number.parseFloat(String(rawY || "").replace("%", ""));
      if (!Number.isFinite(localX) || !Number.isFinite(localY)) {
        return "";
      }

      const x = Number(hotspot.left || 0) + (localX / 100) * Number(hotspot.width || 0);
      const y = Number(hotspot.top || 0) + (localY / 100) * Number(hotspot.height || 0);
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");
}

export default function ServiceClaimKitchenPicker({
  kitchenPlan,
  value,
  visualValue = value,
  onChange,
  onComponentToggle,
  labels,
  contractNumber,
}) {
  const svgHostRef = useRef(null);
  const rawImageClipPathId = useId();
  const rawApplianceClipPathId = useId();
  const [hoveredComponentId, setHoveredComponentId] = useState(null);
  const {
    kitchenConfig,
    svgMarkup,
    kitchenSlug,
    selectableComponentIds,
    selectableComponents = [],
    visibleComponentIds: planVisibleComponentIds = selectableComponentIds,
    claimParts = [],
  } = kitchenPlan;

  const planViewport = PLAN_VIEWPORT_BY_SLUG[kitchenSlug] || null;
  const imageViewHref = PLAN_IMAGE_BY_SLUG[kitchenSlug] || "";

  const resolvedSvgMarkup = useMemo(
    () => applyPlanViewportToMarkup(svgMarkup, kitchenConfig.kitchen.slug),
    [kitchenConfig.kitchen.slug, svgMarkup],
  );

  const fixedComponentIds = useMemo(() => {
    return [];
  }, []);
  const visibleComponentIds = useMemo(
    () => [...new Set(planVisibleComponentIds || [])],
    [planVisibleComponentIds],
  );
  const componentChoiceGroups = useMemo(
    () => buildServiceClaimComponentChoiceGroups(selectableComponents),
    [selectableComponents],
  );
  const componentChoiceGroupByTriggerId = useMemo(
    () => new Map(componentChoiceGroups.map((group) => [group.triggerComponentId, group])),
    [componentChoiceGroups],
  );
  const componentChoiceGroupByOptionId = useMemo(
    () => new Map(
      componentChoiceGroups.flatMap((group) => (
        group.options.map((option) => [option.componentId, group])
      )),
    ),
    [componentChoiceGroups],
  );
  const togglePlanComponent = useCallback((componentId) => {
    if (typeof onComponentToggle === "function") {
      onComponentToggle(componentId);
      return;
    }
    const choiceGroup = componentChoiceGroupByOptionId.get(componentId);
    onChange((current) => {
      if (choiceGroup) {
        const optionIds = new Set(choiceGroup.options.map((option) => option.componentId));
        if (current.some((id) => optionIds.has(id))) {
          return current.filter((id) => !optionIds.has(id));
        }
        return [
          ...current.filter((id) => !optionIds.has(id)),
          choiceGroup.triggerComponentId,
        ];
      }
      return toggleClaimComponentSelection({
        currentIds: current,
        componentId,
        selectableComponentIds,
        kitchenSlug,
      });
    });
  }, [componentChoiceGroupByOptionId, kitchenSlug, onChange, onComponentToggle, selectableComponentIds]);

  const fixedKey = fixedComponentIds.join("|");
  const selectableKey = (selectableComponentIds || []).join("|");
  const visibleKey = visibleComponentIds.join("|");
  const sourceImageHotspots = useMemo(() => {
    const definitions = (PLAN_HOTSPOTS_BY_SLUG[kitchenSlug] || []).map(withHotspotSourceBounds);
    const prepared = withBasePlinthExtension(
      withCornerBlendeExtensions(
        withDerivedSinkFaucet(definitions, kitchenConfig.components),
      ),
      kitchenSlug,
    );
    return buildServiceClaimBlendeHotspots(prepared, selectableComponents, kitchenConfig.components, kitchenSlug);
  }, [kitchenConfig.components, kitchenSlug, selectableComponents]);
  const planDisplayCrop = useMemo(
    () => getPlanDisplayCrop(sourceImageHotspots, kitchenSlug),
    [sourceImageHotspots, kitchenSlug],
  );
  const croppedPlanAspectRatio =
    `${planDisplayCrop.width * PLAN_IMAGE_SOURCE_WIDTH} / ${planDisplayCrop.height * PLAN_IMAGE_SOURCE_HEIGHT}`;
  const croppedImageHotspots = useMemo(() => {
    const cropped = sourceImageHotspots
      .map((hotspot) => cropPlanHotspot(hotspot, planDisplayCrop))
      .map((hotspot) => {
        return {
          ...hotspot,
          componentId: hotspot.componentId || componentIdForKey(hotspot.componentKey),
        };
      });
    return buildServiceClaimPartHotspots(cropped, claimParts, kitchenSlug);
  }, [claimParts, kitchenSlug, planDisplayCrop, sourceImageHotspots]);
  const imageHotspots = useMemo(() => {
    const selectable = new Set(selectableComponentIds || []);
    return croppedImageHotspots.filter((hotspot) => hotspot && selectable.has(hotspot.componentId));
  }, [croppedImageHotspots, selectableComponentIds, selectableKey]);
  const isNonLShapedKitchen = !isLShapedClaimKitchen(kitchenSlug);
  const displaySelectedComponentIds = useMemo(() => {
    return [...new Set(visualValue || [])];
  }, [visualValue]);
  const shouldUseImagePlan = Boolean(imageViewHref && imageHotspots.length);
  const imageClipPathId = useMemo(
    () => toSvgClipPathId(rawImageClipPathId),
    [rawImageClipPathId],
  );
  const applianceClipPathId = useMemo(
    () => toSvgClipPathId(`${rawApplianceClipPathId}-appliances`),
    [rawApplianceClipPathId],
  );
  const applianceImageHotspots = useMemo(
    () => isNonLShapedKitchen
      ? []
      : croppedImageHotspots.filter(
        (hotspot) => (
          hotspot.claimPartKey === "cooktop"
          || hotspot.claimPartKey === "sink"
        ),
      ),
    [croppedImageHotspots, isNonLShapedKitchen],
  );

  useEffect(() => {
    const selectable = new Set(selectableComponentIds || []);
    if (!value.some((id) => !selectable.has(id))) {
      return;
    }
    onChange((current) => current.filter((id) => selectable.has(id)));
  }, [onChange, selectableComponentIds, selectableKey, value]);

  useEffect(() => {
    if (shouldUseImagePlan) {
      return undefined;
    }

    const host = svgHostRef.current;
    const svg = syncKitchenPlan({
      host,
      svgMarkup: resolvedSvgMarkup,
      planViewport,
      kitchenConfig,
      selectedComponentIds: displaySelectedComponentIds,
      lockedComponentIds: fixedComponentIds,
      visibleComponentIds,
      componentIdForItem,
      normalizeColor,
    });

    if (!host || !svg) {
      return undefined;
    }

    const onClick = (event) => {
      const componentId = resolveClaimClickComponentId({
        svg,
        event,
        kitchenSlug,
        selectableComponentIds,
      });
      if (!selectableComponentIds.includes(componentId)) {
        return;
      }

      togglePlanComponent(componentId);
    };

    host.addEventListener("click", onClick, true);
    return () => {
      host.removeEventListener("click", onClick, true);
    };
  }, [
    kitchenConfig,
    kitchenSlug,
    fixedComponentIds,
    fixedKey,
    onChange,
    planViewport,
    resolvedSvgMarkup,
    selectableComponentIds,
    selectableKey,
    visibleComponentIds,
    visibleKey,
    displaySelectedComponentIds,
    shouldUseImagePlan,
    togglePlanComponent,
  ]);

  useEffect(() => {
    if (shouldUseImagePlan) {
      return;
    }

    refreshKitchenPlanSelection({
      host: svgHostRef.current,
      selectedComponentIds: displaySelectedComponentIds,
      lockedComponentIds: fixedComponentIds,
      kitchenSlug,
    });
  }, [displaySelectedComponentIds, fixedKey, fixedComponentIds, kitchenSlug, shouldUseImagePlan]);

  const normalizedContractNumber = String(contractNumber || "").trim();
  const selectedIds = new Set(value || []);
  const displaySelectedIds = new Set(displaySelectedComponentIds);
  const hasSelectedWorktop = imageHotspots.some(
    (hotspot) => (
      hotspot.componentKey === "worktop"
      || hotspot.claimPartKey === "worktop-left"
      || hotspot.claimPartKey === "worktop-right"
      || hotspot.claimPartKey === "worktop-end-panel"
    ) && selectedIds.has(hotspot.componentId),
  );
  // Keep unselected appliances visually cut out of a selected worktop. Sink
  // and cooktop are independent claim articles and should only be tinted when
  // the user explicitly selects them.
  const visibleApplianceImageHotspots = applianceImageHotspots.filter(
    (hotspot) => !displaySelectedIds.has(hotspot.componentId),
  );
  const sinkComponentId = SERVICE_CLAIM_PART_COMPONENT_IDS.sink;
  const sinkCabinetComponentId = SERVICE_CLAIM_PART_COMPONENT_IDS["sink-cabinet"];
  const ovenComponentId = SERVICE_CLAIM_PART_COMPONENT_IDS.oven;
  const cooktopComponentId = SERVICE_CLAIM_PART_COMPONENT_IDS.cooktop;
  const hasContextualSinkChoice = componentChoiceGroupByTriggerId.has(sinkCabinetComponentId);
  const hasContextualCooktopChoice = componentChoiceGroupByTriggerId.has(ovenComponentId);
  const showManualSinkOption =
    isNonLShapedKitchen
    && !hasContextualSinkChoice
    && claimParts.some((part) => String(part?.partKey || "").trim() === "sink")
    && selectableComponentIds.includes(sinkComponentId);
  const showManualCooktopOption =
    isNonLShapedKitchen
    && !hasContextualCooktopChoice
    && claimParts.some((part) => String(part?.partKey || "").trim() === "cooktop")
    && selectableComponentIds.includes(cooktopComponentId);
  const isManualSinkSelected = selectedIds.has(sinkComponentId);
  const isManualCooktopSelected = selectedIds.has(cooktopComponentId);
  const selectedCount = selectedIds.size;

  return (
    <div className="service-claim-kitchen">
      <div className="service-claim-kitchen__instruction">
        <span className="service-claim-kitchen__instruction-icon" aria-hidden="true">✓</span>
        <div className="service-claim-kitchen__instruction-copy">
          <p className="service-claim-kitchen__instruction-title">
            {labels?.instructionTitle || "Which elements are affected?"}
          </p>
          <p className="service-claim-kitchen__instruction-text">
            {labels?.instruction || "Click every affected cabinet or appliance in the drawing."}
          </p>
        </div>
      </div>
      <div className="service-claim-kitchen__header">
        {normalizedContractNumber ? (
          <div className="service-claim-kitchen__meta">
            {labels?.contractLabel ? (
              <p className="service-claim-kitchen__eyebrow">{labels.contractLabel}</p>
            ) : null}
            <p className="service-claim-kitchen__contract">{normalizedContractNumber}</p>
          </div>
        ) : null}
        <button
          type="button"
          className="service-claim-kitchen__reset"
          onClick={() => onChange([])}
          disabled={!selectedCount}
        >
          {labels?.reset || "Reset"}
        </button>
      </div>
      {shouldUseImagePlan ? (
        <div className={`${styles.stageBody} service-claim-kitchen__plan`}>
          <div className={`${styles.pdfCard} service-claim-kitchen__image-card`}>
            <div
              className={`${styles.planImageWrap} service-claim-kitchen__image-wrap`}
              style={{ aspectRatio: croppedPlanAspectRatio }}
            >
              <svg
                role="img"
                aria-label={`${kitchenConfig.kitchen.name || "Kitchen"} plan`}
                className={styles.planImageInteractive}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{
                  inset: 0,
                  width: "100%",
                  height: "100%",
                }}
              >
                <defs>
                  <clipPath id={imageClipPathId} clipPathUnits="userSpaceOnUse">
                    {imageHotspots.map((hotspot) => {
                      const polygonPoints = getHotspotSvgPolygonPoints(hotspot);
                      if (polygonPoints) {
                        return (
                          <polygon
                            key={`clip-${hotspot.componentId}-${hotspot.left}-${hotspot.top}-${hotspot.width}-${hotspot.height}`}
                            points={polygonPoints}
                          />
                        );
                      }

                      return (
                        <rect
                          key={`clip-${hotspot.componentId}-${hotspot.left}-${hotspot.top}-${hotspot.width}-${hotspot.height}`}
                          x={hotspot.left}
                          y={hotspot.top}
                          width={hotspot.width}
                          height={hotspot.height}
                        />
                      );
                    })}
                  </clipPath>
                </defs>
                <image
                  aria-hidden="true"
                  className={styles.planImageUnavailable}
                  href={imageViewHref}
                  x={-(planDisplayCrop.left / planDisplayCrop.width) * 100}
                  y={-(planDisplayCrop.top / planDisplayCrop.height) * 100}
                  width={(100 / planDisplayCrop.width) * 100}
                  height={(100 / planDisplayCrop.height) * 100}
                  preserveAspectRatio="none"
                />
                <image
                  className={styles.planImagePurchased}
                  href={imageViewHref}
                  x={-(planDisplayCrop.left / planDisplayCrop.width) * 100}
                  y={-(planDisplayCrop.top / planDisplayCrop.height) * 100}
                  width={(100 / planDisplayCrop.width) * 100}
                  height={(100 / planDisplayCrop.height) * 100}
                  preserveAspectRatio="none"
                  clipPath={`url(#${imageClipPathId})`}
                />
                {imageHotspots.map((hotspot) => {
                  if (hotspot.claimBlendeSplit) {
                    return null;
                  }
                  if (hotspot.claimWorktopEndPanelSplit) {
                    return null;
                  }
                  if (
                    (
                      hotspot.claimPartKey === "worktop-left"
                      || hotspot.claimPartKey === "worktop-right"
                      || hotspot.claimPartKey === "worktop-end-panel"
                    )
                    && hotspot.preserveManualSize
                  ) {
                    return null;
                  }

                  const polygonPoints = getHotspotSvgPolygonPoints(hotspot);
                  const outlineKey = `outline-${hotspot.componentId}-${hotspot.left}-${hotspot.top}-${hotspot.width}-${hotspot.height}`;
                  const isSplitWorktop =
                    hotspot.claimPartKey === "worktop-left"
                    || hotspot.claimPartKey === "worktop-right"
                    || hotspot.claimPartKey === "worktop-end-panel";
                  const outlineProps = {
                    fill: "none",
                    stroke: "#2f2a24",
                    strokeOpacity: isSplitWorktop ? 0.48 : 0.28,
                    strokeWidth: isSplitWorktop ? 1 : 0.75,
                    vectorEffect: "non-scaling-stroke",
                    pointerEvents: "none",
                  };

                  if (polygonPoints) {
                    return <polygon key={outlineKey} points={polygonPoints} {...outlineProps} />;
                  }

                  return (
                    <rect
                      key={outlineKey}
                      x={hotspot.left}
                      y={hotspot.top}
                      width={hotspot.width}
                      height={hotspot.height}
                      {...outlineProps}
                    />
                  );
                })}
              </svg>
              <div className={styles.planHotspotLayer}>
                {hasSelectedWorktop && visibleApplianceImageHotspots.length ? (
                  <svg
                    aria-hidden="true"
                    className={styles.planApplianceCutouts}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <clipPath id={applianceClipPathId} clipPathUnits="userSpaceOnUse">
                        {visibleApplianceImageHotspots.map((hotspot) => {
                          const polygonPoints = getHotspotSvgPolygonPoints(hotspot);
                          const clipKey = `appliance-clip-${hotspot.componentId}-${hotspot.left}-${hotspot.top}-${hotspot.width}-${hotspot.height}`;
                          if (polygonPoints) {
                            return <polygon key={clipKey} points={polygonPoints} />;
                          }

                          return (
                            <rect
                              key={clipKey}
                              x={hotspot.left}
                              y={hotspot.top}
                              width={hotspot.width}
                              height={hotspot.height}
                            />
                          );
                        })}
                      </clipPath>
                    </defs>
                    <rect
                      className={styles.planApplianceCutoutBacking}
                      x={0}
                      y={0}
                      width={100}
                      height={100}
                      clipPath={`url(#${applianceClipPathId})`}
                    />
                    <image
                      href={imageViewHref}
                      x={-(planDisplayCrop.left / planDisplayCrop.width) * 100}
                      y={-(planDisplayCrop.top / planDisplayCrop.height) * 100}
                      width={(100 / planDisplayCrop.width) * 100}
                      height={(100 / planDisplayCrop.height) * 100}
                      preserveAspectRatio="none"
                      clipPath={`url(#${applianceClipPathId})`}
                    />
                  </svg>
                ) : null}
                {imageHotspots.map((hotspot) => {
                  const isSelected = displaySelectedIds.has(hotspot.componentId);
                  const isHovered = getServiceClaimLinkedComponentIds(kitchenSlug, hotspot.componentId)
                    .includes(hoveredComponentId);
                  return (
                    <button
                      key={`${hotspot.componentId}-${hotspot.left}-${hotspot.top}-${hotspot.width}-${hotspot.height}`}
                      type="button"
                      className={[
                        styles.planHotspot,
                        hotspot.clipPath ? styles.planHotspotPolygon : "",
                        hotspot.claimPartKey === "worktop-left"
                        || hotspot.claimPartKey === "worktop-right"
                        || hotspot.claimPartKey === "worktop-end-panel"
                          ? styles.planHotspotWorktop
                          : "",
                        hotspot.claimBlendeSplit ? styles.planHotspotBlendeSplit : "",
                        isHovered ? styles.planHotspotHover : "",
                        isSelected ? styles.planHotspotSelected : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        left: `${hotspot.left}%`,
                        top: `${hotspot.top}%`,
                        width: `${hotspot.width}%`,
                        height: `${hotspot.height}%`,
                        clipPath: hotspot.clipPath || undefined,
                        WebkitClipPath: hotspot.clipPath || undefined,
                        zIndex:
                          hotspot.claimPartKey === "cooktop"
                            ? 12
                            : hotspot.claimPartKey === "blende"
                            ? 14
                            : hotspot.claimPartKey === "sink"
                            ? 11
                            : hotspot.componentKey === "sink-faucet"
                            || hotspot.claimPartKey === "faucet"
                            ? 10
                            : hotspot.componentKey === "worktop"
                            || hotspot.claimPartKey === "worktop-left"
                            || hotspot.claimPartKey === "worktop-right"
                            || hotspot.claimPartKey === "worktop-end-panel"
                              ? 4
                              : 1,
                      }}
                      aria-pressed={isSelected}
                      aria-label={hotspot.componentKey}
                      onPointerEnter={(event) => {
                        if (event.pointerType === "mouse") setHoveredComponentId(hotspot.componentId);
                      }}
                      onPointerLeave={(event) => {
                        if (event.pointerType !== "mouse") return;
                        setHoveredComponentId((current) =>
                          current === hotspot.componentId ? null : current,
                        );
                      }}
                      onClick={() => {
                        setHoveredComponentId(null);
                        togglePlanComponent(hotspot.componentId);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${styles.stageBody} service-claim-kitchen__plan`}>
          <div className={`${styles.svgCard} service-claim-kitchen__svg-card`}>
            <div
              ref={svgHostRef}
              className={[
                styles.svgCanvas,
                planViewport?.canvasClassName === "wide" ? styles.svgCanvasWide : "",
                "service-claim-kitchen__svg-host",
                planViewport?.canvasClassName === "wide" ? "service-claim-kitchen__svg-host--wide" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          </div>
        </div>
      )}
      {showManualSinkOption || showManualCooktopOption ? (
        <div className="service-claim-kitchen__manual-options">
          {showManualSinkOption ? (
            <button
              type="button"
              className={[
                "service-claim-kitchen__manual-option",
                isManualSinkSelected ? "service-claim-kitchen__manual-option--selected" : "",
              ].filter(Boolean).join(" ")}
              aria-pressed={isManualSinkSelected}
              onClick={() => togglePlanComponent(sinkComponentId)}
            >
              {labels?.sinkOption || "Sink"}
            </button>
          ) : null}
          {showManualCooktopOption ? (
            <button
              type="button"
              className={[
                "service-claim-kitchen__manual-option",
                isManualCooktopSelected ? "service-claim-kitchen__manual-option--selected" : "",
              ].filter(Boolean).join(" ")}
              aria-pressed={isManualCooktopSelected}
              onClick={() => togglePlanComponent(cooktopComponentId)}
            >
              {labels?.cooktopOption || "Cooktop"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

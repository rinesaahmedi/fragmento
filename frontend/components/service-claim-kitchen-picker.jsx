"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  IMAGE_HOTSPOTS_BY_SLUG,
  IMAGE_VIEW_BY_SLUG,
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
  getServiceClaimLinkedComponentIds,
  SERVICE_CLAIM_PART_COMPONENT_IDS,
} from "../lib/service-claim-kitchen-plan-selection";
import {
  buildServiceClaimBlendeHotspots,
  buildServiceClaimPartHotspots,
  isLShapedClaimKitchen,
} from "../lib/service-claim-kitchen-hotspots";
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

export default function ServiceClaimKitchenPicker({ kitchenPlan, value, onChange, labels, contractNumber }) {
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

  const worktopEndPanelComponentId = SERVICE_CLAIM_PART_COMPONENT_IDS["worktop-end-panel"];
  const hasManualWorktopEndPanelOption =
    claimParts.some((part) => String(part?.partKey || "").trim() === "worktop-end-panel")
    && selectableComponentIds.includes(worktopEndPanelComponentId);
  const planViewport = PLAN_VIEWPORT_BY_SLUG[kitchenSlug] || null;
  const imageViewHref = IMAGE_VIEW_BY_SLUG[kitchenSlug] || "";

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

  const fixedKey = fixedComponentIds.join("|");
  const selectableKey = (selectableComponentIds || []).join("|");
  const visibleKey = visibleComponentIds.join("|");
  const sourceImageHotspots = useMemo(() => {
    const definitions = (IMAGE_HOTSPOTS_BY_SLUG[kitchenSlug] || []).map(withHotspotSourceBounds);
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
    () => imageHotspots.filter(
      (hotspot) => hotspot.claimPartKey === "sink" || hotspot.claimPartKey === "cooktop",
    ),
    [imageHotspots],
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
      selectedComponentIds: value,
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

      onChange((current) => {
        return toggleClaimComponentSelection({
          currentIds: current,
          componentId,
          selectableComponentIds,
          kitchenSlug,
        });
      });
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
    value,
    shouldUseImagePlan,
  ]);

  useEffect(() => {
    if (shouldUseImagePlan) {
      return;
    }

    refreshKitchenPlanSelection({
      host: svgHostRef.current,
      selectedComponentIds: value,
      lockedComponentIds: fixedComponentIds,
      kitchenSlug,
    });
  }, [fixedKey, value, fixedComponentIds, kitchenSlug, shouldUseImagePlan]);

  const normalizedContractNumber = String(contractNumber || "").trim();
  const selectedIds = new Set(value || []);
  const hasSelectedWorktop = imageHotspots.some(
    (hotspot) => (
      hotspot.claimPartKey === "worktop-left"
      || hotspot.claimPartKey === "worktop-right"
    ) && selectedIds.has(hotspot.componentId),
  );
  const sinkComponentId = SERVICE_CLAIM_PART_COMPONENT_IDS.sink;
  const cooktopComponentId = SERVICE_CLAIM_PART_COMPONENT_IDS.cooktop;
  const isNonLShapedKitchen = !isLShapedClaimKitchen(kitchenSlug);
  const showManualSinkOption =
    isNonLShapedKitchen
    && claimParts.some((part) => String(part?.partKey || "").trim() === "sink")
    && selectableComponentIds.includes(sinkComponentId);
  const showManualCooktopOption =
    isNonLShapedKitchen
    && claimParts.some((part) => String(part?.partKey || "").trim() === "cooktop")
    && selectableComponentIds.includes(cooktopComponentId);
  const formOnlyClaimOptions = selectableComponents.filter((component) =>
    component?.isCompanionOption && selectableComponentIds.includes(component.componentId),
  );
  const worktopEndPanelOption = selectableComponents.find(
    (component) => component.componentId === worktopEndPanelComponentId,
  );
  const isManualSinkSelected = selectedIds.has(sinkComponentId);
  const isManualCooktopSelected = selectedIds.has(cooktopComponentId);

  return (
    <div className="service-claim-kitchen">
      <div className="service-claim-kitchen__header">
        {normalizedContractNumber ? (
          <div className="service-claim-kitchen__meta">
            {labels?.contractLabel ? (
              <p className="service-claim-kitchen__eyebrow">{labels.contractLabel}</p>
            ) : null}
            <p className="service-claim-kitchen__contract">{normalizedContractNumber}</p>
          </div>
        ) : null}
        <button type="button" className="service-claim-kitchen__reset" onClick={() => onChange([])}>
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
                {hasSelectedWorktop && applianceImageHotspots.length ? (
                  <svg
                    aria-hidden="true"
                    className={styles.planApplianceCutouts}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <clipPath id={applianceClipPathId} clipPathUnits="userSpaceOnUse">
                        {applianceImageHotspots.map((hotspot) => {
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
                  const isSelected = selectedIds.has(hotspot.componentId);
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
                      onMouseEnter={() => setHoveredComponentId(hotspot.componentId)}
                      onMouseLeave={() =>
                        setHoveredComponentId((current) =>
                          current === hotspot.componentId ? null : current,
                        )
                      }
                      onFocus={() => setHoveredComponentId(hotspot.componentId)}
                      onBlur={() =>
                        setHoveredComponentId((current) =>
                          current === hotspot.componentId ? null : current,
                        )
                      }
                      onClick={() => {
                        onChange((current) =>
                          toggleClaimComponentSelection({
                            currentIds: current,
                            componentId: hotspot.componentId,
                            selectableComponentIds,
                            kitchenSlug,
                          }),
                        );
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
      {showManualSinkOption || showManualCooktopOption || hasManualWorktopEndPanelOption || formOnlyClaimOptions.length ? (
        <div className="service-claim-kitchen__manual-options">
          {showManualSinkOption ? (
            <button
              type="button"
              className={[
                "service-claim-kitchen__manual-option",
                isManualSinkSelected ? "service-claim-kitchen__manual-option--selected" : "",
              ].filter(Boolean).join(" ")}
              aria-pressed={isManualSinkSelected}
              onClick={() => {
                onChange((current) => toggleClaimComponentSelection({
                  currentIds: current,
                  componentId: sinkComponentId,
                  selectableComponentIds,
                  kitchenSlug,
                }));
              }}
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
              onClick={() => {
                onChange((current) => toggleClaimComponentSelection({
                  currentIds: current,
                  componentId: cooktopComponentId,
                  selectableComponentIds,
                  kitchenSlug,
                }));
              }}
            >
              {labels?.cooktopOption || "Cooktop"}
            </button>
          ) : null}
          {hasManualWorktopEndPanelOption ? (
            <button
              type="button"
              className={[
                "service-claim-kitchen__manual-option",
                selectedIds.has(worktopEndPanelComponentId)
                  ? "service-claim-kitchen__manual-option--selected"
                  : "",
              ].filter(Boolean).join(" ")}
              aria-pressed={selectedIds.has(worktopEndPanelComponentId)}
              onClick={() => {
                onChange((current) => toggleClaimComponentSelection({
                  currentIds: current,
                  componentId: worktopEndPanelComponentId,
                  selectableComponentIds,
                  kitchenSlug,
                }));
              }}
            >
              {labels?.worktopEndPanelOption || worktopEndPanelOption?.nameDe || "Worktop End Panel"}
            </button>
          ) : null}
          {formOnlyClaimOptions.map((option) => {
            const isSelected = selectedIds.has(option.componentId);
            const label = option.nameDe || option.name || option.articleCode || option.code;

            return (
              <button
                key={option.componentId}
                type="button"
                className={[
                  "service-claim-kitchen__manual-option",
                  isSelected ? "service-claim-kitchen__manual-option--selected" : "",
                ].filter(Boolean).join(" ")}
                aria-pressed={isSelected}
                onClick={() => {
                  onChange((current) => toggleClaimComponentSelection({
                    currentIds: current,
                    componentId: option.componentId,
                    selectableComponentIds,
                    kitchenSlug,
                  }));
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

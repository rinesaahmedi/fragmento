"use client";

import { useEffect, useMemo, useRef } from "react";
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
import styles from "./kitchen-configurator.module.css";

const SERVICE_CLAIM_IMAGE_VIEW_BY_SLUG = {
  "ab-105808": "/plans/AB%20105808.svg",
};

const SERVICE_CLAIM_IMAGE_HOTSPOTS_BY_SLUG = {
  "ab-105808": [
    { componentKey: "refrigerator", left: 3.31, top: 28.08, width: 13.08, height: 59.98 },
    { componentKey: "wall-cabinet-1", left: 17.67, top: 15.89, width: 7.05, height: 24.09 },
    { componentKey: "wall-cabinet-2", left: 24.72, top: 15.89, width: 14.14, height: 24.09 },
    { componentKey: "extractor-hood", left: 24.72, top: 39.98, width: 14.14, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 38.86, top: 15.89, width: 14.12, height: 24.09 },
    { componentKey: "wall-cabinet-4", left: 52.98, top: 15.89, width: 14.12, height: 24.09 },
    { componentKey: "wall-cabinet-5", left: 67.1, top: 15.89, width: 14.13, height: 24.09 },
    { componentKey: "wall-cabinet-6", left: 81.23, top: 15.89, width: 15.07, height: 24.09 },
    { componentKey: "worktop", left: 17.67, top: 57.46, width: 78.63, height: 1.35 },
    { componentKey: "worktop", left: 17.2, top: 57.42, width: 0.45, height: 30.64 },
    { componentKey: "sink-faucet", left: 68.85, top: 50.73, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 17.65, top: 58.81, width: 7.07, height: 29.25 },
    { componentKey: "oven-module", left: 24.72, top: 58.81, width: 14.14, height: 29.25 },
    { componentKey: "base-module-2", left: 38.86, top: 58.81, width: 14.12, height: 29.25 },
    { componentKey: "base-module-3", left: 52.98, top: 58.81, width: 14.12, height: 29.25 },
    { componentKey: "sink-base", left: 67.1, top: 58.81, width: 14.13, height: 29.25 },
    { componentKey: "drawer-module", left: 81.23, top: 58.81, width: 15.07, height: 29.25 },
  ],
};

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

function toggleClaimComponentSelection({ currentIds, componentId, selectableComponentIds }) {
  const selectable = new Set(selectableComponentIds || []);
  const ids = selectable.has(componentId) ? [componentId] : [];
  const current = new Set(currentIds);
  const shouldRemove = current.has(componentId);

  ids.forEach((id) => {
    if (shouldRemove) {
      current.delete(id);
    } else {
      current.add(id);
    }
  });

  return [...current].filter((id) => selectable.has(id));
}

export default function ServiceClaimKitchenPicker({ kitchenPlan, value, onChange, labels, contractNumber }) {
  const svgHostRef = useRef(null);
  const { kitchenConfig, svgMarkup, kitchenSlug, selectableComponentIds } = kitchenPlan;

  const planViewport = PLAN_VIEWPORT_BY_SLUG[kitchenSlug] || null;
  const imageViewHref = SERVICE_CLAIM_IMAGE_VIEW_BY_SLUG[kitchenSlug] || "";

  const resolvedSvgMarkup = useMemo(
    () => applyPlanViewportToMarkup(svgMarkup, kitchenConfig.kitchen.slug),
    [kitchenConfig.kitchen.slug, svgMarkup],
  );

  const fixedComponentIds = useMemo(() => {
    return [];
  }, []);
  const visibleComponentIds = useMemo(
    () => [...new Set(selectableComponentIds || [])],
    [selectableComponentIds],
  );

  const fixedKey = fixedComponentIds.join("|");
  const selectableKey = (selectableComponentIds || []).join("|");
  const visibleKey = visibleComponentIds.join("|");
  const imageHotspots = useMemo(() => {
    const selectable = new Set(selectableComponentIds || []);
    return (SERVICE_CLAIM_IMAGE_HOTSPOTS_BY_SLUG[kitchenSlug] || [])
      .map((hotspot) => ({
        ...hotspot,
        componentId: componentIdForKey(hotspot.componentKey),
      }))
      .filter((hotspot) => selectable.has(hotspot.componentId));
  }, [kitchenSlug, selectableComponentIds, selectableKey]);
  const shouldUseImagePlan = Boolean(imageViewHref && imageHotspots.length);

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
            <div className={`${styles.planImageWrap} service-claim-kitchen__image-wrap`}>
              <img
                src={imageViewHref}
                alt={`${kitchenConfig.kitchen.name || "Kitchen"} plan`}
                className={styles.planImageInteractive}
                draggable={false}
              />
              <div className={styles.planHotspotLayer}>
                {imageHotspots.map((hotspot) => {
                  const isSelected = selectedIds.has(hotspot.componentId);
                  return (
                    <button
                      key={`${hotspot.componentId}-${hotspot.left}-${hotspot.top}-${hotspot.width}-${hotspot.height}`}
                      type="button"
                      className={[
                        styles.planHotspot,
                        isSelected ? styles.planHotspotSelected : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        left: `${hotspot.left}%`,
                        top: `${hotspot.top}%`,
                        width: `${hotspot.width}%`,
                        height: `${hotspot.height}%`,
                        zIndex:
                          hotspot.componentKey === "sink-faucet"
                            ? 10
                            : hotspot.componentKey === "worktop"
                              ? 4
                              : 1,
                      }}
                      aria-pressed={isSelected}
                      aria-label={hotspot.componentKey}
                      onClick={() => {
                        onChange((current) =>
                          toggleClaimComponentSelection({
                            currentIds: current,
                            componentId: hotspot.componentId,
                            selectableComponentIds,
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
    </div>
  );
}

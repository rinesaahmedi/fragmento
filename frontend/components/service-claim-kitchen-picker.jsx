"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { getServiceClaimLinkedComponentIds } from "../lib/service-claim-kitchen-plan-selection";
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

export default function ServiceClaimKitchenPicker({ kitchenPlan, value, onChange, labels, contractNumber }) {
  const svgHostRef = useRef(null);
  const [hoveredComponentId, setHoveredComponentId] = useState(null);
  const { kitchenConfig, svgMarkup, kitchenSlug, selectableComponentIds } = kitchenPlan;

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
    () => [...new Set(selectableComponentIds || [])],
    [selectableComponentIds],
  );

  const fixedKey = fixedComponentIds.join("|");
  const selectableKey = (selectableComponentIds || []).join("|");
  const visibleKey = visibleComponentIds.join("|");
  const sourceImageHotspots = useMemo(() => {
    const definitions = (IMAGE_HOTSPOTS_BY_SLUG[kitchenSlug] || []).map(withHotspotSourceBounds);
    return withBasePlinthExtension(
      withCornerBlendeExtensions(
        withDerivedSinkFaucet(definitions, kitchenConfig.components),
      ),
      kitchenSlug,
    );
  }, [kitchenConfig.components, kitchenSlug]);
  const planDisplayCrop = useMemo(
    () => getPlanDisplayCrop(sourceImageHotspots, kitchenSlug),
    [sourceImageHotspots, kitchenSlug],
  );
  const croppedPlanAspectRatio =
    `${planDisplayCrop.width * PLAN_IMAGE_SOURCE_WIDTH} / ${planDisplayCrop.height * PLAN_IMAGE_SOURCE_HEIGHT}`;
  const imageHotspots = useMemo(() => {
    const selectable = new Set(selectableComponentIds || []);
    return sourceImageHotspots
      .map((hotspot) => cropPlanHotspot(hotspot, planDisplayCrop))
      .map((hotspot) => {
        return {
          ...hotspot,
          componentId: componentIdForKey(hotspot.componentKey),
        };
      })
      .filter((hotspot) => hotspot && selectable.has(hotspot.componentId));
  }, [planDisplayCrop, selectableComponentIds, selectableKey, sourceImageHotspots]);
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
              <img
                src={imageViewHref}
                alt={`${kitchenConfig.kitchen.name || "Kitchen"} plan`}
                className={styles.planImageInteractive}
                style={{
                  left: `${-(planDisplayCrop.left / planDisplayCrop.width) * 100}%`,
                  top: `${-(planDisplayCrop.top / planDisplayCrop.height) * 100}%`,
                  width: `${(100 / planDisplayCrop.width) * 100}%`,
                  height: `${(100 / planDisplayCrop.height) * 100}%`,
                }}
                draggable={false}
              />
              <div className={styles.planHotspotLayer}>
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
                          hotspot.componentKey === "sink-faucet"
                            ? 10
                            : hotspot.componentKey === "worktop"
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
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  componentIdForItem,
  normalizeColor,
  toggleLinkedComponentSelection,
} from "./kitchen-selection-utils";
import {
  PLAN_VIEWPORT_BY_SLUG,
  applyPlanViewportToMarkup,
  refreshKitchenPlanSelection,
  syncKitchenPlan,
} from "./kitchen-svg-plan-utils";
import styles from "./kitchen-configurator.module.css";

export default function ServiceClaimKitchenPicker({ kitchenPlan, value, onChange, labels }) {
  const svgHostRef = useRef(null);
  const { kitchenConfig, svgMarkup, kitchenSlug, selectableComponentIds } = kitchenPlan;

  const planViewport = PLAN_VIEWPORT_BY_SLUG[kitchenSlug] || null;

  const resolvedSvgMarkup = useMemo(
    () => applyPlanViewportToMarkup(svgMarkup, kitchenConfig.kitchen.slug),
    [kitchenConfig.kitchen.slug, svgMarkup],
  );

  const fixedComponentIds = useMemo(() => {
    const allowed = new Set(selectableComponentIds);
    return (kitchenConfig.components || [])
      .map((item) => componentIdForItem(item))
      .filter((id) => !allowed.has(id));
  }, [kitchenConfig.components, selectableComponentIds]);

  const fixedKey = fixedComponentIds.join("|");

  useEffect(() => {
    const host = svgHostRef.current;
    const svg = syncKitchenPlan({
      host,
      svgMarkup: resolvedSvgMarkup,
      planViewport,
      kitchenConfig,
      selectedComponentIds: value,
      lockedComponentIds: fixedComponentIds,
      componentIdForItem,
      normalizeColor,
    });

    if (!host || !svg) {
      return undefined;
    }

    const onClick = (event) => {
      const group = event.target.closest("[data-component-id]");
      if (!group) {
        return;
      }

      const componentId = group.dataset.componentId;
      if (fixedComponentIds.includes(componentId)) {
        return;
      }

      onChange((current) =>
        toggleLinkedComponentSelection(kitchenSlug, current, componentId, fixedComponentIds),
      );
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
    value,
  ]);

  useEffect(() => {
    refreshKitchenPlanSelection({
      host: svgHostRef.current,
      selectedComponentIds: value,
      lockedComponentIds: fixedComponentIds,
    });
  }, [fixedKey, value, fixedComponentIds]);

  return (
    <div className="service-claim-kitchen">
      <div className="service-claim-kitchen__header">
        <div>
          <p className="service-claim-kitchen__eyebrow">{labels?.eyebrow || ""}</p>
          <h3 className="service-claim-kitchen__title">{labels?.title || ""}</h3>
        </div>
        <button type="button" className="service-claim-kitchen__reset" onClick={() => onChange([])}>
          {labels?.reset || "Reset"}
        </button>
      </div>
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
    </div>
  );
}

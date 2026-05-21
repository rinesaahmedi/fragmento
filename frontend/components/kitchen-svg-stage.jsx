"use client";

import { useEffect, useMemo, useRef } from "react";
import styles from "./kitchen-configurator.module.css";
import {
  componentIdForItem,
  normalizeColor,
  toggleLinkedComponentSelection,
} from "./kitchen-selection-utils";
import { usePublicI18n } from "./public-i18n";
import {
  applyPlanViewportToMarkup,
  refreshKitchenPlanSelection,
  syncKitchenPlan,
} from "./kitchen-svg-plan-utils";

export default function KitchenSvgStage({
  svgMarkup,
  kitchenConfig,
  kitchenSlug,
  planViewport,
  fixedComponentIds,
  selectedComponentIds,
  setSelectedComponentIds,
  onResetSelection,
}) {
  const { translate } = usePublicI18n();
  const svgHostRef = useRef(null);
  const resolvedSvgMarkup = useMemo(
    () => applyPlanViewportToMarkup(svgMarkup, kitchenConfig.kitchen.slug),
    [kitchenConfig.kitchen.slug, svgMarkup],
  );
  const fixedComponentIdsKey = fixedComponentIds.join("|");

  useEffect(() => {
    const host = svgHostRef.current;
    const svg = syncKitchenPlan({
      host,
      svgMarkup: resolvedSvgMarkup,
      planViewport,
      kitchenConfig,
      selectedComponentIds,
      lockedComponentIds: fixedComponentIds,
      componentIdForItem,
      normalizeColor,
    });

    if (!host || !svg) {
      return undefined;
    }

    const onClick = (event) => {
      const group = event.target.closest("[data-component-id]");
      if (!group) return;

      const componentId = group.dataset.componentId;
      if (fixedComponentIds.includes(componentId)) return;

      setSelectedComponentIds((current) =>
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
    planViewport,
    resolvedSvgMarkup,
    selectedComponentIds,
    setSelectedComponentIds,
  ]);

  useEffect(() => {
    refreshKitchenPlanSelection({
      host: svgHostRef.current,
      selectedComponentIds,
      lockedComponentIds: fixedComponentIds,
    });
  }, [fixedComponentIdsKey, selectedComponentIds, fixedComponentIds]);

  return (
    <div className={styles.stage}>
      <div className={styles.stageHeader}>
        <div>
          <p className={styles.eyebrow}>{translate("configurator.stageEyebrow", "Plan")}</p>
          <h2>{translate("configurator.stageTitle", "Plan your kitchen")}</h2>
        </div>
        <button type="button" className={styles.ghostButton} onClick={onResetSelection}>
          {translate("configurator.resetSelection", "Reset selection")}
        </button>
      </div>
      <div className={styles.stageBody}>
        <div className={styles.svgCard}>
          <div
            ref={svgHostRef}
            className={[
              styles.svgCanvas,
              planViewport?.canvasClassName === "wide" ? styles.svgCanvasWide : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        </div>
        <div className={styles.stageLegend}>
          <span className={styles.legendChip}>
            <span className={styles.legendSwatch} />
            {translate("configurator.stageLegendClick", "Click in the plan or choose on the right")}
          </span>
          <span className={styles.legendChip}>
            <span className={styles.legendDot} />
            {translate("configurator.stageLegendFixed", "Fixed parts always remain active")}
          </span>
        </div>
      </div>
    </div>
  );
}

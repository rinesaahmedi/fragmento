"use client";

import { useEffect, useMemo, useRef } from "react";
import styles from "./kitchen-configurator.module.css";
import {
  componentIdForItem,
  normalizeColor,
  toggleLinkedComponentSelection,
} from "./kitchen-selection-utils";
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
  lockedComponentIds,
  selectedComponentIds,
  setSelectedComponentIds,
  onResetSelection,
}) {
  const svgHostRef = useRef(null);
  const resolvedSvgMarkup = useMemo(
    () => applyPlanViewportToMarkup(svgMarkup, kitchenConfig.kitchen.slug),
    [kitchenConfig.kitchen.slug, svgMarkup],
  );
  const lockedComponentIdsKey = lockedComponentIds.join("|");

  useEffect(() => {
    const host = svgHostRef.current;
    const svg = syncKitchenPlan({
      host,
      svgMarkup: resolvedSvgMarkup,
      planViewport,
      kitchenConfig,
      selectedComponentIds,
      lockedComponentIds,
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
      if (lockedComponentIds.includes(componentId)) return;

      setSelectedComponentIds((current) =>
        toggleLinkedComponentSelection(kitchenSlug, current, componentId, lockedComponentIds),
      );
    };

    host.addEventListener("click", onClick, true);
    return () => {
      host.removeEventListener("click", onClick, true);
    };
  }, [
    kitchenConfig,
    kitchenSlug,
    lockedComponentIds,
    planViewport,
    resolvedSvgMarkup,
    selectedComponentIds,
    setSelectedComponentIds,
  ]);

  useEffect(() => {
    refreshKitchenPlanSelection({
      host: svgHostRef.current,
      selectedComponentIds,
      lockedComponentIds,
    });
  }, [lockedComponentIdsKey, selectedComponentIds, lockedComponentIds]);

  return (
    <div className={styles.stage}>
      <div className={styles.stageHeader}>
        <div>
          <p className={styles.eyebrow}>Plan</p>
          <h2>Interaktive Kuechenansicht</h2>
        </div>
        <button type="button" className={styles.ghostButton} onClick={onResetSelection}>
          Auswahl zuruecksetzen
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
            Im Plan anklicken oder rechts auswaehlen
          </span>
          <span className={styles.legendChip}>
            <span className={styles.legendDot} />
            Fixe Bestandteile bleiben immer aktiv
          </span>
        </div>
      </div>
    </div>
  );
}

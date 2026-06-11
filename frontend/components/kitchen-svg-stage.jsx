"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./kitchen-configurator.module.css";
import Kitchen3DViewer from "./Kitchen3DViewer";
import {
  componentIdForItem,
  isHiddenLinkedComponent,
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
  const has3dModel = kitchenSlug === "test-3d-kitchen";
  const [activeView, setActiveView] = useState("2d");
  const resolvedSvgMarkup = useMemo(
    () => applyPlanViewportToMarkup(svgMarkup, kitchenConfig.kitchen.slug),
    [kitchenConfig.kitchen.slug, svgMarkup],
  );
  const fixedComponentIdsKey = fixedComponentIds.join("|");
  const componentIds = useMemo(
    () =>
      new Set(
        kitchenConfig.components
          .map((item) => componentIdForItem(item))
          .filter((componentId) => !isHiddenLinkedComponent(kitchenSlug, componentId)),
      ),
    [kitchenConfig.components, kitchenSlug],
  );

  useEffect(() => {
    if (activeView !== "2d") {
      return undefined;
    }

    const host = svgHostRef.current;
    const svg = syncKitchenPlan({
      host,
      svgMarkup: resolvedSvgMarkup,
      planViewport,
      kitchenConfig,
      selectedComponentIds: [],
      lockedComponentIds: fixedComponentIds,
      componentIdForItem,
      normalizeColor,
    });

    if (!host || !svg) {
      return undefined;
    }

    const onClick = (event) => {
      const groupsAtPoint = typeof document.elementsFromPoint === "function"
        ? document.elementsFromPoint(event.clientX, event.clientY)
          .map((element) => element.closest?.("[data-component-id]"))
          .filter(Boolean)
        : [event.target.closest?.("[data-component-id]")].filter(Boolean);
      const uniqueGroups = [...new Map(groupsAtPoint.map((group) => [group.dataset.componentId, group])).values()]
        .filter((group) => group.dataset.componentId && componentIds.has(group.dataset.componentId));
      if (!uniqueGroups.length) return;

      const group = uniqueGroups
        .map((candidate) => {
          const hitbox = candidate.querySelector(".component-hitbox") || candidate;
          const rect = hitbox.getBoundingClientRect();
          return {
            group: candidate,
            area: Math.max(rect.width, 1) * Math.max(rect.height, 1),
          };
        })
        .sort((a, b) => a.area - b.area)[0]?.group;
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
    activeView,
    componentIds,
    planViewport,
    resolvedSvgMarkup,
    setSelectedComponentIds,
  ]);

  useEffect(() => {
    if (activeView !== "2d") {
      return;
    }

    refreshKitchenPlanSelection({
      host: svgHostRef.current,
      selectedComponentIds,
      lockedComponentIds: fixedComponentIds,
      kitchenSlug,
    });
  }, [activeView, fixedComponentIdsKey, selectedComponentIds, fixedComponentIds, kitchenSlug]);

  return (
    <div className={styles.stage}>
      <div className={styles.stageHeader}>
        <div>
          <p className={styles.eyebrow}>{translate("configurator.stageEyebrow", "Plan")}</p>
          <h2>{translate("configurator.stageTitle", "Plan your kitchen")}</h2>
        </div>
        <div className={styles.stageHeaderActions}>
          {has3dModel ? (
            <div className={styles.viewToggle} role="tablist" aria-label="Kitchen preview view">
              <button
                type="button"
                role="tab"
                aria-selected={activeView === "2d"}
                className={activeView === "2d" ? styles.viewToggleButtonActive : styles.viewToggleButton}
                onClick={() => setActiveView("2d")}
              >
                2D View
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeView === "3d"}
                className={activeView === "3d" ? styles.viewToggleButtonActive : styles.viewToggleButton}
                onClick={() => setActiveView("3d")}
              >
                3D View
              </button>
            </div>
          ) : null}
          <button type="button" className={styles.ghostButton} onClick={onResetSelection}>
            {translate("configurator.resetSelection", "Reset selection")}
          </button>
        </div>
      </div>
      <div className={styles.stageBody}>
        {has3dModel && activeView === "3d" ? (
          <>
            <Kitchen3DViewer
              components={kitchenConfig.components}
              componentIds={componentIds}
              fixedComponentIds={fixedComponentIds}
              selectedComponentIds={selectedComponentIds}
              onToggleComponent={(componentId) => {
                setSelectedComponentIds((current) =>
                  toggleLinkedComponentSelection(kitchenSlug, current, componentId, fixedComponentIds),
                );
              }}
            />
            <div className={styles.stageLegend}>
              <span className={styles.legendChip}>
                <span className={styles.legendSwatch} />
                Click parts in the 3D preview or choose on the right
              </span>
              <span className={styles.legendChip}>
                <span className={styles.legendDot} />
                Fixed parts always remain active
              </span>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

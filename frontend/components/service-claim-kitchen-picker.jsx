"use client";

import { useEffect, useMemo, useRef } from "react";
import { componentIdForItem, normalizeColor } from "./kitchen-selection-utils";
import {
  PLAN_VIEWPORT_BY_SLUG,
  applyPlanViewportToMarkup,
  refreshKitchenPlanSelection,
  syncKitchenPlan,
} from "./kitchen-svg-plan-utils";
import styles from "./kitchen-configurator.module.css";

export default function ServiceClaimKitchenPicker({ kitchenPlan, value, onChange, labels, contractNumber }) {
  const svgHostRef = useRef(null);
  const { kitchenConfig, svgMarkup, kitchenSlug, selectableComponentIds } = kitchenPlan;

  const planViewport = PLAN_VIEWPORT_BY_SLUG[kitchenSlug] || null;

  const resolvedSvgMarkup = useMemo(
    () => applyPlanViewportToMarkup(svgMarkup, kitchenConfig.kitchen.slug),
    [kitchenConfig.kitchen.slug, svgMarkup],
  );

  const fixedComponentIds = useMemo(() => {
    return [];
  }, []);
  const defaultComponentIds = useMemo(
    () =>
      (kitchenConfig.components || [])
        .filter((item) => item.isLocked)
        .map((item) => componentIdForItem(item))
        .filter(Boolean),
    [kitchenConfig.components],
  );
  const visibleComponentIds = useMemo(
    () => [...new Set([...(selectableComponentIds || []), ...defaultComponentIds])],
    [defaultComponentIds, selectableComponentIds],
  );

  const fixedKey = fixedComponentIds.join("|");
  const selectableKey = (selectableComponentIds || []).join("|");
  const visibleKey = visibleComponentIds.join("|");

  useEffect(() => {
    const selectable = new Set(selectableComponentIds || []);
    if (!value.some((id) => !selectable.has(id))) {
      return;
    }
    onChange((current) => current.filter((id) => selectable.has(id)));
  }, [onChange, selectableComponentIds, selectableKey, value]);

  useEffect(() => {
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
      const group = event.target.closest("[data-component-id]");
      if (!group) {
        return;
      }

      const componentId = group.dataset.componentId;
      if (!selectableComponentIds.includes(componentId)) {
        return;
      }

      onChange((current) => {
        const locked = new Set(fixedComponentIds);
        if (locked.has(componentId)) {
          return current;
        }
        const next = new Set(current);
        if (next.has(componentId)) {
          next.delete(componentId);
        } else {
          next.add(componentId);
        }
        return [...next];
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
  ]);

  useEffect(() => {
    refreshKitchenPlanSelection({
      host: svgHostRef.current,
      selectedComponentIds: value,
      lockedComponentIds: fixedComponentIds,
    });
  }, [fixedKey, value, fixedComponentIds]);

  const normalizedContractNumber = String(contractNumber || "").trim();

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

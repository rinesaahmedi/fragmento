"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./kitchen-configurator.module.css";
import Kitchen3DViewer from "./Kitchen3DViewer";
import {
  componentIdForItem,
  componentIdForKey,
  getLinkedComponentIds,
  getLocalizedItemName,
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

// Vector plans (rendered from the source PDFs via docs/render-plan-svg.py) so the drawing
// stays razor-sharp at any zoom. The pixel-perfect hotspot overlay sits on top unchanged
// (the SVG keeps the PDF's aspect ratio, so the %-based boxes still line up exactly).
const IMAGE_VIEW_BY_SLUG = {
  "ab-105806": "/plans/AB%20105806.svg",
  "ab-105812": "/plans/AB%20105812.svg",
  "ab-105819": "/plans/AB%20105819.svg",
  "ab-105820": "/plans/AB%20105820.svg",
  "ab-105841": "/plans/AB%20105841.svg",
  "ab-105811": "/plans/AB%20105811.svg",
};

const PDF_VIEW_BY_SLUG = {
  "ab-105807": "/pdfs/AB%20105807.pdf",
};

// Clickable selection boxes drawn on top of a flat plan image.
// Coordinates are percentages of the rendered image (left/top/width/height),
// so they stay aligned at any display size. `componentKey` must match the
// component's `componentKey` in the kitchen data (see prisma/seed.js).
// Coordinates auto-detected from the 3509x2480 plan render by edge-detecting the CAD
// linework (see docs/detect-plan-hotspots.py). Values are % of image width/height, so they
// stay pixel-aligned at any display size. Use ?calibrate=1 on the kitchen page to verify.
const IMAGE_HOTSPOTS_BY_SLUG = {
  "ab-105806": [
    { componentKey: "refrigerator", left: 4.65, top: 28.85, width: 13.53, height: 61.88 },
    { componentKey: "wall-cabinet-1", left: 18.58, top: 16.25, width: 9.72, height: 24.88 },
    { componentKey: "wall-cabinet-2", left: 28.3, top: 16.25, width: 14.59, height: 24.88 },
    { componentKey: "extractor-hood", left: 28.3, top: 41.13, width: 14.59, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 42.89, top: 16.25, width: 9.72, height: 24.88 },
    { componentKey: "wall-cabinet-4", left: 52.61, top: 16.25, width: 14.56, height: 24.88 },
    { componentKey: "wall-cabinet-5", left: 67.17, top: 16.25, width: 14.58, height: 24.88 },
    { componentKey: "wall-cabinet-6", left: 81.75, top: 16.25, width: 14.57, height: 24.88 },
    { componentKey: "worktop", left: 18.58, top: 59.15, width: 78.14, height: 1.4 },
    { componentKey: "sink-faucet", left: 68.74, top: 52.55, width: 4.95, height: 8 },
    { componentKey: "base-module-1", left: 18.58, top: 60.56, width: 10.1, height: 30.17 },
    { componentKey: "oven-module", left: 28.68, top: 60.56, width: 14.59, height: 30.17 },
    { componentKey: "base-module-2", left: 43.27, top: 60.56, width: 9.72, height: 30.17 },
    { componentKey: "base-module-3", left: 52.99, top: 60.56, width: 14.58, height: 30.17 },
    { componentKey: "sink-base", left: 67.57, top: 60.56, width: 14.56, height: 30.17 },
    { componentKey: "drawer-module", left: 82.13, top: 60.56, width: 14.59, height: 30.17 },
  ],
  "ab-105812": [
    { componentKey: "refrigerator", left: 2.49, top: 29.68, width: 13.23, height: 60.02 },
    { componentKey: "wall-cabinet-1", left: 17.07, top: 16.85, width: 7.11, height: 24.32 },
    { componentKey: "wall-cabinet-2", left: 24.18, top: 16.85, width: 14.28, height: 24.32 },
    { componentKey: "extractor-hood", left: 24.18, top: 41.17, width: 14.28, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 38.46, top: 16.85, width: 14.26, height: 24.32 },
    { componentKey: "wall-cabinet-4", left: 52.72, top: 16.85, width: 14.25, height: 24.32 },
    { componentKey: "wall-cabinet-5", left: 66.97, top: 16.85, width: 14.26, height: 24.32 },
    { componentKey: "wall-cabinet-6", left: 81.23, top: 16.85, width: 14.27, height: 24.32 },
    { componentKey: "worktop", left: 17.07, top: 58.83, width: 78.43, height: 1.33 },
    { componentKey: "sink-faucet", left: 68.77, top: 52.16, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 17.07, top: 60.16, width: 7.11, height: 29.54 },
    { componentKey: "oven-module", left: 24.18, top: 60.16, width: 14.28, height: 29.54 },
    { componentKey: "base-module-2", left: 38.46, top: 60.16, width: 14.26, height: 29.54 },
    { componentKey: "base-module-3", left: 52.72, top: 60.16, width: 14.25, height: 29.54 },
    { componentKey: "sink-base", left: 66.97, top: 60.16, width: 14.26, height: 29.54 },
    { componentKey: "drawer-module", left: 81.23, top: 60.16, width: 14.27, height: 29.54 },
  ],
  "ab-105819": [
    { componentKey: "wall-cabinet-1", left: 0.85, top: 22.9, width: 11.7, height: 19.0 },
    { componentKey: "wall-cabinet-2", left: 12.55, top: 22.9, width: 11.15, height: 19.0 },
    { componentKey: "wall-cabinet-3", left: 23.7, top: 22.9, width: 11.14, height: 19.0 },
    { componentKey: "wall-cabinet-4", left: 34.84, top: 22.9, width: 11.14, height: 20.39 },
    { componentKey: "extractor-hood", left: 34.84, top: 43.29, width: 11.14, height: 5.9 },
    { componentKey: "worktop", left: 0.85, top: 55.73, width: 45.13, height: 1.02 },
    { componentKey: "sink-faucet", left: 18.86, top: 48.75, width: 3.79, height: 8 },
    { componentKey: "base-module-1", left: 0.85, top: 56.75, width: 11.7, height: 19.02 },
    { componentKey: "sink-base", left: 12.55, top: 56.75, width: 11.15, height: 19.02 },
    { componentKey: "base-module-3", left: 23.7, top: 56.75, width: 11.14, height: 19.02 },
    { componentKey: "oven-module", left: 34.84, top: 56.75, width: 11.14, height: 19.02 },
    { componentKey: "refrigerator", left: 48.39, top: 32.86, width: 10.33, height: 46.96 },
  ],
  "ab-105820": [
    { componentKey: "refrigerator", left: 2.11, top: 29.8, width: 13.22, height: 60.5 },
    { componentKey: "wall-cabinet-1", left: 17.16, top: 17.5, width: 7.12, height: 24.27 },
    { componentKey: "wall-cabinet-2", left: 24.28, top: 17.5, width: 14.24, height: 24.27 },
    { componentKey: "extractor-hood", left: 24.28, top: 41.77, width: 14.24, height: 7.05 },
    { componentKey: "wall-cabinet-3", left: 38.52, top: 17.5, width: 14.26, height: 24.27 },
    { componentKey: "wall-cabinet-4", left: 52.78, top: 17.5, width: 14.23, height: 24.27 },
    { componentKey: "wall-cabinet-5", left: 67.01, top: 17.5, width: 14.25, height: 24.27 },
    { componentKey: "wall-cabinet-6", left: 81.26, top: 17.5, width: 14.24, height: 24.27 },
    { componentKey: "worktop", left: 17.16, top: 59.48, width: 78.34, height: 1.4 },
    { componentKey: "sink-faucet", left: 68.06, top: 52.88, width: 4.85, height: 8 },
    { componentKey: "base-module-1", left: 17.16, top: 60.79, width: 7.12, height: 29.51 },
    { componentKey: "oven-module", left: 24.28, top: 60.79, width: 14.24, height: 29.51 },
    { componentKey: "base-module-2", left: 38.52, top: 60.79, width: 14.26, height: 29.51 },
    { componentKey: "base-module-3", left: 52.78, top: 60.79, width: 14.23, height: 29.51 },
    { componentKey: "sink-base", left: 67.01, top: 60.79, width: 14.25, height: 29.51 },
    { componentKey: "drawer-module", left: 81.26, top: 60.79, width: 14.24, height: 29.51 },
  ],
  "ab-105841": [
    { componentKey: "wall-cabinet-1", left: 1.55, top: 19.23, width: 13.33, height: 22.73 },
    { componentKey: "wall-cabinet-2", left: 14.88, top: 19.23, width: 13.32, height: 22.73 },
    { componentKey: "extractor-hood", left: 14.88, top: 41.9, width: 13.32, height: 5.5 },
    { componentKey: "wall-cabinet-3", left: 28.2, top: 19.23, width: 13.34, height: 22.73 },
    { componentKey: "wall-cabinet-4", left: 41.54, top: 19.23, width: 13.32, height: 22.73 },
    { componentKey: "wall-cabinet-5", left: 54.86, top: 19.23, width: 13.32, height: 22.73 },
    { componentKey: "wall-cabinet-6", left: 68.18, top: 19.23, width: 13.34, height: 22.73 },
    { componentKey: "worktop", left: 1.55, top: 58.47, width: 80.33, height: 1.4 },
    { componentKey: "sink-faucet", left: 49.19, top: 51.87, width: 4.53, height: 8 },
    { componentKey: "base-module-1", left: 1.55, top: 59.9, width: 13.33, height: 27.44 },
    { componentKey: "oven-module", left: 14.88, top: 59.9, width: 13.32, height: 27.44 },
    { componentKey: "base-module-2", left: 28.2, top: 59.9, width: 13.34, height: 27.44 },
    { componentKey: "sink-base", left: 41.54, top: 59.9, width: 13.32, height: 27.44 },
    { componentKey: "base-module-3", left: 54.86, top: 59.9, width: 13.32, height: 27.44 },
    { componentKey: "drawer-module", left: 68.18, top: 59.9, width: 13.7, height: 27.44 },
    { componentKey: "refrigerator", left: 85.15, top: 30.73, width: 12.34, height: 56.6 },
  ],
  "ab-105811": [
    { componentKey: "wall-cabinet-1", left: 1.4, top: 24.03, width: 11.15, height: 19.01 },
    { componentKey: "wall-cabinet-2", left: 12.55, top: 24.03, width: 11.15, height: 19.01 },
    { componentKey: "wall-cabinet-3", left: 23.7, top: 24.03, width: 11.14, height: 19.01 },
    { componentKey: "wall-cabinet-4", left: 34.84, top: 24.03, width: 11.16, height: 19.01 },
    { componentKey: "extractor-hood", left: 34.84, top: 43.04, width: 11.16, height: 5.46 },
    { componentKey: "worktop", left: 1.4, top: 56.85, width: 44.6, height: 1.03 },
    { componentKey: "sink-faucet", left: 18.88, top: 49.88, width: 3.79, height: 8 },
    { componentKey: "base-module-1", left: 1.4, top: 57.88, width: 11.15, height: 23.11 },
    { componentKey: "sink-base", left: 12.55, top: 57.88, width: 11.15, height: 23.11 },
    { componentKey: "base-module-2", left: 23.7, top: 57.88, width: 11.14, height: 23.11 },
    { componentKey: "oven-module", left: 34.84, top: 57.88, width: 11.16, height: 23.11 },
    { componentKey: "refrigerator", left: 48.4, top: 33.63, width: 10.32, height: 47.38 },
  ],
};

const CALIBRATION_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

// The sink (faucet + waste) is always part of the default configuration and sits on the
// worktop directly above the sink base. Rather than hand-placing a faucet box per kitchen,
// we derive one automatically for every plan: centered over the sink-base hotspot and resting
// on the worktop. This keeps the sink shown as selected by default on every current and future
// kitchen without extra per-kitchen wiring.
function withDerivedSinkFaucet(definitions, components) {
  if (!definitions.length) return definitions;
  if (definitions.some((definition) => definition.componentKey === "sink-faucet")) {
    return definitions;
  }
  const hasFaucetComponent = components.some(
    (item) => String(item?.componentKey || "").toLowerCase() === "sink-faucet",
  );
  if (!hasFaucetComponent) return definitions;

  const sinkBase = definitions.find((definition) => definition.componentKey === "sink-base");
  const worktop = definitions.find((definition) => definition.componentKey === "worktop");
  if (!sinkBase || !worktop) return definitions;

  const width = Math.max(sinkBase.width * 0.34, 3);
  const height = 8;
  const faucet = {
    componentKey: "sink-faucet",
    left: sinkBase.left + (sinkBase.width - width) / 2,
    top: worktop.top + worktop.height - height,
    width,
    height,
  };
  return [...definitions, faucet];
}

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
  const { translate, language } = usePublicI18n();
  const svgHostRef = useRef(null);
  const has3dModel = kitchenSlug === "test-3d-kitchen";
  const normalizedKitchenSlug = String(kitchenSlug || "").trim().toLowerCase();
  const imageViewHref = IMAGE_VIEW_BY_SLUG[normalizedKitchenSlug] || "";
  const pdfViewHref = PDF_VIEW_BY_SLUG[normalizedKitchenSlug] || "";
  const hasImageView = Boolean(imageViewHref);
  const hasPdfView = Boolean(pdfViewHref);
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
  const imageHotspots = useMemo(() => {
    const definitions = withDerivedSinkFaucet(
      IMAGE_HOTSPOTS_BY_SLUG[normalizedKitchenSlug] || [],
      kitchenConfig.components,
    );
    if (!definitions.length) return [];

    const componentById = new Map(
      kitchenConfig.components.map((item) => [componentIdForItem(item), item]),
    );

    return definitions
      .map((definition) => {
        const componentId = componentIdForKey(definition.componentKey);
        const item =
          componentById.get(componentId) ||
          getLinkedComponentIds(normalizedKitchenSlug, componentId)
            .map((linkedComponentId) => componentById.get(linkedComponentId))
            .find(Boolean);
        if (!item) {
          return null;
        }
        return {
          ...definition,
          componentId,
          label: getLocalizedItemName(item, translate, language) || item.name || "",
        };
      })
      .filter(Boolean);
  }, [kitchenConfig.components, normalizedKitchenSlug, translate, language]);
  const hasImageHotspots = imageHotspots.length > 0;
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [hoveredComponentId, setHoveredComponentId] = useState(null);
  // Linked parts (e.g. the hood wall cabinet + its pull-out extractor hood) should react as
  // one unit, so hovering either hotspot highlights the whole group.
  const hoveredLinkedGroup = useMemo(
    () => (hoveredComponentId ? getLinkedComponentIds(normalizedKitchenSlug, hoveredComponentId) : []),
    [hoveredComponentId, normalizedKitchenSlug],
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const value = new URLSearchParams(window.location.search).get("calibrate");
    setIsCalibrating(value === "1" || value === "true");
  }, []);

  useEffect(() => {
    if (activeView !== "2d" || hasImageView || hasPdfView) {
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
    hasImageView,
    hasPdfView,
    activeView,
    componentIds,
    planViewport,
    resolvedSvgMarkup,
    setSelectedComponentIds,
  ]);

  useEffect(() => {
    if (activeView !== "2d" || hasImageView || hasPdfView) {
      return;
    }

    refreshKitchenPlanSelection({
      host: svgHostRef.current,
      selectedComponentIds,
      lockedComponentIds: fixedComponentIds,
      kitchenSlug,
    });
  }, [activeView, fixedComponentIdsKey, selectedComponentIds, fixedComponentIds, kitchenSlug, hasImageView, hasPdfView]);

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
        ) : hasImageView ? (
          <>
            <div className={styles.pdfCard}>
              {hasImageHotspots ? (
                <div className={styles.planImageWrap}>
                  <img
                    src={imageViewHref}
                    alt={`${kitchenConfig.kitchen.name || "Kitchen"} plan`}
                    className={styles.planImageInteractive}
                  />
                  <div className={styles.planHotspotLayer}>
                    {imageHotspots.map((hotspot) => {
                      const isLocked = fixedComponentIds.includes(hotspot.componentId);
                      // Linked parts (e.g. the hood cabinet + its pull-out hood) toggle together,
                      // but the hidden partner isn't persisted on its own. Mirror the group's
                      // selection so both stay highlighted after a refresh.
                      const linkedIds = getLinkedComponentIds(kitchenSlug, hotspot.componentId);
                      const isSelected =
                        isLocked || linkedIds.some((linkedId) => selectedComponentIds.includes(linkedId));
                      const isGroupHovered = hoveredLinkedGroup.includes(hotspot.componentId);
                      return (
                        <button
                          key={hotspot.componentId}
                          type="button"
                          className={[
                            styles.planHotspot,
                            isGroupHovered ? styles.planHotspotHover : "",
                            isSelected ? styles.planHotspotSelected : "",
                            isLocked ? styles.planHotspotLocked : "",
                            isCalibrating ? styles.planHotspotCalibrate : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={{
                            left: `${hotspot.left}%`,
                            top: `${hotspot.top}%`,
                            width: `${hotspot.width}%`,
                            height: `${hotspot.height}%`,
                          }}
                          aria-pressed={isSelected}
                          aria-label={hotspot.label}
                          title={`${hotspot.componentKey} — left:${hotspot.left} top:${hotspot.top} width:${hotspot.width} height:${hotspot.height}`}
                          disabled={isLocked}
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
                            if (fixedComponentIds.includes(hotspot.componentId)) return;
                            setSelectedComponentIds((current) =>
                              toggleLinkedComponentSelection(
                                kitchenSlug,
                                current,
                                hotspot.componentId,
                                fixedComponentIds,
                              ),
                            );
                          }}
                        >
                          {isCalibrating ? (
                            <span className={styles.planHotspotTag}>{hotspot.componentKey}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  {isCalibrating ? (
                    <div className={styles.planCalibrationGrid} aria-hidden="true">
                      {CALIBRATION_TICKS.map((tick) => (
                        <div
                          key={`v-${tick}`}
                          className={styles.planCalibrationLineV}
                          style={{ left: `${tick}%` }}
                        >
                          <span className={styles.planCalibrationLabel}>{tick}</span>
                        </div>
                      ))}
                      {CALIBRATION_TICKS.map((tick) => (
                        <div
                          key={`h-${tick}`}
                          className={styles.planCalibrationLineH}
                          style={{ top: `${tick}%` }}
                        >
                          <span className={styles.planCalibrationLabelH}>{tick}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <img
                  src={imageViewHref}
                  alt={`${kitchenConfig.kitchen.name || "Kitchen"} plan`}
                  className={styles.planImage}
                />
              )}
            </div>
            <div className={styles.stageLegend}>
              <span className={styles.legendChip}>
                <span className={styles.legendSwatch} />
                {hasImageHotspots
                  ? translate("configurator.stageLegendClick", "Click in the plan or choose on the right")
                  : translate("configurator.stageLegendChooseRight", "Choose elements on the right")}
              </span>
              <span className={styles.legendChip}>
                <span className={styles.legendDot} />
                {translate("configurator.stageLegendFixed", "Fixed parts always remain active")}
              </span>
            </div>
          </>
        ) : hasPdfView ? (
          <>
            <div className={styles.pdfCard}>
              <iframe
                src={pdfViewHref}
                title={`${kitchenConfig.kitchen.name || "Kitchen"} PDF view`}
                className={styles.pdfFrame}
              />
            </div>
            <div className={styles.stageLegend}>
              <span className={styles.legendChip}>
                <span className={styles.legendSwatch} />
                {translate("configurator.stageLegendChooseRight", "Choose elements on the right")}
              </span>
              <span className={styles.legendChip}>
                <span className={styles.legendDot} />
                {translate("configurator.stageLegendFixed", "Fixed parts always remain active")}
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

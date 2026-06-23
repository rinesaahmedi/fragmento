"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./kitchen-configurator.module.css";
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
import { PLAN_HOTSPOTS_BY_SLUG as IMAGE_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG as IMAGE_VIEW_BY_SLUG } from "../lib/kitchen-plan-preview-data";

const Kitchen3DViewer = dynamic(() => import("./Kitchen3DViewer"), {
  ssr: false,
  loading: () => (
    <div className={styles.viewerLoading} role="status" aria-live="polite">
      Loading 3D preview…
    </div>
  ),
});

const PDF_VIEW_BY_SLUG = {};

const CALIBRATION_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const PLAN_IMAGE_SOURCE_WIDTH = 842;
const PLAN_IMAGE_SOURCE_HEIGHT = 595;
const PLAN_DIMENSION_LINE_PERCENT = 98.43;
const WALL_CABINET_COMPONENT_KEY_PATTERN = /^wall-cabinet-\d+$/;
const BASE_BODY_COMPONENT_KEYS = new Set([
  "base-module-1",
  "base-module-2",
  "base-module-3",
  "oven-module",
  "sink-base",
  "drawer-module",
]);
const CORNER_BLENDE_MAX_WIDTH = 1.25;
const CORNER_BLENDE_MIN_HEIGHT = 15;
const CORNER_BLENDE_EDGE_TOLERANCE = 1.2;
const CORNER_BLENDE_VERTICAL_TOLERANCE = 0.35;
const BASE_PLINTH_EXTENSION_DISABLED_SLUGS = new Set([
  "ab-105808",
  "ab-105805",
  "ab-105809",
  "ab-105834",
  "ab-105810",
  "ab-105812",
  "ab-105814",
  "ab-105818",
  "ab-105820",
  "ab-105841",
  "ab-105838",
  "ab-105844",
  // L-shaped perspective drawing: base hotspots already include each cabinet's drawn bottom
  // and sit at different heights, so the flat-elevation plinth extension would over-extend them.
  "ab-105837",
  "ab-105816",
]);
// Typical toe-kick height on the 3509×2480 CAD renders (~5.2–5.3% of image height).
const BASE_PLINTH_EXTENSION_PERCENT = 5.25;
// If the base run already reaches within this margin of the floor dimension line, assume
// plinth is included and do not extend (avoids double-counting on older hotspot maps).
const BASE_PLINTH_ALREADY_INCLUDED_GAP = 8;
const PLAN_DISPLAY_CROP_TUNING_BY_SLUG = {
  // AB 105833 has a split run with a large blank page area below the lower cabinets.
  // Keep the crop close to the plinth/floor line instead of carrying the full page tail.
  "ab-105833": {
    bottomPadding: 4,
    bottomLimit: 84,
  },
  "ab-105842": {
    bottomPadding: 4.8,
  },
  "ab-105839": {
    bottomPadding: 4.8,
  },
  "ab-105836": {
    bottomPadding: 4.8,
  },
};

function isBaseBodyHotspot(definition) {
  if (Array.isArray(definition.points) && definition.points.length) {
    return false;
  }
  if (definition.preserveManualSize) {
    return false;
  }
  if (BASE_BODY_COMPONENT_KEYS.has(definition.componentKey)) {
    return true;
  }
  // Tall worktop side strips share the base body column and should include the plinth too.
  return definition.componentKey === "worktop" && definition.height >= 15;
}

function isWallCabinetHotspot(definition) {
  return WALL_CABINET_COMPONENT_KEY_PATTERN.test(definition.componentKey);
}

function isHorizontalWorktopHotspot(definition) {
  return (
    definition.componentKey === "worktop" &&
    definition.width >= 5 &&
    definition.height <= 2
  );
}

function isCornerBlendeHotspot(definition) {
  return (
    definition.componentKey === "worktop" &&
    definition.width > 0 &&
    definition.width <= CORNER_BLENDE_MAX_WIDTH &&
    definition.height >= CORNER_BLENDE_MIN_HEIGHT
  );
}

function canExtendToCornerBlende(definition) {
  if (Array.isArray(definition.points) && definition.points.length) {
    return false;
  }
  if (definition.preserveManualSize) {
    return false;
  }
  return (
    isWallCabinetHotspot(definition) ||
    isBaseBodyHotspot(definition) ||
    isHorizontalWorktopHotspot(definition)
  );
}

function roundHotspotPercent(value) {
  return Math.round(value * 100) / 100;
}

function getHotspotSourceBounds(definition) {
  const points = Array.isArray(definition.points) ? definition.points : [];
  if (points.length) {
    const xs = points.map((point) => Number(point[0])).filter(Number.isFinite);
    const ys = points.map((point) => Number(point[1])).filter(Number.isFinite);
    if (xs.length && ys.length) {
      const left = Math.min(...xs);
      const top = Math.min(...ys);
      const right = Math.max(...xs);
      const bottom = Math.max(...ys);
      return {
        left,
        top,
        right,
        bottom,
        width: Math.max(right - left, 0),
        height: Math.max(bottom - top, 0),
      };
    }
  }

  const left = Number(definition.left || 0);
  const top = Number(definition.top || 0);
  const width = Number(definition.width || 0);
  const height = Number(definition.height || 0);
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

function withHotspotSourceBounds(definition) {
  if (!Array.isArray(definition.points) || !definition.points.length) {
    return definition;
  }

  const bounds = getHotspotSourceBounds(definition);
  return {
    ...definition,
    left: roundHotspotPercent(bounds.left),
    top: roundHotspotPercent(bounds.top),
    width: roundHotspotPercent(bounds.width),
    height: roundHotspotPercent(bounds.height),
  };
}

function verticallyOverlapsCornerBlende(definition, blende) {
  const top = definition.top;
  const bottom = definition.top + definition.height;
  const blendeTop = blende.top;
  const blendeBottom = blende.top + blende.height;

  return (
    blendeBottom >= top - CORNER_BLENDE_VERTICAL_TOLERANCE &&
    blendeTop <= bottom + CORNER_BLENDE_VERTICAL_TOLERANCE
  );
}

function withCornerBlendeExtensions(definitions) {
  const cornerBlenden = definitions.filter(isCornerBlendeHotspot);
  if (!cornerBlenden.length) return definitions;

  return definitions.map((definition) => {
    if (!canExtendToCornerBlende(definition) || isCornerBlendeHotspot(definition)) {
      return definition;
    }

    let left = definition.left;
    let right = definition.left + definition.width;

    cornerBlenden.forEach((blende) => {
      const blendeLeft = blende.left;
      const blendeRight = blende.left + blende.width;
      if (!verticallyOverlapsCornerBlende(definition, blende)) {
        return;
      }

      if (
        blendeRight >= left - CORNER_BLENDE_EDGE_TOLERANCE &&
        blendeRight <= left + CORNER_BLENDE_EDGE_TOLERANCE
      ) {
        left = Math.min(left, blendeLeft);
      }

      if (
        blendeLeft >= right - CORNER_BLENDE_EDGE_TOLERANCE &&
        blendeLeft <= right + CORNER_BLENDE_EDGE_TOLERANCE
      ) {
        right = Math.max(right, blendeRight);
      }
    });

    const nextLeft = roundHotspotPercent(left);
    const nextWidth = roundHotspotPercent(right - left);
    if (nextLeft === definition.left && nextWidth === definition.width) {
      return definition;
    }

    return {
      ...definition,
      left: nextLeft,
      width: nextWidth,
    };
  });
}

// Base hotspots are measured from the door top down to the cabinet bottom, which sits above
// the plinth/toe-kick. Extend them downward so the whole drawn cabinet—including the kick
// board—is clickable, without re-measuring every kitchen.
function withBasePlinthExtension(definitions, slug) {
  if (BASE_PLINTH_EXTENSION_DISABLED_SLUGS.has(slug)) {
    return definitions;
  }

  const baseBodies = definitions.filter(isBaseBodyHotspot);
  if (!baseBodies.length) return definitions;

  const bodyBottom = Math.max(...baseBodies.map((hotspot) => hotspot.top + hotspot.height));
  const gapToFloor = PLAN_DIMENSION_LINE_PERCENT - bodyBottom;
  if (gapToFloor <= BASE_PLINTH_ALREADY_INCLUDED_GAP) {
    return definitions;
  }

  const targetBottom = Math.min(
    bodyBottom + BASE_PLINTH_EXTENSION_PERCENT,
    PLAN_DIMENSION_LINE_PERCENT - 1,
  );

  return definitions.map((definition) => {
    if (!isBaseBodyHotspot(definition)) {
      return definition;
    }
    const currentBottom = definition.top + definition.height;
    if (currentBottom >= targetBottom - 0.2) {
      return definition;
    }
    return {
      ...definition,
      height: targetBottom - definition.top,
    };
  });
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function getPlanDisplayCrop(hotspots, slug) {
  if (!hotspots.length) {
    return { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };
  }

  const bounds = hotspots.reduce(
    (current, hotspot) => {
      const hotspotBounds = getHotspotSourceBounds(hotspot);
      return {
        left: Math.min(current.left, hotspotBounds.left),
        top: Math.min(current.top, hotspotBounds.top),
        right: Math.max(current.right, hotspotBounds.right),
        bottom: Math.max(current.bottom, hotspotBounds.bottom),
      };
    },
    { left: 100, top: 100, right: 0, bottom: 0 },
  );

  // Hotspots hug cabinet bodies; the CAD frame, end panels, and fridge alcove often extend
  // beyond them. Pull the crop toward the page edges when there is still margin left.
  const trailingX = 100 - bounds.right;
  const trailingY = 100 - bounds.bottom;
  const leadingX = bounds.left;
  const leadingY = bounds.top;
  const cropTuning = PLAN_DISPLAY_CROP_TUNING_BY_SLUG[slug] || {};

  const left = clampPercent(bounds.left - Math.max(2.6, leadingX * 0.6));
  const top = clampPercent(bounds.top - Math.max(4, leadingY * 0.5));
  const right = clampPercent(Math.min(99.5, bounds.right + Math.max(3.2, trailingX * 0.92)));
  const bottomPadding = cropTuning.bottomPadding ?? Math.max(1, trailingY * 0.85);
  const bottomLimit = cropTuning.bottomLimit ?? 99.5;
  const bottom = clampPercent(Math.min(bottomLimit, bounds.bottom + bottomPadding));

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(right - left, 1),
    height: Math.max(bottom - top, 1),
  };
}

function cropPlanHotspot(hotspot, crop) {
  const points = Array.isArray(hotspot.points) ? hotspot.points : [];
  if (points.length) {
    const croppedPoints = points.map((point) => [
      (Number(point[0]) - crop.left) / crop.width * 100,
      (Number(point[1]) - crop.top) / crop.height * 100,
    ]);
    const xs = croppedPoints.map((point) => point[0]).filter(Number.isFinite);
    const ys = croppedPoints.map((point) => point[1]).filter(Number.isFinite);
    if (!xs.length || !ys.length) {
      return { ...hotspot, left: 0, top: 0, width: 0, height: 0 };
    }

    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const right = Math.max(...xs);
    const bottom = Math.max(...ys);
    const width = Math.max(right - left, 0);
    const height = Math.max(bottom - top, 0);
    const clipPathPoints = croppedPoints
      .map(([x, y]) => {
        const localX = width > 0 ? (x - left) / width * 100 : 0;
        const localY = height > 0 ? (y - top) / height * 100 : 0;
        return `${roundHotspotPercent(localX)}% ${roundHotspotPercent(localY)}%`;
      })
      .join(", ");

    return {
      ...hotspot,
      left,
      top,
      width,
      height,
      clipPath: `polygon(${clipPathPoints})`,
    };
  }

  const left = Math.max(hotspot.left, crop.left);
  const top = Math.max(hotspot.top, crop.top);
  const right = Math.min(hotspot.left + hotspot.width, crop.right);
  const bottom = Math.min(hotspot.top + hotspot.height, crop.bottom);

  return {
    ...hotspot,
    left: (left - crop.left) / crop.width * 100,
    top: (top - crop.top) / crop.height * 100,
    width: Math.max(right - left, 0) / crop.width * 100,
    height: Math.max(bottom - top, 0) / crop.height * 100,
  };
}

// The sink (faucet + waste) is always part of the default configuration and usually sits on
// the worktop directly above the sink base. Derive a consistent fallback box for those plans,
// while allowing manually calibrated hotspots when the visible bowl/faucet is offset.
function withDerivedSinkFaucet(definitions, components) {
  if (!definitions.length) return definitions;
  const hasFaucetComponent = components.some(
    (item) => String(item?.componentKey || "").toLowerCase() === "sink-faucet",
  );
  if (!hasFaucetComponent) return definitions;

  const sinkBase = definitions.find((definition) => definition.componentKey === "sink-base");
  const worktop = definitions.find((definition) => definition.componentKey === "worktop");
  if (!sinkBase || !worktop) return definitions;

  const existingFaucet = definitions.find((definition) => definition.componentKey === "sink-faucet");
  if (existingFaucet?.preserveManualSize) {
    return definitions;
  }

  const width = Math.max(4.6, Math.min(sinkBase.width * 0.34, 5.1));
  const height = 8;
  const center = existingFaucet
    ? existingFaucet.left + existingFaucet.width / 2
    : sinkBase.left + sinkBase.width / 2;
  const faucet = {
    componentKey: "sink-faucet",
    left: center - width / 2,
    top: worktop.top - height,
    width,
    height,
  };
  return [
    ...definitions.filter((definition) => definition.componentKey !== "sink-faucet"),
    faucet,
  ];
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
    const sourceDefinitions = (IMAGE_HOTSPOTS_BY_SLUG[normalizedKitchenSlug] || [])
      .map(withHotspotSourceBounds);
    const definitions = withBasePlinthExtension(
      withCornerBlendeExtensions(
        withDerivedSinkFaucet(
          sourceDefinitions,
          kitchenConfig.components,
        ),
      ),
      normalizedKitchenSlug,
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
  const planDisplayCrop = useMemo(
    () => getPlanDisplayCrop(imageHotspots, normalizedKitchenSlug),
    [imageHotspots, normalizedKitchenSlug],
  );
  const croppedImageHotspots = useMemo(
    () =>
      imageHotspots
        .map((hotspot) => cropPlanHotspot(hotspot, planDisplayCrop))
        .filter((hotspot) => hotspot.width > 0 && hotspot.height > 0),
    [imageHotspots, planDisplayCrop],
  );
  const croppedPlanAspectRatio =
    `${planDisplayCrop.width * PLAN_IMAGE_SOURCE_WIDTH} / ${planDisplayCrop.height * PLAN_IMAGE_SOURCE_HEIGHT}`;
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
                <div
                  className={styles.planImageWrap}
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
                  />
                  <div className={styles.planHotspotLayer}>
                    {croppedImageHotspots.map((hotspot) => {
                      const isLocked = fixedComponentIds.includes(hotspot.componentId);
                      // Linked parts (e.g. the hood cabinet + its pull-out hood) toggle together,
                      // but the hidden partner isn't persisted on its own. Mirror the group's
                      // selection so both stay highlighted after a refresh.
                      const linkedIds = getLinkedComponentIds(kitchenSlug, hotspot.componentId);
                      const isSelected =
                        isLocked || linkedIds.some((linkedId) => selectedComponentIds.includes(linkedId));
                      const isGroupHovered = hoveredLinkedGroup.includes(hotspot.componentId);
                      const hotspotStyle = {
                        left: `${hotspot.left}%`,
                        top: `${hotspot.top}%`,
                        width: `${hotspot.width}%`,
                        height: `${hotspot.height}%`,
                        zIndex: hotspot.componentKey === "sink-faucet" ? 10 : 1,
                      };
                      if (hotspot.clipPath) {
                        hotspotStyle.clipPath = hotspot.clipPath;
                        hotspotStyle.WebkitClipPath = hotspot.clipPath;
                        hotspotStyle.borderRadius = 0;
                      }
                      const isPolygonHotspot = Boolean(hotspot.clipPath);
                      return (
                        <button
                          key={`${hotspot.componentId}-${hotspot.left}-${hotspot.top}-${hotspot.width}-${hotspot.height}`}
                          type="button"
                          className={[
                            styles.planHotspot,
                            isPolygonHotspot ? styles.planHotspotPolygon : "",
                            isGroupHovered ? styles.planHotspotHover : "",
                            isSelected ? styles.planHotspotSelected : "",
                            isLocked ? styles.planHotspotLocked : "",
                            isCalibrating ? styles.planHotspotCalibrate : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={hotspotStyle}
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

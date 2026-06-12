export const PLAN_VIEWPORT_BY_SLUG = {
  "kitchen-model-c": {
    viewBox: "70 140 720 320",
    preserveAspectRatio: "xMidYMid meet",
    canvasClassName: "wide",
  },
  "l-shaped-kitchen": {
    viewBox: "60 45 600 450",
    preserveAspectRatio: "xMidYMid meet",
  },
};

const BASE_PLAN_STROKE = "#8f877d";
const SELECTED_PLAN_STROKE = "#000000";
const OVERLAY_SELECTED_STROKE = "#2a9155";
const SELECTED_MUTED_APPLIANCE_STROKE = "#374151";
const DISHWASHER_INTERNAL_ICON_IDLE_STROKE = "#e2dfdf";
const TEST_3D_PLAN_STROKE = "#e9eeeb";
const TEST_3D_SELECTED_PLAN_STROKE = "#ffffff";

const PLAN_COMPONENT_BOUNDS = {
  "component-wall-cabinet-1": { x: 239, y: 214, width: 84, height: 118 },
  "component-wall-cabinet-2": { x: 322, y: 214, width: 84, height: 118 },
  "component-wall-cabinet-3": { x: 405, y: 214, width: 84, height: 118 },
  "component-wall-cabinet-4": { x: 488, y: 214, width: 84, height: 118 },
  "component-wall-cabinet-5": { x: 571, y: 214, width: 84, height: 118 },
  "component-extractor-hood": { x: 488, y: 314, width: 84, height: 14 },
  "component-under-cabinet-light": { x: 270, y: 319, width: 287, height: 18 },
  "component-base-module-1": { x: 237, y: 393, width: 86, height: 127 },
  "component-base-module-2": { x: 322, y: 393, width: 84, height: 127 },
  "component-base-module-3": { x: 405, y: 393, width: 84, height: 127 },
  "component-oven-module": { x: 488, y: 393, width: 84, height: 127 },
  "component-drawer-module": { x: 571, y: 393, width: 84, height: 127 },
  "component-refrigerator": { x: 670, y: 270, width: 76, height: 250 },
  "component-sink-faucet": { x: 374, y: 364, width: 10, height: 29 },
  "component-worktop": { x: 236, y: 392, width: 421, height: 7 },
  "component-t3d-wall-1": { x: 132, y: 68, width: 92, height: 140 },
  "component-t3d-wall-2": { x: 198, y: 68, width: 92, height: 140 },
  "component-t3d-wall-3": { x: 264, y: 68, width: 92, height: 140 },
  "component-t3d-wall-4": { x: 330, y: 68, width: 92, height: 140 },
  "component-t3d-wall-5": { x: 396, y: 68, width: 92, height: 140 },
  "component-t3d-light": { x: 170, y: 235, width: 276, height: 37 },
  "component-t3d-hood": { x: 414, y: 258, width: 70, height: 36 },
  "component-t3d-washer": { x: 92, y: 350, width: 88, height: 132 },
  "component-t3d-sink-base": { x: 180, y: 350, width: 88, height: 132 },
  "component-t3d-dishwasher": { x: 268, y: 350, width: 88, height: 132 },
  "component-t3d-oven": { x: 356, y: 350, width: 88, height: 132 },
  "component-t3d-storage": { x: 444, y: 350, width: 92, height: 132 },
  "component-t3d-worktop-main": { x: 92, y: 304, width: 474, height: 46 },
  "component-t3d-sink": { x: 188, y: 276, width: 98, height: 58 },
  "component-t3d-corner": { x: 536, y: 270, width: 84, height: 80 },
  "component-t3d-base": { x: 620, y: 270, width: 84, height: 80 },
  "component-t3d-drawers": { x: 704, y: 270, width: 84, height: 80 },
  "component-t3d-worktop-return": { x: 536, y: 224, width: 282, height: 46 },
};

function getPlanBounds(group, componentId) {
  if (group && typeof group.getBBox === "function") {
    const box = group.getBBox();
    if (box && box.width > 0 && box.height > 0) {
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }
  }
  return PLAN_COMPONENT_BOUNDS[componentId] || null;
}

const L_SHAPED_PLAN_COMPONENT_BOUNDS = {
  "component-wall-cabinet-1": { x: 176, y: 126, width: 76, height: 125 },
  "component-wall-cabinet-2": { x: 227, y: 111, width: 102, height: 153 },
  "component-wall-cabinet-3": { x: 304, y: 98, width: 88, height: 127 },
  "component-wall-cabinet-4": { x: 368, y: 83, width: 107, height: 130 },
  "component-under-cabinet-light": { x: 329, y: 246, width: 70, height: 42 },
  "component-refrigerator": { x: 77, y: 183, width: 114, height: 287 },
  "component-worktop": { x: 156, y: 237, width: 459, height: 92 },
  "component-base-module-1": { x: 200, y: 318, width: 53, height: 122 },
  "component-oven-base": { x: 253, y: 318, width: 77, height: 122 },
  "component-base-module-2": { x: 330, y: 303, width: 71, height: 122 },
  "component-corner-base": { x: 401, y: 289, width: 115, height: 95 },
  "component-base-module-3": { x: 401, y: 317, width: 115, height: 155 },
  "component-dishwasher-base": { x: 440, y: 320, width: 50, height: 143 },
  "component-drawer-base": { x: 516, y: 337, width: 50, height: 125 },
};

const L_SHAPED_PLAN_COMPONENT_SHAPES = {
  "component-wall-cabinet-1": "M176 136 L227 126 L252 140 L201 151 Z M176 136 L201 151 L201 251 L176 236 Z M201 151 L252 140 L252 240 L201 251 Z",
  "component-wall-cabinet-2": "M227 126 L304 111 L329 125 L252 140 Z M252 140 L329 125 L329 225 L252 240 Z M260 242 L284 242 L284 264 L260 264 Z M299 235 L323 235 L323 257 L299 257 Z",
  "component-wall-cabinet-3": "M304 111 L368 98 L392 112 L329 125 Z M329 125 L392 112 L392 213 L329 225 Z",
  "component-wall-cabinet-4": "M368 98 L445 83 L469 97 L392 112 Z M392 112 L469 97 L469 198 L392 213 Z M469 97 L475 96 L475 196 L469 198 Z",
  "component-under-cabinet-light": "M329 276 L399 263 L399 282 L329 296 Z",
  "component-refrigerator": "M77.9 197.48 L148.52 183.53 L190.52 208.53 L190.52 455.98 L119.47 470.02 L77.47 445.02 Z",
  "component-worktop": "M156 296 L356 257 L516 351 L615 332 L456 237 L356 257 L156 296 Z M156 329 L400 281 L516 350 L566 341 L330 388 Z",
  "component-base-module-1": "M202 328 L253 318 L253 440 L202 450 Z",
  "component-oven-base": "M253 346 L330 331 L330 425 L253 439 Z",
  "component-base-module-2": "M329 303 L401 289 L401 317 L330 331 Z M330 331 L401 317 L401 411 L330 425 Z",
  "component-corner-base": "M401 317 L516 294 L566 323 L516 351 L401 375 Z",
  "component-base-module-3": "M401 317 L516 294 L566 323 L566 462 L516 472 L401 411 Z",
  "component-dishwasher-base": "M445 315 L489 341 L489 463 L445 437 Z M445 315 L440 320 L440 338 L445 341 Z M459 338 L475 347 L475 349 L459 340 Z",
  "component-drawer-base": "M516 351 L566 341 L566 462 L516 472 Z",
};

const L_SHAPED_PLAN_COMPONENT_SELECTION_OUTLINE_SHAPES = {
  "component-wall-cabinet-1": "M176 136 L227 126 L252 140 L201 151 Z M176 136 L201 151 L201 251 L176 236 Z M201 151 L252 140 L252 240 L201 251 Z",
  "component-wall-cabinet-2": "M227 126 L304 111 L329 125 L252 140 Z M252 140 L329 125 L329 225 L252 240 Z",
  "component-wall-cabinet-3": "M304 111 L368 98 L392 112 L329 125 Z M329 125 L392 112 L392 213 L329 225 Z",
  "component-wall-cabinet-4": "M368 98 L445 83 L469 97 L392 112 Z M392 112 L469 97 L469 198 L392 213 Z M469 97 L475 96 L475 196 L469 198 Z",
};

const L_SHAPED_HOOD_CABINET_DETAIL_PATHS = new Set([
  "M251.11 246.97L251.11 240.03Z",
  "M251.11 240.03L251.11 246.97Z",
]);

const L_SHAPED_SINK_FAUCET_COMPONENT_ID = "component-sink-faucet";
const L_SHAPED_SINK_FAUCET_DETAIL_GROUP_IDS = [
  "detail-component-wall-cabinet-3-lower",
  "detail-component-wall-cabinet-4-lower",
];
const L_SHAPED_SINK_FAUCET_WALL_CABINET_PATHS = new Set([
  "M465.86 265.55L464.61 252.58",
  "M468.78 252.16L470.11 265.58",
]);
const L_SHAPED_DEFAULT_SELECTED_CORNER_DETAIL_PATHS = new Set([
  "M511.39 354.37L515.37 356.73",
]);
const L_SHAPED_SP60L_HANDLE_DETAIL_PATHS = new Set([
  "M495.69 355.01L495.69 353.75Z",
  "M495.69 353.75L504.95 359.24",
  "M504.95 359.24L504.95 360.5Z",
  "M504.95 360.5L495.69 355.01",
]);
const L_SHAPED_DISHWASHER_INTERNAL_ICON_BOUNDS = [
  { minX: 446, minY: 354, maxX: 490, maxY: 409 },
  { minX: 463, minY: 409, maxX: 472, maxY: 430 },
];
const L_SHAPED_SINK_FAUCET_DETAIL_BOUNDS = {
  minX: 400,
  minY: 248,
  maxX: 540,
  maxY: 329,
};

function getPlanBoundsForSlug(slug, componentId) {
  if (slug === "l-shaped-kitchen") {
    return L_SHAPED_PLAN_COMPONENT_BOUNDS[componentId] || PLAN_COMPONENT_BOUNDS[componentId] || null;
  }
  return PLAN_COMPONENT_BOUNDS[componentId] || null;
}

function getPlanShapeForSlug(slug, componentId) {
  if (slug === "l-shaped-kitchen") {
    return L_SHAPED_PLAN_COMPONENT_SHAPES[componentId] || "";
  }
  return "";
}

function getPlanSelectionOutlineShapeForSlug(slug, componentId) {
  if (slug === "l-shaped-kitchen") {
    return L_SHAPED_PLAN_COMPONENT_SELECTION_OUTLINE_SHAPES[componentId] || getPlanShapeForSlug(slug, componentId);
  }
  return getPlanShapeForSlug(slug, componentId);
}

function shouldUseSelectionOutline(slug, componentId, selectionMode) {
  if (selectionMode === "outline") {
    return true;
  }

  return slug === "l-shaped-kitchen" && componentId.startsWith("component-wall-cabinet-");
}

function cleanupPlanInteractionOverlays(svg, slug) {
  if (!svg) return;

  svg.querySelectorAll(".component-hitbox").forEach((element) => {
    element.setAttribute("fill", "transparent");
    element.setAttribute("stroke", "none");
    element.setAttribute("stroke-width", "0");
    element.setAttribute("opacity", "0");
    element.style.setProperty("fill", "transparent", "important");
    element.style.setProperty("stroke", "transparent", "important");
    element.style.setProperty("stroke-width", "0px", "important");
    element.style.setProperty("opacity", "0", "important");
  });

  if (slug !== "l-shaped-kitchen") return;

  svg.querySelectorAll("[data-component-id]").forEach((group) => {
    group.style.setProperty("outline", "none", "important");
  });

  svg.querySelectorAll(".component-selection-outline").forEach((element) => {
    const componentId = element.closest("[data-component-id]")?.getAttribute("data-component-id") || "";
    if (!componentId.startsWith("component-wall-cabinet-")) {
      element.remove();
    }
  });
}

function applyLShapedDefaultSelectedDetailStyles(svg, lockedComponentIds, selectedComponentIds = []) {
  if (!svg) return;

  const hasLockedSinkFaucet = lockedComponentIds.includes(L_SHAPED_SINK_FAUCET_COMPONENT_ID);
  const hasLockedCornerBase = lockedComponentIds.includes("component-corner-base");
  const hasSelectedSp60l = selectedComponentIds.includes("component-base-module-3");

  svg.querySelectorAll("path").forEach((element) => {
    const pathData = element.getAttribute("d") || "";

    if (hasSelectedSp60l && L_SHAPED_SP60L_HANDLE_DETAIL_PATHS.has(pathData)) {
      element.style.setProperty("fill", "none", "important");
      element.style.setProperty("stroke", SELECTED_PLAN_STROKE, "important");
      element.style.setProperty("stroke-width", "3.2px", "important");
      element.style.setProperty("vector-effect", "non-scaling-stroke", "important");
      return;
    }

    if (hasLockedCornerBase && L_SHAPED_SP60L_HANDLE_DETAIL_PATHS.has(pathData)) {
      element.style.setProperty("fill", "none", "important");
      element.style.setProperty("stroke", BASE_PLAN_STROKE, "important");
      element.style.setProperty("stroke-width", "0.5px", "important");
      element.style.setProperty("vector-effect", "non-scaling-stroke", "important");
      return;
    }

    const shouldUseSelectedStyle =
      (hasLockedSinkFaucet && L_SHAPED_SINK_FAUCET_WALL_CABINET_PATHS.has(pathData)) ||
      (hasLockedCornerBase && L_SHAPED_DEFAULT_SELECTED_CORNER_DETAIL_PATHS.has(pathData));

    if (!shouldUseSelectedStyle) return;

    element.style.setProperty("fill", "none", "important");
    element.style.setProperty("stroke", SELECTED_PLAN_STROKE, "important");
    element.style.setProperty("stroke-width", "3.2px", "important");
    element.style.setProperty("vector-effect", "non-scaling-stroke", "important");
  });
}

function getSvgPathCoordinateBounds(pathData) {
  const values = String(pathData || "")
    .match(/-?\d+(?:\.\d+)?/g)
    ?.map((value) => Number(value));

  if (!values || values.length < 2) return null;

  const box = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };

  for (let index = 0; index + 1 < values.length; index += 2) {
    const x = values[index];
    const y = values[index + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    box.minX = Math.min(box.minX, x);
    box.minY = Math.min(box.minY, y);
    box.maxX = Math.max(box.maxX, x);
    box.maxY = Math.max(box.maxY, y);
  }

  if (!Number.isFinite(box.minX) || !Number.isFinite(box.minY)) return null;
  return box;
}

function isWithinBounds(box, bounds) {
  return (
    box &&
    box.minX >= bounds.minX &&
    box.minY >= bounds.minY &&
    box.maxX <= bounds.maxX &&
    box.maxY <= bounds.maxY
  );
}

function getOrCreateLShapedSinkFaucetGroup(svg) {
  let group = svg.querySelector(`[data-component-id="${L_SHAPED_SINK_FAUCET_COMPONENT_ID}"]`);
  if (group) {
    group.dataset.selectionMode = "cad-linework";
    group.classList.add("kitchen-component");
    return group;
  }

  group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.id = "layer-component-sink-faucet";
  group.dataset.componentId = L_SHAPED_SINK_FAUCET_COMPONENT_ID;
  group.dataset.layerName = "BLANCO sink and tap selected detail";
  group.dataset.selectionMode = "cad-linework";
  group.classList.add("kitchen-component");
  svg.appendChild(group);
  return group;
}

function normalizePlanComponentOwnership(svg, slug) {
  if (slug !== "l-shaped-kitchen") return;

  const leftCabinet = svg.querySelector('[data-component-id="component-wall-cabinet-1"]');
  const hoodCabinet = svg.querySelector('[data-component-id="component-wall-cabinet-2"]');
  if (!leftCabinet || !hoodCabinet) return;

  leftCabinet.querySelectorAll("path").forEach((element) => {
    if (L_SHAPED_HOOD_CABINET_DETAIL_PATHS.has(element.getAttribute("d") || "")) {
      hoodCabinet.appendChild(element);
    }
  });

  const sinkFaucet = getOrCreateLShapedSinkFaucetGroup(svg);

  svg.querySelectorAll('[data-component-id="component-wall-cabinet-4"] path').forEach((element) => {
    if (L_SHAPED_SINK_FAUCET_WALL_CABINET_PATHS.has(element.getAttribute("d") || "")) {
      sinkFaucet.appendChild(element);
    }
  });

  L_SHAPED_SINK_FAUCET_DETAIL_GROUP_IDS.forEach((groupId) => {
    const detailGroup = svg.querySelector(`#${groupId}`);
    if (detailGroup && detailGroup.parentNode !== sinkFaucet) {
      sinkFaucet.appendChild(detailGroup);
    }
  });

  const worktopDetailGroup = svg.querySelector("#detail-component-worktop-drawing");
  worktopDetailGroup?.querySelectorAll("path").forEach((element) => {
    const box = getSvgPathCoordinateBounds(element.getAttribute("d"));
    if (isWithinBounds(box, L_SHAPED_SINK_FAUCET_DETAIL_BOUNDS)) {
      sinkFaucet.appendChild(element);
    }
  });
}

function createRect(namespace, className, box, padding) {
  const rect = document.createElementNS(namespace, "rect");
  rect.classList.add(className);
  rect.setAttribute("x", String(box.x - padding));
  rect.setAttribute("y", String(box.y - padding));
  rect.setAttribute("width", String(box.width + padding * 2));
  rect.setAttribute("height", String(box.height + padding * 2));
  rect.setAttribute("rx", "8");
  rect.setAttribute("ry", "8");
  return rect;
}

function createShapeElement(namespace, className, shapePath, box, padding) {
  if (shapePath) {
    const path = document.createElementNS(namespace, "path");
    path.classList.add(className);
    path.setAttribute("d", shapePath);
    return path;
  }
  return createRect(namespace, className, box, padding);
}

export function applyPlanViewportToMarkup(markup, slug) {
  const viewport = PLAN_VIEWPORT_BY_SLUG[slug];
  if (!viewport || !markup) return markup;

  return markup.replace(/<svg\b([^>]*)>/i, (match, attributes) => {
    let nextAttributes = attributes;

    if (/\bviewBox\s*=\s*["'][^"']*["']/i.test(nextAttributes)) {
      nextAttributes = nextAttributes.replace(/\bviewBox\s*=\s*["'][^"']*["']/i, `viewBox="${viewport.viewBox}"`);
    } else {
      nextAttributes += ` viewBox="${viewport.viewBox}"`;
    }

    if (viewport.preserveAspectRatio) {
      if (/\bpreserveAspectRatio\s*=\s*["'][^"']*["']/i.test(nextAttributes)) {
        nextAttributes = nextAttributes.replace(
          /\bpreserveAspectRatio\s*=\s*["'][^"']*["']/i,
          `preserveAspectRatio="${viewport.preserveAspectRatio}"`,
        );
      } else {
        nextAttributes += ` preserveAspectRatio="${viewport.preserveAspectRatio}"`;
      }
    }

    return `<svg${nextAttributes}>`;
  });
}

function getInheritedSvgAttribute(element, attributeName, stopAt) {
  let current = element;

  while (current && current !== stopAt) {
    const value = current.getAttribute?.(attributeName);
    if (value != null && value !== "") {
      return value;
    }
    current = current.parentElement;
  }

  return "";
}

function isPreservedDetailStroke(stroke) {
  const normalized = String(stroke || "").trim().toLowerCase();
  return ["#ccc", "#cccccc", "#666", "#666666", "gray", "grey"].includes(normalized);
}

function isMutedApplianceLabel(element) {
  if (!element || element.tagName !== "text") return false;
  const label = (element.textContent || "").trim().toUpperCase();
  return label === "WM" || label === "GS";
}

function isMutedApplianceBadgeElement(group, element) {
  const componentId = group?.dataset?.componentId || "";
  if (
    componentId !== "component-base-module-1" &&
    componentId !== "component-base-module-3" &&
    componentId !== "component-wm-base" &&
    componentId !== "component-dishwasher-base"
  ) {
    return false;
  }

  if (element.tagName === "text") {
    return isMutedApplianceLabel(element);
  }

  if (typeof element.getBBox !== "function" || typeof group.getBBox !== "function") {
    return false;
  }

  const elementBox = element.getBBox();
  const groupBox = group.getBBox();
  if (!elementBox || !groupBox) {
    return false;
  }

  const inBottomBadgeZone = elementBox.y >= groupBox.y + groupBox.height * 0.64;
  const isSmallBadgeShape = elementBox.width <= 18 && elementBox.height <= 18;
  return inBottomBadgeZone && isSmallBadgeShape;
}

function isWithinCoordinateBounds(bounds, zone) {
  return (
    bounds &&
    bounds.minX >= zone.minX &&
    bounds.maxX <= zone.maxX &&
    bounds.minY >= zone.minY &&
    bounds.maxY <= zone.maxY
  );
}

function isLShapedDishwasherInternalIconElement(group, element) {
  const tagName = String(element?.localName || element?.tagName || "").toLowerCase();
  if (group?.dataset?.componentId !== "component-dishwasher-base" || tagName !== "path") {
    return false;
  }

  const bounds = getSvgPathCoordinateBounds(element.getAttribute("d") || "");
  return L_SHAPED_DISHWASHER_INTERNAL_ICON_BOUNDS.some((zone) => isWithinCoordinateBounds(bounds, zone));
}

function applyLShapedDishwasherInternalIconStyles(svg, selectedComponentIds = []) {
  if (!svg || !selectedComponentIds.includes("component-dishwasher-base")) return;

  const dishwasherGroup = svg.querySelector('[data-component-id="component-dishwasher-base"]');
  if (!dishwasherGroup) return;

  dishwasherGroup.querySelectorAll("path").forEach((element) => {
    if (!isLShapedDishwasherInternalIconElement(dishwasherGroup, element)) return;

    element.style.setProperty("fill", "none", "important");
    element.style.setProperty("stroke", SELECTED_MUTED_APPLIANCE_STROKE, "important");
    element.style.setProperty("stroke-width", "0.5px", "important");
    element.style.setProperty("vector-effect", "non-scaling-stroke", "important");
  });
}

function bringLShapedRefrigeratorForward(svg, slug) {
  if (slug !== "l-shaped-kitchen") return;

  const refrigeratorGroup = svg?.querySelector('[data-component-id="component-refrigerator"]');
  if (refrigeratorGroup?.parentNode) {
    refrigeratorGroup.parentNode.appendChild(refrigeratorGroup);
  }
}

function isApplianceDetailElement(group, element) {
  const componentId = group?.dataset?.componentId || "";
  if (
    componentId !== "component-base-module-1" &&
    componentId !== "component-base-module-3" &&
    componentId !== "component-wm-base" &&
    componentId !== "component-dishwasher-base"
  ) {
    return false;
  }

  if (isMutedApplianceBadgeElement(group, element)) {
    return true;
  }

  if (isLShapedDishwasherInternalIconElement(group, element)) {
    return true;
  }

  if (typeof element.getBBox !== "function" || typeof group.getBBox !== "function") {
    return false;
  }

  const elementBox = element.getBBox();
  const groupBox = group.getBBox();
  if (!elementBox || !groupBox || groupBox.width <= 0 || groupBox.height <= 0) {
    return false;
  }

  const relativeWidth = elementBox.width / groupBox.width;
  const relativeHeight = elementBox.height / groupBox.height;
  const isInsideBody =
    elementBox.y >= groupBox.y + groupBox.height * 0.18 &&
    elementBox.y + elementBox.height <= groupBox.y + groupBox.height * 0.82;

  return isInsideBody && relativeWidth <= 0.72 && relativeHeight <= 0.42;
}

export function applyGroupVisualState(group, { selected, locked }) {
  if (!group) return;

  const isActive = selected || locked;
  const componentId = group.getAttribute("data-component-id") || "";
  const isTest3dComponent = componentId.startsWith("component-t3d-");
  const emphasisStroke = isTest3dComponent
    ? isActive
      ? TEST_3D_SELECTED_PLAN_STROKE
      : TEST_3D_PLAN_STROKE
    : isActive
      ? SELECTED_PLAN_STROKE
      : BASE_PLAN_STROKE;
  const emphasisWidth = isActive ? (isTest3dComponent ? "1.8" : "3.2") : "";

  group.style.setProperty("opacity", "1", "important");
  group.style.setProperty("filter", "none", "important");

  const selectionMode = group.dataset.selectionMode || "";
  const useOutlineOnlySelection = selectionMode === "outline";
  const useCadLineworkSelection = selectionMode === "cad-linework";
  const useHitboxOnlySelection = selectionMode === "hitbox-only";

  group.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse,text").forEach((element) => {
    if (element.classList.contains("component-hitbox")) {
      element.style.setProperty("fill", "transparent", "important");
      element.style.setProperty("stroke", "transparent", "important");
      element.style.setProperty("stroke-width", "0px", "important");
      element.style.setProperty("opacity", "0", "important");
      return;
    }

    if (element.classList.contains("component-selection-outline")) {
      const isOverlaySelection = group.classList.contains("kitchen-component-overlay");
      element.style.setProperty("fill", "none", "important");
      element.style.setProperty(
        "stroke",
        isActive ? (isOverlaySelection ? OVERLAY_SELECTED_STROKE : SELECTED_PLAN_STROKE) : "transparent",
        "important",
      );
      element.style.setProperty("stroke-width", isActive ? (isOverlaySelection ? "1.4px" : "2.2px") : "0px", "important");
      element.style.setProperty("vector-effect", "non-scaling-stroke", "important");
      element.style.setProperty("pointer-events", "none", "important");
      return;
    }

    if (!element.dataset.originalStroke) {
      element.dataset.originalStroke = getInheritedSvgAttribute(element, "stroke", group) || "";
    }
    if (!element.dataset.originalStrokeWidth) {
      element.dataset.originalStrokeWidth = getInheritedSvgAttribute(element, "stroke-width", group) || "0.5";
    }
    if (!element.dataset.originalFill) {
      element.dataset.originalFill = getInheritedSvgAttribute(element, "fill", group) || "";
    }

    if (isLShapedDishwasherInternalIconElement(group, element)) {
      element.style.setProperty(
        "stroke",
        isActive ? SELECTED_MUTED_APPLIANCE_STROKE : DISHWASHER_INTERNAL_ICON_IDLE_STROKE,
        "important",
      );
      element.style.setProperty("stroke-width", `${element.dataset.originalStrokeWidth}px`, "important");
      element.style.setProperty("vector-effect", "non-scaling-stroke", "important");
      if (element.dataset.originalFill) {
        element.style.setProperty("fill", element.dataset.originalFill, "important");
      }
      return;
    }

    if (useOutlineOnlySelection || useHitboxOnlySelection) {
      const hasOriginalStroke = element.dataset.originalStroke && element.dataset.originalStroke !== "none";
      const selectedHitboxStrokeWidth = useHitboxOnlySelection && isActive && hasOriginalStroke ? "3.2px" : "";
      const hitboxOnlyStroke =
        useHitboxOnlySelection && hasOriginalStroke
          ? isActive
            ? SELECTED_PLAN_STROKE
            : BASE_PLAN_STROKE
          : element.dataset.originalStroke || "none";
      element.style.setProperty(
        "stroke",
        hitboxOnlyStroke,
        "important",
      );
      element.style.setProperty(
        "stroke-width",
        selectedHitboxStrokeWidth || `${element.dataset.originalStrokeWidth}px`,
        "important",
      );
      element.style.setProperty("vector-effect", "non-scaling-stroke", "important");
      if (element.tagName === "text") {
        element.style.setProperty("fill", element.dataset.originalFill || BASE_PLAN_STROKE, "important");
      } else if (element.dataset.originalFill && element.dataset.originalFill !== "none") {
        element.style.setProperty("fill", element.dataset.originalFill, "important");
      } else {
        element.style.setProperty("fill", "none", "important");
      }
      return;
    }

    if (isMutedApplianceBadgeElement(group, element)) {
      element.style.setProperty("stroke", isActive ? SELECTED_MUTED_APPLIANCE_STROKE : BASE_PLAN_STROKE, "important");
      element.style.setProperty("stroke-width", `${element.dataset.originalStrokeWidth}px`, "important");
      element.style.setProperty("vector-effect", "non-scaling-stroke", "important");
      if (element.tagName === "text") {
        element.style.setProperty("fill", isActive ? SELECTED_MUTED_APPLIANCE_STROKE : BASE_PLAN_STROKE, "important");
      } else if (element.dataset.originalFill) {
        element.style.setProperty("fill", element.dataset.originalFill, "important");
      }
      return;
    }

    const preserveOriginalStroke =
      element.dataset.originalStroke &&
      element.dataset.originalStroke !== "none" &&
      isPreservedDetailStroke(element.dataset.originalStroke);
    const preserveOriginalStrokeWidth = isApplianceDetailElement(group, element);
    const applianceDetailStroke = preserveOriginalStrokeWidth && isActive ? SELECTED_MUTED_APPLIANCE_STROKE : "";
    const cadLineworkStrokeWidth =
      useCadLineworkSelection && isActive
        ? String(Number.parseFloat(element.dataset.originalStrokeWidth || "0.5") || 0.5)
        : "";

    element.style.setProperty(
      "stroke",
      applianceDetailStroke
        ? applianceDetailStroke
        : element.dataset.originalStroke === "none"
        ? "none"
        : preserveOriginalStroke
          ? element.dataset.originalStroke
          : emphasisStroke,
      "important",
    );
    element.style.setProperty(
      "stroke-width",
      cadLineworkStrokeWidth
        ? `${cadLineworkStrokeWidth}px`
        : preserveOriginalStrokeWidth
        ? `${element.dataset.originalStrokeWidth}px`
        : emphasisWidth || `${element.dataset.originalStrokeWidth}px`,
      "important",
    );
    element.style.setProperty("vector-effect", "non-scaling-stroke", "important");

    if (element.tagName === "text") {
      element.style.setProperty(
        "fill",
        isTest3dComponent
          ? TEST_3D_PLAN_STROKE
          : isMutedApplianceLabel(element)
            ? BASE_PLAN_STROKE
            : isActive
              ? SELECTED_PLAN_STROKE
              : BASE_PLAN_STROKE,
        "important",
      );
    } else if (
      isTest3dComponent &&
      element.dataset.originalFill &&
      element.dataset.originalFill !== "none" &&
      element.dataset.originalFill !== "white"
    ) {
      element.style.setProperty("fill", element.dataset.originalFill, "important");
    } else if (element.dataset.originalFill && element.dataset.originalFill !== "none" && element.dataset.originalFill !== "white") {
      element.style.setProperty("fill", isActive ? SELECTED_PLAN_STROKE : BASE_PLAN_STROKE, "important");
    } else if (element.dataset.originalFill) {
      element.style.setProperty("fill", element.dataset.originalFill, "important");
    }
  });
}

export function syncKitchenPlan({
  host,
  svgMarkup,
  planViewport,
  kitchenConfig,
  selectedComponentIds,
  lockedComponentIds,
  visibleComponentIds,
  componentIdForItem,
  normalizeColor,
}) {
  if (!host) return null;

  if (host.innerHTML !== svgMarkup) {
    host.innerHTML = svgMarkup || "";
  }

  const svg = host.querySelector("svg");
  if (!svg) return null;

  if (!svg.dataset.originalViewBox) {
    svg.dataset.originalViewBox = svg.getAttribute("viewBox") || "";
  }
  if (!svg.dataset.originalPreserveAspectRatio) {
    svg.dataset.originalPreserveAspectRatio = svg.getAttribute("preserveAspectRatio") || "";
  }

  if (planViewport?.viewBox) {
    svg.setAttribute("viewBox", planViewport.viewBox);
    if (planViewport.preserveAspectRatio) {
      svg.setAttribute("preserveAspectRatio", planViewport.preserveAspectRatio);
    }
  } else if (svg.dataset.originalViewBox) {
    svg.setAttribute("viewBox", svg.dataset.originalViewBox);
    if (svg.dataset.originalPreserveAspectRatio) {
      svg.setAttribute("preserveAspectRatio", svg.dataset.originalPreserveAspectRatio);
    } else {
      svg.removeAttribute("preserveAspectRatio");
    }
  } else {
    svg.removeAttribute("viewBox");
    if (svg.dataset.originalPreserveAspectRatio) {
      svg.setAttribute("preserveAspectRatio", svg.dataset.originalPreserveAspectRatio);
    } else {
      svg.removeAttribute("preserveAspectRatio");
    }
  }

  const namespace = "http://www.w3.org/2000/svg";
  const byColor = new Map();
  const visibleSet = Array.isArray(visibleComponentIds) ? new Set(visibleComponentIds) : null;
  const useColorGrouping = kitchenConfig.kitchen.slug !== "l-shaped-kitchen";
  if (useColorGrouping) {
    svg.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse").forEach((element) => {
      if (element.closest("[data-component-id]")) return;
      const color = normalizeColor(element.getAttribute("stroke"));
      if (!color) return;
      if (!byColor.has(color)) byColor.set(color, []);
      byColor.get(color).push(element);
    });
  }

  normalizePlanComponentOwnership(svg, kitchenConfig.kitchen.slug);

  for (const item of kitchenConfig.components) {
    const colorKey = normalizeColor(item.colorKey);
    const componentId = componentIdForItem(item);
    if (!componentId) continue;
    let group = svg.querySelector(`[data-component-id="${componentId}"]`);

    if (!group && useColorGrouping && colorKey && byColor.has(colorKey)) {
      const elements = byColor.get(colorKey);
      const firstElement = elements[0];
      const parent = firstElement?.parentNode;
      if (!firstElement || !parent) continue;

      group = document.createElementNS(namespace, "g");
      group.dataset.componentId = componentId;
      parent.insertBefore(group, firstElement);
      elements.forEach((element) => group.appendChild(element));
    }

    if (!group) {
      const box = getPlanBoundsForSlug(kitchenConfig.kitchen.slug, componentId);
      if (!box) continue;

      group = document.createElementNS(namespace, "g");
      group.dataset.componentId = componentId;
      group.dataset.selectionMode = "outline";
      group.classList.add("kitchen-component", "kitchen-component-overlay");
      svg.appendChild(group);
    }

    if (visibleSet && !visibleSet.has(componentId)) {
      group.style.setProperty("display", "none", "important");
      group.querySelectorAll(".component-hitbox").forEach((element) => element.remove());
      group.querySelectorAll(".component-selection-outline").forEach((element) => element.remove());
      continue;
    }

    group.style.removeProperty("display");
    group.classList.add("kitchen-component");
    if (kitchenConfig.kitchen.slug === "l-shaped-kitchen") {
      group.dataset.selectionMode = "hitbox-only";
    }
    if (item.code) {
      group.dataset.componentCode = item.code;
    }
    if (item.name && !group.querySelector(":scope > title")) {
      const title = document.createElementNS(namespace, "title");
      title.textContent = item.name;
      group.insertBefore(title, group.firstChild);
    }
    const existingHitbox = group.querySelector(".component-hitbox");

    if (!existingHitbox) {
      const box =
        kitchenConfig.kitchen.slug === "l-shaped-kitchen"
          ? getPlanBoundsForSlug(kitchenConfig.kitchen.slug, componentId)
          : getPlanBounds(group, componentId) || getPlanBoundsForSlug(kitchenConfig.kitchen.slug, componentId);
      if (box) {
        const shapePath = getPlanShapeForSlug(kitchenConfig.kitchen.slug, componentId);
        const hitbox = createShapeElement(namespace, "component-hitbox", shapePath, box, 6);
        hitbox.setAttribute("fill", "transparent");
        hitbox.setAttribute("stroke", "none");
        hitbox.setAttribute("stroke-width", "0");
        hitbox.setAttribute("opacity", "0");
        hitbox.setAttribute("pointer-events", "all");
        hitbox.style.setProperty("fill", "transparent", "important");
        hitbox.style.setProperty("stroke", "transparent", "important");
        hitbox.style.setProperty("stroke-width", "0px", "important");
        hitbox.style.setProperty("opacity", "0", "important");
        group.insertBefore(hitbox, group.firstChild);
      }
    }

    const shouldHaveOutline = shouldUseSelectionOutline(
      kitchenConfig.kitchen.slug,
      componentId,
      group.dataset.selectionMode || "",
    );
    if (!shouldHaveOutline) {
      group.querySelectorAll(".component-selection-outline").forEach((element) => element.remove());
    }

    const hasOutline = group.querySelector(".component-selection-outline");
    if (shouldHaveOutline) {
      const box = getPlanBoundsForSlug(kitchenConfig.kitchen.slug, componentId);
      if (box) {
        const shapePath = getPlanSelectionOutlineShapeForSlug(kitchenConfig.kitchen.slug, componentId);
        if (hasOutline) {
          if (shapePath && hasOutline.tagName === "path") {
            hasOutline.setAttribute("d", shapePath);
          }
        } else {
          const outline = createShapeElement(namespace, "component-selection-outline", shapePath, box, 3);
          outline.setAttribute("fill", "none");
          outline.setAttribute("stroke", "transparent");
          outline.setAttribute("stroke-width", "0");
          group.appendChild(outline);
        }
      }
    }

    applyGroupVisualState(group, {
      selected: selectedComponentIds.includes(componentId),
      locked: lockedComponentIds.includes(componentId),
    });
  }

  if (visibleSet) {
    svg.querySelectorAll("[data-component-id]").forEach((group) => {
      const componentId = group.getAttribute("data-component-id");
      if (componentId && !visibleSet.has(componentId)) {
        group.style.setProperty("display", "none", "important");
        group.querySelectorAll(".component-hitbox").forEach((element) => element.remove());
        group.querySelectorAll(".component-selection-outline").forEach((element) => element.remove());
      }
    });
  }

  svg.querySelectorAll("[data-component-id]").forEach((group) => {
    const componentId = group.getAttribute("data-component-id");
    if (!componentId) return;

    const selected = selectedComponentIds.includes(componentId);
    const locked = lockedComponentIds.includes(componentId);

    group.classList.toggle("selected", selected);
    group.classList.toggle("locked", locked);
    applyGroupVisualState(group, { selected, locked });

    if ((selected || locked) && group.parentNode) {
      group.parentNode.appendChild(group);
    }
  });

  cleanupPlanInteractionOverlays(svg, kitchenConfig.kitchen.slug);
  applyLShapedDefaultSelectedDetailStyles(svg, lockedComponentIds, selectedComponentIds);
  applyLShapedDishwasherInternalIconStyles(svg, selectedComponentIds);
  bringLShapedRefrigeratorForward(svg, kitchenConfig.kitchen.slug);

  return svg;
}

export function refreshKitchenPlanSelection({ host, selectedComponentIds, lockedComponentIds, kitchenSlug }) {
  const svg = host?.querySelector("svg");
  if (!svg) return;

  svg.querySelectorAll("[data-component-id]").forEach((group) => {
    const componentId = group.getAttribute("data-component-id");
    const selected = selectedComponentIds.includes(componentId);
    const locked = lockedComponentIds.includes(componentId);

    group.classList.toggle("selected", selected);
    group.classList.toggle("locked", locked);
    applyGroupVisualState(group, { selected, locked });

    if ((selected || locked) && group.parentNode) {
      group.parentNode.appendChild(group);
    }
  });

  cleanupPlanInteractionOverlays(svg, kitchenSlug);
  applyLShapedDefaultSelectedDetailStyles(svg, lockedComponentIds, selectedComponentIds);
  applyLShapedDishwasherInternalIconStyles(svg, selectedComponentIds);
  bringLShapedRefrigeratorForward(svg, kitchenSlug);
}

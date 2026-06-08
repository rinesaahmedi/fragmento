export const PLAN_VIEWPORT_BY_SLUG = {
  "kitchen-model-c": {
    viewBox: "70 140 720 320",
    preserveAspectRatio: "xMidYMid meet",
    canvasClassName: "wide",
  },
  "l-shaped-kitchen": {
    viewBox: "120 45 540 450",
    preserveAspectRatio: "xMidYMid meet",
  },
};

const BASE_PLAN_STROKE = "#8f877d";
const SELECTED_PLAN_STROKE = "#000000";
const OVERLAY_SELECTED_STROKE = "#2a9155";
const SELECTED_MUTED_APPLIANCE_STROKE = "#374151";
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
  "component-wall-cabinet-1": { x: 156, y: 71, width: 98, height: 186 },
  "component-wall-cabinet-2": { x: 253, y: 71, width: 103, height: 186 },
  "component-wall-cabinet-3": { x: 356, y: 72, width: 100, height: 185 },
  "component-wall-cabinet-4": { x: 456, y: 72, width: 159, height: 165 },
  "component-under-cabinet-light": { x: 329, y: 246, width: 70, height: 42 },
  "component-refrigerator": { x: 566, y: 331, width: 49, height: 147 },
  "component-worktop": { x: 156, y: 237, width: 459, height: 92 },
  "component-base-module-1": { x: 200, y: 318, width: 53, height: 122 },
  "component-oven-base": { x: 253, y: 318, width: 77, height: 122 },
  "component-base-module-2": { x: 330, y: 303, width: 71, height: 122 },
  "component-corner-base": { x: 401, y: 289, width: 115, height: 95 },
  "component-base-module-3": { x: 401, y: 317, width: 115, height: 155 },
  "component-drawer-base": { x: 516, y: 337, width: 50, height: 125 },
};

const L_SHAPED_PLAN_COMPONENT_SHAPES = {
  "component-wall-cabinet-1": "M156 166 L200 192 L200 322 L156 296 Z M200 192 L253 181 L253 312 L200 322 Z",
  "component-wall-cabinet-2": "M253 181 L356 161 L356 291 L253 312 Z",
  "component-wall-cabinet-3": "M356 161 L456 141 L456 272 L356 291 Z",
  "component-wall-cabinet-4": "M456 141 L615 110 L615 237 L456 272 Z",
  "component-under-cabinet-light": "M329 276 L399 263 L399 282 L329 296 Z",
  "component-refrigerator": "M566 341 L615 331 L615 478 L566 462 Z",
  "component-worktop": "M156 296 L356 257 L516 351 L615 332 L456 237 L356 257 L156 296 Z M156 329 L400 281 L516 350 L566 341 L330 388 Z",
  "component-base-module-1": "M200 356 L253 346 L253 439 L200 450 Z",
  "component-oven-base": "M253 346 L330 331 L330 425 L253 439 Z",
  "component-base-module-2": "M330 331 L401 317 L401 411 L330 425 Z",
  "component-corner-base": "M401 317 L516 294 L566 323 L516 351 L401 375 Z",
  "component-base-module-3": "M401 317 L516 294 L566 323 L566 462 L516 472 L401 411 Z",
  "component-drawer-base": "M516 351 L566 341 L566 462 L516 472 Z",
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

  group.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse,text").forEach((element) => {
    if (element.classList.contains("component-hitbox")) {
      element.style.setProperty("fill", "transparent", "important");
      element.style.setProperty("stroke", "transparent", "important");
      element.style.setProperty("stroke-width", "0px", "important");
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

    if (useOutlineOnlySelection) {
      element.style.setProperty("stroke", element.dataset.originalStroke || "none", "important");
      element.style.setProperty("stroke-width", `${element.dataset.originalStrokeWidth}px`, "important");
      element.style.setProperty("vector-effect", "non-scaling-stroke", "important");
      if (element.tagName === "text") {
        element.style.setProperty("fill", element.dataset.originalFill || BASE_PLAN_STROKE, "important");
      } else if (element.dataset.originalFill) {
        element.style.setProperty("fill", element.dataset.originalFill, "important");
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
      continue;
    }

    group.style.removeProperty("display");
    group.classList.add("kitchen-component");
    if (kitchenConfig.kitchen.slug === "l-shaped-kitchen" && !group.dataset.selectionMode) {
      group.dataset.selectionMode = "cad-linework";
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
        hitbox.setAttribute("stroke", "transparent");
        hitbox.setAttribute("pointer-events", "all");
        group.insertBefore(hitbox, group.firstChild);
      }
    }

    const hasOutline = group.querySelector(".component-selection-outline");
    if (!hasOutline && group.dataset.selectionMode === "outline") {
      const box = getPlanBoundsForSlug(kitchenConfig.kitchen.slug, componentId);
      if (box) {
        const shapePath = getPlanShapeForSlug(kitchenConfig.kitchen.slug, componentId);
        const outline = createShapeElement(namespace, "component-selection-outline", shapePath, box, 3);
        outline.setAttribute("fill", "none");
        outline.setAttribute("stroke", "transparent");
        outline.setAttribute("stroke-width", "0");
        group.appendChild(outline);
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
      }
    });
  }

  return svg;
}

export function refreshKitchenPlanSelection({ host, selectedComponentIds, lockedComponentIds }) {
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
}

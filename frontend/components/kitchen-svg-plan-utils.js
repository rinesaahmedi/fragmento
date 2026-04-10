export const PLAN_VIEWPORT_BY_SLUG = {
  "kitchen-model-c": {
    viewBox: "70 140 720 320",
    preserveAspectRatio: "xMidYMid meet",
    canvasClassName: "wide",
  },
};

const BASE_PLAN_STROKE = "#8f877d";
const SELECTED_PLAN_STROKE = "#000000";
const SELECTED_MUTED_APPLIANCE_STROKE = "#374151";

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
  const emphasisStroke = isActive ? SELECTED_PLAN_STROKE : BASE_PLAN_STROKE;
  const emphasisWidth = isActive ? "3.2" : "";

  group.style.setProperty("opacity", "1", "important");
  group.style.setProperty("filter", "none", "important");

  group.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse,text").forEach((element) => {
    if (element.classList.contains("component-hitbox")) {
      element.style.setProperty("fill", "transparent", "important");
      element.style.setProperty("stroke", "transparent", "important");
      element.style.setProperty("stroke-width", "0px", "important");
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
      preserveOriginalStrokeWidth
        ? `${element.dataset.originalStrokeWidth}px`
        : emphasisWidth || `${element.dataset.originalStrokeWidth}px`,
      "important",
    );
    element.style.setProperty("vector-effect", "non-scaling-stroke", "important");

    if (element.tagName === "text") {
      element.style.setProperty(
        "fill",
        isMutedApplianceLabel(element) ? BASE_PLAN_STROKE : isActive ? SELECTED_PLAN_STROKE : BASE_PLAN_STROKE,
        "important",
      );
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
  svg.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse").forEach((element) => {
    if (element.closest("[data-component-id]")) return;
    const color = normalizeColor(element.getAttribute("stroke"));
    if (!color) return;
    if (!byColor.has(color)) byColor.set(color, []);
    byColor.get(color).push(element);
  });

  for (const item of kitchenConfig.components) {
    const colorKey = normalizeColor(item.colorKey);
    const componentId = componentIdForItem(item);
    if (!componentId) continue;
    let group = svg.querySelector(`[data-component-id="${componentId}"]`);

    if (!group && colorKey && byColor.has(colorKey)) {
      const elements = byColor.get(colorKey);
      const firstElement = elements[0];
      const parent = firstElement?.parentNode;
      if (!firstElement || !parent) continue;

      group = document.createElementNS(namespace, "g");
      group.dataset.componentId = componentId;
      parent.insertBefore(group, firstElement);
      elements.forEach((element) => group.appendChild(element));
    }

    if (!group) continue;

    group.classList.add("kitchen-component");
    group.querySelectorAll(".component-hitbox").forEach((element) => element.remove());

    const box = getPlanBounds(group, componentId);
    if (box) {
      const hitbox = document.createElementNS(namespace, "rect");
      hitbox.classList.add("component-hitbox");
      hitbox.setAttribute("x", String(box.x - 6));
      hitbox.setAttribute("y", String(box.y - 6));
      hitbox.setAttribute("width", String(box.width + 12));
      hitbox.setAttribute("height", String(box.height + 12));
      hitbox.setAttribute("rx", "8");
      hitbox.setAttribute("ry", "8");
      hitbox.setAttribute("fill", "transparent");
      hitbox.setAttribute("stroke", "transparent");
      group.insertBefore(hitbox, group.firstChild);
    }

    applyGroupVisualState(group, {
      selected: selectedComponentIds.includes(componentId),
      locked: lockedComponentIds.includes(componentId),
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

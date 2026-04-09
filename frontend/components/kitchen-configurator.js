"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./kitchen-configurator.module.css";

const DISHWASHER_BASE_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="20" y1="14" x2="40" y2="14" stroke-linecap="round" stroke-width="1.5"/><g stroke="#ccc" stroke-width="0.5"><path d="M 10 24 L 14 44 H 46 L 50 24 Z"/><line x1="18" y1="26" x2="20" y2="44"/><line x1="26" y1="26" x2="26" y2="44"/><line x1="34" y1="26" x2="34" y2="44"/><line x1="42" y1="26" x2="40" y2="44"/><line x1="12" y1="32" x2="48" y2="32"/><line x1="13" y1="38" x2="47" y2="38"/></g><rect x="24" y="58" width="12" height="8" fill="white"/><text x="30" y="64" font-family="sans-serif" font-size="5" text-anchor="middle" fill="currentColor" stroke="none">GS</text></svg>';

const ICON_MARKUP = {
  dishwasher: DISHWASHER_BASE_MARKUP,
  refrigerator: '<img src="/img/foto6.png" alt="Kuehlschrank">',
  base_cabinet_30: '<img src="/img/foto1.png" alt="Unterschrank 30cm">',
  wall_cabinet_l: '<img src="/img/foto4.png" alt="Oberschrank links">',
  wall_cabinet_r: '<img src="/img/foto2.png" alt="Oberschrank rechts">',
  extractor_hood: '<img src="/img/foto5.png" alt="Dunstabzugshaube">',
  wall_cabinet_single_light:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="20" y1="50" x2="40" y2="50" stroke-linecap="round" stroke-width="1.5"/><g stroke="#666" stroke-width="0.75"><line x1="30" y1="60" x2="30" y2="63"/><line x1="28" y1="63" x2="32" y2="63"/><line x1="26" y1="66" x2="22" y2="74"/><line x1="30" y1="66" x2="30" y2="75"/><line x1="34" y1="66" x2="38" y2="74"/></g></svg>',
  wall_cabinet_double_light:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="20" y1="50" x2="40" y2="50" stroke-linecap="round" stroke-width="1.5"/><rect x="0.5" y="60" width="59" height="2"/><g stroke="#666" stroke-width="0.75"><line x1="20" y1="62" x2="20" y2="64"/><line x1="18" y1="64" x2="22" y2="64"/><line x1="17" y1="67" x2="14" y2="73"/><line x1="20" y1="67" x2="20" y2="74"/><line x1="23" y1="67" x2="26" y2="73"/><line x1="40" y1="62" x2="40" y2="64"/><line x1="38" y1="64" x2="42" y2="64"/><line x1="37" y1="67" x2="34" y2="73"/><line x1="40" y1="67" x2="40" y2="74"/><line x1="43" y1="67" x2="46" y2="73"/></g></svg>',
  wall_cabinet_plain:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="20" y1="50" x2="40" y2="50" stroke-linecap="round" stroke-width="1.5"/></svg>',
  washing_machine_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="14" x2="60" y2="14"/><line x1="10" y1="8" x2="25" y2="8" stroke-width="0.5"/><g stroke="#ccc" stroke-width="0.5"><path d="M 16 26 C 12 26 12 46 16 46 Z"/><circle cx="30" cy="36" r="14"/><circle cx="30" cy="36" r="10"/></g><rect x="24" y="58" width="12" height="8" fill="white"/><text x="30" y="64" font-family="sans-serif" font-size="5" text-anchor="middle" fill="currentColor" stroke="none">WM</text></svg>',
  sink_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="20" y1="14" x2="40" y2="14" stroke-linecap="round" stroke-width="1.5"/></svg>',
  dishwasher_base: DISHWASHER_BASE_MARKUP,
  oven_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="16" x2="60" y2="16"/><rect x="44" y="6" width="4" height="4"/><rect x="52" y="6" width="4" height="4"/><line x1="0" y1="56" x2="60" y2="56"/><rect x="8" y="22" width="44" height="26"/><rect x="12" y="26" width="36" height="18"/><line x1="22" y1="62" x2="38" y2="62" stroke-linecap="round" stroke-width="1.5"/></svg>',
  drawer_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="16" x2="60" y2="16"/><line x1="20" y1="9" x2="40" y2="9" stroke-linecap="round" stroke-width="1.5"/><line x1="20" y1="24" x2="40" y2="24" stroke-linecap="round" stroke-width="1.5"/></svg>',
  worktop:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 20" fill="none" stroke="currentColor" stroke-width="1"><line x1="2" y1="7" x2="118" y2="7"/><line x1="2" y1="13" x2="118" y2="13"/><line x1="118" y1="7" x2="118" y2="13"/></svg>',
  drawer_base_two:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="18" x2="60" y2="18"/><line x1="20" y1="10" x2="40" y2="10" stroke-linecap="round" stroke-width="1.5"/><line x1="20" y1="26" x2="40" y2="26" stroke-linecap="round" stroke-width="1.5"/></svg>',
  drawer_base_three:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="16" x2="60" y2="16"/><line x1="0" y1="44" x2="60" y2="44"/><line x1="20" y1="9" x2="40" y2="9" stroke-linecap="round" stroke-width="1.5"/><line x1="20" y1="30" x2="40" y2="30" stroke-linecap="round" stroke-width="1.5"/><line x1="20" y1="58" x2="40" y2="58" stroke-linecap="round" stroke-width="1.5"/></svg>',
  tall_refrigerator:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 190" fill="none" stroke="currentColor" stroke-width="1"><line x1="3" y1="1" x2="57" y2="1"/><line x1="3" y1="1" x2="3" y2="186"/><line x1="57" y1="1" x2="57" y2="186"/><line x1="3" y1="186" x2="57" y2="186"/><line x1="8" y1="186" x2="8" y2="189" stroke-width="1.5"/><line x1="52" y1="186" x2="52" y2="189" stroke-width="1.5"/><line x1="3" y1="110" x2="57" y2="110"/><line x1="12" y1="108" x2="48" y2="108" stroke-linecap="round" stroke-width="1.5"/><line x1="12" y1="112" x2="48" y2="112" stroke-linecap="round" stroke-width="1.5"/></svg>',
  extractor_hood_chimney:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="24" y="0.5" width="12" height="39"/><line x1="24" y1="20" x2="36" y2="20"/><rect x="10" y="40" width="40" height="12"/><g stroke="#666" stroke-width="0.75"><line x1="18" y1="55" x2="15" y2="62"/><line x1="22" y1="55" x2="22" y2="63"/><line x1="26" y1="55" x2="29" y2="62"/><line x1="34" y1="55" x2="31" y2="62"/><line x1="38" y1="55" x2="38" y2="63"/><line x1="42" y1="55" x2="45" y2="62"/></g></svg>',
  wall_cabinet_standard:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="20" y1="50" x2="40" y2="50" stroke-linecap="round" stroke-width="1.5"/></svg>',
  under_cabinet_light:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="#666" stroke-width="0.75"><line x1="8" y1="0" x2="12" y2="0" stroke="currentColor" stroke-width="1"/><line x1="6" y1="4" x2="2" y2="14"/><line x1="10" y1="4" x2="10" y2="15"/><line x1="14" y1="4" x2="18" y2="14"/></svg>',
  sink_faucet:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 30" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="8" y="28" width="4" height="2" fill="white" stroke-width="1"/><rect x="9" y="24" width="2" height="4" fill="white" stroke-width="1"/><path d="M 10 24 L 10 10 C 10 4, 16 4, 16 10 L 16 14" stroke-linecap="round"/><line x1="10" y1="18" x2="5" y2="15" stroke-linecap="round"/></svg>',
  pickup: '<img src="/img/warehouse.png" alt="Abholung im Lager">',
  waste_system:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
  cutlery_insert:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="4" height="18" rx="1"/><rect x="8" y="3" width="8" height="4" rx="1"/><rect x="8" y="8" width="3" height="3" rx="1"/><rect x="12" y="8" width="4" height="3" rx="1"/><rect x="8.5" y="12" width="3" height="9" rx="1"/><rect x="12.5" y="12" width="3" height="9" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>',
  lighting_set:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>',
  delivery_assembly:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5-8.5l1.96 2.5H17V9.5h2.5zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-2.2-12.2l-4 4-1.4-1.4-1.4 1.4 2.8 2.8 5.4-5.4-1.4-1.4z"/></svg>',
};

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getSummaryPriceLabel(item) {
  const price = Number(item?.price || 0);
  if (item?.isLocked && price <= 0) {
    return "Inklusive";
  }
  return formatCurrency(price);
}

function getSummaryMetaLabel(item) {
  const price = Number(item?.price || 0);
  if (!item?.isLocked) {
    return "Ausgewaehlt";
  }
  if (price <= 0) {
    return "Im Grundmodell enthalten";
  }
  return "Standardausstattung";
}

function normalizeColor(value) {
  if (!value) return "";
  const color = String(value).trim().toLowerCase();
  if (!color.startsWith("rgb")) return color;
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return color;
  const toHex = (channel) => `0${Number.parseInt(channel, 10).toString(16)}`.slice(-2);
  return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
}

function componentIdForColor(colorKey) {
  return `component-${String(colorKey || "")
    .replace(/[^a-z0-9#-]/gi, "")
    .toLowerCase()}`;
}

function componentIdForKey(componentKey) {
  return `component-${String(componentKey || "")
    .replace(/[^a-z0-9#-]/gi, "")
    .toLowerCase()}`;
}

function componentIdForItem(item) {
  if (item?.componentKey) {
    return componentIdForKey(item.componentKey);
  }
  return componentIdForColor(normalizeColor(item?.colorKey));
}

function selectedMap(items, codes) {
  return items.filter((item) => codes.includes(item.code));
}

const BASE_PLAN_STROKE = "#8f877d";
const SELECTED_PLAN_STROKE = "#000000";
const SELECTED_MUTED_APPLIANCE_STROKE = "#a39b92";

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

const PLAN_VIEWPORT_BY_SLUG = {
  "kitchen-model-c": {
    viewBox: "70 140 720 320",
    preserveAspectRatio: "xMidYMid meet",
    canvasClassName: "wide",
  },
};

const LINKED_COMPONENT_GROUPS_BY_SLUG = {
  "kitchen-model-b": [["component-wall-cabinet-4", "component-extractor-hood"]],
};

const PRODUCT_INFO_BY_CODE = {
  "component-dishwasher": "/product-info/dishwasher-product-info.pdf",
  "component-refrigerator": "/product-info/fridge-product-info.pdf",
  "component-extractor-hood": "/product-info/extractor-hood-flat-product-info.pdf",
  "model-b-base-module-1": "/product-info/washing-machine-product-info.pdf",
  "model-b-base-module-3": "/product-info/dishwasher-product-info.pdf",
  "model-b-oven-module": "/product-info/oven-product-info.pdf",
  "model-b-refrigerator": "/product-info/fridge-product-info.pdf",
  "model-b-extractor-hood": "/product-info/extractor-hood-flat-product-info.pdf",
  "model-c-refrigerator": "/product-info/fridge-product-info.pdf",
  "model-c-extractor-hood": "/product-info/extractor-hood-chimney-product-info.pdf",
  "model-c-oven-base": "/product-info/oven-product-info.pdf",
  "model-c-wm-base": "/product-info/washing-machine-product-info.pdf",
  "model-c-dishwasher-base": "/product-info/dishwasher-product-info.pdf",
};

function getLinkedComponentIds(slug, componentId) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const linkedGroups = LINKED_COMPONENT_GROUPS_BY_SLUG[normalizedSlug] || [];
  const linkedGroup = linkedGroups.find((group) => group.includes(componentId));
  return linkedGroup || [componentId];
}

function isHiddenLinkedComponent(slug, componentId) {
  const linkedIds = getLinkedComponentIds(slug, componentId);
  return linkedIds.length > 1 && linkedIds[0] !== componentId;
}

function isLinkedComponentSelected(slug, selectedIds, componentId) {
  return getLinkedComponentIds(slug, componentId).every((id) => selectedIds.includes(id));
}

function toggleLinkedComponentSelection(slug, currentIds, componentId, lockedIds = []) {
  const linkedIds = getLinkedComponentIds(slug, componentId);
  const currentSet = new Set(currentIds);
  const lockedSet = new Set(lockedIds);
  const shouldRemove = linkedIds.every((id) => currentSet.has(id));

  linkedIds.forEach((id) => {
    if (lockedSet.has(id)) return;
    if (shouldRemove) {
      currentSet.delete(id);
    } else {
      currentSet.add(id);
    }
  });

  return [...currentSet];
}

function getCatalogLinkedItems(allItems, slug, item) {
  const componentId = componentIdForItem(item);
  const linkedIds = getLinkedComponentIds(slug, componentId);
  if (linkedIds.length <= 1) return [item];

  const linkedItems = linkedIds
    .map((linkedId) => allItems.find((candidate) => componentIdForItem(candidate) === linkedId))
    .filter(Boolean);

  return linkedItems.length ? linkedItems : [item];
}

function getCatalogDisplayItem(allItems, slug, item) {
  const linkedItems = getCatalogLinkedItems(allItems, slug, item);
  if (linkedItems.length <= 1) {
    return {
      item,
      price: Number(item.price || 0),
      infoPdfHref: PRODUCT_INFO_BY_CODE[item.code] || "",
    };
  }

  const hoodItem =
    linkedItems.find((entry) => String(entry.componentKey || "").toLowerCase() === "extractor-hood") || null;
  const primaryItem = linkedItems[0];

  return {
    item: {
      ...primaryItem,
      name: hoodItem ? `${primaryItem.name} + ${hoodItem.name}` : primaryItem.name,
      infoText: hoodItem
        ? `${primaryItem.infoText || ""}${primaryItem.infoText ? " • " : ""}${hoodItem.infoText || ""}`.trim()
        : primaryItem.infoText,
      iconKey: hoodItem?.iconKey || primaryItem.iconKey,
    },
    price: Number((hoodItem || primaryItem).price || 0),
    infoPdfHref:
      (hoodItem && PRODUCT_INFO_BY_CODE[hoodItem.code]) ||
      PRODUCT_INFO_BY_CODE[primaryItem.code] ||
      "",
  };
}

function getPlanBounds(group, componentId) {
  if (group && typeof group.getBBox === "function") {
    const box = group.getBBox();
    if (box && box.width > 0 && box.height > 0) {
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }
  }
  return PLAN_COMPONENT_BOUNDS[componentId] || null;
}

function applyPlanViewportToMarkup(markup, slug) {
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

function applyGroupVisualState(group, { selected, hovered, locked }) {
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

    if (element.classList.contains("component-frame")) {
      element.style.setProperty("fill", "none", "important");
      element.style.setProperty("stroke", isActive ? SELECTED_PLAN_STROKE : "transparent", "important");
      element.style.setProperty("stroke-width", isActive ? "2.4px" : "0px", "important");
      element.style.setProperty("vector-effect", "non-scaling-stroke", "important");
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

    element.style.setProperty(
      "stroke",
      element.dataset.originalStroke === "none"
        ? "none"
        : preserveOriginalStroke
          ? element.dataset.originalStroke
          : emphasisStroke,
      "important",
    );
    element.style.setProperty(
      "stroke-width",
      preserveOriginalStrokeWidth ? `${element.dataset.originalStrokeWidth}px` : emphasisWidth || `${element.dataset.originalStrokeWidth}px`,
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

export default function KitchenConfigurator({ kitchenConfig, svgMarkup }) {
  const svgHostRef = useRef(null);
  const kitchenSlug = String(kitchenConfig.kitchen.slug || "").trim().toLowerCase();
  const planViewport = PLAN_VIEWPORT_BY_SLUG[kitchenConfig.kitchen.slug];
  const resolvedSvgMarkup = applyPlanViewportToMarkup(svgMarkup, kitchenConfig.kitchen.slug);
  const lockedComponentIds = [
    ...(kitchenConfig.lockedBaseColors || []),
    ...kitchenConfig.components
      .filter((item) => item.isLocked)
      .map((item) => (item.componentKey ? item.componentKey : normalizeColor(item.colorKey))),
  ].map((value) => componentIdForKey(value));

  const [selectedComponentIds, setSelectedComponentIds] = useState(lockedComponentIds);
  const [selectedAccessoryCodes, setSelectedAccessoryCodes] = useState([]);
  const [selectedServiceCodes, setSelectedServiceCodes] = useState([]);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customer, setCustomer] = useState({
    contractNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    postalCode: "",
    city: "",
    paymentMethod: "",
    consent: false,
  });

  const selectedComponents = kitchenConfig.components.filter((item) =>
    selectedComponentIds.includes(componentIdForItem(item)),
  );
  const selectedAccessories = selectedMap(kitchenConfig.accessories, selectedAccessoryCodes);
  const selectedServices = selectedMap(kitchenConfig.services, selectedServiceCodes);
  const lockedSelectedComponents = selectedComponents.filter((item) => item.isLocked);
  const optionalSelectedComponents = selectedComponents.filter((item) => !item.isLocked);
  const lockedComponentIdsKey = lockedComponentIds.join("|");
  const selectedComponentCodes = selectedComponents.map((item) => item.code);
  const visibleComponents = kitchenConfig.components.filter((item) => {
    const componentId = componentIdForItem(item);
    return !lockedComponentIds.includes(componentId) && !isHiddenLinkedComponent(kitchenSlug, componentId);
  });
  const montageEligible =
    selectedComponents.length >= 3 &&
    selectedComponentCodes.filter((code) => kitchenConfig.montageRequiredCodes.includes(code)).length >= 2;
  const hasAnyBaseSelection = selectedComponents.length > 0 || selectedAccessories.length > 0;
  const grandTotal = [...selectedComponents, ...selectedAccessories, ...selectedServices].reduce(
    (sum, item) => sum + Number(item.price || 0),
    0,
  );

  useEffect(() => {
    setSelectedComponentIds((current) => {
      const next = [...new Set([...lockedComponentIds, ...current])];
      if (next.length === current.length && next.every((item, index) => item === current[index])) {
        return current;
      }
      return next;
    });
  }, [lockedComponentIdsKey]);

  useEffect(() => {
    const host = svgHostRef.current;
    if (!host) return;

    if (host.innerHTML !== resolvedSvgMarkup) {
      host.innerHTML = resolvedSvgMarkup || "";
    }
  }, [resolvedSvgMarkup]);

  useEffect(() => {
    const host = svgHostRef.current;
    const svg = host?.querySelector("svg");
    if (!host || !svg) {
      return;
    }

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

      if (group) {
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
          hovered: false,
          locked: lockedComponentIds.includes(componentId),
        });
      }
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
  }, [kitchenConfig.components, kitchenSlug, lockedComponentIdsKey, planViewport, resolvedSvgMarkup]);

  useEffect(() => {
    const host = svgHostRef.current;
    const svg = host?.querySelector("svg");
    if (!svg) return;

    svg.querySelectorAll("[data-component-id]").forEach((group) => {
      const componentId = group.getAttribute("data-component-id");
      const selected = selectedComponentIds.includes(componentId);
      const locked = lockedComponentIds.includes(componentId);
      const hovered = false;

      group.classList.toggle("selected", selected);
      group.classList.toggle("locked", locked);
      group.classList.toggle("hovered", hovered);
      applyGroupVisualState(group, { selected, hovered, locked });

      // Paint selected and locked components last so neighboring grey strokes
      // do not visually wash out their black edges.
      if ((selected || locked) && group.parentNode) {
        group.parentNode.appendChild(group);
      }
    });
  }, [lockedComponentIdsKey, selectedComponentIds]);

  useEffect(() => {
    if (!montageEligible && selectedServiceCodes.includes("service-montage")) {
      setSelectedServiceCodes((current) => current.filter((code) => code !== "service-montage"));
    }
    if (!hasAnyBaseSelection && selectedServiceCodes.includes("service-pickup")) {
      setSelectedServiceCodes((current) => current.filter((code) => code !== "service-pickup"));
    }
  }, [hasAnyBaseSelection, montageEligible, selectedServiceCodes]);

  function toggleAccessory(itemCode) {
    setSelectedAccessoryCodes((current) =>
      current.includes(itemCode) ? current.filter((code) => code !== itemCode) : [...current, itemCode],
    );
  }

  function toggleService(itemCode) {
    if (itemCode === "service-montage" && !montageEligible) {
      setStatus("Montage ist erst ab mindestens 3 Artikeln moeglich, davon 2 Schrank-Komponenten.");
      setStatusTone("error");
      return;
    }

    if (itemCode === "service-pickup" && !hasAnyBaseSelection) {
      setStatus("Abholung kann erst hinzugefuegt werden, wenn mindestens ein Artikel ausgewaehlt wurde.");
      setStatusTone("error");
      return;
    }

    setStatus("");
    setStatusTone("idle");

    setSelectedServiceCodes((current) => {
      const exists = current.includes(itemCode);
      if (exists) return current.filter((code) => code !== itemCode);
      if (itemCode === "service-montage") return [...current.filter((code) => code !== "service-pickup"), itemCode];
      if (itemCode === "service-pickup") return [...current.filter((code) => code !== "service-montage"), itemCode];
      return [...current, itemCode];
    });
  }

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function removeComponent(item) {
    const componentId = componentIdForItem(item);
    if (lockedComponentIds.includes(componentId)) {
      return;
    }
    setSelectedComponentIds((current) =>
      toggleLinkedComponentSelection(kitchenSlug, current, componentId, lockedComponentIds),
    );
  }

  function removeAccessory(item) {
    setSelectedAccessoryCodes((current) => current.filter((code) => code !== item.code));
  }

  function removeService(item) {
    setSelectedServiceCodes((current) => current.filter((code) => code !== item.code));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!grandTotal) {
      setStatus("Waehle zuerst mindestens einen Artikel aus.");
      setStatusTone("error");
      return;
    }

    if (!customer.consent) {
      setStatus("Bitte bestaetige die Datenschutzeinwilligung.");
      setStatusTone("error");
      return;
    }

    setIsSubmitting(true);
    setStatus("Bestellung wird gesendet...");
    setStatusTone("idle");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            kitchen_slug: kitchenConfig.kitchen.slug,
            order_payload: {
              customer: {
              contractNumber: customer.contractNumber,
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email,
              phone: customer.phone,
              address1: customer.address1,
              address2: customer.address2,
              postalCode: customer.postalCode,
                city: customer.city,
                paymentMethod: customer.paymentMethod,
              },
              components: selectedComponents,
              accessories: selectedAccessories,
              services: selectedServices,
            },
          }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Bestellung konnte nicht gespeichert werden.");
      }

      const emailIssue = payload.notifications?.emailError;
      const webhookIssue = payload.notifications?.webhookError;

      if (emailIssue || webhookIssue) {
        const notes = [emailIssue ? `E-Mail: ${emailIssue}` : "", webhookIssue ? `Webhook: ${webhookIssue}` : ""]
          .filter(Boolean)
          .join(" | ");
        setStatus(`Bestellung gespeichert. Auftragsnummer: ${payload.orderNumber}. Hinweis: ${notes}`);
      } else {
        setStatus(`Bestellung gespeichert. Auftragsnummer: ${payload.orderNumber}`);
      }
      setStatusTone("success");
    } catch (error) {
      setStatus(error.message || "Bestellung konnte nicht gesendet werden.");
      setStatusTone("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderCatalogItem(item, options = {}) {
    const className = [
      styles.itemCard,
      options.selected ? styles.itemCardSelected : "",
      options.locked ? styles.itemCardLocked : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        key={item.id}
        type="button"
        className={className}
        onClick={options.onClick}
        disabled={options.locked}
      >
        <div className={styles.itemTop}>
          <span className={styles.itemIcon} dangerouslySetInnerHTML={{ __html: ICON_MARKUP[item.iconKey] || "" }} />
          <div className={styles.itemText}>
            <strong>{item.name}</strong>
            {item.infoText ? <p>{item.infoText}</p> : null}
          </div>
          <span className={styles.itemPrice}>{formatCurrency(options.price ?? item.price)}</span>
        </div>
        <div className={styles.itemMeta}>
          <span className={options.locked ? styles.lockedPill : styles.togglePill}>
            {options.locked ? "Fix" : options.selected ? "Entfernen" : "Hinzufuegen"}
          </span>
          <div className={styles.itemMetaAside}>
            {options.hint ? <span className={styles.ruleHint}>{options.hint}</span> : null}
            {options.infoPdfHref ? (
              <a
                href={options.infoPdfHref}
                target="_blank"
                rel="noreferrer"
                className={styles.itemPdfLink}
                onClick={(event) => event.stopPropagation()}
              >
                PDF
              </a>
            ) : null}
          </div>
        </div>
      </button>
    );
  }

  function renderSummaryRow(item, onRemove) {
    const price = Number(item.price || 0);
    const priceClassName = [
      styles.summaryPrice,
      item.isLocked && price <= 0 ? styles.summaryPriceIncluded : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div key={item.id} className={styles.summaryRow}>
        <div className={styles.summaryMeta}>
          <strong>{item.name}</strong>
          <span>{getSummaryMetaLabel(item)}</span>
        </div>
        <strong className={priceClassName}>{getSummaryPriceLabel(item)}</strong>
        {item.isLocked ? (
          <span className={[styles.summaryBadge, styles.summaryBadgeLocked].join(" ")}>Standard</span>
        ) : (
          <button type="button" className={styles.summaryRemove} onClick={() => onRemove(item)}>
            Entfernen
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.backLink}>
            Zurueck
          </Link>
          <div className={styles.brand}>
            <img src="/img/fragmentologo.png" alt="Fragmento" />
            <div className={styles.brandText}>
              <h1>{kitchenConfig.kitchen.name}</h1>
              <p>{kitchenConfig.kitchen.description || "Konfiguriere deine Kueche direkt aus dem aktuellen Katalog."}</p>
            </div>
          </div>
          <div className={styles.pricePill}>
            <span>Gesamtpreis</span>
            <strong>{formatCurrency(grandTotal)}</strong>
          </div>
        </header>

        <section className={styles.contentGrid}>
          <div className={styles.mainColumn}>
            <div className={styles.stage}>
              <div className={styles.stageHeader}>
                <div>
                  <p className={styles.eyebrow}>Plan</p>
                  <h2>Interaktive Kuechenansicht</h2>
                </div>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => {
                    setSelectedAccessoryCodes([]);
                    setSelectedServiceCodes([]);
                    setSelectedComponentIds(lockedComponentIds);
                    setStatus("");
                    setStatusTone("idle");
                  }}
                >
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

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Uebersicht</p>
                  <h2>Deine Auswahl</h2>
                </div>
              </div>
              <div className={styles.summaryList}>
                {!selectedComponents.length && !selectedAccessories.length && !selectedServices.length ? (
                  <div className={styles.emptyState}>Noch keine Artikel ausgewaehlt.</div>
                ) : null}

                {lockedSelectedComponents.length ? (
                  <div className={styles.summarySectionTitle}>Standardausstattung</div>
                ) : null}
                {lockedSelectedComponents.map((item) => renderSummaryRow(item, removeComponent))}

                {optionalSelectedComponents.length ? (
                  <div className={styles.summarySectionTitle}>Zusaetzliche Komponenten</div>
                ) : null}
                {optionalSelectedComponents.map((item) => renderSummaryRow(item, removeComponent))}

                {selectedAccessories.length ? <div className={styles.summarySectionTitle}>Zubehoer</div> : null}
                {selectedAccessories.map((item) => renderSummaryRow(item, removeAccessory))}

                {selectedServices.length ? <div className={styles.summarySectionTitle}>Dienstleistungen</div> : null}
                {selectedServices.map((item) => renderSummaryRow(item, removeService))}
              </div>
            </div>
          </div>

          <div className={styles.sideColumn}>
            <aside className={styles.sidebar}>
              <div className={styles.sidebarHeader}>
                <div>
                  <p className={styles.eyebrow}>Katalog</p>
                  <h2>Bauteile und Optionen</h2>
                </div>
                <span className={styles.badge}>
                  {selectedComponents.length + selectedAccessories.length + selectedServices.length}
                </span>
              </div>
              <div className={styles.catalog}>
                <section className={styles.catalogSection}>
                  <h3>Komponenten</h3>
                  <div className={styles.catalogGrid}>
                    {visibleComponents.map((item) => {
                      const componentId = componentIdForItem(item);
                      const displayItem = getCatalogDisplayItem(kitchenConfig.components, kitchenSlug, item);

                      return renderCatalogItem(displayItem.item, {
                        selected: isLinkedComponentSelected(kitchenSlug, selectedComponentIds, componentId),
                        price: displayItem.price,
                        infoPdfHref: displayItem.infoPdfHref,
                        onClick: () =>
                          setSelectedComponentIds((current) =>
                            toggleLinkedComponentSelection(kitchenSlug, current, componentId, lockedComponentIds),
                          ),
                      });
                    })}
                  </div>
                </section>

                <section className={styles.catalogSection}>
                  <h3>Zubehoer</h3>
                  <div className={styles.catalogGrid}>
                    {kitchenConfig.accessories.map((item) =>
                      renderCatalogItem(item, {
                        selected: selectedAccessoryCodes.includes(item.code),
                        onClick: () => toggleAccessory(item.code),
                      }),
                    )}
                  </div>
                </section>

                <section className={styles.catalogSection}>
                  <h3>Dienstleistungen</h3>
                  <div className={styles.catalogGrid}>
                    {kitchenConfig.services.map((item) =>
                      renderCatalogItem(item, {
                        selected: selectedServiceCodes.includes(item.code),
                        onClick: () => toggleService(item.code),
                        hint:
                          item.code === "service-montage"
                            ? "Mindestens 3 Artikel, davon 2 Schrank-Komponenten"
                            : item.code === "service-pickup"
                              ? "Nur mit mindestens einem ausgewaehlten Artikel"
                              : "",
                      }),
                    )}
                  </div>
                </section>
              </div>
            </aside>

            <div className={styles.orderPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Bestellung</p>
                  <h2>Kundendaten</h2>
                </div>
              </div>
              <div className={styles.totalsCard}>
                <span>Aktuelle Summe</span>
                <strong>{formatCurrency(grandTotal)}</strong>
                <div className={styles.totalsActions}>
                  <button type="submit" form="order-form" className={styles.primaryButton} disabled={isSubmitting}>
                    {isSubmitting ? "Wird gesendet..." : "Bestellung absenden"}
                  </button>
                </div>
              </div>

              <form id="order-form" className={styles.orderForm} onSubmit={handleSubmit}>
                <div className={styles.field}>
                  <label htmlFor="contractNumber">Vertragsnummer</label>
                  <input id="contractNumber" value={customer.contractNumber} onChange={(event) => updateCustomer("contractNumber", event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="paymentMethod">Zahlungsart</label>
                  <select id="paymentMethod" value={customer.paymentMethod} onChange={(event) => updateCustomer("paymentMethod", event.target.value)}>
                    <option value="">Bitte waehlen</option>
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="klarna">Klarna</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="firstName">Vorname</label>
                  <input id="firstName" required value={customer.firstName} onChange={(event) => updateCustomer("firstName", event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="lastName">Nachname</label>
                  <input id="lastName" required value={customer.lastName} onChange={(event) => updateCustomer("lastName", event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="email">E-Mail</label>
                  <input id="email" type="email" required value={customer.email} onChange={(event) => updateCustomer("email", event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="phone">Telefon</label>
                  <input id="phone" required value={customer.phone} onChange={(event) => updateCustomer("phone", event.target.value)} />
                </div>
                <div className={styles.fieldFull}>
                  <label htmlFor="address1">Adresse</label>
                  <input id="address1" required value={customer.address1} onChange={(event) => updateCustomer("address1", event.target.value)} />
                </div>
                <div className={styles.fieldFull}>
                  <label htmlFor="address2">Adresszusatz</label>
                  <input id="address2" value={customer.address2} onChange={(event) => updateCustomer("address2", event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="postalCode">PLZ</label>
                  <input id="postalCode" required value={customer.postalCode} onChange={(event) => updateCustomer("postalCode", event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="city">Ort</label>
                  <input id="city" required value={customer.city} onChange={(event) => updateCustomer("city", event.target.value)} />
                </div>
                <div className={styles.checkboxRow}>
                  <input
                    id="consent"
                    type="checkbox"
                    checked={customer.consent}
                    onChange={(event) => updateCustomer("consent", event.target.checked)}
                  />
                  <label htmlFor="consent">
                    Ich bestaetige, dass meine Angaben zur Bearbeitung der Bestellung verwendet werden duerfen.
                  </label>
                </div>
              </form>

              <div
                className={[
                  styles.status,
                  statusTone === "error" ? styles.statusError : "",
                  statusTone === "success" ? styles.statusSuccess : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {status}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

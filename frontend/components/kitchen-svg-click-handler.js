"use client";

import { useEffect } from "react";

function strokeToHex(raw) {
  if (!raw?.trim()) return null;
  const color = raw.trim().toLowerCase();
  if (!color.startsWith("rgb")) return color;
  const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return color;
  const h = (v) => `0${Number.parseInt(v, 10).toString(16)}`.slice(-2);
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
}

function componentId(colorKey) {
  return `component-${colorKey.replace(/[^a-z0-9#]/gi, "").toLowerCase()}`;
}

export default function KitchenSvgClickHandler({ kitchenConfig }) {
  useEffect(() => {
    if (!kitchenConfig?.components?.length) return;

    const wrapper = document.getElementById("kitchen-svg-wrapper");
    const svg = wrapper?.querySelector("svg");
    const list = document.getElementById("combined-list");
    if (!wrapper || !svg || !list) return;

    const NS = "http://www.w3.org/2000/svg";

    const lockedIds = new Set(
      [
        ...(kitchenConfig.lockedBaseColors || []),
        ...(kitchenConfig.components || [])
          .filter((c) => c.isLocked && c.colorKey)
          .map((c) => c.colorKey),
      ].map((c) => componentId((c || "").trim().toLowerCase())),
    );

    const byColor = new Map();
    svg
      .querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse")
      .forEach((el) => {
        if (el.closest("[data-component-id]")) return;
        const color = strokeToHex(el.getAttribute("stroke"));
        if (color) {
          if (!byColor.has(color)) byColor.set(color, []);
          byColor.get(color).push(el);
        }
      });

    for (const comp of kitchenConfig.components) {
      const key = (comp.colorKey || "").trim().toLowerCase();
      if (!key) continue;
      const id = componentId(key);
      let g = svg.querySelector(`[data-component-id="${id}"]`);

      if (!g && byColor.has(key)) {
        const els = byColor.get(key);
        const parent = els[0]?.parentNode;
        if (parent) {
          g = document.createElementNS(NS, "g");
          g.dataset.componentId = id;
          parent.insertBefore(g, els[0]);
          els.forEach((el) => g.appendChild(el));
        }
      }

      if (g) {
        g.classList.add("kitchen-component");
        if (comp.price != null) g.dataset.price = String(comp.price);
        if (lockedIds.has(id)) g.classList.add("is-locked", "selected");
      }
    }

    function handleClick(e) {
      const g = e.target.closest("[data-component-id]");
      if (!g || g.classList.contains("is-locked")) return;

      e.stopPropagation();
      e.preventDefault();

      const id = g.dataset.componentId;
      const item = list.querySelector(`[data-target-id="${id}"]`);
      if (!item) return;

      item.classList.toggle("selected");
      g.classList.toggle("selected");
      window.updateTotalPriceAndSummary?.();
    }

    wrapper.addEventListener("click", handleClick, true);
    return () => wrapper.removeEventListener("click", handleClick, true);
  }, [kitchenConfig]);

  return null;
}

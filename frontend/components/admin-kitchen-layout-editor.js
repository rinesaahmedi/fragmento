"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { codePillStyle, mutedTextStyle, primaryButtonStyle } from "./admin-ui";
import { getCompatibilityMessage, isItemCompatibleWithSlot } from "../lib/kitchen-slot-compatibility";

function componentIdForKey(componentKey) {
  return `component-${String(componentKey || "")
    .replace(/[^a-z0-9#-]/gi, "")
    .toLowerCase()}`;
}

function getBounds(group) {
  if (!group || typeof group.getBBox !== "function") {
    return null;
  }

  try {
    const box = group.getBBox();
    if (box && box.width > 0 && box.height > 0) {
      return box;
    }
  } catch {}

  return null;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function applyAdminGroupVisualState(group, { selected }) {
  if (!group) return;

  const emphasisStroke = selected ? "#000000" : null;
  const emphasisWidth = selected ? "3.2" : null;

  group.style.setProperty("opacity", "1", "important");
  group.style.setProperty("filter", selected ? "drop-shadow(0 0 10px rgba(0, 0, 0, 0.18))" : "none", "important");

  group.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse,text").forEach((element) => {
    if (element.classList.contains("admin-component-hitbox")) {
      element.style.setProperty("fill", "transparent", "important");
      element.style.setProperty("stroke", "transparent", "important");
      element.style.setProperty("stroke-width", "0px", "important");
      return;
    }

    if (!element.dataset.originalStroke) {
      element.dataset.originalStroke = element.getAttribute("stroke") || "";
    }
    if (!element.dataset.originalStrokeWidth) {
      element.dataset.originalStrokeWidth = element.getAttribute("stroke-width") || "1";
    }
    if (!element.dataset.originalFill) {
      element.dataset.originalFill = element.getAttribute("fill") || "";
    }

    const originalStroke = element.dataset.originalStroke;
    const originalStrokeWidth = element.dataset.originalStrokeWidth;
    const originalFill = element.dataset.originalFill;

    element.style.setProperty(
      "stroke",
      selected ? (originalStroke === "none" ? "none" : emphasisStroke) : (originalStroke || ""),
      "important",
    );
    element.style.setProperty(
      "stroke-width",
      selected ? emphasisWidth : (originalStrokeWidth || ""),
      "important",
    );
    element.style.setProperty("vector-effect", "non-scaling-stroke", "important");

    if (element.tagName === "text") {
      element.style.setProperty("fill", selected ? "#000000" : (originalFill || ""), "important");
    } else if (selected && originalFill && originalFill !== "none" && originalFill !== "white") {
      element.style.setProperty("fill", "#000000", "important");
    } else if (originalFill) {
      element.style.setProperty("fill", originalFill, "important");
    } else {
      element.style.removeProperty("fill");
    }
  });
}

export function AdminKitchenLayoutEditor({ items, structureSlots, svgMarkup, requestedEditId = "" }) {
  const hostRef = useRef(null);
  const [selectedSlotKey, setSelectedSlotKey] = useState("");

  const componentsBySlot = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      if (item.itemType !== "COMPONENT" || !item.componentKey) continue;
      const bucket = map.get(item.componentKey) || [];
      bucket.push(item);
      map.set(item.componentKey, bucket);
    }
    return map;
  }, [items]);

  const slotsById = useMemo(
    () => new Map(structureSlots.map((slot) => [componentIdForKey(slot.componentKey), slot])),
    [structureSlots],
  );
  const selectedSlot = structureSlots.find((slot) => slot.componentKey === selectedSlotKey) || null;
  const selectedItems = selectedSlot ? componentsBySlot.get(selectedSlot.componentKey) || [] : [];
  const selectedPrimaryItem = selectedItems[0] || null;
  const openSlotCount = structureSlots.filter((slot) => !(componentsBySlot.get(slot.componentKey) || []).length).length;

  useEffect(() => {
    const host = hostRef.current;
    const svg = host?.querySelector("svg");
    if (!host || !svg) return undefined;

    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";

    const namespace = "http://www.w3.org/2000/svg";

    svg.querySelectorAll("[data-component-id]").forEach((group) => {
      const componentId = group.getAttribute("data-component-id") || "";
      const slot = slotsById.get(componentId);
      group.style.cursor = slot ? "pointer" : "default";
      if (!slot) {
        return;
      }

      let hitbox = group.querySelector(".admin-component-hitbox");
      const box = getBounds(group);
      if (!box) return;

      if (!hitbox) {
        hitbox = document.createElementNS(namespace, "rect");
        hitbox.classList.add("admin-component-hitbox");
        hitbox.setAttribute("pointer-events", "all");
        group.appendChild(hitbox);
      }

      hitbox.setAttribute("x", String(box.x - 4));
      hitbox.setAttribute("y", String(box.y - 4));
      hitbox.setAttribute("width", String(box.width + 8));
      hitbox.setAttribute("height", String(box.height + 8));
      hitbox.setAttribute("rx", "6");
      hitbox.setAttribute("ry", "6");
      hitbox.setAttribute("fill", "#ffffff");
      hitbox.setAttribute("fill-opacity", "0.001");
      hitbox.setAttribute("stroke", "none");
    });

    const onClick = (event) => {
      const group = event.target.closest("[data-component-id]");
      if (!group) return;
      const slot = slotsById.get(group.getAttribute("data-component-id") || "");
      if (!slot) return;
      setSelectedSlotKey(slot.componentKey);
    };

    host.addEventListener("click", onClick, true);
    return () => host.removeEventListener("click", onClick, true);
  }, [slotsById]);

  useEffect(() => {
    const svg = hostRef.current?.querySelector("svg");
    if (!svg) return;

    svg.querySelectorAll("[data-component-id]").forEach((group) => {
      const componentId = group.getAttribute("data-component-id") || "";
      const slot = slotsById.get(componentId);
      if (!slot) return;

      const isSelected = slot.componentKey === selectedSlotKey;
      applyAdminGroupVisualState(group, { selected: isSelected });
    });
  }, [componentsBySlot, selectedSlotKey, slotsById]);

  return (
    <div style={layoutGridStyle}>
      <section style={canvasPanelStyle}>
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: "1rem" }}>Kitchen plan</strong>
          <p style={mutedTextStyle}>Click a slot to inspect it, then edit the assigned component from the item card below.</p>
        </div>
        <div style={metricsRowStyle}>
          <span style={pillStyle}>{structureSlots.length} slots</span>
          <span style={pillStyle}>{openSlotCount} open</span>
          <span style={pillStyle}>{items.filter((item) => item.itemType === "COMPONENT").length} components</span>
        </div>
        <div style={svgCanvasStyle}>
          <div ref={hostRef} dangerouslySetInnerHTML={{ __html: svgMarkup }} />
        </div>
      </section>

      <aside style={inspectorStyle}>
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: "1rem" }}>Selected slot</strong>
          {selectedSlot ? (
            <>
              <span style={codePillStyle}>{selectedSlot.label}</span>
              <span style={{ color: "var(--app-text-muted)", fontSize: 13 }}>{selectedSlot.zone}</span>
              {selectedPrimaryItem ? <span style={selectedHintStyle}>Selected in the plan</span> : null}
            </>
          ) : (
            <p style={mutedTextStyle}>No slot selected yet. Click a slot in the plan to inspect it.</p>
          )}
        </div>

        {selectedSlot ? (
          <div style={itemSummaryStyle}>
            {selectedPrimaryItem ? (
              <>
                <strong style={{ fontSize: "1.05rem" }}>{selectedPrimaryItem.name}</strong>
                <span style={{ color: "var(--app-text-muted)", fontSize: 13 }}>{selectedPrimaryItem.code}</span>
                <span style={{ color: "var(--app-text-muted)", fontSize: 13 }}>{formatCurrency(selectedPrimaryItem.price)}</span>
                {!isItemCompatibleWithSlot(selectedPrimaryItem, selectedSlot) ? (
                  <span style={{ color: "var(--app-danger-text)", fontSize: 13 }}>
                    {getCompatibilityMessage(selectedPrimaryItem, selectedSlot)}
                  </span>
                ) : null}
                <a href={`?edit=${encodeURIComponent(selectedPrimaryItem.id)}#item-${selectedPrimaryItem.id}`} style={primaryMiniLinkStyle}>
                  Edit item below
                </a>
              </>
            ) : (
              <>
                <strong style={{ fontSize: "1.05rem" }}>Empty slot</strong>
                <span style={{ color: "var(--app-text-muted)", fontSize: 13 }}>
                  No component is assigned here. Components can only be edited from existing item cards below.
                </span>
              </>
            )}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

const layoutGridStyle = {
  display: "grid",
  gap: 20,
  gridTemplateColumns: "minmax(0, 1.55fr) minmax(280px, 0.7fr)",
  alignItems: "start",
};

const canvasPanelStyle = {
  display: "grid",
  gap: 14,
  borderRadius: 18,
  padding: 18,
  border: "1px solid var(--app-border)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,245,239,0.88))",
};

const inspectorStyle = {
  display: "grid",
  gap: 14,
  borderRadius: 18,
  padding: 18,
  border: "1px solid var(--app-border)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,249,245,0.88))",
};

const svgCanvasStyle = {
  padding: 18,
  borderRadius: 14,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,240,232,0.74))",
  overflow: "auto",
};

const metricsRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const pillStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  color: "var(--app-accent)",
  background: "rgba(143, 62, 44, 0.08)",
};

const itemSummaryStyle = {
  display: "grid",
  gap: 8,
  padding: "14px 16px",
  borderRadius: 14,
  background: "linear-gradient(180deg, rgba(255, 245, 236, 0.98), rgba(255, 250, 246, 0.92))",
  border: "1px solid rgba(143, 62, 44, 0.2)",
  boxShadow: "0 14px 28px rgba(143, 62, 44, 0.08)",
};

const selectedHintStyle = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  color: "#8f3e2c",
  background: "rgba(178, 77, 42, 0.12)",
};

const primaryMiniLinkStyle = {
  ...primaryButtonStyle,
  minHeight: 40,
  padding: "10px 14px",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

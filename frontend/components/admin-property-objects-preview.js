"use client";

import { Fragment, useState } from "react";
import { AdminText } from "./admin-i18n";

const DEFAULT_VISIBLE_OBJECTS = 2;

function propertyObjectAddress(object) {
  const streetLine = [object.address1, object.address2].filter(Boolean).join(", ");
  const cityLine = [object.postalCode, object.city].filter(Boolean).join(" ");
  return [streetLine, cityLine, object.country].filter(Boolean).join(" | ");
}

function propertyObjectContact(object) {
  return object.contactPhone || "";
}

function buildObjectSearchIndex(object) {
  return [
    object.name,
    object.contactPhone,
    object.country,
    object.city,
    object.postalCode,
    object.address1,
    object.address2,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function prioritizeObjects(objects, priorityQuery) {
  const query = String(priorityQuery || "").trim().toLowerCase();
  if (!query) return objects;

  const matching = [];
  const nonMatching = [];

  objects.forEach((object) => {
    if (buildObjectSearchIndex(object).includes(query)) {
      matching.push(object);
      return;
    }
    nonMatching.push(object);
  });

  return [...matching, ...nonMatching];
}

function renderHighlightedText(text, query) {
  const value = String(text || "");
  const needle = String(query || "").trim();
  if (!value || !needle) return value;

  const lowerValue = value.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const parts = [];
  let cursor = 0;

  while (cursor < value.length) {
    const matchIndex = lowerValue.indexOf(lowerNeedle, cursor);
    if (matchIndex === -1) {
      parts.push(value.slice(cursor));
      break;
    }

    if (matchIndex > cursor) {
      parts.push(value.slice(cursor, matchIndex));
    }

    const matchedText = value.slice(matchIndex, matchIndex + needle.length);
    parts.push(
      <mark key={`${matchIndex}-${matchedText}`} style={highlightMarkStyle}>
        {matchedText}
      </mark>,
    );
    cursor = matchIndex + needle.length;
  }

  return parts.map((part, index) => (
    <Fragment key={`${typeof part === "string" ? part : "mark"}-${index}`}>{part}</Fragment>
  ));
}

export default function AdminPropertyObjectsPreview({ objects = [], priorityQuery = "" }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!objects.length) {
    return (
      <span style={emptyObjectPreviewStyle}>
        <AdminText i18nKey="propertyOwnersAdmin.noObjectsConfigured" fallback="No objects configured for this company." />
      </span>
    );
  }

  const prioritizedObjects = prioritizeObjects(objects, priorityQuery);
  const hasOverflow = prioritizedObjects.length > DEFAULT_VISIBLE_OBJECTS;
  const visibleObjects = hasOverflow && !isExpanded
    ? prioritizedObjects.slice(0, DEFAULT_VISIBLE_OBJECTS)
    : prioritizedObjects;
  const hiddenCount = prioritizedObjects.length - DEFAULT_VISIBLE_OBJECTS;

  return (
    <div style={objectPreviewGroupStyle}>
      <div style={objectPreviewListStyle}>
        {visibleObjects.map((object) => {
          const address = propertyObjectAddress(object);
          const contact = propertyObjectContact(object);
          return (
            <div key={object.id} style={objectPreviewCardStyle}>
              <div style={objectPreviewHeaderStyle}>
                <strong>{renderHighlightedText(object.name, priorityQuery)}</strong>
                <span style={objectPreviewCountStyle}>
                  {object._count.contracts} <AdminText i18nKey="kitchensAdmin.contractCount" fallback="contract(s)" />
                </span>
              </div>
              {address ? <span style={objectPreviewAddressStyle}>{renderHighlightedText(address, priorityQuery)}</span> : null}
              {contact ? <span style={objectPreviewMetaStyle}>{renderHighlightedText(contact, priorityQuery)}</span> : null}
            </div>
          );
        })}
      </div>

      {hasOverflow ? (
        <button type="button" onClick={() => setIsExpanded((current) => !current)} style={toggleButtonStyle}>
          {isExpanded ? (
            <AdminText i18nKey="propertyOwnersAdmin.showLessObjects" fallback="Show less" />
          ) : (
            <>
              <AdminText i18nKey="propertyOwnersAdmin.viewMoreObjects" fallback="View more" /> ({hiddenCount})
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

const objectPreviewGroupStyle = {
  display: "grid",
  gap: 8,
};

const objectPreviewListStyle = {
  display: "grid",
  gap: 6,
  minWidth: 320,
  maxWidth: 520,
};

const objectPreviewCardStyle = {
  display: "grid",
  gap: 3,
  padding: "7px 9px",
  borderRadius: 9,
  border: "1px solid rgba(45, 108, 121, 0.14)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(245,250,249,0.72))",
};

const objectPreviewHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  color: "var(--app-text)",
  fontSize: 13,
  lineHeight: 1.2,
};

const objectPreviewCountStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "3px 7px",
  background: "rgba(45, 108, 121, 0.09)",
  color: "var(--app-info-text)",
  fontSize: 11,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const objectPreviewAddressStyle = {
  color: "var(--app-text-muted)",
  fontSize: 12,
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

const objectPreviewMetaStyle = {
  color: "var(--app-info-text)",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

const emptyObjectPreviewStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

const toggleButtonStyle = {
  width: "fit-content",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  borderRadius: 999,
  minHeight: 34,
  padding: "7px 12px",
  background: "rgba(255,255,255,0.88)",
  color: "var(--app-accent)",
  font: "inherit",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "var(--app-shadow-soft)",
};

const highlightMarkStyle = {
  background: "var(--app-highlight-soft)",
  color: "inherit",
  padding: "0 2px",
  borderRadius: 4,
};

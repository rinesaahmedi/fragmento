"use client";

import { useState } from "react";
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

export default function AdminPropertyObjectsPreview({ objects = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!objects.length) {
    return (
      <span style={emptyObjectPreviewStyle}>
        <AdminText i18nKey="propertyOwnersAdmin.noObjectsConfigured" fallback="No objects configured for this company." />
      </span>
    );
  }

  const hasOverflow = objects.length > DEFAULT_VISIBLE_OBJECTS;
  const visibleObjects = hasOverflow && !isExpanded
    ? objects.slice(0, DEFAULT_VISIBLE_OBJECTS)
    : objects;
  const hiddenCount = objects.length - DEFAULT_VISIBLE_OBJECTS;

  return (
    <div style={objectPreviewGroupStyle}>
      <div style={objectPreviewListStyle}>
        {visibleObjects.map((object) => {
          const address = propertyObjectAddress(object);
          const contact = propertyObjectContact(object);
          return (
            <div key={object.id} style={objectPreviewCardStyle}>
              <div style={objectPreviewHeaderStyle}>
                <strong>{object.name}</strong>
                <span style={objectPreviewCountStyle}>
                  {object._count.contracts} <AdminText i18nKey="kitchensAdmin.contractCount" fallback="contract(s)" />
                </span>
              </div>
              {address ? <span style={objectPreviewAddressStyle}>{address}</span> : null}
              {contact ? <span style={objectPreviewMetaStyle}>{contact}</span> : null}
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

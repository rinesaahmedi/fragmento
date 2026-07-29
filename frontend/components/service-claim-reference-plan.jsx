"use client";

import { useState } from "react";

function MarkerUndoLabel({ label }) {
  const text = String(label || "");
  const markerIndex = text.lastIndexOf("X");

  if (markerIndex < 0) return text;

  return (
    <>
      {text.slice(0, markerIndex)}
      <span className="service-claim-reference-plan__undo-x">X</span>
      {text.slice(markerIndex + 1)}
    </>
  );
}

function getRelativePosition(event) {
  const bounds = event.currentTarget.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return null;
  const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
  const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
  return {
    x: Math.round(x * 10000) / 10000,
    y: Math.round(y * 10000) / 10000,
  };
}

export default function ServiceClaimReferencePlan({
  kitchenPlan,
  contractNumber,
  labels,
  markers = [],
  onAddMarker,
  onUndoMarker,
}) {
  const [previewOrientation, setPreviewOrientation] = useState("");
  const pdfPath = String(kitchenPlan?.pdfPath || "").trim();
  const previewImagePath = String(kitchenPlan?.previewImagePath || "").trim();
  if (!pdfPath && !previewImagePath) return null;

  return (
    <div className="service-claim-reference-plan">
      <div className="service-claim-reference-plan__header">
        <div>
          <h3 className="service-claim-reference-plan__title">
            {kitchenPlan.kitchenName || labels.title}
          </h3>
        </div>
        <div className="service-claim-reference-plan__contract">
          <span>{labels.contractLabel}</span>
          <strong>{contractNumber}</strong>
        </div>
      </div>

      {previewImagePath ? (
        <>
          <p className="service-claim-reference-plan__tap-hint">
            {labels.addMarker}
          </p>
          <figure className="service-claim-reference-plan__preview">
            <div
              className={`service-claim-reference-plan__image-stage is-interactive${previewOrientation ? ` is-${previewOrientation}` : ""}`}
              onClick={(event) => {
                const position = getRelativePosition(event);
                if (position) onAddMarker?.(position);
              }}
              role="button"
              tabIndex={0}
              aria-label={labels.addMarker}
            >
              <img
                className="service-claim-reference-plan__image"
                src={previewImagePath}
                alt={labels.previewAlt}
                draggable="false"
                onLoad={(event) => {
                  const image = event.currentTarget;
                  setPreviewOrientation(image.naturalWidth >= image.naturalHeight ? "landscape" : "portrait");
                }}
              />
              <div className="service-claim-plan-markers" aria-hidden="true">
                {markers.map((marker, index) => (
                  <span
                    key={marker.id}
                    className="service-claim-plan-marker"
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                  >
                    X
                  </span>
                ))}
              </div>
            </div>
          </figure>
          {markers.length ? (
            <div className="service-claim-reference-plan__marker-actions">
              <div className="service-claim-reference-plan__marker-summary">
                <span className="service-claim-reference-plan__marker-count">
                  {labels.markerCount.replace("{count}", String(markers.length))}
                </span>
                <span className="service-claim-reference-plan__marker-count-icons" aria-hidden="true">
                  {markers.slice(0, 5).map((marker) => (
                    <span key={marker.id}>X</span>
                  ))}
                  {markers.length > 5 ? <strong>+{markers.length - 5}</strong> : null}
                </span>
              </div>
              <button
                type="button"
                className="service-claim-reference-plan__undo-button"
                onClick={onUndoMarker}
              >
                <MarkerUndoLabel label={labels.undoMarker} />
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="service-claim-reference-plan__preview-unavailable">
          {labels.previewUnavailable}
        </div>
      )}

      {pdfPath ? (
        <a
          className="service-claim-reference-plan__open"
          href={pdfPath}
          target="_blank"
          rel="noreferrer"
        >
          <span aria-hidden="true">↗</span>
          {labels.open}
        </a>
      ) : null}
    </div>
  );
}

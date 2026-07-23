"use client";

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
              className="service-claim-reference-plan__image-stage is-interactive"
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
              <span>{labels.markerCount.replace("{count}", String(markers.length))}</span>
              <button type="button" onClick={onUndoMarker}>
                {labels.undoMarker}
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

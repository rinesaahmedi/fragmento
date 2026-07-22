"use client";

export default function ServiceClaimReferencePlan({
  kitchenPlan,
  contractNumber,
  labels,
}) {
  const pdfPath = String(kitchenPlan?.pdfPath || "").trim();
  const previewImagePath = String(kitchenPlan?.previewImagePath || "").trim();
  if (!pdfPath && !previewImagePath) return null;

  return (
    <div className="service-claim-reference-plan">
      <div className="service-claim-reference-plan__header">
        <div>
          <p className="service-claim-reference-plan__eyebrow">{labels.eyebrow}</p>
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
        <figure className="service-claim-reference-plan__preview">
          <img
            className="service-claim-reference-plan__image"
            src={previewImagePath}
            alt={labels.previewAlt}
          />
        </figure>
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

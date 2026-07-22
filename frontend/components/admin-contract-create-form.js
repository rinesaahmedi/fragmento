"use client";

import { useState } from "react";
import AdminContractLinkFields from "./admin-contract-link-fields";
import AdminSelect from "./admin-select";
import { FormField, inputStyle, primaryButtonStyle } from "./admin-ui";

export default function AdminContractCreateForm({
  kitchens = [],
  owners = [],
  projects = [],
  defaultKitchenId = "",
  defaultHousingCompanyId = "",
  defaultProjectId = "",
  returnTo = "/admin/contracts",
}) {
  const [contractType, setContractType] = useState("");

  return (
    <div style={rootStyle}>
      <div role="group" aria-label="Contract type" style={typeGridStyle}>
        <button
          type="button"
          aria-pressed={contractType === "ARC"}
          onClick={() => setContractType("ARC")}
          style={contractType === "ARC" ? selectedTypeButtonStyle : typeButtonStyle}
        >
          <strong style={typeTitleStyle}>ARC</strong>
          <span style={typeDescriptionStyle}>Contract number and kitchen sketch only</span>
        </button>
        <button
          type="button"
          aria-pressed={contractType === "FRG"}
          onClick={() => setContractType("FRG")}
          style={contractType === "FRG" ? selectedTypeButtonStyle : typeButtonStyle}
        >
          <strong style={typeTitleStyle}>FRG</strong>
          <span style={typeDescriptionStyle}>Kitchen, project and housing-company contract</span>
        </button>
      </div>

      {!contractType ? (
        <p style={choiceHintStyle}>Choose ARC or FRG to continue.</p>
      ) : null}

      {contractType === "ARC" ? (
        <form
          key="arc-contract"
          action="/api/admin/contracts"
          method="post"
          encType="multipart/form-data"
          style={arcFormStyle}
        >
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="contractType" value="ARC" />
          <FormField label="Contract number">
            <input name="contractNumber" placeholder="222" style={compactInputStyle} required />
          </FormField>
          <FormField label="Kitchen sketch (JPG, PNG, or WebP)">
            <input
              type="file"
              name="claimPlanPreviewFile"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              style={compactInputStyle}
              required
            />
          </FormField>
          <div style={actionStyle}>
            <button type="submit" style={primaryButtonStyle}>Create ARC contract</button>
          </div>
        </form>
      ) : null}

      {contractType === "FRG" ? (
        <form
          key="frg-contract"
          action="/api/admin/contracts"
          method="post"
          encType="multipart/form-data"
          style={frgFormStyle}
        >
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="contractType" value="FRG" />
          <FormField label="Kitchen">
            <AdminSelect name="kitchenId" defaultValue={defaultKitchenId || ""} style={compactInputStyle}>
              <option value="">Select kitchen</option>
              {kitchens.map((kitchen) => (
                <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>
              ))}
            </AdminSelect>
          </FormField>
          <FormField label="Contract number">
            <input name="contractNumber" placeholder="670123456" style={compactInputStyle} required />
          </FormField>
          <FormField label="Kitchen sketch (JPG, PNG, or WebP)">
            <input
              type="file"
              name="claimPlanPreviewFile"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              style={compactInputStyle}
            />
          </FormField>
          <FormField label="Original kitchen plan (PDF, optional)">
            <input
              type="file"
              name="claimPlanPdfFile"
              accept="application/pdf,.pdf"
              style={compactInputStyle}
            />
          </FormField>
          <AdminContractLinkFields
            owners={owners}
            projects={projects}
            defaultHousingCompanyId={defaultHousingCompanyId}
            defaultProjectId={defaultProjectId}
            allowInlineObjectCreate
            compact
            contract={{}}
          />
          <div style={actionStyle}>
            <button type="submit" style={primaryButtonStyle}>Create FRG contract</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

const rootStyle = {
  display: "grid",
  gap: 18,
  paddingTop: 6,
};

const typeGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(180px, 280px))",
  gap: 12,
};

const typeButtonStyle = {
  display: "grid",
  gap: 5,
  minHeight: 88,
  padding: "16px 18px",
  borderRadius: 12,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.86)",
  color: "var(--app-text)",
  textAlign: "left",
  cursor: "pointer",
};

const selectedTypeButtonStyle = {
  ...typeButtonStyle,
  border: "2px solid var(--app-accent)",
  background: "var(--app-accent-soft)",
  boxShadow: "0 8px 20px rgba(99, 67, 47, 0.10)",
};

const typeTitleStyle = {
  fontSize: 20,
  lineHeight: 1.1,
};

const typeDescriptionStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.35,
};

const choiceHintStyle = {
  margin: 0,
  color: "var(--app-text-muted)",
  fontSize: 14,
};

const arcFormStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(180px, 260px) minmax(280px, 440px)",
  gap: 14,
  alignItems: "end",
  maxWidth: 760,
};

const frgFormStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  alignItems: "start",
};

const compactInputStyle = {
  ...inputStyle,
  minHeight: 42,
  padding: "7px 10px",
  fontSize: "0.92rem",
};

const actionStyle = {
  gridColumn: "1 / -1",
  paddingTop: 2,
};

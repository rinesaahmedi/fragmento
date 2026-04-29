"use client";

import { useEffect, useState } from "react";
import { FormField, actionRowStyle, inputStyle, secondaryButtonStyle } from "./admin-ui";
import { AdminText } from "./admin-i18n";
import AdminContractAddressFields from "./admin-contract-address-fields";
import { projectLabel } from "../lib/property-projects";

export default function AdminContractLinkFields({
  owners = [],
  projects = [],
  defaultHousingCompanyId = "",
  defaultProjectId = "",
  contract = {},
  compact = false,
  allowInlineObjectCreate = false,
}) {
  const [housingCompanyId, setHousingCompanyId] = useState(defaultHousingCompanyId || "");
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [createObjectOpen, setCreateObjectOpen] = useState(false);

  const filteredProjects = projects.filter((project) => project.housingCompanyId === housingCompanyId);
  const fieldStyle = compact ? compactInputStyle : inputStyle;

  useEffect(() => {
    if (!housingCompanyId) {
      setProjectId("");
      setCreateObjectOpen(false);
      return;
    }

    if (createObjectOpen) return;
    if (filteredProjects.some((project) => project.id === projectId)) return;
    setProjectId(filteredProjects[0]?.id || "");
  }, [createObjectOpen, filteredProjects, housingCompanyId, projectId]);

  const objectFieldNames = {
    name: "inlineObjectName",
    projectName: "inlineProjectName",
    contactPhone: "inlineObjectContactPhone",
    country: "inlineObjectCountry",
    city: "inlineObjectCity",
    postalCode: "inlineObjectPostalCode",
    address1: "inlineObjectAddress1",
    address2: "inlineObjectAddress2",
    addressVerification: "inlineObjectAddressVerification",
  };

  return (
    <>
      <FormField label={<AdminText i18nKey="contractsAdmin.owner" fallback="Housing company" />}>
        <select
          name="housingCompanyId"
          value={housingCompanyId}
          style={fieldStyle}
          required
          onChange={(event) => {
            setHousingCompanyId(event.target.value);
            setProjectId("");
            setCreateObjectOpen(false);
          }}
        >
          <option value=""><AdminText i18nKey="contractsAdmin.selectHousingCompany" fallback="Select housing company" /></option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={<AdminText i18nKey="contractsAdmin.project" fallback="Project / object" />}>
        <select
          name="projectId"
          value={createObjectOpen ? "" : projectId}
          style={fieldStyle}
          required={!createObjectOpen}
          disabled={!housingCompanyId || createObjectOpen}
          onChange={(event) => setProjectId(event.target.value)}
        >
          <option value="">
            {!housingCompanyId
              ? "Select housing company first"
              : filteredProjects.length
                ? "Select project/object"
                : "No existing projects"}
          </option>
          {filteredProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {projectLabel(project.name, project.propertyObject?.name)}
            </option>
          ))}
        </select>
      </FormField>

      {allowInlineObjectCreate ? (
        <div style={inlineObjectPanelStyle}>
          <div style={actionRowStyle}>
            {!createObjectOpen ? (
              <button
                type="button"
                disabled={!housingCompanyId}
                onClick={() => {
                  setCreateObjectOpen(true);
                  setProjectId("");
                }}
                style={compact ? compactSecondaryButtonStyle : secondaryButtonStyle}
              >
                <AdminText i18nKey="propertyOwnersAdmin.addObject" fallback="Add object" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCreateObjectOpen(false);
                  setProjectId(filteredProjects[0]?.id || "");
                }}
                style={compact ? compactSecondaryButtonStyle : secondaryButtonStyle}
              >
                <AdminText i18nKey="contractsAdmin.useExistingProject" fallback="Use existing project" />
              </button>
            )}
          </div>

          {createObjectOpen ? (
            <div style={inlineObjectBodyStyle}>
              <FormField label={<AdminText i18nKey="propertyOwnersAdmin.objectName" fallback="Object/building name" />} wide>
                <input name={objectFieldNames.name} placeholder="Building A" style={fieldStyle} required />
              </FormField>
              <FormField label={<AdminText i18nKey="propertyOwnersAdmin.projectName" fallback="Project name" />}>
                <input name={objectFieldNames.projectName} placeholder="Project A" style={fieldStyle} required />
              </FormField>
              <FormField label={<AdminText i18nKey="propertyOwnersAdmin.objectContactPhone" fallback="Object contact phone" />}>
                <input name={objectFieldNames.contactPhone} placeholder="+49 170 1234567" style={fieldStyle} />
              </FormField>
              <AdminContractAddressFields
                mode="object"
                compact={compact}
                includeUnitFields={false}
                includeNotes={false}
                referenceFieldName={objectFieldNames.name}
                fieldNames={objectFieldNames}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <FormField label={<AdminText i18nKey="contractAddressFields.floor" fallback="Floor" />}>
        <input name="floor" defaultValue={contract.floor || ""} style={fieldStyle} />
      </FormField>
      <FormField label={<AdminText i18nKey="contractAddressFields.unitNumber" fallback="Unit number" />}>
        <input name="unitNumber" defaultValue={contract.unitNumber || ""} style={fieldStyle} />
      </FormField>
      <FormField label={<AdminText i18nKey="contractAddressFields.notes" fallback="Notes" />} wide>
        <textarea name="notes" defaultValue={contract.notes || ""} rows={compact ? 2 : 3} style={compact ? compactTextareaStyle : defaultTextareaStyle} />
      </FormField>
    </>
  );
}

const compactInputStyle = {
  ...inputStyle,
  minHeight: 38,
  padding: "6px 10px",
  fontSize: "0.92rem",
};

const defaultTextareaStyle = {
  ...inputStyle,
  minHeight: 92,
  padding: "10px 14px",
  resize: "vertical",
};

const compactTextareaStyle = {
  ...defaultTextareaStyle,
  minHeight: 58,
  padding: "6px 10px",
  fontSize: "0.92rem",
  lineHeight: 1.35,
};

const compactSecondaryButtonStyle = {
  ...secondaryButtonStyle,
  minHeight: 38,
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: "0.88rem",
};

const inlineObjectPanelStyle = {
  display: "grid",
  gap: 10,
  gridColumn: "1 / -1",
};

const inlineObjectBodyStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  background: "rgba(255,255,255,0.78)",
};

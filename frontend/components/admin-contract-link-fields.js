"use client";

import { useEffect, useState } from "react";
import { FormField, actionRowStyle, inputStyle, primaryButtonStyle, secondaryButtonStyle } from "./admin-ui";
import { AdminText } from "./admin-i18n";
import AdminContractAddressFields from "./admin-contract-address-fields";

export default function AdminContractLinkFields({
  owners = [],
  propertyObjects = [],
  defaultHousingCompanyId = "",
  defaultPropertyObjectId = "",
  contract = {},
  compact = false,
  allowInlineObjectCreate = false,
  showUnassignedToggle = true,
}) {
  const hasInitialLink = Boolean(defaultHousingCompanyId && defaultPropertyObjectId);
  const [mode, setMode] = useState(hasInitialLink ? "linked" : "unassigned");
  const [housingCompanyId, setHousingCompanyId] = useState(defaultHousingCompanyId || "");
  const [propertyObjectId, setPropertyObjectId] = useState(defaultPropertyObjectId || "");
  const [createObjectOpen, setCreateObjectOpen] = useState(false);

  const filteredObjects = propertyObjects.filter((object) => object.housingCompanyId === housingCompanyId);
  const fieldStyle = compact ? compactInputStyle : inputStyle;

  useEffect(() => {
    if (mode !== "linked") return;

    if (!housingCompanyId) {
      setPropertyObjectId("");
      setCreateObjectOpen(false);
      return;
    }

    if (createObjectOpen) return;
    if (filteredObjects.some((object) => object.id === propertyObjectId)) return;
    setPropertyObjectId(filteredObjects[0]?.id || "");
  }, [createObjectOpen, filteredObjects, housingCompanyId, mode, propertyObjectId]);

  const objectFieldNames = {
    name: "inlineObjectName",
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
      {showUnassignedToggle ? (
        <div style={modeToggleWrapStyle}>
          <button
            type="button"
            onClick={() => {
              setMode("unassigned");
              setCreateObjectOpen(false);
            }}
            style={mode === "unassigned" ? activeModeButtonStyle : inactiveModeButtonStyle}
          >
            <AdminText i18nKey="contractsAdmin.unassignedContract" fallback="Unassigned contract" />
          </button>
          <button
            type="button"
            onClick={() => setMode("linked")}
            style={mode === "linked" ? activeModeButtonStyle : inactiveModeButtonStyle}
          >
            <AdminText i18nKey="contractsAdmin.linkedContract" fallback="Linked to object" />
          </button>
        </div>
      ) : null}

      {mode !== "linked" ? (
        <>
          <input type="hidden" name="housingCompanyId" value="" />
          <input type="hidden" name="propertyObjectId" value="" />
          <FormField label={<AdminText i18nKey="contractAddressFields.building" fallback="Building" />}>
            <input name="building" defaultValue={contract.building || ""} style={fieldStyle} />
          </FormField>
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
      ) : (
        <>
          <FormField label={<AdminText i18nKey="contractsAdmin.owner" fallback="Housing company" />}>
            <select
              name="housingCompanyId"
              value={housingCompanyId}
              style={fieldStyle}
              required
              onChange={(event) => {
                setHousingCompanyId(event.target.value);
                setPropertyObjectId("");
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

          <FormField label={<AdminText i18nKey="contractsAdmin.propertyObject" fallback="Property object" />}>
            <select
              name="propertyObjectId"
              value={createObjectOpen ? "" : propertyObjectId}
              style={fieldStyle}
              required={!createObjectOpen}
              disabled={!housingCompanyId || createObjectOpen}
              onChange={(event) => setPropertyObjectId(event.target.value)}
            >
              <option value="">
                {!housingCompanyId
                  ? "Select housing company first"
                  : filteredObjects.length
                    ? "Select object/building"
                    : "No existing objects"}
              </option>
              {filteredObjects.map((object) => (
                <option key={object.id} value={object.id}>
                  {object.name}
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
                      setPropertyObjectId("");
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
                      setPropertyObjectId(filteredObjects[0]?.id || "");
                    }}
                    style={compact ? compactSecondaryButtonStyle : secondaryButtonStyle}
                  >
                    <AdminText i18nKey="contractsAdmin.useExistingObject" fallback="Use existing object" />
                  </button>
                )}
              </div>

              {createObjectOpen ? (
                <div style={inlineObjectBodyStyle}>
                  <FormField label={<AdminText i18nKey="propertyOwnersAdmin.objectName" fallback="Object/building name" />} wide>
                    <input name={objectFieldNames.name} placeholder="Building A" style={fieldStyle} required />
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
      )}
    </>
  );
}

const modeToggleWrapStyle = {
  display: "flex",
  gap: 8,
  gridColumn: "1 / -1",
  flexWrap: "wrap",
};

const activeModeButtonStyle = {
  ...primaryButtonStyle,
  minHeight: 42,
  borderRadius: 10,
  padding: "9px 14px",
  fontSize: "0.92rem",
  boxShadow: "0 10px 20px rgba(143, 62, 44, 0.16)",
};

const inactiveModeButtonStyle = {
  ...secondaryButtonStyle,
  minHeight: 42,
  borderRadius: 10,
  padding: "9px 14px",
  fontSize: "0.92rem",
};

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

"use client";

import { useState } from "react";
import AdminContractAddressFields from "./admin-contract-address-fields";
import { useAdminI18n } from "./admin-i18n";
import {
  FormField,
  actionRowStyle,
  inputStyle,
  mutedTextStyle,
  secondaryButtonStyle,
} from "./admin-ui";

function createObjectDraft(id) {
  return { id };
}

function objectFieldNames(id) {
  return {
    name: `objectName__${id}`,
    contactPhone: `objectContactPhone__${id}`,
    country: `objectCountry__${id}`,
    city: `objectCity__${id}`,
    postalCode: `objectPostalCode__${id}`,
    address1: `objectAddress1__${id}`,
    address2: `objectAddress2__${id}`,
    addressVerification: `objectAddressVerification__${id}`,
  };
}

export default function AdminPropertyOwnerObjectBuilder() {
  const { translate } = useAdminI18n();
  const [nextId, setNextId] = useState(0);
  const [drafts, setDrafts] = useState([]);

  function handleAddObject() {
    setDrafts((current) => [...current, createObjectDraft(nextId)]);
    setNextId((current) => current + 1);
  }

  function handleRemoveObject(id) {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  }

  return (
    <div style={builderStyle}>
      <div style={builderHeaderStyle}>
        <div style={{ display: "grid", gap: 4 }}>
          <strong style={builderTitleStyle}>
            {translate("propertyOwnersAdmin.objectsToCreate", "Objects/buildings to create")}
          </strong>
          <p style={mutedTextStyle}>
            {translate("propertyOwnersAdmin.objectsOptionalHelp", "Add one or more objects now, or leave this section empty.")}
          </p>
        </div>
        <button type="button" onClick={handleAddObject} style={secondaryButtonStyle}>
          {translate("propertyOwnersAdmin.addAnotherObject", "Add another object")}
        </button>
      </div>

      {!drafts.length ? (
        <p style={mutedTextStyle}>
          {translate("propertyOwnersAdmin.noPendingObjects", "No objects queued for creation yet.")}
        </p>
      ) : null}

      <div style={draftListStyle}>
        {drafts.map((draft, index) => {
          const fieldNames = objectFieldNames(draft.id);

          return (
            <section key={draft.id} style={draftCardStyle}>
              <div style={draftCardHeaderStyle}>
                <strong style={draftLabelStyle}>
                  {translate("propertyOwnersAdmin.objectDraftLabel", "Object")} {index + 1}
                </strong>
                <button type="button" onClick={() => handleRemoveObject(draft.id)} style={removeButtonStyle}>
                  {translate("propertyOwnersAdmin.removeObject", "Remove object")}
                </button>
              </div>

              <div style={draftGridStyle}>
                <FormField label={translate("propertyOwnersAdmin.objectName", "Object/building name")}>
                  <input
                    name={fieldNames.name}
                    placeholder={translate("propertyOwnersAdmin.objectNamePlaceholder", "Building A")}
                    style={inputStyle}
                  />
                </FormField>
                <FormField label={translate("propertyOwnersAdmin.objectContactPhone", "Object contact phone")}>
                  <input
                    name={fieldNames.contactPhone}
                    placeholder={translate("propertyOwnersAdmin.objectContactPhonePlaceholder", "+49 170 1234567")}
                    style={inputStyle}
                  />
                </FormField>
                <AdminContractAddressFields
                  mode="object"
                  includeUnitFields={false}
                  includeNotes={false}
                  referenceFieldName={fieldNames.name}
                  fieldNames={fieldNames}
                  allowEmpty
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

const builderStyle = {
  display: "grid",
  gap: 14,
  padding: 18,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  borderRadius: 18,
  background: "linear-gradient(180deg, rgba(255,255,255,0.86), rgba(255,247,240,0.72))",
};

const builderHeaderStyle = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
};

const builderTitleStyle = {
  color: "var(--app-text)",
  fontSize: 15,
};

const draftListStyle = {
  display: "grid",
  gap: 12,
};

const draftCardStyle = {
  display: "grid",
  gap: 12,
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(45, 108, 121, 0.12)",
  background: "rgba(255,255,255,0.78)",
};

const draftCardHeaderStyle = {
  ...actionRowStyle,
  justifyContent: "space-between",
};

const draftLabelStyle = {
  color: "var(--app-text)",
  fontSize: 14,
};

const draftGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  alignItems: "start",
};

const removeButtonStyle = {
  border: "1px solid rgba(180, 71, 57, 0.16)",
  borderRadius: 12,
  minHeight: 42,
  padding: "9px 12px",
  background: "rgba(255, 247, 245, 0.9)",
  color: "var(--app-danger-text)",
  font: "inherit",
  fontWeight: 700,
  cursor: "pointer",
};

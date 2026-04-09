import { ItemType, KitchenStatus } from "@prisma/client";
import {
  ActionLink,
  AdminSection,
  FlashMessage,
  FormField,
  StatusBadge,
  TypeBadge,
  actionRowStyle,
  cardListStyle,
  checkboxRowStyle,
  formGridStyle,
  inputStyle,
  itemCardStyle,
  itemHeaderStyle,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  subMetaStyle,
  textareaStyle,
} from "../../../../components/admin-ui";
import { AdminShell } from "../../../../components/admin-shell";
import { AdminComponentSlotPicker } from "../../../../components/admin-component-slot-picker";
import { AdminKitchenLayoutEditor } from "../../../../components/admin-kitchen-layout-editor";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminPage } from "../../../../lib/auth";
import { getKitchenById } from "../../../../lib/catalog";
import { getKitchenStructureSlots } from "../../../../lib/kitchen-structure";
import { loadKitchenSvgMarkup } from "../../../../lib/load-kitchen-svg";

export const dynamic = "force-dynamic";

const ITEM_TYPE_OPTIONS = Object.values(ItemType);
const KITCHEN_STATUS_OPTIONS = Object.values(KitchenStatus);

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function serializeKitchenItem(item) {
  return {
    id: item.id,
    kitchenId: item.kitchenId,
    itemType: item.itemType,
    code: item.code,
    name: item.name,
    price: Number(item.price),
    infoText: item.infoText || "",
    iconKey: item.iconKey || "",
    colorKey: item.colorKey || "",
    componentKey: item.componentKey || "",
    isLocked: item.isLocked,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt || ""),
    updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : String(item.updatedAt || ""),
  };
}

export default async function AdminKitchenDetailPage({ params, searchParams }) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const kitchen = await getKitchenById(id);

  if (!kitchen) {
    return (
      <AdminShell adminEmail={admin.email}>
        <div style={pageGridStyle}>
          <AdminSection title="Kitchen not found" description="The requested kitchen record does not exist.">
            <ActionLink href="/admin/kitchens">Back to kitchens</ActionLink>
          </AdminSection>
        </div>
      </AdminShell>
    );
  }

  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const structureSlots = getKitchenStructureSlots(kitchen.slug);
  const requestedEditId =
    typeof resolvedSearchParams.edit === "string" && resolvedSearchParams.edit.trim()
      ? resolvedSearchParams.edit.trim()
      : "";
  const serializedItems = kitchen.items.map(serializeKitchenItem);
  const occupiedByKey = kitchen.items.reduce((acc, item) => {
    if (!item.componentKey) return acc;
    acc[item.componentKey] = [...(acc[item.componentKey] || []), item.name];
    return acc;
  }, {});
  const svgMarkup = structureSlots.length ? await loadKitchenSvgMarkup(kitchen.slug).catch(() => "") : "";

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={kitchen.name}
          description="Edit the core kitchen definition used by the public configurator."
          actions={
            <div style={actionRowStyle}>
              <ActionLink href="/admin/kitchens">
                Back to kitchens
              </ActionLink>
              <ActionLink href={`/kitchens/${kitchen.slug}`}>Open public page</ActionLink>
            </div>
          }
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <form action={`/api/admin/kitchens/${kitchen.id}`} method="post" style={formGridStyle}>
            <FormField label="Kitchen name">
              <input name="name" defaultValue={kitchen.name} style={inputStyle} required />
            </FormField>
            <FormField label="Slug">
              <input name="slug" defaultValue={kitchen.slug} style={inputStyle} required />
            </FormField>
            <FormField label="Status">
              <select name="status" defaultValue={kitchen.status} style={inputStyle}>
                {KITCHEN_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Description" wide>
              <textarea
                name="description"
                defaultValue={kitchen.description || ""}
                rows={4}
                style={textareaStyle}
              />
            </FormField>
            <div style={{ gridColumn: "1 / -1", ...actionRowStyle }}>
              <button type="submit" style={primaryButtonStyle}>Save kitchen</button>
              <StatusBadge status={kitchen.status} />
            </div>
          </form>
        </AdminSection>

        {svgMarkup ? (
          <AdminSection
            title="Layout editor"
            description="Inspect the kitchen layout by clicking slots on the plan, then open the assigned component card to edit it."
          >
            <AdminKitchenLayoutEditor
              items={serializedItems}
              structureSlots={structureSlots}
              svgMarkup={svgMarkup}
              requestedEditId={requestedEditId}
            />
          </AdminSection>
        ) : null}

        <AdminSection
          title="Add extra item"
          description="Create accessories or services for this kitchen. Components are edited only through the existing item cards below."
        >
          <form action={`/api/admin/kitchens/${kitchen.id}/items`} method="post" style={formGridStyle}>
            <FormField label="Item type">
              <select name="itemType" defaultValue={ItemType.ACCESSORY} style={inputStyle}>
                {[ItemType.ACCESSORY, ItemType.SERVICE].map((itemType) => (
                  <option key={itemType} value={itemType}>
                    {itemType}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Code">
              <input name="code" style={inputStyle} required />
            </FormField>
            <FormField label="Name">
              <input name="name" style={inputStyle} required />
            </FormField>
            <FormField label="Price">
              <input name="price" defaultValue="0.00" style={inputStyle} required />
            </FormField>
            <FormField label="Icon key">
              <input name="iconKey" style={inputStyle} />
            </FormField>
            <FormField label="Color key">
              <input name="colorKey" style={inputStyle} />
            </FormField>
            <FormField label="Sort order">
              <input name="sortOrder" defaultValue="0" style={inputStyle} />
            </FormField>
            <FormField label="Info text" wide>
              <textarea name="infoText" rows={3} style={textareaStyle} />
            </FormField>
            <div style={{ gridColumn: "1 / -1", ...checkboxRowStyle }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" name="isLocked" value="true" />
                <span>Locked item</span>
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" name="isActive" value="true" defaultChecked />
                <span>Active item</span>
              </label>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" style={primaryButtonStyle}>Create extra item</button>
            </div>
          </form>
        </AdminSection>

        <AdminSection
          title="Catalog items"
          description="Compact item cards. Open only the component you want to edit."
        >
          <div style={cardListStyle}>
            {!kitchen.items.length ? <p style={mutedTextStyle}>No items configured for this kitchen.</p> : null}
            {kitchen.items.map((item) => {
              const slot = structureSlots.find((entry) => entry.componentKey === item.componentKey);
              const isRequestedEdit = requestedEditId === item.id;

              return (
                <details key={item.id} id={`item-${item.id}`} open={isRequestedEdit} style={isRequestedEdit ? highlightedCompactItemCardStyle : compactItemCardStyle}>
                  <summary style={compactSummaryStyle}>
                    <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <strong style={{ fontSize: "1.05rem" }}>{item.name}</strong>
                      <div style={subMetaStyle}>
                        <TypeBadge label={item.itemType} />
                        <span>{item.code}</span>
                        <span>{formatCurrency(item.price)}</span>
                        <span>{slot ? slot.label : "No slot"}</span>
                      </div>
                    </div>
                    <div style={{ ...actionRowStyle, justifyContent: "flex-end" }}>
                      <StatusBadge status={item.isActive ? "ACTIVE" : "ARCHIVED"} />
                      <span style={editHintStyle}>Edit</span>
                    </div>
                  </summary>

                  <form action={`/api/admin/items/${item.id}`} method="post" style={compactFormStyle}>
                    <div style={compactTopGridStyle}>
                      <FormField label="Item type" wide={false}>
                        <select name="itemType" defaultValue={item.itemType} style={compactInputStyle}>
                          {ITEM_TYPE_OPTIONS.map((itemType) => (
                            <option key={itemType} value={itemType}>
                              {itemType}
                            </option>
                          ))}
                        </select>
                      </FormField>
                      <FormField label="Code" wide={false}>
                        <input name="code" defaultValue={item.code} style={compactInputStyle} required />
                      </FormField>
                      <FormField label="Name" wide={false}>
                        <input name="name" defaultValue={item.name} style={compactInputStyle} required />
                      </FormField>
                      <FormField label="Price" wide={false}>
                        <input name="price" defaultValue={String(item.price)} style={compactInputStyle} required />
                      </FormField>
                      <FormField label="Icon key" wide={false}>
                        <input name="iconKey" defaultValue={item.iconKey || ""} style={compactInputStyle} />
                      </FormField>
                      <FormField label="Color key" wide={false}>
                        <input name="colorKey" defaultValue={item.colorKey || ""} style={compactInputStyle} />
                      </FormField>
                      <FormField label="Sort" wide={false}>
                        <input name="sortOrder" defaultValue={String(item.sortOrder)} style={compactInputStyle} />
                      </FormField>
                    </div>

                    {item.itemType === ItemType.COMPONENT ? (
                      <div style={compactComponentRowStyle}>
                        <AdminComponentSlotPicker
                          name="componentKey"
                          slots={structureSlots}
                          defaultValue={item.componentKey || ""}
                          occupiedByKey={occupiedByKey}
                          allowOccupiedKey={item.componentKey || ""}
                          helperText="Use the compact slot selector to remap the component."
                          compact
                        />
                      </div>
                    ) : null}

                    <FormField label="Info text" wide>
                      <textarea name="infoText" defaultValue={item.infoText || ""} rows={2} style={compactTextareaStyle} />
                    </FormField>

                    <div style={compactFooterStyle}>
                      <div style={checkboxRowStyle}>
                        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="checkbox" name="isLocked" value="true" defaultChecked={item.isLocked} />
                          <span>Locked item</span>
                        </label>
                        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="checkbox" name="isActive" value="true" defaultChecked={item.isActive} />
                          <span>Active item</span>
                        </label>
                      </div>
                      <div style={actionRowStyle}>
                        <button type="submit" style={primaryButtonStyle}>Save item</button>
                        <button type="submit" name="_intent" value="delete" style={secondaryButtonStyle}>
                          Delete item
                        </button>
                      </div>
                    </div>
                  </form>
                </details>
              );
            })}
          </div>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const compactItemCardStyle = {
  ...itemCardStyle,
  padding: 0,
  gap: 0,
  overflow: "hidden",
};

const highlightedCompactItemCardStyle = {
  ...compactItemCardStyle,
  border: "1px solid rgba(143, 62, 44, 0.28)",
  boxShadow: "0 18px 36px rgba(143, 62, 44, 0.12)",
  background: "linear-gradient(180deg, rgba(255,248,242,0.98), rgba(255,255,255,0.98))",
};

const compactSummaryStyle = {
  ...itemHeaderStyle,
  listStyle: "none",
  cursor: "pointer",
  padding: "14px 16px",
  margin: 0,
};

const compactFormStyle = {
  display: "grid",
  gap: 8,
  padding: "0 14px 12px",
  borderTop: "1px solid var(--app-border)",
};

const compactTopGridStyle = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  alignItems: "start",
};

const compactComponentRowStyle = {
  display: "grid",
  gap: 6,
  alignItems: "start",
};

const compactInputStyle = {
  ...inputStyle,
  minHeight: 38,
  padding: "6px 10px",
  fontSize: "0.92rem",
};

const compactTextareaStyle = {
  ...textareaStyle,
  minHeight: 42,
  padding: "6px 10px",
  fontSize: "0.92rem",
  lineHeight: 1.35,
};

const compactFooterStyle = {
  ...checkboxRowStyle,
  justifyContent: "space-between",
  gap: 10,
};

const editHintStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

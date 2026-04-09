import { ItemType, KitchenStatus } from "@prisma/client";
import Link from "next/link";
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
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminPage } from "../../../../lib/auth";
import { getKitchenById } from "../../../../lib/catalog";
import { getKitchenStructureSlots } from "../../../../lib/kitchen-structure";

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

        <AdminSection
          title="Add item"
          description="Create a new component, accessory, or service inside this kitchen."
        >
          <form action={`/api/admin/kitchens/${kitchen.id}/items`} method="post" style={formGridStyle}>
            <FormField label="Item type">
              <select name="itemType" defaultValue={ItemType.COMPONENT} style={inputStyle}>
                {ITEM_TYPE_OPTIONS.map((itemType) => (
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
            <FormField label="Component slot">
              <select name="componentKey" defaultValue="" style={inputStyle}>
                <option value="">None</option>
                {structureSlots.map((slot) => (
                  <option key={slot.componentKey} value={slot.componentKey}>
                    {slot.label} ({slot.zone})
                  </option>
                ))}
              </select>
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
              <button type="submit" style={primaryButtonStyle}>Create item</button>
            </div>
          </form>
        </AdminSection>

        <AdminSection
          title="Catalog items"
          description="Update existing items inline. Save each card separately."
        >
          <div style={cardListStyle}>
            {!kitchen.items.length ? <p style={mutedTextStyle}>No items configured for this kitchen.</p> : null}
            {kitchen.items.map((item) => {
              const slot = structureSlots.find((entry) => entry.componentKey === item.componentKey);

              return (
                <article key={item.id} style={itemCardStyle}>
                  <div style={itemHeaderStyle}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <strong style={{ fontSize: "1.15rem" }}>{item.name}</strong>
                      <div style={subMetaStyle}>
                        <TypeBadge label={item.itemType} />
                        <span>{item.code}</span>
                        <span>{formatCurrency(item.price)}</span>
                        {slot ? <span>{slot.label}</span> : null}
                      </div>
                    </div>
                    <div style={actionRowStyle}>
                      <StatusBadge status={item.isActive ? "ACTIVE" : "ARCHIVED"} />
                    </div>
                  </div>

                  <form action={`/api/admin/items/${item.id}`} method="post" style={formGridStyle}>
                    <FormField label="Item type">
                      <select name="itemType" defaultValue={item.itemType} style={inputStyle}>
                        {ITEM_TYPE_OPTIONS.map((itemType) => (
                          <option key={itemType} value={itemType}>
                            {itemType}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Code">
                      <input name="code" defaultValue={item.code} style={inputStyle} required />
                    </FormField>
                    <FormField label="Name">
                      <input name="name" defaultValue={item.name} style={inputStyle} required />
                    </FormField>
                    <FormField label="Price">
                      <input name="price" defaultValue={String(item.price)} style={inputStyle} required />
                    </FormField>
                    <FormField label="Icon key">
                      <input name="iconKey" defaultValue={item.iconKey || ""} style={inputStyle} />
                    </FormField>
                    <FormField label="Color key">
                      <input name="colorKey" defaultValue={item.colorKey || ""} style={inputStyle} />
                    </FormField>
                    <FormField label="Component slot">
                      <select name="componentKey" defaultValue={item.componentKey || ""} style={inputStyle}>
                        <option value="">None</option>
                        {structureSlots.map((entry) => (
                          <option key={entry.componentKey} value={entry.componentKey}>
                            {entry.label} ({entry.zone})
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Sort order">
                      <input name="sortOrder" defaultValue={String(item.sortOrder)} style={inputStyle} />
                    </FormField>
                    <FormField label="Info text" wide>
                      <textarea name="infoText" defaultValue={item.infoText || ""} rows={3} style={textareaStyle} />
                    </FormField>
                    <div style={{ gridColumn: "1 / -1", ...checkboxRowStyle }}>
                      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="checkbox" name="isLocked" value="true" defaultChecked={item.isLocked} />
                        <span>Locked item</span>
                      </label>
                      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="checkbox" name="isActive" value="true" defaultChecked={item.isActive} />
                        <span>Active item</span>
                      </label>
                    </div>
                    <div style={{ gridColumn: "1 / -1", ...actionRowStyle }}>
                      <button type="submit" style={primaryButtonStyle}>Save item</button>
                      <button type="submit" name="_intent" value="delete" style={secondaryButtonStyle}>
                        Delete item
                      </button>
                    </div>
                  </form>
                </article>
              );
            })}
          </div>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

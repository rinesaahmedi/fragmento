import { ItemType, KitchenStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { getFormMessage } from "../../../../../lib/admin-forms";
import { LEGACY_ICON_KEYS, getKitchenById } from "../../../../../lib/catalog";
import {
  AdminSection,
  ActionLink,
  FlashMessage,
  FormField,
  MetricCard,
  PageHero,
  StatusBadge,
  actionRowStyle,
  checkboxRowStyle,
  dangerButtonStyle,
  emptyStateStyle,
  formGridStyle,
  inputStyle,
  pageGridStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  splitGridStyle,
  textareaStyle,
} from "../../../../../components/admin-ui";

export const dynamic = "force-dynamic";

const ITEM_TYPE_LABELS = {
  [ItemType.COMPONENT]: "Components",
  [ItemType.ACCESSORY]: "Accessories",
  [ItemType.SERVICE]: "Services",
};

export default async function AdminKitchenDetailPage({ params, searchParams }) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const kitchen = await getKitchenById(id);
  if (!kitchen) notFound();

  const groupedItems = Object.values(ItemType).map((type) => ({
    type,
    title: ITEM_TYPE_LABELS[type],
    items: kitchen.items.filter((item) => item.itemType === type),
  }));

  const activeItems = kitchen.items.filter((item) => item.isActive).length;

  return (
    <div style={pageGridStyle}>
      <PageHero
        eyebrow="Kitchen Detail"
        title={kitchen.name}
        description="Keep the kitchen setup simple: edit the core settings first, then manage the catalog by item group."
        actions={[
          <ActionLink key="preview" href={`/kitchens/${kitchen.slug}`}>Open preview</ActionLink>,
          <ActionLink key="all" href="/admin/kitchens" secondary>Back to kitchens</ActionLink>,
        ]}
        stats={[
          <MetricCard key="status" label="Status" value={kitchen.status} />,
          <MetricCard key="items" label="Items" value={String(kitchen._count.items)} />,
          <MetricCard key="active" label="Active items" value={String(activeItems)} />,
          <MetricCard key="orders" label="Orders" value={String(kitchen._count.orders)} />,
        ]}
      />

      {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}
      {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}

      <div style={splitGridStyle}>
        <AdminSection
          title="Kitchen settings"
          description="Use this area for the public-facing identity of the kitchen."
        >
          <form action={`/api/admin/kitchens/${kitchen.id}`} method="post" style={formGridStyle}>
            <input type="hidden" name="_intent" value="update" />
            <FormField label="Name">
              <input name="name" defaultValue={kitchen.name} required style={inputStyle} />
            </FormField>
            <FormField label="Slug">
              <input name="slug" defaultValue={kitchen.slug} required style={inputStyle} />
            </FormField>
            <FormField label="Status">
              <select name="status" defaultValue={kitchen.status} style={inputStyle}>
                {Object.values(KitchenStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Description" wide>
              <textarea name="description" rows={4} defaultValue={kitchen.description || ""} style={textareaStyle} />
            </FormField>
            <button type="submit" style={primaryButtonStyle}>Save kitchen</button>
          </form>
        </AdminSection>

        <AdminSection
          title="Add item"
          description="Create one catalog entry at a time. Use legacy icon keys to keep the configurator image mapping intact."
        >
          <form action={`/api/admin/kitchens/${kitchen.id}/items`} method="post" style={formGridStyle}>
            <FormField label="Type">
              <select name="itemType" defaultValue={ItemType.COMPONENT} style={inputStyle}>
                {Object.values(ItemType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Code">
              <input name="code" placeholder="component-dishwasher" required style={inputStyle} />
            </FormField>
            <FormField label="Name">
              <input name="name" placeholder="Display name" required style={inputStyle} />
            </FormField>
            <FormField label="Price">
              <input name="price" placeholder="349.00" required style={inputStyle} />
            </FormField>
            <FormField label="Icon key">
              <input name="iconKey" placeholder="dishwasher" list="legacy-icon-keys" style={inputStyle} />
            </FormField>
            <FormField label="Color key">
              <input name="colorKey" placeholder="#001f7f" style={inputStyle} />
            </FormField>
            <FormField label="Component key">
              <input name="componentKey" placeholder="Optional future mapping" style={inputStyle} />
            </FormField>
            <FormField label="Sort order">
              <input name="sortOrder" type="number" defaultValue={0} style={inputStyle} />
            </FormField>
            <FormField label="Info text" wide>
              <textarea name="infoText" rows={3} placeholder="Optional product info" style={textareaStyle} />
            </FormField>
            <div style={checkboxRowStyle}>
              <label><input name="isLocked" type="checkbox" value="true" /> Locked</label>
              <label><input name="isActive" type="checkbox" value="true" defaultChecked /> Active</label>
            </div>
            <button type="submit" style={primaryButtonStyle}>Add item</button>
          </form>
          <datalist id="legacy-icon-keys">
            {LEGACY_ICON_KEYS.map((iconKey) => (
              <option key={iconKey} value={iconKey} />
            ))}
          </datalist>
        </AdminSection>
      </div>

      <AdminSection
        title="Catalog sync"
        description="Export, edit, and import the catalog."
      >
        <div style={splitGridStyle}>
          <form
            action={`/api/admin/kitchens/${kitchen.id}/catalog`}
            method="get"
            style={catalogActionCardStyle}
          >
            <span style={catalogEyebrowStyle}>Export</span>
            <strong style={catalogActionTitleStyle}>Download current catalog</strong>
            <button type="submit" style={secondaryButtonStyle}>Export .xlsx</button>
          </form>

          <form
            action={`/api/admin/kitchens/${kitchen.id}/catalog`}
            method="post"
            encType="multipart/form-data"
            style={catalogActionCardStyle}
          >
            <span style={catalogEyebrowStyle}>Import</span>
            <strong style={catalogActionTitleStyle}>Upload edited file</strong>
            <FormField label="Edited catalog file" wide>
              <input
                name="catalogFile"
                type="file"
                accept=".xlsx,.xls,.xml,.csv,text/csv,text/xml,application/xml,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
                style={inputStyle}
              />
            </FormField>
            <span style={catalogNoteStyle}>Keep `id` and `code` unchanged.</span>
            <button type="submit" style={primaryButtonStyle}>Import file</button>
          </form>
        </div>
      </AdminSection>

      {groupedItems.map((group) => (
        <AdminSection
          key={group.type}
          title={group.title}
          description={`${group.items.length} item(s) in this group.`}
        >
          {group.items.length ? (
            <div style={compactTableWrapStyle}>
              <div style={{ ...compactTableRowStyle, ...compactTableHeaderStyle }}>
                <span>Name</span>
                <span>Code</span>
                <span>Price</span>
                <span>Icon</span>
                <span>Color</span>
                <span>Component</span>
                <span>Sort</span>
                <span>Type</span>
                <span>Info</span>
                <span>State</span>
                <span>Actions</span>
              </div>
              {group.items.map((item) => (
                <form key={item.id} action={`/api/admin/items/${item.id}`} method="post" style={compactTableRowStyle}>
                  <input type="hidden" name="_intent" value="update" />
                  <div style={{ display: "grid", gap: 6 }}>
                    <input name="name" defaultValue={item.name} required style={compactInputStyle} />
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={compactMetaTextStyle}>{item.itemType}</span>
                      {item.isLocked ? <span style={compactMetaTextStyle}>Locked</span> : null}
                      {!item.isLocked ? <span style={compactMetaTextStyle}>Unlocked</span> : null}
                    </div>
                  </div>

                  <input name="code" defaultValue={item.code} required style={compactInputStyle} />
                  <input name="price" defaultValue={Number(item.price).toFixed(2)} required style={compactInputStyle} />
                  <input name="iconKey" defaultValue={item.iconKey || ""} list="legacy-icon-keys" style={compactInputStyle} />
                  <input name="colorKey" defaultValue={item.colorKey || ""} style={compactInputStyle} />
                  <input name="componentKey" defaultValue={item.componentKey || ""} style={compactInputStyle} />
                  <input name="sortOrder" type="number" defaultValue={item.sortOrder} style={compactInputStyle} />
                  <select name="itemType" defaultValue={item.itemType} style={compactInputStyle}>
                    {Object.values(ItemType).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <input name="infoText" defaultValue={item.infoText || ""} style={compactInputStyle} />

                  <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <StatusBadge status={item.isActive ? "ACTIVE" : "ARCHIVED"} />
                      <span style={compactMetaTextStyle}>{Number(item.price).toFixed(2)} EUR</span>
                    </div>
                    <div style={compactToggleListStyle}>
                      <label style={compactToggleLabelStyle}>
                        <input name="isLocked" type="checkbox" value="true" defaultChecked={item.isLocked} />
                        Locked
                      </label>
                      <label style={compactToggleLabelStyle}>
                        <input name="isActive" type="checkbox" value="true" defaultChecked={item.isActive} />
                        Active
                      </label>
                    </div>
                  </div>

                  <div style={{ ...actionRowStyle, alignItems: "stretch" }}>
                    <button type="submit" style={compactPrimaryButtonStyle}>Save</button>
                    <button
                      type="submit"
                      name="_intent"
                      value="delete"
                      style={compactDangerButtonStyle}
                      formAction={`/api/admin/items/${item.id}`}
                    >
                      Delete
                    </button>
                  </div>
                </form>
              ))}
            </div>
          ) : (
            <p style={emptyStateStyle}>No {group.title.toLowerCase()} yet.</p>
          )}
        </AdminSection>
      ))}
    </div>
  );
}

const catalogActionCardStyle = {
  display: "grid",
  gap: 14,
  alignContent: "start",
  padding: 20,
  borderRadius: 12,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface-muted)",
};

const catalogEyebrowStyle = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--app-text-muted)",
};

const catalogActionTitleStyle = {
  fontSize: "1.05rem",
  fontWeight: 700,
  color: "var(--app-text)",
  letterSpacing: "-0.01em",
};

const catalogNoteStyle = {
  fontSize: 13,
  color: "var(--app-text-muted)",
};

const compactTableColumns =
  "minmax(190px,1.15fr) minmax(180px,1fr) 96px minmax(140px,0.9fr) minmax(120px,0.8fr) minmax(150px,0.9fr) 82px 130px minmax(180px,1fr) minmax(170px,0.95fr) 148px";

const compactTableWrapStyle = {
  overflowX: "auto",
  borderRadius: 12,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface)",
};

const compactTableRowStyle = {
  minWidth: 1620,
  display: "grid",
  gridTemplateColumns: compactTableColumns,
  gap: 12,
  alignItems: "start",
  padding: "14px 16px",
  borderBottom: "1px solid var(--app-border)",
};

const compactTableHeaderStyle = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--app-text-muted)",
  background: "var(--app-surface-muted)",
};

const compactInputStyle = {
  ...inputStyle,
  minHeight: 40,
  padding: "9px 10px",
  borderRadius: 8,
  fontSize: 14,
};

const compactMetaTextStyle = {
  fontSize: 12,
  color: "var(--app-text-muted)",
  lineHeight: 1.4,
};

const compactToggleListStyle = {
  display: "grid",
  gap: 6,
};

const compactToggleLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "var(--app-text-muted)",
};

const compactPrimaryButtonStyle = {
  ...primaryButtonStyle,
  minHeight: 40,
  padding: "9px 12px",
  borderRadius: 8,
  fontSize: 14,
};

const compactDangerButtonStyle = {
  ...dangerButtonStyle,
  minHeight: 40,
  padding: "9px 12px",
  borderRadius: 8,
  fontSize: 14,
};

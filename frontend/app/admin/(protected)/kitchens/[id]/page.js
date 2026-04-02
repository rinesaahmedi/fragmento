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
  TypeBadge,
  actionRowStyle,
  cardListStyle,
  checkboxRowStyle,
  codePillStyle,
  dangerButtonStyle,
  denseGridStyle,
  emptyStateStyle,
  formGridStyle,
  inputStyle,
  itemCardStyle,
  itemHeaderStyle,
  pageGridStyle,
  primaryButtonStyle,
  splitGridStyle,
  subMetaStyle,
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

      {groupedItems.map((group) => (
        <AdminSection
          key={group.type}
          title={group.title}
          description={`${group.items.length} item(s) in this group.`}
        >
          {group.items.length ? (
            <div style={cardListStyle}>
              {group.items.map((item) => (
                <form key={item.id} action={`/api/admin/items/${item.id}`} method="post" style={itemCardStyle}>
                  <input type="hidden" name="_intent" value="update" />
                  <div style={itemHeaderStyle}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "1.08rem", color: "#251a13" }}>{item.name}</strong>
                        <TypeBadge label={group.type} />
                        <StatusBadge status={item.isActive ? "ACTIVE" : "ARCHIVED"} />
                      </div>
                      <div style={subMetaStyle}>
                        <span>{item.code}</span>
                        <span>{Number(item.price).toFixed(2)} EUR</span>
                        <span>{item.isLocked ? "Locked" : "Unlocked"}</span>
                      </div>
                    </div>
                  </div>

                  <div style={denseGridStyle}>
                    <FormField label="Name">
                      <input name="name" defaultValue={item.name} required style={inputStyle} />
                    </FormField>
                    <FormField label="Code">
                      <input name="code" defaultValue={item.code} required style={inputStyle} />
                    </FormField>
                    <FormField label="Price">
                      <input name="price" defaultValue={Number(item.price).toFixed(2)} required style={inputStyle} />
                    </FormField>
                    <FormField label="Icon key">
                      <input name="iconKey" defaultValue={item.iconKey || ""} list="legacy-icon-keys" style={inputStyle} />
                    </FormField>
                    <FormField label="Color key">
                      <input name="colorKey" defaultValue={item.colorKey || ""} style={inputStyle} />
                    </FormField>
                    <FormField label="Component key">
                      <input name="componentKey" defaultValue={item.componentKey || ""} style={inputStyle} />
                    </FormField>
                    <FormField label="Sort order">
                      <input name="sortOrder" type="number" defaultValue={item.sortOrder} style={inputStyle} />
                    </FormField>
                    <FormField label="Type">
                      <select name="itemType" defaultValue={item.itemType} style={inputStyle}>
                        {Object.values(ItemType).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Info text" wide>
                      <input name="infoText" defaultValue={item.infoText || ""} style={inputStyle} />
                    </FormField>
                  </div>

                  <div style={{ ...actionRowStyle, justifyContent: "space-between" }}>
                    <div style={checkboxRowStyle}>
                      <label><input name="isLocked" type="checkbox" value="true" defaultChecked={item.isLocked} /> Locked</label>
                      <label><input name="isActive" type="checkbox" value="true" defaultChecked={item.isActive} /> Active</label>
                    </div>
                    <div style={actionRowStyle}>
                      <span style={codePillStyle}>
                        {item.iconKey ? `Icon ${item.iconKey}` : "No icon"}
                        {item.colorKey ? ` | ${item.colorKey}` : ""}
                      </span>
                      <button type="submit" style={primaryButtonStyle}>Save</button>
                      <button
                        type="submit"
                        name="_intent"
                        value="delete"
                        style={dangerButtonStyle}
                        formAction={`/api/admin/items/${item.id}`}
                      >
                        Delete
                      </button>
                    </div>
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

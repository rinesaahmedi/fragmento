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
  splitGridStyle,
  subMetaStyle,
  textareaStyle,
} from "../../../../components/admin-ui";
import { AdminShell } from "../../../../components/admin-shell";
import { AdminComponentSlotPicker } from "../../../../components/admin-component-slot-picker";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminPage } from "../../../../lib/auth";
import { getKitchenById } from "../../../../lib/catalog";
import { getKitchenStructureSlots } from "../../../../lib/kitchen-structure";
import { loadKitchenSvgMarkup } from "../../../../lib/load-kitchen-svg";

export const dynamic = "force-dynamic";

const ITEM_TYPE_OPTIONS = Object.values(ItemType);
const KITCHEN_STATUS_OPTIONS = Object.values(KitchenStatus);
const ITEM_ICON_MARKUP = {
  waste_system:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
  cutlery_insert:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="4" height="18" rx="1"/><rect x="8" y="3" width="8" height="4" rx="1"/><rect x="8" y="8" width="3" height="3" rx="1"/><rect x="12" y="8" width="4" height="3" rx="1"/><rect x="8.5" y="12" width="3" height="9" rx="1"/><rect x="12.5" y="12" width="3" height="9" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>',
  lighting_set:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>',
  delivery_assembly:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5-8.5l1.96 2.5H17V9.5h2.5zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-2.2-12.2l-4 4-1.4-1.4-1.4 1.4 2.8 2.8 5.4-5.4-1.4-1.4z"/></svg>',
  pickup: '<img src="/img/warehouse.png" alt="Pickup service"/>',
};
const PREVIEW_HIGHLIGHT_BOUNDS_BY_SLUG = {
  "kitchen-model-b": {
    "wall-cabinet-1": { x: 239, y: 214, width: 84, height: 118 },
    "wall-cabinet-2": { x: 322, y: 214, width: 84, height: 118 },
    "wall-cabinet-3": { x: 405, y: 214, width: 84, height: 118 },
    "wall-cabinet-4": { x: 488, y: 214, width: 84, height: 118 },
    "wall-cabinet-5": { x: 571, y: 214, width: 84, height: 118 },
    "extractor-hood": { x: 488, y: 314, width: 84, height: 14 },
    "under-cabinet-light": { x: 270, y: 319, width: 287, height: 18 },
    "base-module-1": { x: 237, y: 393, width: 86, height: 127 },
    "base-module-2": { x: 322, y: 393, width: 84, height: 127 },
    "base-module-3": { x: 405, y: 393, width: 84, height: 127 },
    "oven-module": { x: 488, y: 393, width: 84, height: 127 },
    "drawer-module": { x: 571, y: 393, width: 84, height: 127 },
    "refrigerator": { x: 670, y: 270, width: 76, height: 250 },
    "sink-faucet": { x: 374, y: 364, width: 14, height: 33 },
    "worktop": { x: 236, y: 392, width: 421, height: 7 },
  },
  "kitchen-model-c": {
    "refrigerator": { x: 119, y: 220, width: 70, height: 220 },
    "extractor-hood": { x: 276, y: 189, width: 68, height: 48 },
    "wall-cabinet-1": { x: 470, y: 185, width: 72, height: 72 },
    "wall-cabinet-2": { x: 542, y: 185, width: 72, height: 72 },
    "wall-cabinet-3": { x: 614, y: 185, width: 72, height: 72 },
    "wall-cabinet-4": { x: 686, y: 185, width: 72, height: 72 },
    "under-cabinet-light": { x: 534, y: 262, width: 160, height: 15 },
    "cook-base-left": { x: 205, y: 338, width: 70, height: 97 },
    "oven-base": { x: 275, y: 338, width: 70, height: 97 },
    "cook-base-right": { x: 345, y: 338, width: 70, height: 97 },
    "wm-base": { x: 470, y: 338, width: 72, height: 97 },
    "sink-base": { x: 542, y: 338, width: 72, height: 97 },
    "dishwasher-base": { x: 614, y: 338, width: 72, height: 97 },
    "drawer-base-3": { x: 686, y: 338, width: 72, height: 97 },
    "worktop": { x: 205, y: 338, width: 553, height: 3 },
    "sink-faucet": { x: 569, y: 302, width: 18, height: 28 },
  },
};

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function enhanceSvgMarkup(markup) {
  if (!markup) return "";

  return markup.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    if (/style=/i.test(attrs)) {
      return `<svg${attrs.replace(/style=(["'])(.*?)\1/i, (styleMatch, quote, value) => ` style=${quote}${value};width:100%;height:auto;display:block${quote}`)}>`;
    }

    return `<svg${attrs} style="width:100%;height:auto;display:block">`;
  });
}

function buildCatalogPreviewMarkup(svgMarkup, kitchenSlug, componentKey) {
  const baseMarkup = enhanceSvgMarkup(svgMarkup);
  if (!baseMarkup) return "";

  const bounds = PREVIEW_HIGHLIGHT_BOUNDS_BY_SLUG[String(kitchenSlug || "").trim().toLowerCase()]?.[componentKey];
  if (!bounds) {
    return baseMarkup;
  }

  const highlightMarkup = [
    `<rect x="${bounds.x - 3}" y="${bounds.y - 3}" width="${bounds.width + 6}" height="${bounds.height + 6}"`,
    ` rx="8" ry="8" fill="rgba(176, 90, 50, 0.08)" stroke="#8f3e2c" stroke-width="2.5"`,
    ` vector-effect="non-scaling-stroke" pointer-events="none"/>`,
  ].join("");

  return baseMarkup.replace("</svg>", `${highlightMarkup}</svg>`);
}

function normalizeItemIconMarkup(iconMarkup) {
  if (!iconMarkup) return "";

  return iconMarkup
    .replace(/<img\b([^>]*)>/i, (match, attrs) => {
      if (/style=/i.test(attrs)) {
        return `<img${attrs.replace(/style=(["'])(.*?)\1/i, (styleMatch, quote, value) => ` style=${quote}${value};max-width:100%;max-height:100%;display:block;object-fit:contain${quote}`)}>`;
      }

      return `<img${attrs} style="max-width:100%;max-height:100%;display:block;object-fit:contain">`;
    })
    .replace(/<svg\b([^>]*)>/i, (match, attrs) => {
      if (/style=/i.test(attrs)) {
        return `<svg${attrs.replace(/style=(["'])(.*?)\1/i, (styleMatch, quote, value) => ` style=${quote}${value};width:100%;height:100%;display:block${quote}`)}>`;
      }

      return `<svg${attrs} style="width:100%;height:100%;display:block">`;
    });
}

function KitchenCatalogPreview({ markup, iconMarkup, slotLabel, itemType }) {
  const isComponent = itemType === ItemType.COMPONENT;
  const normalizedIconMarkup = normalizeItemIconMarkup(iconMarkup);

  if (normalizedIconMarkup) {
    return (
      <div style={previewIconWrapStyle} aria-label={`${itemType || "Item"} icon preview`}>
        <div style={previewIconStyle} dangerouslySetInnerHTML={{ __html: normalizedIconMarkup }} />
      </div>
    );
  }

  if (!markup) {
    return <div style={isComponent ? previewEmptyStyle : previewEmptyCompactStyle}>No preview</div>;
  }

  return (
    <div style={previewWrapStyle} aria-label={slotLabel ? `${slotLabel} preview` : "Kitchen preview"}>
      <div style={previewSvgStyle} dangerouslySetInnerHTML={{ __html: markup }} />
    </div>
  );
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
  const kitchenSvgMarkup = structureSlots.length ? await loadKitchenSvgMarkup(kitchen.slug).catch(() => "") : "";

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
          title="Excel catalog"
          description="Export this kitchen to Excel, update prices or other item fields, then import the file back to update the matching kitchen items."
        >
          <div style={splitGridStyle}>
            <div style={catalogPanelStyle}>
              <div style={{ display: "grid", gap: 8 }}>
                <strong style={{ fontSize: "1.05rem", color: "var(--app-text)" }}>Export current kitchen data</strong>
                <p style={mutedTextStyle}>
                  Download all catalog rows for this kitchen, including the current prices shown in admin.
                </p>
              </div>
              <a
                href={`/api/admin/kitchens/${kitchen.id}/catalog`}
                style={catalogDownloadLinkStyle}
              >
                Export Excel
              </a>
            </div>

            <form
              action={`/api/admin/kitchens/${kitchen.id}/catalog`}
              method="post"
              encType="multipart/form-data"
              style={catalogPanelStyle}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <strong style={{ fontSize: "1.05rem", color: "var(--app-text)" }}>Import edited file</strong>
                <p style={mutedTextStyle}>
                  Change the prices you want in the exported sheet, save it, then upload it here. Matching items will be updated.
                </p>
              </div>
              <FormField label="Catalog file">
                <input
                  type="file"
                  name="catalogFile"
                  accept=".xlsx,.csv"
                  style={inputStyle}
                  required
                />
              </FormField>
              <div style={actionRowStyle}>
                <button type="submit" style={primaryButtonStyle}>Import catalog</button>
                <span style={catalogHelpTextStyle}>Supported formats: `.xlsx` and `.csv`</span>
              </div>
            </form>
          </div>
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
              const previewMarkup = buildCatalogPreviewMarkup(kitchenSvgMarkup, kitchen.slug, item.componentKey);
              const iconMarkup = item.componentKey ? "" : (ITEM_ICON_MARKUP[item.iconKey] || "");

              return (
                <details key={item.id} id={`item-${item.id}`} open={isRequestedEdit} style={isRequestedEdit ? highlightedCompactItemCardStyle : compactItemCardStyle}>
                  <summary style={item.itemType === ItemType.COMPONENT ? compactSummaryStyle : compactSummaryCompactPreviewStyle}>
                    <div style={compactSummaryMainStyle}>
                      <strong style={{ fontSize: "1.05rem" }}>{item.name}</strong>
                      <div style={subMetaStyle}>
                        <TypeBadge label={item.itemType} />
                        <span>{item.code}</span>
                        <span>{formatCurrency(item.price)}</span>
                        <span>{slot ? slot.label : "No slot"}</span>
                      </div>
                    </div>
                    <KitchenCatalogPreview
                      markup={previewMarkup}
                      iconMarkup={iconMarkup}
                      slotLabel={slot?.label || item.name}
                      itemType={item.itemType}
                    />
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

const catalogPanelStyle = {
  ...itemCardStyle,
  gap: 14,
  alignContent: "start",
};

const catalogDownloadLinkStyle = {
  ...secondaryButtonStyle,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  width: "fit-content",
};

const catalogHelpTextStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
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
  display: "grid",
  gap: 14,
  gridTemplateColumns: "minmax(0, 1fr) minmax(180px, 220px) auto",
  alignItems: "center",
};

const compactSummaryCompactPreviewStyle = {
  ...compactSummaryStyle,
  gridTemplateColumns: "minmax(0, 1fr) 96px auto",
  alignItems: "center",
};

const compactSummaryMainStyle = {
  display: "grid",
  gap: 6,
  minWidth: 0,
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

const previewWrapStyle = {
  minWidth: 180,
  maxWidth: 220,
  padding: 8,
  borderRadius: 14,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,240,232,0.76))",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
};

const previewSvgStyle = {
  width: "100%",
  lineHeight: 0,
};

const previewIconWrapStyle = {
  width: 96,
  minWidth: 96,
  maxWidth: 96,
  padding: 4,
  borderRadius: 10,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,240,232,0.76))",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
  minHeight: 64,
  display: "grid",
  placeItems: "center",
  color: "var(--app-accent)",
};

const previewIconStyle = {
  width: 26,
  height: 26,
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
};

const previewEmptyStyle = {
  ...previewWrapStyle,
  display: "grid",
  placeItems: "center",
  minHeight: 96,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 700,
};

const previewEmptyCompactStyle = {
  ...previewIconWrapStyle,
  color: "var(--app-text-muted)",
  fontSize: 10,
  fontWeight: 700,
};

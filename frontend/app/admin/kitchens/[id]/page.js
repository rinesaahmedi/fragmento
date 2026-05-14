import { ItemType, KitchenStatus } from "@prisma/client";
import {
  ActionLink,
  AdminSection,
  FlashMessage,
  FormField,
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
import { AdminKitchenDisplayName, AdminKitchenNameInput, AdminStatusBadge, AdminText, AdminTranslatedInput } from "../../../../components/admin-i18n";
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

function contractAddressLines(contract) {
  const streetLine = [contract.address1, contract.address2].filter(Boolean).join(", ");
  const cityLine = [contract.postalCode, contract.city].filter(Boolean).join(" ");
  const unitLine = [
    contract.building ? `Building ${contract.building}` : "",
    contract.floor ? `Floor ${contract.floor}` : "",
    contract.unitNumber ? `Unit ${contract.unitNumber}` : "",
  ].filter(Boolean).join(" · ");

  return [streetLine, cityLine, contract.country, unitLine, contract.notes ? `Notes: ${contract.notes}` : ""].filter(Boolean);
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
    return <div style={isComponent ? previewEmptyStyle : previewEmptyCompactStyle}><AdminText i18nKey="kitchenDetailAdmin.noPreview" fallback="No preview" /></div>;
  }

  return (
    <div style={previewWrapStyle} aria-label={slotLabel ? `${slotLabel} preview` : "Kitchen preview"}>
      <div style={previewSvgStyle} dangerouslySetInnerHTML={{ __html: markup }} />
    </div>
  );
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
          <AdminSection title={<AdminText i18nKey="kitchenDetailAdmin.kitchenNotFound" fallback="Kitchen not found" />} description={<AdminText i18nKey="kitchenDetailAdmin.requestedKitchenRecordDoesNotExist" fallback="The requested kitchen record does not exist." />}>
            <ActionLink href="/admin/kitchens"><AdminText i18nKey="kitchenDetailAdmin.backToKitchens" fallback="Back to kitchens" /></ActionLink>
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
  const itemSearchQuery = typeof resolvedSearchParams.itemSearch === "string" ? resolvedSearchParams.itemSearch.trim() : "";
  const itemTypeFilter = typeof resolvedSearchParams.itemType === "string" ? resolvedSearchParams.itemType.trim() : "";
  const itemStatusFilter = typeof resolvedSearchParams.itemStatus === "string" ? resolvedSearchParams.itemStatus.trim() : "";
  const normalizedItemSearch = itemSearchQuery.toLowerCase();
  const hasItemFilters = Boolean(itemSearchQuery || itemTypeFilter || itemStatusFilter);
  const visibleItems = kitchen.items.filter((item) => {
    const matchesSearch = !normalizedItemSearch
      || item.name.toLowerCase().includes(normalizedItemSearch)
      || item.code.toLowerCase().includes(normalizedItemSearch);
    const matchesType = !itemTypeFilter || item.itemType === itemTypeFilter;
    const matchesStatus = !itemStatusFilter
      || (itemStatusFilter === "active" && item.isActive)
      || (itemStatusFilter === "inactive" && !item.isActive);

    return matchesSearch && matchesType && matchesStatus;
  });
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
          title={<AdminKitchenDisplayName slug={kitchen.slug} name={kitchen.name} />}
          actions={
            <div style={actionRowStyle}>
              <ActionLink href="/admin/kitchens">
                <AdminText i18nKey="kitchenDetailAdmin.backToKitchens" fallback="Back to kitchens" />
              </ActionLink>
              <ActionLink href={`/kitchens/${kitchen.slug}`}><AdminText i18nKey="kitchenDetailAdmin.openPublicPage" fallback="Open public page" /></ActionLink>
            </div>
          }
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <form action={`/api/admin/kitchens/${kitchen.id}`} method="post" style={kitchenDetailsFormStyle}>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.kitchenName" fallback="Kitchen name" />}>
              <AdminKitchenNameInput slug={kitchen.slug} name={kitchen.name} style={compactInputStyle} required />
            </FormField>
            <FormField label={<AdminText i18nKey="kitchensAdmin.slug" fallback="Slug" />}>
              <input name="slug" defaultValue={kitchen.slug} style={compactInputStyle} required />
            </FormField>
            <FormField label={<AdminText i18nKey="kitchensAdmin.status" fallback="Status" />}>
              <select name="status" defaultValue={kitchen.status} style={compactInputStyle}>
                {KITCHEN_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.description" fallback="Description" />} wide>
              <textarea
                name="description"
                defaultValue={kitchen.description || ""}
                rows={2}
                style={compactTextareaStyle}
              />
            </FormField>
            <div style={{ gridColumn: "1 / -1", ...actionRowStyle }}>
              <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="kitchenDetailAdmin.saveKitchen" fallback="Save kitchen" /></button>
              <AdminStatusBadge status={kitchen.status} />
            </div>
          </form>
        </AdminSection>

        <div style={contractNoticeStyle}>
          <p style={contractNoticeTextStyle}>
            <strong><AdminText i18nKey="kitchenDetailAdmin.contractNumbers" fallback="Contract numbers" /></strong>
            <span><AdminText i18nKey="kitchenDetailAdmin.contractNumbersManagedInContracts" fallback="Contract numbers are managed in Contracts." /></span>
          </p>
          <ActionLink href={`/admin/contracts?kitchenId=${kitchen.id}`}><AdminText i18nKey="kitchenDetailAdmin.manageContracts" fallback="Manage contracts" /></ActionLink>
        </div>

        <AdminSection
          title={<AdminText i18nKey="kitchenDetailAdmin.catalogItems" fallback="Catalog Items" />}
        >
          <form method="get" style={catalogFiltersStyle}>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.searchItems" fallback="Search items" />}>
              <AdminTranslatedInput
                name="itemSearch"
                defaultValue={itemSearchQuery}
                placeholderKey="kitchenDetailAdmin.searchItemsPlaceholder"
                placeholderFallback="Name or code"
                style={compactInputStyle}
              />
            </FormField>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.filterType" fallback="Type" />}>
              <select name="itemType" defaultValue={itemTypeFilter} style={compactInputStyle}>
                <option value=""><AdminText i18nKey="kitchenDetailAdmin.allTypes" fallback="All types" /></option>
                {ITEM_TYPE_OPTIONS.map((itemType) => (
                  <option key={itemType} value={itemType}>
                    {itemType}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={<AdminText i18nKey="kitchenDetailAdmin.filterStatus" fallback="Status" />}>
              <select name="itemStatus" defaultValue={itemStatusFilter} style={compactInputStyle}>
                <option value=""><AdminText i18nKey="kitchenDetailAdmin.allStatuses" fallback="All statuses" /></option>
                <option value="active"><AdminText i18nKey="kitchenDetailAdmin.active" fallback="Active" /></option>
                <option value="inactive"><AdminText i18nKey="kitchenDetailAdmin.inactive" fallback="Inactive" /></option>
              </select>
            </FormField>
            <div style={{ ...actionRowStyle, alignSelf: "end" }}>
              <button type="submit" style={secondaryButtonStyle}><AdminText i18nKey="dashboard.apply" fallback="Apply" /></button>
              <ActionLink href={`/admin/kitchens/${kitchen.id}`}><AdminText i18nKey="dashboard.clearFilters" fallback="Clear filters" /></ActionLink>
            </div>
          </form>

          <div style={cardListStyle}>
            {!visibleItems.length ? (
              <p style={mutedTextStyle}>
                {hasItemFilters
                  ? <AdminText i18nKey="kitchenDetailAdmin.noCatalogItemsMatchFilters" fallback="No catalog items match the current filters." />
                  : <AdminText i18nKey="kitchenDetailAdmin.noItemsConfiguredForThisKitchen" fallback="No items configured for this kitchen." />}
              </p>
            ) : null}
            {visibleItems.map((item) => {
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
                        <span><AdminText i18nKey="kitchenDetailAdmin.itemCode" fallback="Item code" />: {item.code}</span>
                        <span><AdminText i18nKey="kitchenDetailAdmin.articleNo" fallback="Article No" />: {item.articleNumber || "-"}</span>
                        <span>{formatCurrency(item.price)}</span>
                        <span>{slot ? slot.label : <AdminText i18nKey="kitchenDetailAdmin.noSlot" fallback="No slot" />}</span>
                      </div>
                    </div>
                    <KitchenCatalogPreview
                      markup={previewMarkup}
                      iconMarkup={iconMarkup}
                      slotLabel={slot?.label || item.name}
                      itemType={item.itemType}
                    />
                    <div style={{ ...actionRowStyle, justifyContent: "flex-end" }}>
                      <AdminStatusBadge status={item.isActive ? "ACTIVE" : "ARCHIVED"} />
                      <span style={editHintStyle}><AdminText i18nKey="kitchenDetailAdmin.edit" fallback="Edit" /></span>
                    </div>
                  </summary>

                  <form action={`/api/admin/items/${item.id}`} method="post" style={compactFormStyle}>
                    <div style={compactTopGridStyle}>
                      <FormField label={<AdminText i18nKey="kitchenDetailAdmin.itemType" fallback="Item type" />} wide={false}>
                        <select name="itemType" defaultValue={item.itemType} style={compactInputStyle}>
                          {ITEM_TYPE_OPTIONS.map((itemType) => (
                            <option key={itemType} value={itemType}>
                              {itemType}
                            </option>
                          ))}
                        </select>
                      </FormField>
                      <FormField label={<AdminText i18nKey="kitchenDetailAdmin.itemCode" fallback="Item code" />} wide={false}>
                        <input name="code" defaultValue={item.code} style={compactInputStyle} required />
                      </FormField>
                      <FormField label={<AdminText i18nKey="kitchenDetailAdmin.articleNumber" fallback="Article number" />} wide={false}>
                        <input name="articleNumber" defaultValue={item.articleNumber || ""} style={compactInputStyle} />
                      </FormField>
                      <FormField label={<AdminText i18nKey="kitchenDetailAdmin.name" fallback="Name" />} wide={false}>
                        <input name="name" defaultValue={item.name} style={compactInputStyle} required />
                      </FormField>
                      <FormField label={<AdminText i18nKey="kitchenDetailAdmin.price" fallback="Price" />} wide={false}>
                        <input name="price" defaultValue={String(item.price)} style={compactInputStyle} required />
                      </FormField>
                      <FormField label={<AdminText i18nKey="kitchenDetailAdmin.iconKey" fallback="Icon key" />} wide={false}>
                        <input name="iconKey" defaultValue={item.iconKey || ""} style={compactInputStyle} />
                      </FormField>
                      <FormField label={<AdminText i18nKey="kitchenDetailAdmin.colorKey" fallback="Color key" />} wide={false}>
                        <input name="colorKey" defaultValue={item.colorKey || ""} style={compactInputStyle} />
                      </FormField>
                      <FormField label={<AdminText i18nKey="kitchenDetailAdmin.sortOrder" fallback="Sort order" />} wide={false}>
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

                    <FormField label={<AdminText i18nKey="kitchenDetailAdmin.infoText" fallback="Info text" />} wide>
                      <textarea name="infoText" defaultValue={item.infoText || ""} rows={2} style={compactTextareaStyle} />
                    </FormField>
                    <details style={advancedDetailsStyle}>
                      <summary style={advancedSummaryStyle}><AdminText i18nKey="kitchenDetailAdmin.productInformation" fallback="Product Information" /></summary>
                      <div style={advancedFieldsStyle}>
                        <FormField label={<AdminText i18nKey="kitchenDetailAdmin.productInfoPdfPath" fallback="PDF Path" />} wide>
                          <input name="productInfoPdfPath" defaultValue={item.productInfoPdfPath || ""} style={compactInputStyle} />
                        </FormField>
                        <FormField label={<AdminText i18nKey="kitchenDetailAdmin.productInfoSummary" fallback="Intro Summary" />} wide>
                          <textarea name="productInfoSummary" defaultValue={item.productInfoSummary || ""} rows={2} style={compactTextareaStyle} />
                        </FormField>
                        <FormField label={<AdminText i18nKey="kitchenDetailAdmin.productInfoKeyFacts" fallback="Key Facts" />} wide>
                          <textarea name="productInfoKeyFacts" defaultValue={(item.productInfoKeyFacts || []).join("\n")} rows={4} style={compactTextareaStyle} />
                        </FormField>
                        <FormField label={<AdminText i18nKey="kitchenDetailAdmin.productInfoExtractedText" fallback="Extracted Product Text" />} wide>
                          <textarea name="productInfoExtractedText" defaultValue={item.productInfoExtractedText || ""} rows={5} style={compactTextareaStyle} />
                        </FormField>
                      </div>
                    </details>

                    <div style={compactFooterStyle}>
                      <div style={checkboxRowStyle}>
                        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="checkbox" name="isLocked" value="true" defaultChecked={item.isLocked} />
                          <span><AdminText i18nKey="kitchenDetailAdmin.lockedItem" fallback="Locked" /></span>
                        </label>
                        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="checkbox" name="isActive" value="true" defaultChecked={item.isActive} />
                          <span><AdminText i18nKey="kitchenDetailAdmin.activeItem" fallback="Active" /></span>
                        </label>
                      </div>
                      <div style={actionRowStyle}>
                        <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="kitchenDetailAdmin.saveItem" fallback="Save item" /></button>
                        <button type="submit" name="_intent" value="delete" style={secondaryButtonStyle}>
                          <AdminText i18nKey="kitchenDetailAdmin.deleteItem" fallback="Delete item" />
                        </button>
                      </div>
                    </div>
                  </form>
                </details>
              );
            })}
          </div>
        </AdminSection>

        <AdminSection
          title={<AdminText i18nKey="kitchenDetailAdmin.excelCatalog" fallback="Import / Export Catalog" />}
          description={<AdminText i18nKey="kitchenDetailAdmin.exportKitchenToExcelThenImportBack" fallback="Export this kitchen to Excel, update prices or other item fields, then import the file back to update matching kitchen items." />}
        >
          <div style={splitGridStyle}>
            <div style={catalogPanelStyle}>
              <div style={{ display: "grid", gap: 8 }}>
                <strong style={{ fontSize: "1.05rem", color: "var(--app-text)" }}><AdminText i18nKey="kitchenDetailAdmin.exportCurrentKitchenData" fallback="Export current kitchen data" /></strong>
                <p style={mutedTextStyle}>
                  <AdminText i18nKey="kitchenDetailAdmin.downloadAllCatalogRowsForKitchenIncludingCurrentPricesShownInAdmin" fallback="Download all catalog rows for this kitchen, including current prices shown in admin." />
                </p>
              </div>
              <a
                href={`/api/admin/kitchens/${kitchen.id}/catalog`}
                style={catalogDownloadLinkStyle}
              >
                <AdminText i18nKey="kitchenDetailAdmin.exportExcel" fallback="Export Excel" />
              </a>
            </div>

            <form
              action={`/api/admin/kitchens/${kitchen.id}/catalog`}
              method="post"
              encType="multipart/form-data"
              style={catalogPanelStyle}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <strong style={{ fontSize: "1.05rem", color: "var(--app-text)" }}><AdminText i18nKey="kitchenDetailAdmin.importEditedFile" fallback="Import edited file" /></strong>
                <p style={mutedTextStyle}>
                  <AdminText i18nKey="kitchenDetailAdmin.changePricesInExportedSheetThenUpload" fallback="Change prices in the exported sheet, save it, then upload it here. Matching items will be updated." />
                </p>
              </div>
              <FormField label={<AdminText i18nKey="kitchenDetailAdmin.catalogFile" fallback="Catalog file" />}>
                <input
                  type="file"
                  name="catalogFile"
                  accept=".xlsx,.csv"
                  style={inputStyle}
                  required
                />
              </FormField>
              <div style={actionRowStyle}>
                <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="kitchenDetailAdmin.importCatalog" fallback="Import catalog" /></button>
                <span style={catalogHelpTextStyle}><AdminText i18nKey="kitchenDetailAdmin.supportedFormatsXlsxAndCsv" fallback="Supported formats: .xlsx and .csv" /></span>
              </div>
            </form>
          </div>
        </AdminSection>

        <AdminSection
          title={<AdminText i18nKey="kitchenDetailAdmin.addExtraItem" fallback="Add Catalog Item" />}
        >
          <details style={addItemDetailsStyle}>
            <summary style={addItemSummaryStyle}>
              <AdminText i18nKey="kitchenDetailAdmin.addExtraItem" fallback="Add Catalog Item" />
            </summary>
            <form action={`/api/admin/kitchens/${kitchen.id}/items`} method="post" style={addItemFormStyle}>
              <fieldset style={formGroupStyle}>
                <legend style={formGroupLegendStyle}><AdminText i18nKey="kitchenDetailAdmin.basicInfo" fallback="Basic Info" /></legend>
                <div style={formGridStyle}>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.itemType" fallback="Item type" />}>
                    <select name="itemType" defaultValue={ItemType.ACCESSORY} style={inputStyle}>
                      {[ItemType.ACCESSORY, ItemType.SERVICE].map((itemType) => (
                        <option key={itemType} value={itemType}>
                          {itemType}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.name" fallback="Name" />}>
                    <input name="name" style={inputStyle} required />
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.itemCode" fallback="Item code" />}>
                    <input name="code" placeholder="DISH-600-STD" style={inputStyle} required />
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.articleNumber" fallback="Article number" />}>
                    <input name="articleNumber" placeholder="A-EGSPV597210" style={inputStyle} />
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.price" fallback="Price" />}>
                    <input name="price" defaultValue="0.00" style={inputStyle} required />
                  </FormField>
                  <label style={{ ...checkboxInlineStyle, alignSelf: "end" }}>
                    <input type="checkbox" name="isActive" value="true" defaultChecked />
                    <span><AdminText i18nKey="kitchenDetailAdmin.activeItem" fallback="Active" /></span>
                  </label>
                </div>
              </fieldset>

              <fieldset style={formGroupStyle}>
                <legend style={formGroupLegendStyle}><AdminText i18nKey="kitchenDetailAdmin.display" fallback="Display" /></legend>
                <div style={formGridStyle}>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.iconKey" fallback="Icon key" />}>
                    <input name="iconKey" style={inputStyle} />
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.colorKey" fallback="Color key" />}>
                    <input name="colorKey" style={inputStyle} />
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.sortOrder" fallback="Sort order" />}>
                    <input name="sortOrder" defaultValue="0" style={inputStyle} />
                  </FormField>
                  <label style={{ ...checkboxInlineStyle, alignSelf: "end" }}>
                    <input type="checkbox" name="isLocked" value="true" />
                    <span><AdminText i18nKey="kitchenDetailAdmin.lockedItem" fallback="Locked" /></span>
                  </label>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.infoText" fallback="Info text" />} wide>
                    <textarea name="infoText" rows={2} style={textareaStyle} />
                  </FormField>
                </div>
              </fieldset>

              <details style={advancedDetailsStyle}>
                <summary style={advancedSummaryStyle}><AdminText i18nKey="kitchenDetailAdmin.productInformation" fallback="Product Information" /></summary>
                <div style={advancedFieldsStyle}>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.productInfoPdfPath" fallback="PDF Path" />} wide>
                    <input name="productInfoPdfPath" placeholder="/product-info/example.pdf" style={inputStyle} />
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.productInfoSummary" fallback="Intro Summary" />} wide>
                    <textarea name="productInfoSummary" rows={2} style={textareaStyle} />
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.productInfoKeyFacts" fallback="Key Facts" />} wide>
                    <textarea name="productInfoKeyFacts" rows={4} placeholder="One key fact per line" style={textareaStyle} />
                  </FormField>
                  <FormField label={<AdminText i18nKey="kitchenDetailAdmin.productInfoExtractedText" fallback="Extracted Product Text" />} wide>
                    <textarea name="productInfoExtractedText" rows={5} style={textareaStyle} />
                  </FormField>
                </div>
              </details>

              <div>
                <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="kitchenDetailAdmin.createExtraItem" fallback="Create Item" /></button>
              </div>
            </form>
          </details>
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

const kitchenDetailsFormStyle = {
  ...formGridStyle,
  gap: 12,
};

const contractNoticeStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 14,
  background: "var(--color-card)",
  padding: "12px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  boxShadow: "var(--app-shadow-soft)",
};

const contractNoticeTextStyle = {
  margin: 0,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  color: "var(--app-text-muted)",
  lineHeight: 1.5,
};

const catalogFiltersStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  alignItems: "end",
};

const addItemDetailsStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 14,
  background: "var(--app-surface)",
  overflow: "hidden",
};

const addItemSummaryStyle = {
  width: "fit-content",
  listStyle: "none",
  cursor: "pointer",
  margin: 16,
  border: "1px solid var(--app-border-strong)",
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "var(--color-card)",
  color: "var(--app-accent)",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  boxShadow: "var(--app-shadow-soft)",
};

const addItemFormStyle = {
  display: "grid",
  gap: 16,
  padding: "0 16px 16px",
};

const formGroupStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 14,
  padding: "16px",
  margin: 0,
  display: "grid",
  gap: 12,
  background: "var(--color-card)",
};

const formGroupLegendStyle = {
  padding: "0 8px",
  color: "var(--app-text)",
  fontWeight: 800,
};

const checkboxInlineStyle = {
  minHeight: 52,
  display: "flex",
  gap: 8,
  alignItems: "center",
  color: "var(--app-text)",
  fontWeight: 700,
};

const advancedDetailsStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.62)",
  overflow: "hidden",
};

const advancedSummaryStyle = {
  listStyle: "none",
  cursor: "pointer",
  padding: "12px 14px",
  color: "var(--app-accent)",
  fontWeight: 800,
};

const advancedFieldsStyle = {
  display: "grid",
  gap: 12,
  padding: "0 14px 14px",
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

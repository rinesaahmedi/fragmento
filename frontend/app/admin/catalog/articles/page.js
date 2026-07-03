import {
  ActionLink,
  AdminSection,
  FlashMessage,
  FormField,
  PageHero,
  actionRowStyle,
  codePillStyle,
  emptyStateStyle,
  formGridStyle,
  inputStyle,
  pageGridStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
  textareaStyle,
} from "../../../../components/admin-ui";
import { Fragment } from "react";
import AdminConfirmSubmitButton from "../../../../components/admin-confirm-submit-button";
import { AdminShell } from "../../../../components/admin-shell";
import AdminSelect from "../../../../components/admin-select";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminPage } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { ItemType } from "@prisma/client";

export const dynamic = "force-dynamic";

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatBoolean(value) {
  return value ? "Yes" : "No";
}

const ITEM_TYPE_OPTIONS = Object.values(ItemType);

function formatDimensionInputValue(value) {
  const cm = Number(value) / 10;
  if (!Number.isFinite(cm)) return "";
  return Number.isInteger(cm)
    ? String(cm)
    : String(Number(cm.toFixed(2))).replace(/\.0+$/, "");
}

function CatalogArticleForm({ action, article, submitLabel }) {
  return (
    <form action={action} method="post" style={articleFormStyle}>
      <div style={formGridStyle}>
        <FormField label="Article number">
          <input name="articleNumber" defaultValue={article?.articleNumber || ""} style={inputStyle} required />
        </FormField>
        <FormField label="Name">
          <input name="name" defaultValue={article?.name || ""} style={inputStyle} required />
        </FormField>
        <FormField label="German name">
          <input name="nameDe" defaultValue={article?.nameDe || ""} style={inputStyle} />
        </FormField>
        <FormField label="Item type">
          <AdminSelect name="itemType" defaultValue={article?.itemType || ItemType.COMPONENT} style={inputStyle}>
            {ITEM_TYPE_OPTIONS.map((itemType) => (
              <option key={itemType} value={itemType}>{itemType}</option>
            ))}
          </AdminSelect>
        </FormField>
        <FormField label="Price">
          <input name="price" defaultValue={article ? formatMoney(article.price) : "0.00"} style={inputStyle} required />
        </FormField>
        <FormField label="Width cm">
          <input name="widthMm" defaultValue={formatDimensionInputValue(article?.widthMm)} style={inputStyle} />
        </FormField>
        <FormField label="Height cm">
          <input name="heightMm" defaultValue={formatDimensionInputValue(article?.heightMm)} style={inputStyle} />
        </FormField>
        <FormField label="Depth cm">
          <input name="depthMm" defaultValue={formatDimensionInputValue(article?.depthMm)} style={inputStyle} />
        </FormField>
        <FormField label="Fixed package">
          <AdminSelect name="isFixedPricePackage" defaultValue={article?.isFixedPricePackage ? "true" : ""} style={inputStyle}>
            <option value="">No</option>
            <option value="true">Yes</option>
          </AdminSelect>
        </FormField>
        <FormField label="Active">
          <AdminSelect name="isActive" defaultValue={article?.isActive === false ? "" : "true"} style={inputStyle}>
            <option value="true">Yes</option>
            <option value="">No</option>
          </AdminSelect>
        </FormField>
        <FormField label="Description" wide>
          <textarea name="description" defaultValue={article?.description || ""} rows={2} style={textareaStyle} />
        </FormField>
      </div>
      <div style={actionRowStyle}>
        <button type="submit" style={primaryButtonStyle}>{submitLabel}</button>
      </div>
    </form>
  );
}

function CatalogAddonForm({ action, item, submitLabel }) {
  return (
    <form action={action} method="post" style={addonFormStyle}>
      <div style={formGridStyle}>
        <FormField label="Code">
          <input name="code" defaultValue={item?.code || ""} style={inputStyle} required />
        </FormField>
        <FormField label="Name">
          <input name="name" defaultValue={item?.name || ""} style={inputStyle} required />
        </FormField>
        <FormField label="German name">
          <input name="nameDe" defaultValue={item?.nameDe || ""} style={inputStyle} />
        </FormField>
        <FormField label="Price">
          <input name="price" defaultValue={item ? formatMoney(item.price) : "0.00"} style={inputStyle} required />
        </FormField>
        <FormField label="Active">
          <AdminSelect name="isActive" defaultValue={item?.isActive === false ? "" : "true"} style={inputStyle}>
            <option value="true">Yes</option>
            <option value="">No</option>
          </AdminSelect>
        </FormField>
        <FormField label="Description" wide>
          <textarea name="description" defaultValue={item?.description || ""} rows={2} style={textareaStyle} />
        </FormField>
      </div>
      <div style={actionRowStyle}>
        <button type="submit" style={primaryButtonStyle}>{submitLabel}</button>
      </div>
    </form>
  );
}

function CatalogDeleteForm({ action, itemLabel, entityLabel, linkedKitchenItems }) {
  const linkedCount = Number(linkedKitchenItems || 0);
  if (linkedCount > 0) {
    return (
      <span style={deleteUnavailableStyle}>
        Linked to {linkedCount} KitchenItem{linkedCount === 1 ? "" : "s"}
      </span>
    );
  }

  return (
    <form action={action} method="post" style={deleteFormStyle}>
      <AdminConfirmSubmitButton
        name="_intent"
        value="delete"
        style={deleteButtonStyle}
        confirmFallback={`Delete ${entityLabel.toLowerCase()} "${itemLabel}"?\nThis action cannot be undone.`}
      >
        Delete
      </AdminConfirmSubmitButton>
    </form>
  );
}

function formatDimensionPart(value) {
  const cm = Number(value) / 10;
  if (!Number.isFinite(cm)) return "-";
  return Number.isInteger(cm)
    ? String(cm)
    : String(Number(cm.toFixed(2))).replace(/\.0+$/, "");
}

function formatDimensions(article) {
  if (!article.widthMm && !article.heightMm && !article.depthMm) return "";
  return [
    formatDimensionPart(article.widthMm),
    formatDimensionPart(article.heightMm),
    formatDimensionPart(article.depthMm),
  ].join(" x ") + " cm";
}

export default async function AdminCatalogArticlesPage({ searchParams }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = await searchParams;
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const [articles, blenden, services] = await Promise.all([
    prisma.$queryRaw`
    SELECT
      ca."id",
      ca."articleNumber",
      ca."name",
      ca."nameDe",
      ca."description",
      ca."widthMm",
      ca."heightMm",
      ca."depthMm",
      ca."price",
      ca."itemType",
      ca."isFixedPricePackage",
      ca."isActive",
      COUNT(ki."id")::int AS "linkedKitchenItems"
    FROM "CatalogArticle" ca
    LEFT JOIN "KitchenItem" ki ON ki."catalogArticleId" = ca."id"
    GROUP BY ca."id"
    ORDER BY ca."itemType" ASC, ca."articleNumber" ASC
    `,
    prisma.$queryRaw`
    SELECT
      cb."id",
      cb."code",
      cb."name",
      cb."nameDe",
      cb."description",
      cb."price",
      cb."isActive",
      COUNT(ki."id")::int AS "linkedKitchenItems"
    FROM "CatalogBlende" cb
    LEFT JOIN "KitchenItem" ki ON ki."catalogBlendeId" = cb."id"
    GROUP BY cb."id"
    ORDER BY cb."code" ASC
    `,
    prisma.$queryRaw`
    SELECT
      cs."id",
      cs."code",
      cs."name",
      cs."nameDe",
      cs."description",
      cs."price",
      cs."isActive",
      COUNT(ki."id")::int AS "linkedKitchenItems"
    FROM "CatalogService" cs
    LEFT JOIN "KitchenItem" ki ON ki."catalogServiceId" = cs."id"
    GROUP BY cs."id"
    ORDER BY cs."code" ASC
    `,
  ]);

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <PageHero
          eyebrow="Manage"
          title="Catalog"
          description="Reusable articles, blenden, and services for kitchen item setup and catalog audit."
          actions={<ActionLink href="/api/admin/catalog/export" secondary>Export Excel</ActionLink>}
        />
        {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
        {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

        <AdminSection
          title="Articles"
          actions={(
            <details style={addonDetailsStyle}>
              <summary style={secondaryButtonStyle}>Add article</summary>
              <CatalogArticleForm action="/api/admin/catalog/articles" submitLabel="Create article" />
            </details>
          )}
        >
          {!articles.length ? <p style={emptyStateStyle}>No catalog articles found.</p> : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Article number</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>German name</th>
                    <th style={thStyle}>Dimensions (W x H x D)</th>
                    <th style={thStyle}>Item type</th>
                    <th style={thStyle}>Price</th>
                    <th style={thStyle}>Fixed package</th>
                    <th style={thStyle}>Active</th>
                    <th style={thStyle}>Linked KitchenItems</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => (
                    <Fragment key={article.id}>
                      <tr>
                        <td style={tdStyle}><span style={codePillStyle}>{article.articleNumber}</span></td>
                        <td style={tdStyle}>{article.name}</td>
                        <td style={tdStyle}>{article.nameDe || ""}</td>
                        <td style={tdStyle}>{formatDimensions(article)}</td>
                        <td style={tdStyle}>{article.itemType}</td>
                        <td style={tdStyle}>{formatMoney(article.price)}</td>
                        <td style={tdStyle}>{formatBoolean(article.isFixedPricePackage)}</td>
                        <td style={tdStyle}>{formatBoolean(article.isActive)}</td>
                        <td style={tdStyle}>{article.linkedKitchenItems}</td>
                      </tr>
                      <tr>
                        <td colSpan={9} style={editRowCellStyle}>
                          <div style={editActionRowStyle}>
                            <details style={editDetailsStyle}>
                              <summary style={editSummaryStyle}>Edit</summary>
                              <CatalogArticleForm action={`/api/admin/catalog/articles/${article.id}`} article={article} submitLabel="Save article" />
                            </details>
                            <CatalogDeleteForm
                              action={`/api/admin/catalog/articles/${article.id}`}
                              entityLabel="Article"
                              itemLabel={article.articleNumber}
                              linkedKitchenItems={article.linkedKitchenItems}
                            />
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>

        <AdminSection
          title="Blenden"
          actions={(
            <details style={addonDetailsStyle}>
              <summary style={secondaryButtonStyle}>Add blende</summary>
              <CatalogAddonForm action="/api/admin/catalog/blenden" submitLabel="Create blende" />
            </details>
          )}
        >
          {!blenden.length ? <p style={emptyStateStyle}>No catalog blenden found.</p> : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Code</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>German name</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Price</th>
                    <th style={thStyle}>Active</th>
                    <th style={thStyle}>Linked KitchenItems</th>
                  </tr>
                </thead>
                <tbody>
                  {blenden.map((blende) => (
                    <Fragment key={blende.id}>
                      <tr>
                        <td style={tdStyle}><span style={codePillStyle}>{blende.code}</span></td>
                        <td style={tdStyle}>{blende.name}</td>
                        <td style={tdStyle}>{blende.nameDe || ""}</td>
                        <td style={tdStyle}>{blende.description || ""}</td>
                        <td style={tdStyle}>{formatMoney(blende.price)}</td>
                        <td style={tdStyle}>{formatBoolean(blende.isActive)}</td>
                        <td style={tdStyle}>{blende.linkedKitchenItems}</td>
                      </tr>
                      <tr>
                        <td colSpan={7} style={editRowCellStyle}>
                          <div style={editActionRowStyle}>
                            <details style={editDetailsStyle}>
                              <summary style={editSummaryStyle}>Edit</summary>
                              <CatalogAddonForm action={`/api/admin/catalog/blenden/${blende.id}`} item={blende} submitLabel="Save blende" />
                            </details>
                            <CatalogDeleteForm
                              action={`/api/admin/catalog/blenden/${blende.id}`}
                              entityLabel="Blende"
                              itemLabel={blende.code}
                              linkedKitchenItems={blende.linkedKitchenItems}
                            />
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>

        <AdminSection
          title="Services"
          actions={(
            <details style={addonDetailsStyle}>
              <summary style={secondaryButtonStyle}>Add service</summary>
              <CatalogAddonForm action="/api/admin/catalog/services" submitLabel="Create service" />
            </details>
          )}
        >
          {!services.length ? <p style={emptyStateStyle}>No catalog services found.</p> : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Code</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>German name</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Price</th>
                    <th style={thStyle}>Active</th>
                    <th style={thStyle}>Linked KitchenItems</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <Fragment key={service.id}>
                      <tr>
                        <td style={tdStyle}><span style={codePillStyle}>{service.code}</span></td>
                        <td style={tdStyle}>{service.name}</td>
                        <td style={tdStyle}>{service.nameDe || ""}</td>
                        <td style={tdStyle}>{service.description || ""}</td>
                        <td style={tdStyle}>{formatMoney(service.price)}</td>
                        <td style={tdStyle}>{formatBoolean(service.isActive)}</td>
                        <td style={tdStyle}>{service.linkedKitchenItems}</td>
                      </tr>
                      <tr>
                        <td colSpan={7} style={editRowCellStyle}>
                          <div style={editActionRowStyle}>
                            <details style={editDetailsStyle}>
                              <summary style={editSummaryStyle}>Edit</summary>
                              <CatalogAddonForm action={`/api/admin/catalog/services/${service.id}`} item={service} submitLabel="Save service" />
                            </details>
                            <CatalogDeleteForm
                              action={`/api/admin/catalog/services/${service.id}`}
                              entityLabel="Service"
                              itemLabel={service.code}
                              linkedKitchenItems={service.linkedKitchenItems}
                            />
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const addonDetailsStyle = {
  position: "relative",
};

const addonFormStyle = {
  display: "grid",
  gap: 14,
  minWidth: 520,
  maxWidth: 760,
  marginTop: 10,
  padding: 16,
  border: "1px solid var(--app-border)",
  borderRadius: 14,
  background: "var(--color-card)",
  boxShadow: "var(--app-shadow-soft)",
};

const articleFormStyle = {
  ...addonFormStyle,
  minWidth: 680,
};

const editRowCellStyle = {
  ...tdStyle,
  paddingTop: 0,
  background: "var(--app-surface)",
};

const editDetailsStyle = {
  flex: "1 1 480px",
};

const editSummaryStyle = {
  ...secondaryButtonStyle,
  width: "fit-content",
  minHeight: 40,
  padding: "9px 13px",
  listStyle: "none",
  cursor: "pointer",
};

const editActionRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  flexWrap: "wrap",
};

const deleteFormStyle = {
  margin: 0,
};

const deleteButtonStyle = {
  border: "1px solid rgba(217, 92, 92, 0.24)",
  background: "rgba(255,255,255,0.72)",
  color: "var(--app-danger-text)",
  minHeight: 40,
  borderRadius: 8,
  padding: "9px 13px",
  fontSize: 13,
  boxShadow: "none",
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const deleteUnavailableStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 40,
  borderRadius: 8,
  padding: "9px 13px",
  background: "rgba(115, 80, 55, 0.07)",
  border: "1px solid rgba(115, 80, 55, 0.12)",
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

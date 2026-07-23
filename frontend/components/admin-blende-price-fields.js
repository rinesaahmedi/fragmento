"use client";

import { useMemo, useState } from "react";
import { FormField } from "./admin-ui";
import { useAdminI18n } from "./admin-i18n";
import AdminSelect from "./admin-select";

function moneyToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function centsToMoney(cents) {
  return (Math.max(0, cents) / 100).toFixed(2);
}

function quantityValue(value, hasBlende) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!hasBlende) return "";
  return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : "1";
}

function blendeTotalCents(blende, quantity) {
  if (!blende) return 0;
  return moneyToCents(blende.price) * (Number.parseInt(String(quantity || 1), 10) || 1);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

export default function AdminBlendePriceFields({
  totalPriceDefaultValue = "0.00",
  priceStyle,
  selectStyle,
  catalogBlenden = [],
  catalogServices = [],
  catalogArticles = [],
  defaultArticleId = "",
  defaultBlendeId = "",
  defaultBlendeQuantity = "",
  defaultServiceId = "",
  currentBlendePrice = null,
}) {
  const { language } = useAdminI18n();
  const localizedName = (entry) => {
    const englishName = String(entry?.name || entry?.label || "").trim();
    const germanName = String(entry?.nameDe || "").trim();
    return language === "de" ? (germanName || englishName) : (englishName || germanName);
  };
  const blendenById = useMemo(() => {
    return new Map(catalogBlenden.map((blende) => [blende.id, blende]));
  }, [catalogBlenden]);
  const articlesById = useMemo(() => {
    return new Map(catalogArticles.map((article) => [article.id, article]));
  }, [catalogArticles]);
  const initialHasBlende = Boolean(defaultBlendeId);
  const initialQuantity = quantityValue(defaultBlendeQuantity, initialHasBlende);
  const initialBlendeTotalCents = currentBlendePrice == null
    ? 0
    : moneyToCents(currentBlendePrice) * (Number.parseInt(initialQuantity || "1", 10) || 1);
  const initialArticlePrice = centsToMoney(moneyToCents(totalPriceDefaultValue) - initialBlendeTotalCents);

  const [articlePrice, setArticlePrice] = useState(initialArticlePrice);
  const [articleId, setArticleId] = useState(defaultArticleId || "");
  const [blendeId, setBlendeId] = useState(defaultBlendeId || "");
  const [quantity, setQuantity] = useState(initialQuantity);

  const selectedBlende = blendenById.get(blendeId) || null;
  const selectedBlendeUnitPrice = selectedBlende ? centsToMoney(moneyToCents(selectedBlende.price)) : "0.00";
  const selectedBlendeTotal = centsToMoney(blendeTotalCents(selectedBlende, quantity));
  const totalPrice = centsToMoney(moneyToCents(articlePrice) + blendeTotalCents(selectedBlende, quantity));

  return (
    <section className="admin-catalog-editor" aria-labelledby="admin-catalog-editor-title">
      <div className="admin-catalog-editor__heading">
        <div>
          <h3 id="admin-catalog-editor-title">Catalog &amp; pricing</h3>
          <p>Catalog values are used automatically for the article number, names and prices.</p>
        </div>
        <span className={`admin-catalog-editor__status${articleId ? " is-linked" : ""}`}>
          {articleId ? "Catalog linked" : "Not linked"}
        </span>
      </div>

      <div className="admin-catalog-editor__relations">
        <FormField label="Catalog article" wide={false}>
          <AdminSelect
            name="catalogArticleId"
            value={articleId}
            onChange={(event) => {
              const nextArticleId = event.target.value;
              setArticleId(nextArticleId);
              const nextArticle = articlesById.get(nextArticleId);
              if (nextArticle) {
                setArticlePrice(centsToMoney(moneyToCents(nextArticle.price)));
              }
            }}
            style={selectStyle}
          >
            <option value="">No article link</option>
            {catalogArticles.map((article) => (
              <option key={article.id} value={article.id}>
                {article.articleNumber} - {localizedName(article)} ({article.formattedPrice})
              </option>
            ))}
          </AdminSelect>
        </FormField>

        <FormField label="Included Blende" wide={false}>
          <AdminSelect
            name="catalogBlendeId"
            value={blendeId}
            onChange={(event) => {
              const nextBlendeId = event.target.value;
              setBlendeId(nextBlendeId);
              setQuantity((current) => quantityValue(current, Boolean(nextBlendeId)));
            }}
            style={selectStyle}
          >
            <option value="">No included Blende</option>
            {catalogBlenden.map((blende) => (
              <option key={blende.id} value={blende.id}>
                {blende.code} - {localizedName(blende)} ({blende.formattedPrice})
              </option>
            ))}
          </AdminSelect>
        </FormField>

        <FormField label="Quantity" wide={false}>
          <input
            type="number"
            name="catalogBlendeQuantity"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            min="1"
            step="1"
            disabled={!blendeId}
            style={selectStyle}
          />
        </FormField>
      </div>

      {!articleId ? (
        <div className="admin-catalog-editor__manual-price">
          <FormField label="Manual article price" wide={false}>
            <input
              name="articleBasePrice"
              value={articlePrice}
              onChange={(event) => setArticlePrice(event.target.value)}
              style={priceStyle}
              required
            />
          </FormField>
        </div>
      ) : (
        <input type="hidden" name="articleBasePrice" value={articlePrice} />
      )}
      <input type="hidden" name="price" value={totalPrice} />

      <div className="admin-catalog-editor__price" aria-label="Price calculation">
        <div>
          <span>Article</span>
          <strong>{formatCurrency(articlePrice)}</strong>
        </div>
        <span className="admin-catalog-editor__operator" aria-hidden="true">+</span>
        <div>
          <span>Blende{blendeId ? ` × ${quantity || 1}` : ""}</span>
          <strong>{formatCurrency(selectedBlendeTotal)}</strong>
          {blendeId ? <small>{formatCurrency(selectedBlendeUnitPrice)} each</small> : null}
        </div>
        <span className="admin-catalog-editor__operator" aria-hidden="true">=</span>
        <div className="admin-catalog-editor__price-total">
          <span>Total</span>
          <strong>{formatCurrency(totalPrice)}</strong>
        </div>
      </div>

      <details className="admin-catalog-editor__service-link">
        <summary>Service catalog link</summary>
        <div>
          <FormField label="Linked service" wide={false}>
            <AdminSelect name="catalogServiceId" defaultValue={defaultServiceId || ""} style={selectStyle}>
              <option value="">No service link</option>
              {catalogServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.code} - {localizedName(service)} ({service.formattedPrice})
                </option>
              ))}
            </AdminSelect>
          </FormField>
          <p>Only service-type items need this connection.</p>
        </div>
      </details>
    </section>
  );
}

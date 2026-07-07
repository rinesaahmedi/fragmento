"use client";

import { useMemo, useState } from "react";
import { FormField } from "./admin-ui";
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

export default function AdminBlendePriceFields({
  totalPriceDefaultValue = "0.00",
  priceStyle,
  selectStyle,
  relationGridStyle,
  catalogBlenden = [],
  catalogServices = [],
  catalogArticles = [],
  defaultArticleId = "",
  defaultBlendeId = "",
  defaultBlendeQuantity = "",
  defaultServiceId = "",
  currentBlendePrice = null,
}) {
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
    <>
      <div style={relationGridStyle}>
        <FormField label="Article price" wide={false}>
          <input
            name="articleBasePrice"
            value={articlePrice}
            onChange={(event) => setArticlePrice(event.target.value)}
            style={priceStyle}
            required
          />
        </FormField>
        <FormField label="Blende unit price" wide={false}>
          <input value={selectedBlendeUnitPrice} style={priceStyle} readOnly />
        </FormField>
        <FormField label="Blende total" wide={false}>
          <input value={selectedBlendeTotal} style={priceStyle} readOnly />
        </FormField>
        <FormField label="Total price" wide={false}>
          <input name="price" value={totalPrice} style={priceStyle} readOnly required />
        </FormField>
      </div>

      <div style={relationGridStyle}>
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
                {article.articleNumber} - {article.label} ({article.formattedPrice})
              </option>
            ))}
          </AdminSelect>
        </FormField>
        <FormField label="Blende" wide={false}>
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
            <option value="">No blende</option>
            {catalogBlenden.map((blende) => (
              <option key={blende.id} value={blende.id}>
                {blende.code} - {blende.label} ({blende.formattedPrice})
              </option>
            ))}
          </AdminSelect>
        </FormField>
        <FormField label="Blende quantity" wide={false}>
          <input
            type="number"
            name="catalogBlendeQuantity"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            min="1"
            step="1"
            style={selectStyle}
          />
        </FormField>
        <FormField label="Service catalog link" wide={false}>
          <AdminSelect name="catalogServiceId" defaultValue={defaultServiceId || ""} style={selectStyle}>
            <option value="">No service link</option>
            {catalogServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.code} - {service.label} ({service.formattedPrice})
              </option>
            ))}
          </AdminSelect>
        </FormField>
      </div>
    </>
  );
}

# VAT Price Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show every grand-total price display as three lines (Price / VAT 19% / Total) without changing any stored number or amount charged.

**Architecture:** Add one shared, dependency-free util (`frontend/lib/price-utils.js`) exporting `getPriceBreakdown(total)`. Each consuming file computes the breakdown at render time from its existing total value and renders three lines instead of one, reusing that file's existing `formatCurrency`.

**Tech Stack:** Next.js app router (ESM `import`/`export` throughout), no test runner in this project — verification is `npm run build` (in `frontend/`) plus manual browser check.

## Global Constraints

- VAT rate is fixed at 19% (`VAT_RATE = 0.19`), not configurable, no schema/migration.
- The existing stored `totalPrice`/`order.total` value never changes — it is always the gross/total, and is always the third (bold) line.
- `net = total / 1.19`, `vat = total - net`.
- No English order-confirmation email/PDF work (explicitly declined by user) — email/PDF stay German-only; only the 3-line split is added there, in German.
- Admin list-view tables (`admin/orders/page.js`, `admin/px-orders/page.js`) keep a single "Total" column — no breakdown there (user decision).
- Per-line-item/unit/catalog prices are untouched — breakdown applies only to the final grand total.

---

### Task 1: Shared VAT util

**Files:**
- Create: `frontend/lib/price-utils.js`

**Interfaces:**
- Produces: `VAT_RATE` (number, `0.19`), `getPriceBreakdown(total: number) => { net: number, vat: number, total: number }` — used by every later task.

- [ ] **Step 1: Create the util**

```js
export const VAT_RATE = 0.19;

export function getPriceBreakdown(total) {
  const gross = Number(total) || 0;
  const net = gross / (1 + VAT_RATE);
  const vat = gross - net;
  return { net, vat, total: gross };
}
```

- [ ] **Step 2: Sanity-check in node**

Run:
```bash
cd frontend && node -e "const {getPriceBreakdown}=require('./lib/price-utils.js'); console.log(getPriceBreakdown(2859))"
```
If this errors because the project only supports ESM `import` (not `require`), instead verify with:
```bash
cd frontend && node --input-type=module -e "import {getPriceBreakdown} from './lib/price-utils.js'; console.log(getPriceBreakdown(2859))"
```
Expected: `{ net: 2402.5210084033615, vat: 456.4789915966386, total: 2859 }` (net + vat ≈ 2859).

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/price-utils.js
git commit -m "feat: add shared VAT price-breakdown util"
```

---

### Task 2: Kitchen configurator summary panel (customer-facing)

**Files:**
- Modify: `frontend/components/kitchen-selection-summary.jsx:250-253`
- Modify: `frontend/locales/public.en.json:8` (add keys after `totalPrice`)
- Modify: `frontend/locales/public.de.json:8` (add keys after `totalPrice`)

**Interfaces:**
- Consumes: `getPriceBreakdown` from `../lib/price-utils` (Task 1); `translate` from `usePublicI18n()` (already imported in this file).

- [ ] **Step 1: Add translation keys**

In `frontend/locales/public.en.json`, inside `"common"`, add after `"totalPrice": "Total price",`:
```json
    "priceExclVat": "Price",
    "vatAmount": "VAT (19%)",
```

In `frontend/locales/public.de.json`, inside `"common"`, add after `"totalPrice": "Gesamtpreis",`:
```json
    "priceExclVat": "Preis",
    "vatAmount": "MwSt. (19%)",
```

- [ ] **Step 2: Import the util**

In `frontend/components/kitchen-selection-summary.jsx`, add to the import block at the top (after the `kitchen-selection-utils` import):
```js
import { getPriceBreakdown } from "../lib/price-utils";
```

- [ ] **Step 3: Replace the total block**

Replace:
```jsx
      <div className={styles.summaryActions}>
        <div className={styles.summaryTotal}>
          <span>{translate("common.totalPrice", "Total price")}</span>
          <strong>{formatCurrency(grandTotal)}</strong>
        </div>
        <button type="button" className={styles.primaryButton} onClick={onOpenOrderSection}>
          {translate("configurator.summaryContinueToOrder", "Continue to order")}
        </button>
      </div>
```
with:
```jsx
      <div className={styles.summaryActions}>
        <div className={styles.summaryTotal}>
          {(() => {
            const { net, vat, total } = getPriceBreakdown(grandTotal);
            return (
              <>
                <div className={styles.summaryTotalLine}>
                  <span>{translate("common.priceExclVat", "Price")}</span>
                  <span>{formatCurrency(net)}</span>
                </div>
                <div className={styles.summaryTotalLine}>
                  <span>{translate("common.vatAmount", "VAT (19%)")}</span>
                  <span>{formatCurrency(vat)}</span>
                </div>
                <div className={styles.summaryTotalLine}>
                  <span>{translate("common.totalPrice", "Total price")}</span>
                  <strong>{formatCurrency(total)}</strong>
                </div>
              </>
            );
          })()}
        </div>
        <button type="button" className={styles.primaryButton} onClick={onOpenOrderSection}>
          {translate("configurator.summaryContinueToOrder", "Continue to order")}
        </button>
      </div>
```

- [ ] **Step 4: Add the `summaryTotalLine` CSS rule**

Open `frontend/components/kitchen-configurator.module.css`, find the existing `.summaryTotal` rule, and add a new rule directly after it:
```css
.summaryTotalLine {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.summaryTotalLine + .summaryTotalLine {
  margin-top: 4px;
}
```
(If `.summaryTotal` already sets `display: flex; flex-direction: column;`, keep that — these new lines stack inside it. If it's currently `display:flex; justify-content:space-between` for a single row, change it to `flex-direction: column; align-items: stretch; gap: 2px;` so the three lines stack instead of trying to sit side by side. Read the current rule first and adapt minimally — don't remove unrelated properties like padding/border/background.)

- [ ] **Step 5: Build check**

```bash
cd frontend && npm run build
```
Expected: build succeeds with no new errors.

- [ ] **Step 6: Manual check**

Run `npm run dev`, open a kitchen configurator URL (e.g. `/kitchens/<slug>`), confirm the bottom summary panel shows three lines — Price, VAT (19%), Total price (bold) — and that `net + vat` displayed equals the `Total price` value (within a cent), in both `?lang=en` and `?lang=de`.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/kitchen-selection-summary.jsx frontend/components/kitchen-configurator.module.css frontend/locales/public.en.json frontend/locales/public.de.json
git commit -m "feat: show price/VAT/total breakdown in kitchen configurator summary"
```

---

### Task 3: Admin dashboard "Total revenue" tile

**Files:**
- Modify: `frontend/app/admin/page.js:1455-1461`
- Modify: `frontend/components/admin-dashboard-charts.js:286-309`
- Modify: `frontend/locales/admin.en.json` (add keys near `dashboard.totalRevenue`, line 173)
- Modify: `frontend/locales/admin.de.json` (same, line 173)

**Interfaces:**
- Consumes: `getPriceBreakdown` from `../../lib/price-utils` (path relative to `app/admin/page.js`).
- Produces: `kpi.breakdown` — optional array of `{ label: string, value: string }` on a kpi object, consumed by `admin-dashboard-charts.js`.

- [ ] **Step 1: Add translation keys**

In `frontend/locales/admin.en.json`, inside `"dashboard"`, add after `"totalRevenue": "Total revenue",`:
```json
    "priceExclVat": "Price",
    "vatAmount": "VAT (19%)",
```

In `frontend/locales/admin.de.json`, inside `"dashboard"`, add after `"totalRevenue": "Gesamtumsatz",`:
```json
    "priceExclVat": "Preis",
    "vatAmount": "MwSt. (19%)",
```

- [ ] **Step 2: Import the util in `admin/page.js`**

Find the existing import block at the top of `frontend/app/admin/page.js` and add:
```js
import { getPriceBreakdown } from "../../lib/price-utils";
```

- [ ] **Step 3: Add breakdown to the revenue kpi**

Replace:
```js
    {
      labelKey: "dashboard.totalRevenue",
      fallbackLabel: "Total revenue",
      value: formatCurrency(totalRevenue),
      trendKey: "dashboard.grossOrderValue",
      trendFallback: "Gross order value",
    },
```
with:
```js
    {
      labelKey: "dashboard.totalRevenue",
      fallbackLabel: "Total revenue",
      value: formatCurrency(totalRevenue),
      breakdown: [
        {
          labelKey: "dashboard.priceExclVat",
          fallbackLabel: "Price",
          value: formatCurrency(getPriceBreakdown(totalRevenue).net),
        },
        {
          labelKey: "dashboard.vatAmount",
          fallbackLabel: "VAT (19%)",
          value: formatCurrency(getPriceBreakdown(totalRevenue).vat),
        },
      ],
    },
```

- [ ] **Step 4: Render the breakdown lines in `admin-dashboard-charts.js`**

In the desktop kpi grid (around line 287-293), replace:
```jsx
        {kpis.map((kpi) => (
          <article key={kpi.labelKey || kpi.fallbackLabel || kpi.value} className="kpi-card">
            <span>{translate(kpi.labelKey || "", kpi.fallbackLabel || "")}</span>
            <strong>{kpi.value}</strong>
            <small>{translateText(kpi.trendKey || "", kpi.trendFallback || "", kpi.trendValues)}</small>
          </article>
        ))}
```
with:
```jsx
        {kpis.map((kpi) => (
          <article key={kpi.labelKey || kpi.fallbackLabel || kpi.value} className="kpi-card">
            <span>{translate(kpi.labelKey || "", kpi.fallbackLabel || "")}</span>
            <strong>{kpi.value}</strong>
            {kpi.breakdown ? (
              kpi.breakdown.map((line) => (
                <small key={line.labelKey}>
                  {translate(line.labelKey || "", line.fallbackLabel || "")}: {line.value}
                </small>
              ))
            ) : (
              <small>{translateText(kpi.trendKey || "", kpi.trendFallback || "", kpi.trendValues)}</small>
            )}
          </article>
        ))}
```

Do the same replacement in the mobile kpi grid block a few lines below (around line 302-308), same pattern with `mobile-kpi-card`.

- [ ] **Step 5: Build check**

```bash
cd frontend && npm run build
```
Expected: build succeeds.

- [ ] **Step 6: Manual check**

Log into `/admin`, confirm the "Total revenue" tile shows the bold total as before, plus two smaller lines "Price: €X" and "VAT (19%): €Y" beneath it, in both EN and DE admin language settings.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/admin/page.js frontend/components/admin-dashboard-charts.js frontend/locales/admin.en.json frontend/locales/admin.de.json
git commit -m "feat: add price/VAT breakdown to admin dashboard revenue tile"
```

---

### Task 4: Admin order detail page (regular orders)

**Files:**
- Modify: `frontend/app/admin/orders/[id]/page.js:244-247`
- Modify: `frontend/locales/admin.en.json` (add keys near `orderDetailAdmin.total`, line 795)
- Modify: `frontend/locales/admin.de.json` (same, line 796)

**Interfaces:**
- Consumes: `getPriceBreakdown` from `../../../../lib/price-utils` (adjust relative depth to match this file's existing imports — check the existing import path style in this file before adding).

- [ ] **Step 1: Add translation keys**

In `frontend/locales/admin.en.json`, inside `"orderDetailAdmin"`, add after `"total": "Total",`:
```json
    "priceExclVat": "Price",
    "vatAmount": "VAT (19%)",
```

In `frontend/locales/admin.de.json`, inside `"orderDetailAdmin"`, add after `"total": "Gesamt",`:
```json
    "priceExclVat": "Preis",
    "vatAmount": "MwSt. (19%)",
```

- [ ] **Step 2: Import the util**

Add near the top of `frontend/app/admin/orders/[id]/page.js`, matching this file's existing import style (check whether other `lib/` imports in this file use `@/lib/...` alias or relative paths, and match it):
```js
import { getPriceBreakdown } from "../../../../lib/price-utils";
```

- [ ] **Step 3: Replace the Total metric cell**

Replace:
```jsx
              <div style={actionMetricStyle}>
                <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.total" fallback="Total" /></span>
                <strong>{formatCurrency(order.totalPrice)}</strong>
              </div>
```
with:
```jsx
              <div style={actionMetricStyle}>
                <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.total" fallback="Total" /></span>
                <div style={{ display: "grid", gap: 2 }}>
                  <span style={{ fontSize: 12, color: "var(--app-text-muted)" }}>
                    <AdminText i18nKey="orderDetailAdmin.priceExclVat" fallback="Price" />: {formatCurrency(getPriceBreakdown(order.totalPrice).net)}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--app-text-muted)" }}>
                    <AdminText i18nKey="orderDetailAdmin.vatAmount" fallback="VAT (19%)" />: {formatCurrency(getPriceBreakdown(order.totalPrice).vat)}
                  </span>
                  <strong>{formatCurrency(order.totalPrice)}</strong>
                </div>
              </div>
```

- [ ] **Step 4: Build check**

```bash
cd frontend && npm run build
```

- [ ] **Step 5: Manual check**

Open an order's admin detail page (`/admin/orders/<id>`), confirm the Total metric cell now shows Price and VAT sub-lines above the bold Total.

- [ ] **Step 6: Commit**

```bash
git add "frontend/app/admin/orders/[id]/page.js" frontend/locales/admin.en.json frontend/locales/admin.de.json
git commit -m "feat: add price/VAT breakdown to admin order detail total"
```

---

### Task 5: Admin PX-order detail page

**Files:**
- Modify: `frontend/app/admin/px-orders/[id]/page.js:129-132`

**Interfaces:**
- Consumes: `getPriceBreakdown` from `../../../../lib/price-utils`. This file has no i18n (plain hardcoded English strings) — match that convention, do not introduce `AdminText` here.

- [ ] **Step 1: Import the util**

Add near the top of `frontend/app/admin/px-orders/[id]/page.js`:
```js
import { getPriceBreakdown } from "../../../../lib/price-utils";
```

- [ ] **Step 2: Replace the Total metric cell**

Replace:
```jsx
              <div style={metricStyle}>
                <span style={labelStyle}>Total</span>
                <strong>{formatCurrency(order.totalPrice)}</strong>
              </div>
```
with:
```jsx
              <div style={metricStyle}>
                <span style={labelStyle}>Total</span>
                <div style={{ display: "grid", gap: 2 }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Price: {formatCurrency(getPriceBreakdown(order.totalPrice).net)}</span>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>VAT (19%): {formatCurrency(getPriceBreakdown(order.totalPrice).vat)}</span>
                  <strong>{formatCurrency(order.totalPrice)}</strong>
                </div>
              </div>
```

- [ ] **Step 3: Build check**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Manual check**

Open a PX order's admin detail page, confirm the same 3-line breakdown appears.

- [ ] **Step 5: Commit**

```bash
git add "frontend/app/admin/px-orders/[id]/page.js"
git commit -m "feat: add price/VAT breakdown to admin PX-order detail total"
```

---

### Task 6: Checkout success page

**Files:**
- Modify: `frontend/app/checkout/success/page.js:288-291`

**Interfaces:**
- Consumes: `getPriceBreakdown` from `../../../lib/price-utils`. This page is English-only, hardcoded strings — match that convention.

- [ ] **Step 1: Import the util**

Add near the top of `frontend/app/checkout/success/page.js`:
```js
import { getPriceBreakdown } from "../../../lib/price-utils";
```

- [ ] **Step 2: Replace the total row**

Replace:
```jsx
              <div style={totalRowStyle}>
                <span>Total</span>
                <strong>{formatCurrency(order.totalPrice)}</strong>
              </div>
```
with:
```jsx
              <div style={totalRowStyle}>
                <div>
                  <div>Price</div>
                  <div>VAT (19%)</div>
                  <div>Total</div>
                </div>
                <div>
                  <div>{formatCurrency(getPriceBreakdown(order.totalPrice).net)}</div>
                  <div>{formatCurrency(getPriceBreakdown(order.totalPrice).vat)}</div>
                  <strong>{formatCurrency(order.totalPrice)}</strong>
                </div>
              </div>
```
Check `totalRowStyle`'s definition (around line 490) before this edit — if it's a `display:flex; justify-content:space-between` row expecting exactly two flex children, this two-column layout (label column + value column) still fits that pattern (two children). If it instead expects text directly (no wrapper divs), adjust the JSX to keep the same two-child flex structure but stack three lines inside each side using a `<div style={{display:"grid", gap:2}}>` wrapper as shown above.

- [ ] **Step 3: Build check**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Manual check**

Complete or view a checkout success page (`/checkout/success?...`), confirm the receipt's total row shows the 3-line breakdown, right-aligned values.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/checkout/success/page.js
git commit -m "feat: add price/VAT breakdown to checkout success total"
```

---

### Task 7: Order confirmation email (German)

**Files:**
- Modify: `frontend/lib/email/order-notifications.js:1388-1392`

**Interfaces:**
- Consumes: `getPriceBreakdown` from `./price-utils.js` (same `lib/` directory — adjust the relative path to `../price-utils.js` since this file lives in `lib/email/`).

- [ ] **Step 1: Import the util**

Add to the import block at the top of `frontend/lib/email/order-notifications.js`:
```js
import { getPriceBreakdown } from "../price-utils.js";
```

- [ ] **Step 2: Replace the Gesamtpreis table row**

Replace:
```js
        <table style="width:100%;margin-top:20px;border-top:2px solid #333;padding-top:15px;">
          <tr><td style="text-align:right;font-size:1.3em;font-weight:bold;">Gesamtpreis: ${formatCurrency(
            order.total,
          )}</td></tr>
        </table>
```
with:
```js
        <table style="width:100%;margin-top:20px;border-top:2px solid #333;padding-top:15px;">
          <tr><td style="text-align:right;font-size:0.95em;color:#555;">Preis: ${formatCurrency(
            getPriceBreakdown(order.total).net,
          )}</td></tr>
          <tr><td style="text-align:right;font-size:0.95em;color:#555;">MwSt. (19%): ${formatCurrency(
            getPriceBreakdown(order.total).vat,
          )}</td></tr>
          <tr><td style="text-align:right;font-size:1.3em;font-weight:bold;">Gesamtpreis: ${formatCurrency(
            order.total,
          )}</td></tr>
        </table>
```

- [ ] **Step 3: Build check**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Manual check**

Trigger an order-confirmation email preview from the admin order review modal (`OrderEmailReviewModal`) for an existing order, confirm the HTML preview shows Preis / MwSt. (19%) / Gesamtpreis as three right-aligned rows.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/email/order-notifications.js
git commit -m "feat: add price/VAT breakdown to order confirmation email"
```

---

### Task 8: Order confirmation PDF (server-generated, German)

**Files:**
- Modify: `frontend/lib/email/order-notifications.js:1207-1212` (`generateOrderConfirmationPdf`, same file as Task 7 — util already imported)

- [ ] **Step 1: Replace the Gesamtpreis PDF line**

Replace:
```js
  ensureSpace(40);
  doc.setDrawColor(150).line(margin, y, pageWidth - margin, y);
  y += 20;
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text("Gesamtpreis:", margin, y);
  doc.text(formatCurrency(order.total), pageWidth - margin, y, { align: "right" });
```
with:
```js
  ensureSpace(70);
  doc.setDrawColor(150).line(margin, y, pageWidth - margin, y);
  y += 18;
  const { net, vat, total } = getPriceBreakdown(order.total);
  doc.setFont("helvetica", "normal").setFontSize(11);
  doc.text("Preis:", margin, y);
  doc.text(formatCurrency(net), pageWidth - margin, y, { align: "right" });
  y += 16;
  doc.text("MwSt. (19%):", margin, y);
  doc.text(formatCurrency(vat), pageWidth - margin, y, { align: "right" });
  y += 20;
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text("Gesamtpreis:", margin, y);
  doc.text(formatCurrency(total), pageWidth - margin, y, { align: "right" });
```

- [ ] **Step 2: Build check**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Manual check**

Generate/download an order confirmation PDF for an existing order (via the admin order detail actions), open it, confirm the final page shows Preis / MwSt. (19%) / Gesamtpreis as three lines with no overlapping text or page-break issues.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/email/order-notifications.js
git commit -m "feat: add price/VAT breakdown to server-generated order confirmation PDF"
```

---

### Task 9: Order confirmation PDF (client-generated, German)

**Files:**
- Modify: `frontend/components/kitchen-order-pdf.js:285-290`

**Interfaces:**
- Consumes: `getPriceBreakdown` from `../lib/price-utils` (this component lives in `components/`, one level up to `lib/`).

- [ ] **Step 1: Import the util**

Add to the import block at the top of `frontend/components/kitchen-order-pdf.js`:
```js
import { getPriceBreakdown } from "../lib/price-utils";
```

- [ ] **Step 2: Replace the Gesamtpreis PDF line**

Replace:
```js
  ensureSpace(40);
  doc.setDrawColor(150).line(margin, y, pageWidth - margin, y);
  y += 20;
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text("Gesamtpreis:", margin, y);
  doc.text(formatCurrency(order.total), pageWidth - margin, y, { align: "right" });
```
with:
```js
  ensureSpace(70);
  doc.setDrawColor(150).line(margin, y, pageWidth - margin, y);
  y += 18;
  const { net, vat, total } = getPriceBreakdown(order.total);
  doc.setFont("helvetica", "normal").setFontSize(11);
  doc.text("Preis:", margin, y);
  doc.text(formatCurrency(net), pageWidth - margin, y, { align: "right" });
  y += 16;
  doc.text("MwSt. (19%):", margin, y);
  doc.text(formatCurrency(vat), pageWidth - margin, y, { align: "right" });
  y += 20;
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text("Gesamtpreis:", margin, y);
  doc.text(formatCurrency(total), pageWidth - margin, y, { align: "right" });
```

- [ ] **Step 3: Build check**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Manual check**

In the kitchen configurator, trigger the client-side "download order PDF" action (wherever `generateOrderPdf` from `kitchen-order-pdf.js` is called), confirm the downloaded PDF shows the same 3-line breakdown as Task 8's server PDF.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/kitchen-order-pdf.js
git commit -m "feat: add price/VAT breakdown to client-generated order confirmation PDF"
```

---

### Task 10: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Full build**

```bash
cd frontend && npm run build
```
Expected: no errors.

- [ ] **Step 2: Walk the golden path**

Using `npm run dev`:
1. Open a kitchen configurator (`/kitchens/<slug>?lang=en` then `?lang=de`), add a couple of items, confirm the summary panel's 3-line breakdown updates live as items are added/removed and `net + vat` always reconciles to the displayed total (within 1 cent).
2. Log into `/admin`, confirm the dashboard revenue tile breakdown renders correctly in both admin languages.
3. Open an existing order's admin detail page and an existing PX-order's admin detail page, confirm both show the breakdown.
4. Preview an order confirmation email (admin review modal) and generate both PDF variants (admin-triggered server PDF, and the client-side "download PDF" from the configurator) — confirm all three show Preis/MwSt./Gesamtpreis.
5. View a checkout success page for an existing order, confirm the breakdown appears there too.

- [ ] **Step 3: Report results**

Summarize which of the above passed/failed. If anything failed, file it as a follow-up rather than blocking the already-committed tasks (each task is independently committed and functional).

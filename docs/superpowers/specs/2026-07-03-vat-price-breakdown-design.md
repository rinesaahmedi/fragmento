# VAT price breakdown (net + 19% VAT = total)

## Goal

Every price the app currently shows as a single "total" number (e.g. €2500) stays
exactly that number — nothing charged, stored, or persisted changes. We add a
display-only breakdown, computed from that stored total:

```
net  = total / 1.19
vat  = total - net
total = net + vat   (unchanged)
```

Shown as three lines wherever a grand total currently appears:

```
Price:        €2101.68
VAT (19%):    €398.32
Total:        €2500.00
```

No VAT rate or amount is stored in the database — it's derived at render time
from `totalPrice` (or whatever field already holds the number) every time.

## Scope

**In scope** (grand-total displays get the 3-line breakdown):
- Kitchen configurator customer summary: `frontend/components/kitchen-selection-summary.jsx` grand total row, and the sticky total pill in `frontend/components/kitchen-configurator.js`.
- Admin dashboard revenue tile(s): `frontend/app/admin/page.js` ("Total revenue").
- Admin order detail totals: `frontend/app/admin/orders/[id]/page.js`, `frontend/app/admin/px-orders/[id]/page.js`.
- Checkout success page: `frontend/app/checkout/success/page.js`.
- Order confirmation email: `frontend/lib/email/order-notifications.js` (`buildOrderSummaryHtml`'s "Gesamtpreis" line).
- Order confirmation PDFs: `generateOrderConfirmationPdf` (same file) and the client-side twin `frontend/components/kitchen-order-pdf.js` (`generateOrderPdf`).

**Explicitly out of scope** (stays a single number, unchanged):
- Admin list-view tables: `frontend/app/admin/orders/page.js`, `frontend/app/admin/px-orders/page.js` — one "Total" column, no breakdown (per user decision — compact table rows).
- Individual line-item / unit / catalog prices anywhere (e.g. the per-item "Article price / Unit price / Line total" table in order detail, kitchen catalog prices, contract values) — VAT breakdown only applies to the final total line, not each line item.
- Contracts pages (`admin/contracts/*`) — not order totals, untouched.
- English order-confirmation email/PDF — out of scope per user decision; both stay German-only, as today. Only the VAT line split is added, in German.
- No database schema changes, no migration — this is purely a render-time calculation.

## Shared utility

New file `frontend/lib/price-utils.js`:

```js
const VAT_RATE = 0.19;

function getPriceBreakdown(total) {
  const gross = Number(total) || 0;
  const net = gross / (1 + VAT_RATE);
  const vat = gross - net;
  return { net, vat, total: gross };
}

module.exports = { VAT_RATE, getPriceBreakdown };
```

(Exported in whatever module format matches each consumer — the codebase mixes
CommonJS `lib/` files with ESM-ish `components/*.js`/`.jsx`; match the existing
convention in each file rather than forcing one style.)

Existing `formatCurrency` implementations are **not** being consolidated as
part of this task — that's a separate, unrelated cleanup (14 duplicated
copies found during research). We only add the new VAT math util and reuse
each file's existing local `formatCurrency` for rendering the three amounts.

## UI copy (both languages, where the surface is already bilingual)

The kitchen configurator, its order summary, and the checkout success page
are the only in-scope surfaces that are already bilingual (EN/DE via
`frontend/locales/public.en.json` / `public.de.json`). Add two new keys to
each, alongside the existing `totalPrice` key:

- `public.en.json`: `"priceExclVat": "Price"`, `"vatAmount": "VAT (19%)"`
- `public.de.json`: `"priceExclVat": "Preis"`, `"vatAmount": "MwSt. (19%)"`

The admin dashboard is also bilingual (`admin.en.json`/`admin.de.json`); add
matching keys there for the revenue tile and order-detail total labels:

- `admin.en.json`: `"priceExclVat": "Price"`, `"vatAmount": "VAT (19%)"`
- `admin.de.json`: `"priceExclVat": "Preis"`, `"vatAmount": "MwSt. (19%)"`

Existing `totalPrice`/`total` keys are reused unchanged as the third line's
label.

The order confirmation email/PDF is hardcoded German text (no i18n keys) —
add the two new lines as plain German strings ("Preis:", "MwSt. (19%):")
directly next to the existing "Gesamtpreis:" line, matching that file's
existing pattern (no locale-file involvement there).

## Rendering pattern

Wherever a total currently renders as:

```
Total: €2500.00
```

it becomes three lines (label + formatted amount each), in this order:
Price (net) → VAT (19%) → Total (gross, bold/emphasized as today). The
existing formatting/styling (bold, larger font, sticky pill, PDF font size,
email table row style) carries over to the new "Total" line; the two new
lines above it use lighter/secondary styling consistent with each surface's
existing "sub-line" conventions (e.g. how per-item price breakdowns are
already styled in `admin/orders/[id]/page.js`).

## Risks / edge cases

- Rounding: `net` and `vat` are computed with full float precision then
  rounded only at format time (`formatCurrency` already handles 2-decimal
  rounding) — so `net + vat` may occasionally be off by €0.01 from `total`
  in the two displayed sub-lines due to independent rounding. This is
  standard invoice behavior (net and VAT are each rounded to the cent) and
  matches how any German invoice shows net/VAT/gross — not a bug to fix.
- `total = 0` (e.g. fully locked/empty order): breakdown shows €0.00 / €0.00
  / €0.00 — no special-casing needed, the formula handles it.

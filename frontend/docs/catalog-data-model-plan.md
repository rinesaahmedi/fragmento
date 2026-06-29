# Catalog Data Model Plan

This document is a design proposal only. It records the current stable state and a safe direction for separating reusable catalog/pricing data from kitchen-specific layout data.

No Prisma schema, migrations, seed data, runtime pricing, checkout, Stripe, orders, PDFs, emails, frontend, or admin behavior should be changed from this document alone.

## Current Stable State

- `frontend/prisma/seed.js` is the current source for seeded production kitchen data.
- `frontend/scripts/audit-seed-db.js` is the read-only validation script for seed/database parity.
- `DEFAULT_KITCHENS` contains 43 seeded production kitchens.
- Normalized seed rows: 842.
- Live seeded `KitchenItem` rows: 842.
- Missing seeded rows: 0.
- Seeded row business-field diffs: 0.
- Numeric seed price diffs: 0.
- Forbidden legacy markers: 0.
- Extra live rows are test data from `test-3d-kitchen`.
- `KitchenItem.price` remains the final stored price used by checkout and the app.
- `OrderItem.priceSnapshot` remains the historical price truth for orders.

## Confirmed Business Decisions

1. Appliance/front combinations are one sellable product.
   - Example: `A-EGSPV597210 + TGV60`.
   - Example: `EWA34660W + TGV60 + WU16`.
   - These should not be decomposed into individually charged child parts for checkout.

2. Hood/cabinet/filter packages are one fixed-price product.
   - Example: `FH664621E + FWK124 + HD6002`.
   - Example: `KHF664611S + FWP18`.
   - Checkout should use the package price, not a sum of internal parts.

3. Included default items stay simple zero-price `KitchenItem` rows with no catalog link.
   - Worktops, default sink markers, default sink base markers, and locked included packages should stay easy to reason about.
   - Do not force catalog references onto included/default rows.

4. Sink and waste stay separate.
   - `SINK-WORKTOP`: visual/default sink-faucet marker, locked, `0.00`, no article/catalog link.
   - `SINKBASE-B-600`: default sink lower cabinet marker, locked, `0.00`, no article/catalog link.
   - `ACC-WASTE-001`: paid waste system, article `517467`, price `89.00`, separate selectable/paid item.

5. `test-3d-kitchen` is test data.
   - Catalog migration should ignore it unless a later task explicitly includes test data.

6. Current orders can be treated as test data, but only after a dedicated order cleanup audit/export.
   - Do not delete orders as part of catalog modeling.
   - Do not recalculate historical orders during migration.

## Target Catalog Model

The target direction is to move reusable pricing and product identity into catalog tables while keeping kitchen layout, geometry, selection behavior, and default behavior on `KitchenItem`.

### CatalogArticle

Use for simple sellable products and fixed-price packaged products.

Suggested fields:

- `id String @id @default(cuid())`
- `articleNumber String @unique`
- `name String`
- `nameDe String?`
- `description String?`
- `price Decimal @db.Decimal(10, 2)`
- `itemType ItemType`
- `isFixedPricePackage Boolean @default(false)`
- `isActive Boolean @default(true)`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

Maps from current seed fields:

- `KitchenItem.articleNumber`
- `KitchenItem.name`
- `KitchenItem.nameDe`
- `KitchenItem.price` where price is a reusable article price
- product names for appliances, accessories, fixed-price hood packages, and packaged appliance/front combinations

Examples:

- `517467`: waste system, `89.00`
- `US30`: base cabinet, `175.00`
- `US40`: base cabinet, `183.00`
- `US50`: base cabinet, `198.00`
- `US60`: base cabinet, `219.00`
- `H6002`: wall cabinet, `149.00`
- `A-EGSPV597210 + TGV60`: dishwasher plus front, `579.00`
- `EWA34660W + TGV60 + WU16`: washing machine plus front/side panel, `639.00`
- `FH664621E + FWK124 + HD6002`: hood/cabinet/filter package, fixed price

Important rule:

- A fixed-price packaged product can be stored in `CatalogArticle` with `isFixedPricePackage = true`. Do not decompose it into charged child rows unless there is a later reporting-only requirement.

### CatalogBlende

Use for reusable add-ons/blenden.

Suggested fields:

- `id String @id @default(cuid())`
- `code String @unique`
- `name String`
- `nameDe String?`
- `price Decimal @db.Decimal(10, 2)`
- `isActive Boolean @default(true)`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

Maps from current seed fields:

- `KitchenItem.blendeCode`
- `KitchenItem.blendeLabel`
- `KitchenItem.blendePrice`
- seed `BLENDE_PRICES`

Examples:

- `UPK20`: `25.00`
- `HPK2002`: `35.00`

### CatalogService

Use for reusable service choices.

Suggested fields:

- `id String @id @default(cuid())`
- `code String @unique`
- `name String`
- `nameDe String?`
- `price Decimal @db.Decimal(10, 2)`
- `isActive Boolean @default(true)`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

Maps from current seed fields:

- `SVC-MONTAGE-001`: delivery/carry/assembly/connection, `349.00`
- `SVC-PICKUP-001`: pickup, `0.00`

### KitchenItem Catalog References

Prefer direct nullable references on `KitchenItem` first. This keeps migration smaller than adding a join table too early.

Possible future `KitchenItem` fields:

- `catalogArticleId String?`
- `catalogArticle CatalogArticle?`
- `catalogBlendeId String?`
- `catalogBlende CatalogBlende?`
- `catalogBlendeQuantity Int?`
- `catalogServiceId String?`
- `catalogService CatalogService?`
- `catalogLinkStatus String?` such as `MATCHED`, `DEFAULT_INCLUDED`, `AMBIGUOUS`, `MANUAL`, `TEST_DATA`

Rules:

- `KitchenItem.price` stays populated and remains checkout source during early phases.
- Catalog references are nullable.
- Included/default items should intentionally have no catalog link.
- `test-3d-kitchen` rows should not be linked unless explicitly included later.

### KitchenItemPriceOverride

Defer unless needed. Use only if a catalog-linked row needs an intentional price exception.

Suggested fields:

- `id String @id @default(cuid())`
- `kitchenItemId String @unique`
- `reason String`
- `overridePrice Decimal @db.Decimal(10, 2)`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

This should be rare. Most current safe rows should match catalog price plus blende price.

### CatalogBundle

Defer unless there is a real need to display package composition.

If added later, use it for reporting/display only at first:

- `CatalogBundle`
- `CatalogBundleItem`

Do not use child bundle item sums for checkout. Appliance/front combinations and hood/cabinet/filter packages are fixed-price sellable products.

### KitchenItemCatalogPart

Defer. One catalog product per `KitchenItem` is enough for the current migration direction.

## What Stays On KitchenItem

`KitchenItem` remains the kitchen-specific planning and selection row.

Keep:

- `kitchenId`
- `itemType`
- `code`
- `name` and `nameDe` as display snapshots/fallbacks
- `price` as current checkout source
- `widthMm`, `heightMm`, `depthMm`
- `infoText`
- product info fields until a separate product-info migration exists
- `iconKey`
- `colorKey`
- `componentKey`
- `isLocked`
- `isActive`
- `sortOrder`
- `blendeCode`, `blendeLabel`, `blendePrice` until catalog blende references are fully validated
- relation to `OrderItem`

## What Moves To Catalog

Move only after validation:

- reusable article identity
- reusable base article price
- reusable blende code and unit price
- reusable service code and price
- fixed-price packaged product identity and price

Do not move default included marker behavior out of `KitchenItem` yet.

## Order And Checkout Safety Rules

- `KitchenItem.price` remains checkout source until a later, fully verified phase.
- `Order.totalPrice` must remain the stored total at the time of order.
- `OrderItem.priceSnapshot` remains historical truth.
- Existing orders must not be recalculated from catalog prices.
- Catalog-derived prices should be used only for read-only validation until parity is proven.
- If orders are deleted later, do it only after a dedicated order cleanup audit/export.

Fields that must stay snapshotted on `OrderItem`:

- `itemType`
- `code`
- `nameSnapshot`
- `priceSnapshot`
- `quantity`
- nullable `kitchenItemId` for traceability when the source row still exists

Future optional snapshots if catalog migration proceeds:

- `articleNumberSnapshot`
- `catalogArticleIdSnapshot`
- `blendeCodeSnapshot`
- `blendePriceSnapshot`

## Migration Phases

### Phase A: Add Catalog Tables Only

- Add catalog tables with no runtime usage.
- No checkout changes.
- No seed behavior changes that affect current `KitchenItem.price`.
- No `test-3d-kitchen` migration.

### Phase B: Backfill Catalog From Seed Helpers

- Populate catalog rows from current centralized seed helpers.
- Treat appliance/front combinations as single `CatalogArticle` rows.
- Treat fixed-price hood/cabinet/filter packages as single `CatalogArticle` rows or deferred bundle records for naming only.
- Add `CatalogBlende` rows for `UPK20` and `HPK2002`.
- Add `CatalogService` rows for montage and pickup.

### Phase C: Add Nullable KitchenItem References

- Add nullable references from `KitchenItem` to catalog tables.
- Backfill only safe, unambiguous seeded production rows.
- Leave default included rows unlinked.
- Leave ambiguous/manual/test rows unlinked.

### Phase D: Read-Only Validation

- Compare `KitchenItem.price` with catalog-derived expected price.
- Validate article-only rows.
- Validate article plus blende quantity rows.
- Validate services.
- Validate fixed-price packages by exact package price, not child sums.
- Report mismatches without changing checkout.

### Phase E: Admin And Reporting Improvements

- Optionally show catalog references in admin/reporting.
- Keep checkout and order creation using `KitchenItem.price`.
- Make current-vs-snapshot reporting explicit so historical orders are not confusing.

### Phase F: Possible Checkout Pricing Change

- Only much later, consider catalog-derived pricing as checkout source.
- This should require a separate design, migration, test plan, and rollback plan.
- Do not do this while default items, packages, blenden, and historical orders still have ambiguity.

## Risks and safeguards

| Risk area | Example problem | Safeguard |
| --- | --- | --- |
| Checkout pricing | Checkout totals change silently after catalog links are added. | Keep checkout on `KitchenItem.price` until an explicit pricing migration is approved and validated. |
| Default included rows | `SINK-WORKTOP`, `SINKBASE-B-600`, or worktops become chargeable catalog rows. | Default included rows must remain locked, `0.00`, and intentionally unlinked from catalog pricing. |
| Sink/waste/accessories | Waste is charged once through `ACC-WASTE-001` and again through a sink marker. | Keep sink markers as visual/default rows and waste as the separate paid article `517467`. |
| Fixed-price packages | Hood/cabinet/filter packages are incorrectly priced by summing child parts. | Treat fixed packages as one sellable fixed-price article for checkout. |
| Blenden | `UPK20` or `HPK2002` quantity is interpreted as one when two are required, or vice versa. | Validate catalog-derived prices read-only against seeded `KitchenItem.price` and explicit blende quantity metadata. |
| Clone kitchens | Shared item arrays or cloned kitchens drift after partial backfill. | Run `audit-seed-db.js` and catalog parity reports before and after migration steps. |
| Historical orders | Reports confuse current catalog prices with historical order snapshots. | Treat `OrderItem.priceSnapshot` as historical truth and show current/catalog prices separately. |
| Test data | `test-3d-kitchen` is linked or reported as production catalog data. | Ignore `test-3d-kitchen` unless explicitly running in test/admin mode. |
| Chatbot/admin assistant | Assistant recommends unavailable items or changes prices without approval. | Start read-only, use role-based permissions, show explanations, and require admin confirmation for writes. |

### 1. Database / pricing risks

- Checkout totals could change silently if catalog-derived prices replace `KitchenItem.price` too early.
- Default zero-price items could become charged if they are catalog-linked incorrectly.
- Waste/accessory duplicate charges could happen if `SINK-WORKTOP` or `SINKBASE-B-600` is treated as paid waste in addition to `ACC-WASTE-001`.
- Fixed-package pricing could be wrong if appliance/front combinations or hood/cabinet/filter packages are interpreted as sum-of-parts bundles.
- Blende quantity mistakes could produce wrong totals, especially one vs two `UPK20` or `HPK2002` add-ons.
- Clone kitchen drift could occur when aliased or cloned item arrays are backfilled inconsistently.
- Reseed could overwrite manual/test rows if migration code assumes every live `KitchenItem` belongs to `DEFAULT_KITCHENS`.
- Historical order snapshots may differ from current catalog prices, which is expected but easy to misread in reports.
- `test-3d-kitchen` could be accidentally treated as production seed data.

### 2. Migration risks

- Adding catalog references too early can create false confidence before all ambiguous rows are understood.
- Removing `KitchenItem.price` too early would break the current checkout safety model.
- Switching checkout from `KitchenItem.price` to catalog-derived price too early could change Stripe totals, PDFs, emails, and admin totals.
- Catalog links may be backfilled incorrectly for bundled strings, default rows, manually edited rows, or cloned kitchens.
- Existing admin/reporting code may assume article, price, blende, and layout data all live directly on `KitchenItem`.
- Current prices and historical snapshot prices can be confused if reporting does not label them clearly.

### 3. Chatbot / AI risks

- A chatbot may recommend unavailable items if it reads catalog rows without checking active kitchen availability.
- A chatbot may confuse default included items with paid selectable items.
- A chatbot may double-count sink, waste, or accessories.
- A chatbot may calculate prices from catalog incorrectly instead of using the approved `KitchenItem.price` checkout source.
- A chatbot may suggest changing historical orders or `OrderItem.priceSnapshot` values.
- A chatbot may use `test-3d-kitchen` data as if it were production data.
- A chatbot may misunderstand fixed-price packages as sum-of-parts bundles.
- A chatbot may miss blende quantity rules.
- A chatbot may expose internal cost or configuration details to customers if permissions are not controlled.
- A chatbot may make changes without admin approval if write permissions are too broad.

### 4. Safeguards

- Checkout must keep using `KitchenItem.price` until an explicit migration changes that rule.
- `OrderItem.priceSnapshot` is historical truth.
- Default included rows must remain `0.00` and non-chargeable.
- `audit-seed-db.js` must pass before and after any migration.
- Catalog-derived price checks must be read-only at first.
- Chatbot/admin assistant behavior should be read-only at first.
- Chatbot/admin assistant responses should show explanations and require admin confirmation before write actions.
- Chatbot/admin assistant tools should not delete or change orders unless explicitly approved.
- Chatbot/admin assistant logic should ignore `test-3d-kitchen` unless operating in test/admin mode.
- Role-based permissions are required for chatbot actions.
- Price and catalog changes require human review.

## What Not To Implement Yet

- Do not change Prisma schema until a migration task is explicitly approved.
- Do not create migrations from this document.
- Do not switch checkout to catalog pricing.
- Do not recalculate existing orders.
- Do not delete orders.
- Do not decompose appliance/front combinations into charged parts.
- Do not decompose hood/cabinet/filter packages for checkout.
- Do not catalog-link default included rows.
- Do not migrate or clean `test-3d-kitchen` unless explicitly requested.
- Do not remove `KitchenItem.price`.

## Remaining Open Questions

- Should fixed-price packaged products be represented only as `CatalogArticle`, or also as optional display-only `CatalogBundle` records later?
- Do admin users need to see package composition, or is the sellable package name enough?
- Should future orders snapshot `articleNumber` and blende metadata in addition to current `OrderItem` fields?
- Which current orders are test orders, and what export is required before deletion?
- Should manual/custom future kitchens be allowed to reference catalog rows, or should catalog links be limited to seeded production kitchens first?

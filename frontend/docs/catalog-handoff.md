# Catalog Handoff

This catalog phase keeps pricing behavior unchanged. Checkout still uses
`KitchenItem.price` as the source of truth.

## What Migrations Do

The catalog migrations create tables and nullable link columns only:

- `CatalogArticle`
- `CatalogBlende`
- `CatalogService`
- nullable catalog reference fields on `KitchenItem`

Migrations do not insert catalog rows, link kitchen items, recalculate prices, or
change checkout behavior.

## What Scripts Do

Catalog data is applied explicitly with scripts:

- `npm run catalog:backfill` inserts or updates catalog articles, blenden, and services.
- `npm run catalog:link` links safe seeded `KitchenItem` rows to catalog records.
- `npm run catalog:audit` validates catalog links, catalog prices, warnings, and link state.
- `npm run db:audit` validates live seeded kitchen rows against normalized seed output.

These scripts are intentionally separate from `prisma/seed.js`. Do not move
catalog data into the main seed yet.

## Current Rules

- `KitchenItem.price` remains the checkout source.
- Catalog-derived prices are read-only validation data for now.
- Default included rows remain unlinked.
- `test-3d-kitchen` remains unlinked and is test data.
- `SINK-WORKTOP` and `SINKBASE-B-600` remain default zero-price rows with no catalog link.
- `ACC-WASTE-001` remains the paid waste article.

## Safe Setup Sequence

For another developer or server:

```bash
cd frontend
npm install
npx prisma generate
npx prisma migrate deploy
npm run catalog:backfill
npm run catalog:link
npm run catalog:audit
npm run db:audit
npm run build
```

Run `npm run db:audit` and `npm run catalog:audit` before and after database work.

## Warnings

- Do not run `prisma migrate reset` on a shared or server database.
- Do not switch checkout to catalog pricing yet.
- Do not edit catalog tables manually unless the change is documented.
- Do not link default included rows.
- Do not link `test-3d-kitchen`.
- Do not reseed production data as part of catalog handoff.
- Do not add catalog create/edit/delete admin actions yet.

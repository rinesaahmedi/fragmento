# Kitchen 670 105778

Registered as `ab-105778`, kitchen code `105 778`, with contracts `670105778`
and `111105778`. Source: `frontend/public/pdfs/670 105778.pdf` and the supplied
item-list screenshot. The PDF has one 842 x 595 point vector page and no raster images.

## Supplier schedule and catalog links

| NR | Supplied article(s) | Component | Catalog relation | EUR |
| --- | --- | --- | --- | ---: |
| 1 | UHK / EH92364E-A / 9EC744100C | oven-module | A-EH923640E + 9EC744100C | Included |
| 2 | PLR60 | worktop | PLR60 | Included |
| 3 | SP50 R / 526335 R / 517720 | sink-base + sink-faucet | SP50 and 526335 + 517720 | Included |
| 4 | US40 | base-module-1 | US40 | 183 |
| 5 | A-EGSPV597210 / TGV60 | dishwasher-base | A-EGSPV597210 + TGV60 | 579 |
| 6 | UPK20 | sink-end-blende | CatalogBlende UPK20 | 25 |
| 7 | H4002 | wall-cabinet-1 | H4002 | 130 |
| 8 | FH664621E / FWK124 / HD6002 | wall-cabinet-2 + hidden extractor-hood | FH664621E + FWK124 + HD6002 | 349 |
| 9 | H6002 | wall-cabinet-3 | H6002 | 149 |
| 10 | H5002 / HPK2002 | wall-cabinet-4 | H5002 + CatalogBlende HPK2002 | 135 + 35 |

All 17 item rows, including the hidden hood and standard accessories/services,
have an active catalog relation and `MATCHED` status. The hidden hood follows the
visible package selection and contributes no additional price.

The screenshot supplies no dimensions or optional prices. Existing catalog
prices and dimensions are used. DEFAULT rows and the sink/faucet package remain
locked and included at zero, matching the current catalog convention. The supplier
oven spelling uses the existing catalog alias `A-EH923640E`; `SP50 R` retains its
right hinge in the item note. Optional HPK2002 is charged at the catalog price of
35 EUR together with H5002, following supplier row 10. UPK20 remains a separate
selection because it has its own supplier row and callout 6.

## Measured plan geometry

Source path coordinates are divided by 842 x 595, rather than rounded raster
measurements. All 15 hotspots preserve their measured size after display cropping.

- Wall cabinet dividers: x = 183.96, 273, 406.56, 540.24, 651.6 points.
- The H5002 hotspot includes its right HPK2002 through x = 663.6.
- Wall fronts: y = 99.88..260.8. Hood underside: y = 260.8..271.96.
- Both LED ray symbols at y = 279.76..298.48 use separate trapezoid hotspots
  with the existing `extractor-hood` key and follow the hood's visual selection.
- Worktop: x = 180.36..663.6, y = 377.68..386.68.
- Locked left side panel: x = 180.36..183.96, y = 386.68..582.16.
- Base fronts and plinth: y = 386.68..582.16.
- UPK20: x = 651.6..663.6, independent of the locked SP50.
- Faucet: x = 563.52..576, y = 332.8..377.68.
- ASC sink strip: x = 540.24..651.6, y = 377.68..386.68, aligned to both
  measured worktop edges and confined to the SP50 width.
- Claim oven/drawer boundary: y = 515.92, with the drawer continuing to the baseline.
- Dishwasher basket and GS marking use separate tight clips and stay light grey.

The SVG loader, configurator, catalog previews and claims share the same source
asset. Claims keep the linear worktop and separate sink, faucet, SP50, oven, UHK
drawer and cooktop choices.

## Verification

- Scoped seed completed successfully for `ab-105778`.
- `node scripts/audit-105778.cjs --summary` checks all catalog relations, defaults,
  contract numbers and the six core claim article identities.
- New kitchen tests plus AB 105776 regressions: 8 passed.
- Shared catalog-preview and claims suites: 167 passed, 6 failed. The same six
  failures occur on the unchanged HEAD snapshot (105828, 105809, 105814, service
  picker, and two 105834 checks). No new shared-suite failures were introduced.
- `npm run build`: successful, including lint and type checks.
- Source overlay inspected against the full-resolution PDF raster.
- Desktop browser: HTTP 200, no JavaScript errors; plan/catalog selection works
  both ways; hood faces toggle together; defaults are selected and disabled.
- All seven optional components total 1,585 EUR after the H5002 filler confirmation.
- Mobile at 390 px: the measured hotspots remain aligned, with no horizontal overflow.
- Claims contract API for `111105778`: HTTP 200 and the correct kitchen plan.
- ASC sink-strip correction: 4 kitchen tests and 2 existing elevation regressions
  passed; desktop visual review and mobile alignment confirmed. The existing
  linked sink, faucet and cabinet selection still toggles correctly.

Temporary verification screenshots and overlays are under `tmp/pdfs/105778-*`.

Local review: `/kitchens/ab-105778?contractNumber=111105778&lang=en`.

## Separate identical kitchens

105781, 105784 and 105787 are independent kitchen records with their own item,
claim-part and contract rows. Each uses the same article codes, catalog links,
prices, defaults and source-plan geometry as 105778. The shared drawing includes
the hood LED selection and the corrected ASC sink strip.

| Kitchen | Route | Contracts |
| --- | --- | --- |
| 105781 | `/kitchens/ab-105781` | `670105781`, `111105781` |
| 105784 | `/kitchens/ab-105784` | `670105784`, `111105784` |
| 105787 | `/kitchens/ab-105787` | `670105787`, `111105787` |

Verification: scoped seeds succeeded for all three; `node scripts/audit-105778.cjs
--family` confirmed four unique kitchen IDs, 17 separate catalog-linked item rows
and 10 separate ASC parts per kitchen, with identical content. All 11 kitchen and
105776 regression tests passed. Each order page and both contract prefixes
returned HTTP 200; browser checks confirmed all four hood faces toggle together
and the ASC sink, faucet and cabinet meet exactly. `npx next build` passed,
including lint and type checks.

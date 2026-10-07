# Kitchen 670 105789

Independent kitchen `ab-105789`, code `105 789`, with contracts `670105789`
and `111105789`. Source: `frontend/public/pdfs/670 105789.pdf` and the supplied
Excel screenshot. The source is a one-page, 842 x 595 point vector PDF.

## Supplier rows and catalog links

| NR | Supplier article(s) | Component | Catalog relation | EUR |
| --- | --- | --- | --- | ---: |
| 1 | UHK / EH92364E-A / 9EC744100C | oven-module | A-EH923640E + 9EC744100C | Included |
| 2 | PLR60 | worktop | PLR60 | Included |
| 3 | SP60 R / 526335 R / 517720 | sink-base + sink-faucet | SP60 and 526335 + 517720 | Included |
| 4 | OL-KGCN388140E | refrigerator | OL-KGCN388140E | 579 |
| 5 | UPK20 | base-end-blende | CatalogBlende UPK20 | 25 |
| 6 | US30 / UPK20 | base-module-1 | US30 + CatalogBlende UPK20 | 175 + 25 |
| 7 | A-EGSPV597210 / TGV60 / UPEF65 | dishwasher-base | A-EGSPV597210 + TGV60 and CatalogBlende UPEF65 | 579 + 68 |
| 8 | US30 / UPK20 | base-module-2 | US30 + CatalogBlende UPK20 | 175 + 25 |
| 9 | FH664621E / FWK124 / HD6002 | wall-cabinet-1 + hidden extractor-hood | FH664621E + FWK124 + HD6002 | 349 |
| 10 | H3002 | wall-cabinet-2 | H3002 | 115 |
| 11 | H6002 / HPK2002 | wall-cabinet-3 | H6002 + CatalogBlende HPK2002 | 149 + 35 |

All 18 item records, including the hidden hood and standard accessories/services,
have an active catalog relation and `MATCHED` status. The hidden hood does not
add a second charge. The eight optional components total 2,299 EUR.

The screenshot provides no prices or dimensions. Existing catalog prices and
dimensions are used, with standard dimension fallbacks for missing catalog fields.
DEFAULT rows and their sink/faucet package are locked and included at zero,
following the current kitchen convention. Supplier `EH92364E-A` uses the existing
catalog oven alias `A-EH923640E`. The right hinge/orientation of row 3 is retained
in the item notes. Row 7 has UPEF65 only; no additional UPK20 is charged there.

## Plan and ASC geometry

`frontend/lib/ab-105789-plan.js` contains 39 measured polygon hotspots shared by
the configurator and ASC. Source points come from PDF paths, divided by 842 x 595.
Every polygon preserves its measured shape and includes its drawn plinth.

- Refrigerator: top, left side and front; the hood cabinet side stops at the
  refrigerator's visible occlusion line.
- Hood package: three cabinet faces, the underside, and two separate LED ray symbols.
- Row 5 UPK20: independent strip between the refrigerator and oven.
- Rows 6 and 8 UPK20: attached to their respective US30 cabinets in the order view.
- Row 7 UPEF65: the front corner filler follows the dishwasher selection.
  Only the thin right edge, x = 454.08..456.12 PDF points, belongs to the
  locked worktop and stays blue independently of the dishwasher.
- Row 11 HPK2002: front and top faces follow the H6002 selection.
- Worktop: two surfaces, two fascias, the right end panel and three thin locked returns.
- Sink: complete bowl/drainer rim. Faucet: four separate silhouettes, including the
  curved neck and stem. Cooktop: the outside glass perimeter visible beside the fridge.
- Dishwasher basket: tight source bounds enclosing the light-grey drawing.
  The GS mark has a separate clip; both stay light grey when selected.

ASC creates 13 claim records, including the oven, UHK drawer, cooktop, SP60,
sink, faucet, dishwasher, furniture front, filter, both PLR60 legs and WU16 panels.
Optional sources become claimable through the existing confirmed-order rules.
Cabinet Blenden use complete measured faces when split for a claim. The oven/drawer
seam follows `(289.32, 470.92)` to `(382.32, 461.32)` in PDF coordinates.
The thin return beside the refrigerator selects with the left worktop in ASC.
Both thin returns on the right (inside corner and end-panel edge) select with the right worktop in ASC.
The existing affected-part controls can narrow grouped selections to individual parts.

## Verification

- Scoped seed completed for `ab-105789`; existing catalog rows were left unchanged.
- `node scripts/audit-105789.cjs`: all catalog links, price parity, defaults,
  attached fillers, contract identities and core claim articles passed.
- 26 tests passed for 105789, 105775, 105777 and the 105778 family.
- 12 existing ASC side/end-panel regression cases passed.
- `npx next build`: passed, including lint and type checks.
- Source overlay and desktop/mobile screenshots inspected against PDF linework.
- Desktop: all eight optional selections work; total 2,299 EUR, no JavaScript errors.
  Filler confirmations use the catalog prices and the hood/LED areas toggle together.
- Mobile at 390 px: no horizontal overflow; all six hood package areas select together.
- ASC contract API for `111105789`: HTTP 200, correct kitchen and source SVG.
  Sink, faucet, cabinet and worktop selections follow the measured perspective faces.

Review: `/kitchens/ab-105789?contractNumber=111105789&lang=en&instructionMode=text`.
Verification images are under `tmp/pdfs/105789-*`.

Purchased-kitchen email attachment correction: the server's legacy object-literal
reader now receives `PLAN_HOTSPOTS_BY_SLUG`, which the modular 105789 layout
references. The missing binding previously raised a ReferenceError before the
shared metadata fallback ran, so no sketch path or purchased-kitchen PDF was found.
Eight attachment/product-info/baseline tests passed. Generated and visually checked
the one-page `Gekaufte-Kueche-670105789-1.pdf` from the saved 2,299 EUR order;
no email was sent during verification.

Appearance correction: persistent-detail clips now supply the renderer's required
`left`, `top`, `width`, and `height`. Passing only polygon points produced an invalid
CSS clip, so the grey duplicate image covered the whole plan and exposed the otherwise
white supplier numbers. The corrected clips preserve dark source lines and keep the
grey repaint confined to the basket and GS marking.

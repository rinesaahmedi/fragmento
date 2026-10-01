# Kitchen 104296

Implemented from `frontend/public/pdfs/670 104296.pdf` and the two supplied screenshots, following `kitchen-from-pdf-agent-guide.md`.

- Kitchen: `ab-104296`, name `104296`, code `104 296`, program `BURGER CINDY`.
- Contracts: `670104296` and `111104296`.
- All 23 persisted rows have catalog links with `catalogLinkStatus: MATCHED`, including the hidden hood helper, accessories, services and the supplied SP20214K/DBK50 panels.
- Excel DEFAULT rows 1-7 are locked. Catalog prices are used for optional upper cabinets, the hood package, accessories and services; locked items do not add to the order total.
- Included structural rows UHS60, UPE65, SP20214K and DBK50 are hidden from the FRG default-selection summary, while retaining their catalog links, plan highlights and ASC claim selection.
- GI88214-01 is furniture only: it does not infer a refrigerator appliance PDF from its name. A future explicitly attached housing-cabinet document remains supported.
- ASC selects GI88214-01 as one article: its lift-up front (BLUM Aventos HK-S), refrigerator furniture door, drawer, lower door, cabinet body and plinth highlight together and produce one claim form row. The top closing panel has its own DBK50 article (600 x 425 mm); the narrow side filler has its own SP20214K article (91 mm width, cut to fit). These three article choices retain their PDF-measured polygons, without refrigerator appliance claims or serial-number requirements. The earlier six GI88214-01 subpart records are inactive.
- Blank spreadsheet dimensions are supplied from existing catalog records and identifiable cabinet widths. Unknown appliance/housing heights are omitted.

| Excel NR | Catalog article | Supplied part |
| --- | --- | --- |
| 1 | PLR60 | Both worktop legs |
| 2 | SPDT60; 526335 + 517720 | Sink cabinet and sink/faucet |
| 3 | TV60 | Furniture front only; customer's dishwasher excluded |
| 4 | EHCX9330S-A; UHS60 | One oven/ceramic appliance set and its furniture cabinet |
| 5 | US2A30 | Narrow drawer cabinet |
| 6 | US2A50; UPE65 | Left drawer cabinet and the supplied corner filler |
| 7 | GI88214-01; SP20214K; DBK50 | Housing cabinet with its distinct side filler and top closure; customer's refrigerator excluded |
| 8 | H6002 + HPK2002 | Upper cabinet and outside filler |
| 9 | H3002 | Upper cabinet |
| 10 | FH664621E + FWK124 + HD6002 | Linked hood package |
| 11 | H6002 | Upper cabinet |
| 12 | H6002 | Upper cabinet |

The SVG is rendered directly from the original PDF. `frontend/lib/ab-104296-plan.js` contains the measured PDF vertices shared by FRG and ASC, including exposed sides, top faces, corner strips, faucet curves and the oven/cabinet seam.

ASC has one `oven-set` claim identity across the oven face and ceramic surface. UHS60 remains furniture, and TV60/GI88214-01 never create dishwasher/refrigerator appliance claims. Sink, faucet, both worktop legs and the upper-cabinet HPK2002 retain separate measured claim surfaces. Worktop selection preserves the sink and ceramic surface cutouts. The appliance inventory recognizes the cooker set's shared serial number.

## Catalog corrections

- All linked article, filler and service records are registered in `BURGER CINDY`. Existing Burger prices are preserved; missing program prices retain their current catalog values. Supplier codes from the supplied schedule remain unchanged apart from removing L/R.
- Catalog articles `GI88214-01 L` and `SPDT60 R` are renamed to `GI88214-01` and `SPDT60`, preserving their IDs. The duplicate `526335 R + 517720` is merged into the existing `526335 + 517720` package. Internal kitchen-item codes remain stable so selection and existing references continue to resolve.
- Seven new kitchen-specific master articles remain: `GI88214-01`, `TV60`, `SPDT60`, `EHCX9330S-A`, `UHS60`, `SP20214K`, `DBK50`. The last two were added following the user's explicit supplier-code clarification. The sink/faucet package and all remaining kitchen articles already existed.
- The first seed also restored an existing seed declaration missing from this database: `U40` (40 cm lower cabinet), unrelated to 104296 and currently unused. Initially six kitchen-specific master articles were created; the redundant oriented sink/faucet package has now been merged into the earlier catalog record.
- Follow-up verification: 55 focused tests passed. Database checks cover all 21 Burger catalog links, normalized FRG/ASC article codes, preserved furniture IDs, sink-package reuse and preservation of existing Burger/Impuls prices.

## Verification

- All-items email check: created contract `222104296` and order `222104296-1` through the normal submission validator, with 22 saved item snapshots and a EUR 1,484.00 total. This includes every active component, the waste system, lighting, both compatible Burger cutlery widths (`ZBE30`, `ZBE50`) and assembly; pickup is the mutually exclusive alternative. The inactive hood helper is represented by its commercial package. The order remains `NEW`/`UNPAID`, clearly marked as a test; no checkout or fulfillment webhook was triggered.
- Audited all 23 kitchen rows: linked master records and active `BURGER CINDY` program prices, all `MATCHED`. Confirmation notifications now preserve Burger cutlery article snapshots and German labels. Furniture components cannot infer customer-owned refrigerator/dishwasher PDFs. An explicit sender-copy suppression sends this requested test only to `334primex.eu@gmail.com`.
- The two generated PDFs were rendered and visually checked. 53 focused order/email/kitchen tests and the production build passed. Gmail accepted the test email (SMTP `250 2.0.0 OK`, no rejected recipients); the delivery receipt is saved in `output/pdf/order-222104296-1/email-delivery.json` with the confirmation and purchased-kitchen PDFs.
- Article grouping correction: 56 focused tests passed. Both live contract APIs now expose exactly one GI88214-01 claim row and independent SP20214K/DBK50 choices. The six earlier GI88214-01 subpart records are inactive. The actual ASC/email preview was inspected: all seven GI88214-01 faces highlight together, while the top closure and narrow side filler remain unselected.
- Housing supplier-code correction: 56 focused tests passed. Both live contract APIs expose SP20214K and DBK50 with their own linked Burger catalog records and claim sources; the other housing parts retain GI88214-01. Database audit verifies 23/23 matched rows and the supplied panel dimensions. Actual ASC/email previews were visually checked for DBK50, the narrow SP20214K strip, the GI88214-01 lift-up front and cabinet body; the FRG summary still omits the included structural rows.
- Targeted seed and reconciliation completed; no other kitchen was reconciled.
- Live kitchen page and service-claim contract API returned HTTP 200.
- Database audit: 21/21 catalog matches; expected defaults, supplier articles and claim parts verified.
- PDF overlay and actual ASC preview renderings visually inspected for the cooker set, sink and both worktop legs.
- 51 focused tests passed, including all 7 new kitchen tests and existing appliance/serial-number/Burger tests.
- Broader checks: 239/247 passed. The same 8 failures reproduced against the original HEAD (232/240): two reference-plan email marker tests, AB 105828/105809 catalog previews, AB 105814 geometry, a legacy claim-form source assertion and two AB 105834 geometry assertions.
- Production build passed with `npx next build`. The existing Prisma client was used because the running development server holds its Windows DLL open; no schema changes were required.
- Browser runtime discovery returned no connected browser. Live interactive click/hover QA remains unverified; shared geometry, selection identities, live API data and server-rendered previews were checked.

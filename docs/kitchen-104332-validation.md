# Kitchen 104332

Added from `frontend/public/pdfs/670 104332.pdf` and the supplied Excel screenshot, following `kitchen-from-pdf-agent-guide.md`.

- Kitchen `ab-104332`, program `BURGER CINDY`; contracts `670104332` and `111104332`.
- All eight Excel DEFAULT rows are included and locked at EUR 0, including when the shared Burger article has an optional catalog price. `LOCKED_INCLUDED` is persisted and honored by the public serializer. The four optional upper cabinets retain callouts 9–12.
- 22 persisted rows, all linked to the master catalog (`MATCHED`). Supplier L/R suffixes are kept as orientation information rather than separate master article identities.
- The actual PDF becomes the self-contained vector SVG. `frontend/lib/ab-104332-plan.js` stores PDF-point polygons shared by FRG and ASC, including cabinet tops, the full tall housing, oven/cabinet seam, corner filler, outside filler and exposed end face.
- UHS60, UPEV and UP10K remain included structural parts, hidden from the standard-equipment summary. The sink/faucet helper merges with the worktop in that summary, leaving eight supplier DEFAULT rows.
- GI88214-01 and TV60 represent furniture for customer-owned appliances; they do not create refrigerator/dishwasher appliance claims or infer their product PDFs.
- The hood, cabinet 10 and both PDF LED symbols toggle together in FRG and ASC. LED polygons use the PDF ray endpoints and resolve through the catalog-linked hood package. Cabinet 12 includes its HP2072K outside filler in FRG; ASC can select that filler separately after the cabinet is purchased.
- Dishwasher basket and GS technical lines have tight persistent light-grey clips, excluding the furniture outline and handle.

| Excel NR | Supplier article(s) | Plan component(s) |
| --- | --- | --- |
| 1 | AP60 | Both worktop legs |
| 2 | GI88214-01 L | Complete tall housing |
| 3 | US2A60 | Left drawer cabinet |
| 4 | EHCX9330S-A + UHS60 | Cooker set and its furniture cabinet |
| 5 | US2A60 + UPEV | Corner drawer cabinet and both corner filler faces |
| 6 | SPDT60 L + 526335 L | Sink cabinet and sink/faucet |
| 7 | TV60 | Dishwasher furniture front |
| 8 | UVADT20-01 R + UP10K | Narrow pull-out cabinet, end filler and exposed side |
| 9 | H6072 | Left upper cabinet, partly occluded by tall housing |
| 10 | FH664621E + FWK124 + HFLH6072 | Upper hood package |
| 11 | H6072 | Middle upper cabinet |
| 12 | H6072 + HP2072K | Right upper cabinet and outside filler |

## Assumptions for blank spreadsheet fields

- Optional H6072: EUR 146; hood package: EUR 346, from the existing Burger catalog.
- HP2072K: provisional EUR 35, matching the existing equivalent upper filler. Cabinet 12 fallback total is EUR 181. Existing configured program prices remain authoritative.
- The faucet is the guide's standard 517720, bundled with the supplied 526335 sink at no extra price.
- Cabinet widths and known depths come from catalog/article identities. Upper cabinets are 600 x 720 x 340 mm. Unspecified heights, exact worktop lengths and filler dimensions remain omitted.
- AP60, UVADT20-01, UPEV, UP10K and HP2072K have explicit master identities, retaining the supplied codes.

## Verification

- Targeted seed completed for this kitchen; other kitchen rows were not reconciled.
- Database audit: 22/22 matched catalog rows, with actual active catalog relations and Burger program registrations verified (18 article-linked, 2 standalone filler-linked, 2 service-linked; HP2072K also linked on cabinet 12). Eight locked supplier rows, four optional upper cabinets, and the correct contract/claim identities verified.
- 42 tests passed: 32 focused kitchen/Burger tests and 10 catalog-price/product-information tests, including priced master articles attached to included cabinets.
- LED follow-up: 33 focused kitchen/Burger tests passed, including both light polygons and synchronized hood/LED selection in FRG and ASC. A fresh audit verifies actual catalog foreign-key relations and active Burger program entries for all 22 rows.
- Production build passed, including lint/type checks.
- Kitchen page, public kitchen API and contract claim API returned HTTP 200.
- PDF polygon overlay visually inspected. Seven actual ASC previews checked: housing, cooker, sink, faucet, left/right worktops and dishwasher furniture front. Worktops preserve appliance/sink cutouts.
- No browser was connected; interactive hover/click verification remains unperformed. Linked selection identities and responsive polygon alignment are covered by the focused tests.

Reproduce the database/claim checks from `frontend/`:

```powershell
node scripts/audit-104332.cjs
node scripts/verify-104332.mjs
node --test test/ab-104332-kitchen.test.js
```

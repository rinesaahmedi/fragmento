# Kitchen 105777

Kitchens 105780, 105783 and 105786 reuse this complete layout and item schedule.
Each has its own kitchen record and contracts `670<code>` and `111<code>`.
They share the same catalog-linked items, fixed left end panel, linked hood lights,
claim part splits, filler geometry, dishwasher light details and mobile layout.

Source: `frontend/public/pdfs/670 105777.pdf` and the supplied Excel screenshot.
The PDF contains two front elevations on an 842 × 595 page. Contract: `670105777`.

| Excel NR | Articles | Selection |
| --- | --- | --- |
| 1 DEFAULT | UHK, EH92364E-A, 9EC744100C | Locked oven module; independent drawer, oven and cooktop claims |
| 2 DEFAULT | PLR60 | Locked worktop on both elevations; left/right claims PLR60-1 and PLR60-2 |
| 3 DEFAULT | SP60, 526335, 517720 | Locked sink cabinet and fixtures; independent cabinet, sink and faucet claims |
| 4 | OL-KGCN388140E | Refrigerator at far left |
| 5 | US60 | Left elevation, first lower cabinet |
| 6 | US40 | Left elevation, lower cabinet immediately right of oven |
| 7 | US30, UPK20 | Left elevation, last lower cabinet and right filler |
| 8 | US50, UPK20 | Right elevation, first lower cabinet and left filler |
| 9 | A-EGSPV597210, TGV60, UPK20 | Right elevation, dishwasher, furniture front and right lower filler (confirmed by the user's follow-up) |
| 10 | H6002 | Left elevation, first upper cabinet |
| 11 | FH664621E, FWK124, HD6002 | Linked hood/cabinet package above oven |
| 12 | H4002 | Left elevation, upper cabinet immediately right of hood |
| 13 | H3002, HPK2002 | Left elevation, last upper cabinet and right filler |
| 14 | H5002, HPK2002 | Right elevation, first upper cabinet and left filler |
| 15 | H6002 | Right elevation, middle upper cabinet |
| 16 | H6002, HPK2002 | Right elevation, last upper cabinet and right filler |

Hotspots use measured PDF strokes, converted to percentages, with the outside
filler strips included in their adjacent cabinets. The claim calibration separates
those strips at the actual divider. The oven/drawer seam is y=465.88 PDF points.
The narrow left floor-height end strip (x=117.24–120 PDF points) belongs to
the fixed worktop and stays blue independently of the optional US60 cabinet.
Dishwasher basket and GS marking clips preserve light grey technical detail.
Both hood light symbols select and highlight together with the hood package.
The front elevation does not draw a sink bowl or a cooktop surface: existing
elevation claim controls provide access to these parts.
Claims prefer the configured 105777 plan over older uploaded contract previews.
The previous upload remains stored; it no longer overrides the interactive plan.

The screenshot contains no dimensions or prices. Dimensions and optional item
prices follow the existing catalog. Included items use the application's current
zero-price defaults. The oven links to the canonical catalog package
`A-EH923640E + 9EC744100C`, while its display and claim retain `EH92364E-A`.

Verification: `node --test test/ab-105777-kitchen.test.js` from `frontend`.
Measured overlay: `frontend/public/hotspot-overlays/105777-hotspots.png`.

Database checks verified all schedule articles, catalog links, included-item locks,
claim article codes and the contract link. The kitchen page and both kitchen and
claim APIs returned successfully. The production build and 16 focused tests passed.
Four broader assertions also fail at the repository baseline (the claim picker,
two 105834 geometry checks and the 105845 icon assertion). Live browser interaction
was unavailable in this session.

To reconcile this kitchen's seed intentionally, set `SEED_ONLY_KITCHEN_SLUG=ab-105777`
and `SEED_RECONCILE_EXISTING=true` when running `node prisma/seed.js`. Ordinary
seeding continues to preserve existing kitchen records.

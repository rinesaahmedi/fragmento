# Kitchen 105779

Source: `frontend/public/pdfs/670 105779.pdf` and the final Excel screenshot
(Image #2, without the L suffixes). Contracts: `670105779` and test `111105779`.

| NR | Articles | Plan selection |
| --- | --- | --- |
| 1 DEFAULT | UHK, EH92364E-A, 9EC744100C | Locked oven module and cooktop; independent oven/drawer/cooktop claims |
| 2 DEFAULT | PLR60 | Locked worktop surfaces, fascias and end panel; separate left/right worktop claims |
| 3 DEFAULT | SP60, 526335, 517720 | Locked sink cabinet, sink and faucet; independent claims |
| 4 | OL-KGCN388140E | Refrigerator at left |
| 5 | US30 | Lower cabinet immediately left of oven |
| 6 | UPEF65 | Excluded at the customer's request; the corner gap has no catalog item, highlight or selection hotspot |
| 7 | A-EGSPV597210, TGV60 | Dishwasher and furniture front |
| 8 | US60 | Lower cabinet immediately right of dishwasher |
| 9 | US40 | Rightmost lower cabinet |
| 10 | H3002 | Leftmost upper cabinet |
| 11 | FH664621E, FWK124, HD6002 | Hood cabinet, fascia and both light symbols linked together |
| 12 | H6002, HPK2002 | Rightmost upper cabinet with both visible filler faces |

Prices and dimensions follow the existing catalog because the screenshot supplies
neither. Default equipment remains included at zero price. Identical refrigerator,
hood and default appliance packages reuse existing codes. The oven display and
claim retain `EH92364E-A`, linked to the canonical catalog package
`A-EH923640E + 9EC744100C`.

`docs/build-105779-hotspots.py` records the measured PDF endpoints and generates
the plan polygons. Worktop pieces meet at the drawn corner seam and are partitioned
around the sink and cooktop. The large outer end panel belongs to the locked
worktop and has a WU16 claim; the small left end strip stays fixed blue.
The narrow divider between the dishwasher and US60 also stays fixed blue,
independently of the optional cabinet, without creating an additional worktop claim.
Worktop selection pieces render without borders or inset shadows, so the cutout
partitions do not introduce artificial blue seams near the sink.
The purchased-kitchen PDF/email renderer applies the same border-free worktop fill.
The oven and drawer share the actual sloped PDF seam. Dishwasher basket and GS details
stay light grey. Claims use this interactive plan ahead of older reference uploads.

Verification: 17 active catalog-linked items, 12 active claim parts, both contracts
resolved to the exact SVG, and the kitchen page returned HTTP 200. The 13 focused
kitchen tests and production build passed. Live browser clicks were not verified
because no browser connection was available in this session.

# Kitchen 105804

Source: `frontend/public/pdfs/670 105804.pdf`, one vector page, 842 x 595 points,
and the supplied Excel screenshot. The message's `195804` is treated as a typo:
both the source filename and the Excel contract identify `105804`.

Kitchen: `ab-105804`. Contracts: `670105804` and `111105804`.

| NR | Supplier articles | Plan component | Catalog relation |
| --- | --- | --- | --- |
| 1 DEFAULT | UHK / EH92364E-A / 9EC744100C | oven-module | A-EH923640E + 9EC744100C |
| 2 DEFAULT | PLR60 | worktop | PLR60 |
| 3 DEFAULT | SP60 R / 526335 R / 517720 | sink-base, sink-faucet | SP60, 526335 + 517720 |
| 4 | US50 / UPK20 | base-module-1 | US50, CatalogBlende UPK20 |
| 5 | A-EGSPV597210 / TGV60 | dishwasher-base | A-EGSPV597210 + TGV60 |
| 6 | UPK20 | sink-end-blende | CatalogBlende UPK20 |
| 7 | US60 / UPK20 | base-module-2 | US60, CatalogBlende UPK20 |
| 8 | OL-KGCN388140E | refrigerator | OL-KGCN388140E |
| 9 | H5002 / HPK2002 | wall-cabinet-1 | H5002, CatalogBlende HPK2002 |
| 10 | FH664621E / FWK124 / HD6002 | wall-cabinet-2, hidden extractor-hood | FH664621E + FWK124 + HD6002 |
| 11 | H6002 | wall-cabinet-3 | H6002 |
| 12 | H6002 / HPK2002 | wall-cabinet-4 | H6002, CatalogBlende HPK2002 |

The screenshot contains no prices or dimensions. Existing catalog prices and
dimensions are used, with standard cabinet fallbacks. DEFAULT sources remain
locked and included at zero. The shared seed normalizes appliance packages to
their catalog dimensions; unspecified dishwasher height/depth remain empty.
The right sink orientation and hinge are preserved in item notes. The existing
EH92364E-A catalog alias is used for ordering; claims retain the supplier code
and its appropriate product-information document.

There are 19 catalog-linked records: 14 component records (one hidden hood),
three accessories and two services. Nine optional components total EUR 2,502.
The hidden hood does not add a separate charge. Row 6 is an independent optional
filler; the other four fillers follow their cabinets in the order view and have
separate measured claim faces.

`frontend/lib/ab-105804-plan.js` traces 56 source polygons across two separate
perspective runs. It includes roof/front/side faces, plinths, hood fascia and both
light symbols, the worktop fascia and side panels, and separate sink/faucet
silhouettes. Worktop surfaces are partitioned around the sink and cooktop without
adding borders along the partition edges, including purchased-kitchen sketches.
The dishwasher basket and GS mark stay light grey through tight source clips.

Claims include independent sink, faucet, SP60 cabinet, oven, UHK drawer, ceramic
cooktop, dishwasher/front, hood filter, both PLR60 worktops and side panels.
This is a two-run perspective plan, not an L-shaped corner. Claim polygons use
the measured oven/drawer seam and explicit fixture identities.
The floor-height left end panel is grouped with the left worktop in claims;
selecting this panel highlights the left worktop assembly, not the right run.

Verification: scoped local seed, `node scripts/audit-105804.cjs`, selection/claim
tests, purchased-kitchen metadata/overlay tests, production build, source overlay
inspection and HTTP 200 from the local kitchen page. Browser interaction could
not be verified because no browser was connected in this session. No email was
sent and no hosted database was changed.

Local access initially failed because the database lacked the order email
delivery columns. Applied only the three additive email migrations dated
20261005120000, 20261005160000 and 20261005180000 to localhost, leaving unrelated
pending migrations untouched. Kitchen access and claim lookup now return HTTP
200 with `ok: true` for both contracts. These checks did not send email.

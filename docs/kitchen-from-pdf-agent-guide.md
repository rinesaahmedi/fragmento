# Building a Kitchen from a PDF + Excel — Coding Agent Playbook

Hand this file to a coding agent **together with**:

1. the kitchen **plan PDF** (e.g. `AB 105820.pdf`), and
2. the **Excel/CSV item list** (one row per item, with article numbers, dimensions, L/R, price).

The agent's job: add the kitchen to the Fragmento configurator so that it **looks exactly like the
plan, is razor-sharp (vector), and every cabinet is clickable/selectable** and wired to its data.

Read this whole file first, then follow the **Recipe** (section 6) top to bottom. Section 7 is a
fully worked example (`AB 105820`) you can copy.

---

## 1. TL;DR — the pipeline

```
PDF  ──render-plan-svg.py──►  /public/plans/<plan>.svg   (crisp vector plan, what users see)
PDF  ──render-plan-pdf.py──►  /public/jpg/<plan>.jpg      (raster, only used to detect edges)
JPG  ──detect-plan-hotspots.py──►  cabinet edges in %     (pixel-perfect click boxes)
Excel ──► seed.js item rows + kitchen + contract
        ──► kitchen-svg-stage.jsx (plan image + hotspot boxes, including linked hood area)
        ──► kitchen-selection-utils.js (callout numbers + hood link)
verify: prisma db seed → next build → browser
```

The plan picture is **the real drawing** (vector), so it is pixel-perfect by definition. The only
hand-work is mapping Excel rows to cabinet slots — and even the click boxes are auto-detected.

---

## 2. Prerequisites (one-time)

- Node + the repo installed (`frontend/` is the Next.js app, Prisma + Postgres for data).
- Python 3 with these packages (used only by the helper scripts in `docs/`):

```
pip install pymupdf pypdfium2 pillow numpy
```

- Run all Python commands **from the repository root** (the folder that contains `frontend/` and
  `docs/`). Run all `npm`/`npx` commands **from `frontend/`**.
- `frontend/.env` must have a working `DATABASE_URL` so `prisma db seed` can run.

---

## 3. The reusable tools (already in `docs/`)

| Script | Purpose | Example |
| --- | --- | --- |
| `render-plan-svg.py` | Vector PDF → self-contained SVG (the plan users see) | `python docs/render-plan-svg.py "frontend/public/pdfs/AB 105820.pdf" "frontend/public/plans/AB 105820.svg"` |
| `render-plan-pdf.py` | PDF → JPG at ~300 DPI (input for edge detection / fallback) | `python docs/render-plan-pdf.py "frontend/public/pdfs/AB 105820.pdf" "frontend/public/jpg/AB 105820_page-0001.jpg"` |
| `detect-plan-hotspots.py` | Edge-detect cabinet grid lines from the JPG; also draws an overlay to verify | `python docs/detect-plan-hotspots.py "frontend/public/jpg/AB 105820_page-0001.jpg"` |

`detect-plan-hotspots.py` prints, as **percentages of the image**:
- major **horizontal** lines (frame, wall-cabinet top/bottom, worktop, base bottom, dimension line),
- **vertical** dividers inside the **wall** band and the **base** band (the cabinet edges).

The wall/base bands are heuristic vertical fractions (`0.18–0.40` and `0.62–0.90`). If a plan is
proportioned differently and a band misses dividers, edit those fractions in the script and re-run.

---

## 4. Understanding the inputs

### 4.1 The plan
A single-wall elevation: a tall unit (fridge), a row of **wall** cabinets up top, a **worktop**
band, and a row of **base** cabinets below, usually with **numbered callouts** (`①②③…`) that match
the Excel `NR` column. The callouts make mapping unambiguous — always use them.

If the PDF is **vector** (test: it has path operators, no embedded raster), use the SVG plan.
If it is a **scan/raster**, skip the SVG and use the JPG as the plan instead.

### 4.2 The Excel/CSV
Example layout (from `AB 105820`):

| Column | Meaning |
| --- | --- |
| `NR` | Plan callout number (1..N) |
| `ARTICLE NR 1/2/3` | Manufacturer article(s), e.g. `H6002`, `US60`, `FH664621E` + `HD6002` |
| `DIMENSIONET` | Dimensions, e.g. `600/720/340 mm`, `300/600 mm`, `178 cm` |
| `L/R` | Door hinge side (left/right) |
| `CMIMI` | Price in EUR (blank / `DEFAULT` = included in the base kitchen) |

`DEFAULT` rows (no price) are the always-included parts — typically the **oven**, **worktop**, and
**sink base**. Mark these `isLocked: true` (see 5.2). Mirror an existing kitchen's prices for them
(oven `449.00`, worktop `0.00`, sink base `0.00`, sink+waste `89.00`) unless told otherwise — and
flag that assumption to the user.

The canonical column layout for a clean import lives in `docs/kitchen-database-export.csv`.

---

## 5. How a kitchen is wired (architecture)

A kitchen page `/kitchens/<slug>` renders `KitchenConfigurator`: the **plan stage** (left), the
**catalog panel** (right, selectable list), and the summary/order form below.

### 5.1 Data model — one row per item (`frontend/prisma/seed.js`)
Each item object supports:

| Field | Meaning | Required |
| --- | --- | --- |
| `itemType` | `ItemType.COMPONENT` / `ACCESSORY` / `SERVICE` | yes |
| `code` | SKU-style id, **unique per kitchen** (`@@unique([kitchenId, code])`) | yes |
| `name` | Human label | yes |
| `price` | EUR string, e.g. `"149.00"` (`"0.00"` = included) | yes |
| `componentKey` | Plan slot id, e.g. `wall-cabinet-1` | yes for COMPONENT |
| `iconKey` | Visual type (list below) | yes for COMPONENT |
| `colorKey` | Used for SVG color grouping; any value is fine | yes for COMPONENT |
| `sortOrder` | Order in the catalog list | yes |
| `articleNumber` | Manufacturer article (shown as `Article: …` in the catalog) | optional |
| `widthMm` / `heightMm` / `depthMm` | Dimensions in mm — rendered as a `W x H x D mm` line **directly below the article** in the catalog | optional but **fill them in** |
| `nameDe` | German label | optional |
| `isLocked` | `true` = always included, not deselectable | optional |
| `isActive` | `false` = hidden helper row (e.g. a linked hood) | optional |
| `infoText` | Short catalog note (shown when no localized case exists) | optional |

> ⚠️ **Always set `widthMm`/`heightMm`/`depthMm` from the Excel `DIMENSIONET` column.** The catalog
> shows them on their own line under the article number (`getStructuredDimensions` in
> `kitchen-catalog-panel.jsx`; missing values are skipped, so a fridge with no depth reads
> `710 x 1780 mm`). If an item has no `Mm` values, the only dimensions shown are ones that happen to
> be baked into its `name` (e.g. `Wall Cabinet (600 x 720 x 340 mm)`) — so don't rely on that, set
> the fields. The seed's upsert writes these columns (see Step 4); verify they aren't `null` in the DB.

Common `iconKey` values already in use: `wall_cabinet_plain`, `wall_cabinet_standard`,
`hood_wall_cabinet`,
`tall_refrigerator`, `oven_base`, `dishwasher_base`, `sink_base`, `sink_faucet`,
`drawer_base_two`, `drawer_base_three`, `base_cabinet_30`, `washing_machine_base`,
`extractor_hood`, `extractor_hood_chimney`, `under_cabinet_light`, `worktop`, `waste_system`,
`cutlery_insert`, `lighting_set`, `delivery_assembly`, `pickup`.

Every kitchen also includes the standard accessory/service rows — copy them verbatim from an
existing kitchen: `ACC-WASTE-001`, `ACC-CUTLERY-ZB60SG`, `ACC-LIGHT-003`, `SVC-MONTAGE-001`,
`SVC-PICKUP-001`.

### 5.2 Selection model
Selection is a list of **component ids**, where `componentId = "component-" + componentKey`
(see `componentIdForKey` in `kitchen-selection-utils.js`). The plan and the catalog toggle the
**same** ids, so clicking a cabinet on the plan and ticking it in the list stay in sync.

- `isLocked: true` → rendered highlighted + non-clickable (always in the order).
- Linked items (e.g. a hood **cabinet** that also pulls in a hidden **hood** appliance row) toggle
  together. Declare the link in `LINKED_COMPONENT_GROUPS_BY_SLUG`, set the helper row
  `isActive: false`, and give the hood cabinet package the `hood_wall_cabinet` catalog icon.
  For image/SVG hotspot plans, add both hotspots: one for the visible hood wall cabinet and one
  small `extractor-hood` hotspot around the hood drawing directly below the cabinet. Both hotspots
  use the same linked group, so either click highlights/selects the package together.

### 5.3 ♻️ Code-reuse rule (important, saves most of the work)
Because `code` is unique **per kitchen**, a new kitchen can **reuse an existing kitchen's codes**
for items that are truly identical (same appliance, price, dimensions). Reusing a code makes the
new kitchen inherit that code's localized name, info text, callout number, product-info PDF, and
image gallery **for free** (those maps in `kitchen-selection-utils.js` are keyed by `code`).

- Reuse a code **only** when the item is identical in every displayed respect.
- For anything that differs (a different cabinet width/price), create a **new** code and add a
  callout-number entry for it (5.2 / Step 6).

`AB 105820` reused all of `AB 105806`'s appliance/worktop/sink codes and only created 4 new codes
for its differently-sized cabinets.

### 5.4 Plan tiers
| Tier | Plan is… | Clickable | Source | Use when |
| --- | --- | --- | --- | --- |
| Vector SVG + hotspots ⭐ | crisp `<img src=.svg>` with %-positioned click boxes | yes, pixel-perfect | vector PDF | **default** |
| JPG + hotspots | raster `<img>` with click boxes | yes, pixel-perfect | any PDF/scan | PDF is raster |
| Image / PDF only | flat picture, no plan clicks | no (list only) | any | quick stub |

Both the SVG and JPG tiers use the **same** `<img>` + hotspot overlay code; only the `src` differs.
The hotspots are `%` of the image, and the SVG keeps the PDF's aspect ratio, so the same boxes line
up on either source.

---

## 6. Recipe — add a kitchen (vector SVG + pixel-perfect hotspots)

Assume the PDF is at `frontend/public/pdfs/<PLAN>.pdf` and you have the Excel.

### Step 1 — Render the plan
```
python docs/render-plan-svg.py "frontend/public/pdfs/<PLAN>.pdf" "frontend/public/plans/<PLAN>.svg"
python docs/render-plan-pdf.py "frontend/public/pdfs/<PLAN>.pdf" "frontend/public/jpg/<PLAN>_page-0001.jpg"
```
If the SVG render is empty/garbled the PDF is raster — skip the SVG and use the JPG as the plan.

### Step 2 — Detect cabinet edges
```
python docs/detect-plan-hotspots.py "frontend/public/jpg/<PLAN>_page-0001.jpg"
```
From the output build a box per visible component (`left`, `top`, `width`, `height` in %):
- `left` = the divider where the cabinet starts; `width` = next divider − left.
- Wall cabinets: `top` = wall-top line, `height` = wall-bottom − wall-top.
- Base cabinets: `top` = worktop-bottom line, `height` = base-bottom − worktop-bottom.
- Worktop: a thin full-width strip at the worktop line.
- Fridge / tall unit: detect its own left/right/top/bottom (it sits left of the run).

### Step 3 — Map Excel rows → components
For each Excel `NR`, decide the `componentKey` from its position on the plan. The standard
single-wall layout uses these keys (left→right):
- Tall unit: `refrigerator`
- Base run: `base-module-1`, `oven-module`, `base-module-2`, `base-module-3`, `sink-base`,
  `drawer-module` (names are slots, not types — a slot can hold any cabinet/appliance)
- Worktop: `worktop`
- Wall run: `wall-cabinet-1` … `wall-cabinet-6`
- Hidden helper: `extractor-hood` (linked to the hood cabinet, `isActive:false`; add a small
  linked hotspot around the visible hood drawing under the cabinet when the plan image shows it)

Apply the **code-reuse rule** (5.3): reuse an existing identical kitchen's codes; mint new codes
only for items that differ.

### Step 4 — Seed (`frontend/prisma/seed.js`)
1. Add an items array `const <PLAN>_ITEMS = [ … ]` (one object per Excel row + the standard
   accessory/service rows). Set `isLocked` on the `DEFAULT` items, `isActive:false` on the hidden
   hood, set the hood cabinet package's `iconKey` to `hood_wall_cabinet`, and fill
   `widthMm`/`heightMm`/`depthMm` from each row's `DIMENSIONET` so the catalog can
   show the size line. The upsert `data` object in `main()` already persists
   `widthMm`/`heightMm`/`depthMm`/`nameDe`; if you add a new item field, add it there too or it
   silently won't reach the DB.
2. Register the kitchen in `DEFAULT_KITCHENS`:
   ```js
   { slug: "<slug>", kitchenCode: "<code>", name: "<NAME> Kitchen",
     description: "Kitchen configuration based on frontend/public/jpg/<PLAN>_page-0001.jpg",
     items: <PLAN>_ITEMS },
   ```
3. Add a `DEFAULT_KITCHEN_CONTRACTS` entry with the next free contract number.
4. **Only if you minted new appliance codes** (didn't reuse), add their `PRODUCT_INFO_BY_CODE`
   aliases next to the existing ones, e.g. `PRODUCT_INFO_BY_CODE["REF-<PLAN>-…"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];`

### Step 5 — Show the plan (`frontend/components/kitchen-svg-stage.jsx`)
1. Add the slug to `IMAGE_VIEW_BY_SLUG` → `/plans/<PLAN>.svg` (or `/jpg/<PLAN>_page-0001.jpg`).
2. Add the slug to `IMAGE_HOTSPOTS_BY_SLUG` with one box per visible `componentKey` from Step 2.
   For a linked hood package, also add a small `{ componentKey: "extractor-hood", ... }` box around
   the hood/aspirator drawing under the wall cabinet. This helper component is hidden from the
   catalog, but the stage resolves the hotspot through the linked visible cabinet.

### Step 6 — Wire interactivity (`frontend/components/kitchen-selection-utils.js`)
1. Add callout numbers for any **new** codes to `AB_105806_PHOTO_NUMBER_BY_CODE` (reused codes
   already have theirs). Map `code → "<NR>"`.
2. Add the hood link to `LINKED_COMPONENT_GROUPS_BY_SLUG`:
   `"<slug>": [["component-wall-cabinet-2", "component-extractor-hood"]]` (use whatever
   `componentKey` the hood cabinet has).
3. (Optional) Add `case` lines for new codes in `getLocalizedItemName` / `getLocalizedItemInfoText`
   for clean DE/EN names. If you skip this, the catalog falls back to the item's `name`/`infoText`,
   which is fine (this matches how existing non-standard cabinets behave).

### Step 7 — Re-seed, build, verify
```
cd frontend
npx prisma db seed
npx next build
npm run dev          # open /kitchens/<slug>
```
Verifications:
- **Overlay check** — confirm every box hugs its cabinet:
  ```
  python docs/detect-plan-hotspots.py "frontend/public/jpg/<PLAN>_page-0001.jpg" --overlay boxes.json out.png
  ```
  where `boxes.json` is `[{"name","left","top","width","height"}, …]`; open `out.png`.
- **Calibration grid** — load `/kitchens/<slug>?calibrate=1` to see a labelled 0–100% grid plus
  every hotspot outlined with its `componentKey`.
- **In the browser** — hovering a cabinet highlights it; clicking toggles it and the matching
  catalog row + total update; locked items show as included and don't toggle; the hood cabinet
  also pulls in the hidden hood.

---

## 7. Worked example — `AB 105820`

Inputs: `frontend/public/pdfs/AB 105820.pdf` + an Excel with rows NR 1..14. Same single-wall layout
as `AB 105806`; only the cabinet sizes differ, so it **reused** AB 105806's codes for identical
slots and minted 4 new codes.

### 7.1 Excel → component map
| NR | Article | Dim | € | componentKey | code (reuse✓ / new✦) |
| --- | --- | --- | --- | --- | --- |
| 4 | OL-KGCN388140E | 178 cm | 579 | `refrigerator` | `REF-AB105806-KGCN388140E` ✓ |
| 5 | US30 | 300/600 | 175 | `base-module-1` | `CAB-BASE-AB105820-US30-300` ✦ |
| 1 | DEFAULT (oven) | — | 449* | `oven-module` | `OVEN-AB105806-600-HOB` ✓ (locked) |
| 6 | US60 | 600/600 | 219 | `base-module-2` | `CAB-BASE-AB105820-US60` ✦ |
| 3 | DEFAULT (sink base) | — | 0 | `sink-base` | `SINKBASE-AB105806-600` ✓ (locked) |
| 7 | A-EGSPV597210 + TGV60 | — | 579 | `base-module-3` | `DISH-AB105806-600` ✓ |
| 8 | US60 | 600/600 | 219 | `drawer-module` | `CAB-BASE-AB105806-US60` ✓ |
| 2 | DEFAULT (worktop) | — | 0 | `worktop` | `TOP-AB105806` ✓ (locked) |
| 9 | H3002 | 300/720/340 | 115 | `wall-cabinet-1` | `CAB-WALL-AB105820-H3002-300` ✦ |
| 10 | FH664621E + HD6002 | — | 349 | `wall-cabinet-2` | `CAB-HOOD-AB105806-600` ✓ |
| — | (hidden hood) | — | 349 | `extractor-hood` | `HOOD-AB105806-FH664621E` ✓ (`isActive:false`) |
| 11 | H6002 | 600/720/340 | 149 | `wall-cabinet-3` | `CAB-WALL-AB105820-H6002` ✦ |
| 12 | H6002 | 600/720/340 | 149 | `wall-cabinet-4` | `CAB-WALL-AB105806-1` ✓ |
| 13 | H6002 | 600/720/340 | 149 | `wall-cabinet-5` | `CAB-WALL-AB105806-2` ✓ |
| 14 | H6002 | 600/720/340 | 149 | `wall-cabinet-6` | `CAB-WALL-AB105806-3` ✓ |
| — | sink + waste | — | 89 | `sink-faucet` | `SINK-AB105806-BOTTON-45` ✓ (locked) |

\* oven shown as `DEFAULT` in the Excel; priced `449.00` + locked to mirror AB 105806 (assumption,
flagged to the user).

### 7.2 Hotspots added to `IMAGE_HOTSPOTS_BY_SLUG` (grid = 300/600/600/600/600/600 mm)
```js
"ab-105820": [
  { componentKey: "refrigerator", left: 2.11, top: 29.8, width: 13.22, height: 60.5 },
  { componentKey: "wall-cabinet-1", left: 17.16, top: 17.5, width: 7.12, height: 24.27 },
  { componentKey: "wall-cabinet-2", left: 24.28, top: 17.5, width: 14.24, height: 24.27 },
  { componentKey: "extractor-hood", left: 24.28, top: 41.77, width: 14.24, height: 7.05 },
  { componentKey: "wall-cabinet-3", left: 38.52, top: 17.5, width: 14.26, height: 24.27 },
  { componentKey: "wall-cabinet-4", left: 52.78, top: 17.5, width: 14.23, height: 24.27 },
  { componentKey: "wall-cabinet-5", left: 67.01, top: 17.5, width: 14.25, height: 24.27 },
  { componentKey: "wall-cabinet-6", left: 81.26, top: 17.5, width: 14.24, height: 24.27 },
  { componentKey: "worktop", left: 17.16, top: 59.48, width: 78.34, height: 1.4 },
  { componentKey: "base-module-1", left: 17.16, top: 60.79, width: 7.12, height: 29.51 },
  { componentKey: "oven-module", left: 24.28, top: 60.79, width: 14.24, height: 29.51 },
  { componentKey: "base-module-2", left: 38.52, top: 60.79, width: 14.26, height: 29.51 },
  { componentKey: "base-module-3", left: 52.78, top: 60.79, width: 14.23, height: 29.51 },
  { componentKey: "sink-base", left: 67.01, top: 60.79, width: 14.25, height: 29.51 },
  { componentKey: "drawer-module", left: 81.26, top: 60.79, width: 14.24, height: 29.51 },
],
```

### 7.3 Other edits
- `IMAGE_VIEW_BY_SLUG["ab-105820"] = "/plans/AB%20105820.svg"`.
- `AB_105806_PHOTO_NUMBER_BY_CODE` gained the 4 new codes → numbers `5, 6, 9, 11`.
- `LINKED_COMPONENT_GROUPS_BY_SLUG["ab-105820"] = [["component-wall-cabinet-2", "component-extractor-hood"]]`.
- The hood cabinet catalog row uses `iconKey: "hood_wall_cabinet"` and the plan includes an
  `extractor-hood` hotspot below `wall-cabinet-2`, so the cabinet and hood area highlight together.
- `DEFAULT_KITCHENS` += `ab-105820` (code `105 820`); `DEFAULT_KITCHEN_CONTRACTS` += `736274`.

---

## 8. Checklist

- [ ] `pip install pymupdf pypdfium2 pillow numpy` done.
- [ ] `/public/plans/<PLAN>.svg` and `/public/jpg/<PLAN>_page-0001.jpg` generated.
- [ ] Hotspots detected and **overlay-verified** (boxes hug the linework).
- [ ] All Excel rows seeded; identical items **reuse** existing codes, differing ones get new codes.
- [ ] Standard accessory + service rows included; `DEFAULT` items `isLocked`; hidden hood `isActive:false`.
- [ ] Kitchen registered in `DEFAULT_KITCHENS` + a `DEFAULT_KITCHEN_CONTRACTS` entry.
- [ ] `IMAGE_VIEW_BY_SLUG` + `IMAGE_HOTSPOTS_BY_SLUG` updated, including a linked
      `extractor-hood` hotspot under every hood wall cabinet shown in the drawing.
- [ ] Callout numbers added for new codes; hood link added to `LINKED_COMPONENT_GROUPS_BY_SLUG`.
- [ ] `prisma db seed` ok, `next build` ok, page verified in the browser (hover/click/lock/link).

---

## 9. Key files

| File | Role |
| --- | --- |
| `frontend/prisma/seed.js` | Kitchen + item data (the "database") |
| `frontend/prisma/schema.prisma` | `KitchenItem` model; `@@unique([kitchenId, code])` |
| `frontend/components/kitchen-svg-stage.jsx` | Plan stage: `IMAGE_VIEW_BY_SLUG` + `IMAGE_HOTSPOTS_BY_SLUG` + `?calibrate=1` grid |
| `frontend/components/kitchen-selection-utils.js` | component ids, callout numbers, names/info, linked groups, product info, galleries |
| `frontend/components/kitchen-catalog-panel.jsx` | Right-hand selectable list; renders name → `Article: …` → `W x H x D mm` dimension line (`getStructuredDimensions`) |
| `frontend/components/kitchen-configurator.js` | Orchestrates selection state, locking, order |
| `docs/render-plan-svg.py` | PDF → vector SVG plan |
| `docs/render-plan-pdf.py` | PDF → JPG (detection input / raster fallback) |
| `docs/detect-plan-hotspots.py` | Auto-detect hotspots + overlay verification |
| `docs/kitchen-database-export.csv` | Canonical column layout for the Excel item list |

---

## 10. Troubleshooting

- **Hotspots slightly off** — re-run the detector and rebuild the boxes; verify with `--overlay`
  and `?calibrate=1`. Don't hand-guess percentages; read them off the detector/grid.
- **A band misses dividers** — adjust the wall/base band fractions in `detect-plan-hotspots.py`.
- **SVG looks wrong / empty** — the PDF is likely raster; use the JPG plan instead.
- **Catalog name reads oddly for a new code** — add a `case` in `getLocalizedItemName` /
  `getLocalizedItemInfoText`, or just set a clean `name`/`infoText` on the item (fallback).
- **Dimensions not showing under the article** — the item's `widthMm`/`heightMm`/`depthMm` are
  `null` in the DB. Either you didn't set them on the item row, or a field you added isn't being
  written by the seed's upsert `data` object (`main()` in `seed.js` must list every column it
  saves). Set the fields, confirm the `data` object includes them, then re-run `prisma db seed`.
- **Seed error about a missing kitchen for a contract** — the `kitchenSlug` in
  `DEFAULT_KITCHEN_CONTRACTS` must match a `DEFAULT_KITCHENS` slug.
- **`DEFAULT`/included pricing unclear** — mirror an existing kitchen and flag the assumption to
  the user.

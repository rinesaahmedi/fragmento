# Building a Kitchen from a PDF + Excel — Coding Agent Guide

This is the brief to hand to a coding agent (together with the kitchen **PDF/plan image**
and the **Excel/CSV item list**) when you want a new kitchen added to the Fragmento
configurator so that it **looks like the plan and is clickable/selectable**.

The agent should read this whole file first, then follow the **Recipe** section.

---

## 1. What you give the agent

1. **The plan** — the kitchen elevation/layout drawing. A PDF is fine; the agent will
   export page 1 to a JPG/PNG. Best case the drawing has **numbered callouts** (circles
   `1, 2, 3 …`) matching the Excel rows — that makes mapping unambiguous.
2. **The item list** — an Excel/CSV with one row per item. Reuse the column layout of
   `docs/kitchen-database-export.csv`. The fields that actually matter per item:

   | Column | Meaning | Required |
   | --- | --- | --- |
   | `itemType` | `COMPONENT`, `ACCESSORY`, or `SERVICE` | yes |
   | `code` | Unique SKU-style id, e.g. `CAB-WALL-AB105810-1` | yes |
   | `name` | Human label, e.g. `Wall Cabinet (600 x 720 x 340 mm)` | yes |
   | `price` | EUR, e.g. `149.00` (`0.00` = included) | yes |
   | `articleNumber` | Manufacturer article, e.g. `H6002` | optional |
   | `widthMm` / `heightMm` / `depthMm` | Dimensions | optional |
   | `componentKey` | Plan slot id, e.g. `wall-cabinet-1` (COMPONENT only) | yes for components |
   | `iconKey` | Visual type (see list below) | yes for components |
   | `colorKey` | Color used for SVG color-grouping; any unique value if not used | yes for components |
   | `isLocked` | `true` = always included, not deselectable | optional |
   | `isActive` | `false` = hidden helper row (e.g. a linked hood) | optional |
   | `sortOrder` | Order in the catalog list | yes |
   | `infoText` | Short note shown in the catalog | optional |

   Common `iconKey` values already in use: `wall_cabinet_plain`, `wall_cabinet_standard`,
   `tall_refrigerator`, `oven_base`, `dishwasher_base`, `sink_base`, `sink_faucet`,
   `drawer_base_two`, `drawer_base_three`, `base_cabinet_30`, `washing_machine_base`,
   `extractor_hood`, `extractor_hood_chimney`, `under_cabinet_light`, `worktop`,
   `waste_system`, `cutlery_insert`, `lighting_set`, `delivery_assembly`, `pickup`.

   Every kitchen normally also includes the standard accessories/services rows
   (`ACC-WASTE-001`, `ACC-CUTLERY-ZB60SG`, `ACC-LIGHT-003`, `SVC-MONTAGE-001`,
   `SVC-PICKUP-001`). Copy them from an existing kitchen in `prisma/seed.js`.

---

## 2. How a kitchen is wired (architecture)

A kitchen page (`/kitchens/<slug>`) renders `KitchenConfigurator`. It has three parts:

- **The plan stage** (`frontend/components/kitchen-svg-stage.jsx`) — the picture of the
  kitchen on the left.
- **The catalog panel** (`kitchen-catalog-panel.jsx`) — the selectable item list on the
  right.
- **The summary + order form** below.

Selection is a list of **component ids**. A component id is derived from the item:
`componentKey` → `component-<componentKey>` (see `componentIdForItem` /
`componentIdForKey` in `kitchen-selection-utils.js`). The plan and the catalog both
toggle the same component ids, so clicking the plan and clicking the list stay in sync.

### The three plan tiers (pick one)

| Tier | Plan is… | Clickable on plan? | Source needed | Effort |
| --- | --- | --- | --- | --- |
| **1. Image / PDF only** | flat picture (`IMAGE_VIEW_BY_SLUG` / `PDF_VIEW_BY_SLUG`) | no — select on the right only | a PDF/JPG | low |
| **2. Image + hotspot overlay** ⭐ | flat picture with invisible clickable boxes per item | **yes** | a PDF/JPG | low–medium |
| **3. Interactive vector SVG** | real vector linework, every cabinet is a group | yes, pixel-perfect | a clean CAD/DXF/vector | high, hand-tuned |

**Default to Tier 2.** It gives "looks exactly like the plan **and** is clickable" from
just a PDF, with no CAD file. Use Tier 3 only when a clean vector/DXF exists and
pixel-perfect linework is required (see `l-shaped-kitchen` as the reference example, which
uses `kitchen-svgs/active/*.svg` + hand-tuned bounds in `kitchen-svg-plan-utils.js`).

---

## 3. Recipe — add a kitchen with a clickable image plan (Tier 2)

Worked reference: kitchen **AB 105806** (slug `ab-105806`). Mirror it.

### Step 1 — Add the plan image
Export page 1 of the PDF to a JPG and place it in `frontend/public/jpg/` (or keep a PDF in
`frontend/public/pdfs/`). Note the public URL (spaces → `%20`).

### Step 2 — Seed the items (`frontend/prisma/seed.js`)
1. Create an items array, e.g. `const AB_105810_ITEMS = [ … ]`, one object per Excel row.
   Match the field names in the table above. Give each **COMPONENT** a unique
   `componentKey` that corresponds to a slot on the plan
   (`wall-cabinet-1`, `base-module-1`, `refrigerator`, `oven-module`, `worktop`, …).
2. Register the kitchen in the kitchens array:
   ```js
   {
     slug: "ab-105810",
     kitchenCode: "105 810",
     name: "AB 105810 Kitchen",
     description: "Kitchen configuration based on jpg/AB 105810_page-0001.jpg",
     items: AB_105810_ITEMS,
   }
   ```
3. (Optional) add a `DEFAULT_KITCHEN_CONTRACTS` entry so it's reachable via a contract
   number for local testing.
4. If an appliance reuses existing product info, alias it like the existing
   `PRODUCT_INFO_BY_CODE["…"] = PRODUCT_INFO_BY_CODE["…"]` lines.

### Step 3 — Show the image on the plan stage
In `frontend/components/kitchen-svg-stage.jsx`, add the slug to `IMAGE_VIEW_BY_SLUG`:
```js
const IMAGE_VIEW_BY_SLUG = {
  "ab-105806": "/jpg/AB%20105806_page-0001.jpg",
  "ab-105810": "/jpg/AB%20105810_page-0001.jpg",
};
```

### Step 4 — Add clickable hotspots (the important part)
Still in `kitchen-svg-stage.jsx`, add an entry to `IMAGE_HOTSPOTS_BY_SLUG`. Each hotspot is
a box positioned as **percentages of the image** (`left`, `top`, `width`, `height`), keyed
by the item's `componentKey`:
```js
const IMAGE_HOTSPOTS_BY_SLUG = {
  "ab-105810": [
    { componentKey: "refrigerator", left: 4.3, top: 28.7, width: 12.8, height: 66.4 },
    { componentKey: "wall-cabinet-1", left: 17.7, top: 16.5, width: 9.6, height: 25.5 },
    // …one per visible component, covering its area on the drawing
  ],
};
```
How to get the numbers (auto, recommended): if the plan is a clean black-on-white CAD
render, run the detector to read the cabinet edges straight from the pixels:

```
python docs/detect-plan-hotspots.py frontend/public/jpg/<plan>.jpg
```

It prints the major horizontal lines and the vertical dividers (as % of the image) for the
wall and base bands. Map those % directly to `left`/`top`/`width`/`height`
(`width = next_divider − left`). Verify the fit by drawing the boxes back onto the plan:

```
python docs/detect-plan-hotspots.py frontend/public/jpg/<plan>.jpg --overlay boxes.json out.png
```

The `ab-105806` boxes were produced this way and match the linework to the pixel.

How to get the numbers (manual): open the kitchen page with `?calibrate=1`
(e.g. `/kitchens/ab-105806?calibrate=1`). This overlays a labelled **0–100 % grid** on the
plan and outlines every hotspot with its `componentKey`. Read each cabinet's left/top/right/
bottom directly off the grid and set `left`/`top`/`width`/`height` (`width = right − left`,
`height = bottom − top`). Percentages are scale-invariant, so they stay aligned at any
display size. If the plan is drawn to scale, derive the inner verticals from the dimension
chain instead of eyeballing each one (only the run's start % and end % need measuring; the
rest follow from the mm widths). Aim for boxes that cover each drawn cabinet without
overlapping neighbours.

The overlay code already handles the rest:
- `isLocked` items (`isLocked: true` in seed) render highlighted and non-clickable.
- Linked items (e.g. a hood cabinet that also pulls in a hidden hood row) toggle together —
  define the link in `LINKED_COMPONENT_GROUPS_BY_SLUG` in `kitchen-selection-utils.js` and
  only add **one** hotspot for the visible cabinet. Hidden rows (`isActive: false`, listed
  second in the link group) get no hotspot.

### Step 5 — Names / info text (optional but recommended)
`kitchen-selection-utils.js` maps `code` → localized name/info in `getLocalizedItemName`
and `getLocalizedItemInfoText`. Add `case` entries for the new codes so the catalog and
hotspot tooltips read cleanly. If the plan has numbered callouts, add the
`code → number` map (see `AB_105806_PHOTO_NUMBER_BY_CODE`) so labels show "9. Wall Cabinet".

### Step 6 — Re-seed and verify
```
cd frontend
npx prisma db seed      # or the project's seed script
npm run lint
npm run dev             # open /kitchens/ab-105810
```
Check: the plan shows the image; hovering a cabinet highlights its box; clicking toggles it
and the matching catalog row + total price update; locked items show as included and don't
toggle.

---

## 4. Checklist for the agent

- [ ] Plan image added under `frontend/public/`.
- [ ] All Excel rows seeded in `prisma/seed.js` with unique `code` and per-component
      `componentKey`; kitchen registered in the kitchens array.
- [ ] Standard accessories + services rows included.
- [ ] Slug added to `IMAGE_VIEW_BY_SLUG`.
- [ ] One hotspot per visible component in `IMAGE_HOTSPOTS_BY_SLUG`, boxes aligned to the
      drawing.
- [ ] `isLocked` set for always-included parts (worktop, sink base, oven, etc.).
- [ ] Linked groups defined in `LINKED_COMPONENT_GROUPS_BY_SLUG` where one cabinet implies
      a hidden helper row; hidden rows are `isActive: false`.
- [ ] `getLocalizedItemName` / `getLocalizedItemInfoText` cases added for new codes.
- [ ] Re-seeded, lint passes, page verified in the browser.

## 5. Key files reference

| File | Role |
| --- | --- |
| `frontend/prisma/seed.js` | Kitchen + item data (the "database") |
| `frontend/components/kitchen-svg-stage.jsx` | Plan stage: image/PDF/SVG + **hotspot overlay** |
| `frontend/components/kitchen-selection-utils.js` | component ids, names, links, product info |
| `frontend/components/kitchen-catalog-panel.jsx` | Right-hand selectable list |
| `frontend/components/kitchen-configurator.js` | Orchestrates selection state, locking, order |
| `frontend/components/kitchen-svg-plan-utils.js` | Tier-3 vector SVG bounds/styling (advanced) |
| `frontend/lib/load-kitchen-svg.js` | Maps slug → vector SVG file (Tier 3 only) |
| `docs/kitchen-database-export.csv` | Canonical column layout for the Excel item list |

# Agent prompt — kitchen plan selection & measurements

Copy everything below the line and attach it together with the kitchen **PDF** and **Excel item list**.

---

## Your task

Add or fix a kitchen in the Fragmento configurator so that:

1. The **plan** matches the PDF exactly (vector SVG, razor-sharp).
2. Every cabinet/appliance on the plan is **clickable** — selection boxes hug the drawn linework.
3. Every Excel row is wired to the **catalog** with correct prices, articles, and dimensions.
4. Default items (oven, worktop, sink base, sink+faucet) are **locked** (blue on plan).
5. User-selected items highlight **green** on the plan; hood cabinet + aspirator toggle together.

Read `docs/kitchen-from-pdf-agent-guide.md` for the full pipeline. This document focuses on **how to measure selection boxes on the plan** and **how to set catalog dimensions** — the parts that must be pixel-perfect.

---

## Two different “measurements” (do not confuse them)

| What | Where it lives | Units | Shown to user |
| --- | --- | --- | --- |
| **Plan hotspots** | `frontend/components/kitchen-svg-stage.jsx` → `IMAGE_HOTSPOTS_BY_SLUG` | `%` of plan image (`left`, `top`, `width`, `height`) | Green/blue overlay on the plan when selecting |
| **Catalog dimensions** | `frontend/prisma/seed.js` → `widthMm`, `heightMm`, `depthMm` on each item | millimetres | `W x H x D mm` line under the article number in the catalog |

**Never put dimensions in the item `name`.** Names are plain labels (`Wall Cabinet`, `Base cabinet with drawer`). Dimensions go only in `widthMm`/`heightMm`/`depthMm`.

---

## Plan hotspot measurement workflow

### Step 1 — Render assets (from repo root)

```bash
python docs/render-plan-svg.py "frontend/public/pdfs/AB <plan>.pdf" "frontend/public/plans/AB <plan>.svg"
python docs/render-plan-pdf.py "frontend/public/pdfs/AB <plan>.pdf" "frontend/public/jpg/AB <plan>_page-0001.jpg"
```

The JPG is only for measuring. Users see the SVG.

### Step 2 — Auto-detect cabinet grid

```bash
python docs/detect-plan-hotspots.py "frontend/public/jpg/AB <plan>_page-0001.jpg"
```

This prints horizontal lines and vertical dividers in **percent of image size**. Use them as a starting grid — then **refine** with the rules below.

### Step 3 — Build one box per `componentKey`

Each hotspot is:

```js
{ componentKey: "oven-module", left: 24.29, top: 57.86, width: 14.25, height: 30.89 }
```

All four values are **percentages** (0–100). They must match the **drawn cabinet**, not dimension extension lines.

### Step 4 — Overlay verification (mandatory)

```bash
# boxes.json = array of { "componentKey", "left", "top", "width", "height" }
python docs/detect-plan-hotspots.py "frontend/public/jpg/AB <plan>_page-0001.jpg" --overlay boxes.json out.png
```

Open `out.png`. Every red box must hug its cabinet. Also verify in browser:

```
/kitchens/<slug>?calibrate=1
```

Shows a 0–100% grid and every hotspot labelled with its `componentKey`.

---

## Hotspot rules by component type

### Wall cabinets (`wall-cabinet-1` … `wall-cabinet-6`)

- **left** = vertical divider where the cabinet starts (from detector WALL band).
- **width** = next divider − left.
- **top** = wall-cabinet top horizontal line.
- **height** = hood-band top − wall top (do not include the hood drawing).

### Hood package (two hotspots, one linked group)

1. **`wall-cabinet-N`** — the hood wall cabinet box (same size as other wall cabinets in that slot).
2. **`extractor-hood`** — a smaller box over the hood/aspirator drawing **below** the cabinet.

Register link in `LINKED_COMPONENT_GROUPS_BY_SLUG`:

```js
"<slug>": [["component-wall-cabinet-2", "component-extractor-hood"]]
```

(Use whichever `wall-cabinet-N` slot holds the hood — varies by layout.)

Seed: hood cabinet → `iconKey: "hood_wall_cabinet"`; hidden hood row → `isActive: false`.

### Base cabinets (`base-module-1`, `oven-module`, `sink-base`, `drawer-module`, etc.)

- **left** / **width** — from detector BASE band vertical dividers.
- **top** — use the **cabinet door top** line, **not** the CAD “base top” line below the worktop.

  The detector’s base-top line sits ~1.3–1.4% **below** where the highlight should start. Measure door top by scanning ink in an oven/base column around y = 57–60% of image height, or set:

  ```
  base_top_hotspot = detector_base_top_line − 1.35%
  base_height      = (old_top + old_height) − base_top_hotspot   // keep same bottom edge
  ```

- **height** — from door top down to the cabinet bottom (above the plinth/toe-kick). Do not include the floor dimension line.

### Worktop (`worktop`)

- Thin horizontal strip at the worktop line (~1.3–1.4% tall).
- **left** = start of base run; **width** = full run width.

### Narrow side blende / side panel strips

Some plans show a very thin vertical side strip between the tall fridge/wall area and the base
run. It can be on the left or on the right, depending on where the tall wall/fridge sits.

- Add this as an extra image hotspot so it is selected by default.
- Use `componentKey: "worktop"` for the strip. The worktop is locked, so the strip renders blue
  without creating a new catalog item or changing the order.
- Make it narrow: `width` should be about `0.42%` to `0.45%`, like the `ab-105841` reference.
- Align it to the actual drawn cabinet side line, not the open gap and not the full alcove.
  If the first base cabinet starts at `18.58%`, the strip should start at `18.58%`; if the strip
  is on the right, place it on the final base-run side line.
- Its `top` / `height` should match the base cabinet body area, from the base door top down to
  the cabinet bottom. Do not include the plinth/toe-kick or floor dimension line.
- Because this creates a second `worktop` hotspot, the rendered hotspot key must include the
  coordinates, not only `componentId`, otherwise React will collapse duplicate hotspots.

### Refrigerator (`refrigerator`)

**Critical:** Do **not** size the box to the full alcove between dividers. Dimension ticks and gaps make it look too wide.

For fridge-left layouts (most AB kitchens), use the **drawn cabinet body**:

- **left** ≈ `4.15%` (inner left cabinet line, inset from dimension ticks)
- **width** ≈ `11.15%` (ends ~`15.3%`, not at the 16–17% divider before the first base cabinet)
- **top** / **height** — tall unit body from freezer top to cabinet feet (~`28–30%` top, ~`59–60%` height)

Re-measure per plan if the fridge position differs (e.g. fridge on the **right** in `ab-105841`).

### Sink faucet (`sink-faucet`)

- Always **locked** (`isLocked: true` in seed).
- If the plan drawing shows the faucet off-centre on the sink, add an **explicit** hotspot (do not rely on auto-centre).
- Measure faucet X from the JPG (scan ink above sink-base between worktop and wall cabinets).
- Typical size: `width ≈ 4–5%`, `height ≈ 8%`, `top` just above worktop.
- If no explicit hotspot exists, `withDerivedSinkFaucet()` in `kitchen-svg-stage.jsx` derives one centred on `sink-base` — only acceptable when the faucet is actually centred.

---

## Catalog dimension rules (Excel → seed)

From Excel column `DIMENSIONET`, parse into mm fields:

| Excel example | `widthMm` | `heightMm` | `depthMm` |
| --- | --- | --- | --- |
| `600/720/340 mm` | 600 | 720 | 340 |
| `600/600 mm` | 600 | 878 | 600 |
| `300/600 mm` | 300 | 878 | 600 |
| `450/600 mm` | 450 | 878 | 600 |
| `178 cm` | 710 | 1780 | (omit if unknown) |

Always set these on the seed item. The catalog renders them via `getStructuredDimensions()` in `kitchen-catalog-panel.jsx` as a line under the article:

```
Article: US60
600 x 878 x 600 mm
```

---

## Selection behaviour (what “correct” looks like)

| State | Plan colour | Behaviour |
| --- | --- | --- |
| Locked default (oven, worktop, sink base, sink+faucet) | **Blue** | Always selected, not clickable |
| User selected | **Green** | Click plan or catalog to toggle |
| Hover (linked group) | Light green on **all** linked parts | Hood cabinet + aspirator together |

Hidden linked rows (`extractor-hood`, `isActive: false`) must stay selected when the hood cabinet is selected, including after page refresh.

---

## Standard component slots

### Layout A — fridge left, 6 wall + 6 base (most AB plans)

Left → right:

| Plan position | `componentKey` | Typical Excel NR |
| --- | --- | --- |
| Tall left | `refrigerator` | 4 |
| Wall ×6 | `wall-cabinet-1` … `wall-cabinet-6` | 9–14 (hood = 10) |
| Hood drawing | `extractor-hood` | (hidden, linked) |
| Worktop strip | `worktop` | 2 (DEFAULT) |
| Faucet | `sink-faucet` | (locked accessory) |
| Base ×6 | `base-module-1`, `oven-module`, `base-module-2`, `base-module-3`, `sink-base`, `drawer-module` | 5–8 + 1,3 |

Slot names are **positions**, not types — `base-module-2` might be a 400 mm filler, US60, or dishwasher depending on the kitchen.

### Layout B — compact, fridge right (`ab-105811`)

4 wall + 4 base, fridge on right. See `IMAGE_HOTSPOTS_BY_SLUG["ab-105811"]`.

### Layout C — fridge right, wide run (`ab-105841`)

6 wall + 6 base, fridge on far right. Hood at `wall-cabinet-2`.

### Layout D — compact, fridge right of run (`ab-105819`)

4 wall + 4 base, fridge between run and door.

---

## Implemented AB kitchens (reference)

All use SVG plan + hotspots unless noted. Contract format: **`670` + 6-digit plan number** for new kitchens.

| Slug | Plan | Contract | Layout | Notes |
| --- | --- | --- | --- | --- |
| `ab-105806` | AB 105806 | `736273` | A — fridge left, 400+600 mix | Original reference kitchen |
| `ab-105807` | AB 105807 | `736272` | PDF only (no hotspots yet) | `PDF_VIEW_BY_SLUG` |
| `ab-105808` | AB 105808 | `670105808` | A — same items as 820 | US30 base |
| `ab-105810` | AB 105810 | `670105810` | A — US45 + 400 fillers | Unique wall/base fillers |
| `ab-105811` | AB 105811 | `670105811` | B — compact, fridge right | 4+4 run |
| `ab-105812` | AB 105812 | `736276` | A — same items as 820 | |
| `ab-105814` | AB 105814 | `670105814` | A — variant of 820 layout | |
| `ab-105816` | AB 105816 | `670105816` | A — same items as 820 | H6002 L hinge on NR 11 |
| `ab-105819` | AB 105819 | `736275` | D — compact, fridge right of run | |
| `ab-105820` | AB 105820 | `736274` | A — US30 + US60 | Template for 808/812/816 |
| `ab-105841` | AB 105841 | `736277` | C — fridge right, 6+6 | |

### Code-reuse clusters

- **820 family** (`808`, `812`, `814`, `816`, `820`): same appliance codes; only differing cabinets get new codes.
- **806 family**: oven, worktop, sink, hood, many H6002 wall codes shared across kitchens.
- **811**: own codes for compact layout.
- **841**: own base codes; shares 806 defaults for oven/worktop/sink/hood.

When adding a kitchen similar to an existing one, **reuse identical item codes** and only mint new codes for cabinets that differ in size/price/article.

---

## Files you must touch

| File | What to add |
| --- | --- |
| `frontend/public/plans/AB <plan>.svg` | Vector plan (render script) |
| `frontend/public/jpg/AB <plan>_page-0001.jpg` | Raster for measuring |
| `frontend/prisma/seed.js` | `<PLAN>_ITEMS`, `DEFAULT_KITCHENS`, `DEFAULT_KITCHEN_CONTRACTS` |
| `frontend/components/kitchen-svg-stage.jsx` | `IMAGE_VIEW_BY_SLUG` + `IMAGE_HOTSPOTS_BY_SLUG` |
| `frontend/components/kitchen-selection-utils.js` | Callout numbers for new codes, `LINKED_COMPONENT_GROUPS_BY_SLUG` |

---

## Verification checklist

- [ ] Overlay PNG: every box hugs its cabinet (no overlap into neighbours, no gap inside drawing).
- [ ] Fridge box matches **drawn** fridge, not full alcove width.
- [ ] Narrow side blende strip exists when drawn, is selected by default via locked `worktop`,
      and is only ~0.42-0.45% wide on the actual cabinet side line.
- [ ] Base boxes align with **door tops**, not sitting low under worktop.
- [ ] Faucet box sits on the actual faucet position.
- [ ] Hood cabinet + aspirator highlight together on hover and after refresh.
- [ ] Locked items (blue): oven, worktop, sink base, sink+faucet.
- [ ] Catalog shows dimensions under article (not in name).
- [ ] `npx prisma db seed` succeeds.
- [ ] `/kitchens/<slug>?contractNumber=<contract>` loads and selections sync plan ↔ catalog.

---

## When updating an existing kitchen PDF

If the user replaces a plan PDF with a corrected version:

1. Re-render SVG + JPG (same paths, overwrite).
2. Re-run `detect-plan-hotspots.py`.
3. Compare new grid to existing `IMAGE_HOTSPOTS_BY_SLUG` — if geometry unchanged, assets-only update is enough.
4. If layout shifted, re-measure and update hotspots using the rules above.
5. Seed data usually unchanged unless Excel/items changed.

---

## Quick copy-paste prompt (minimal)

```
Add/fix kitchen AB <plan> in the Fragmento configurator.

Inputs:
- PDF: frontend/public/pdfs/AB <plan>.pdf
- Excel: [attach item list]

Follow docs/kitchen-plan-selection-prompt.md and docs/kitchen-from-pdf-agent-guide.md.

Requirements:
- Vector SVG plan + pixel-perfect hotspots (% in kitchen-svg-stage.jsx)
- Catalog dimensions in widthMm/heightMm/depthMm (not in names)
- Contract: 670<plan-number> (e.g. AB 105811 → 670105811)
- Locked defaults: oven, worktop, sink base, sink+faucet (blue on plan)
- Hood linked: wall-cabinet-N + extractor-hood (green together)
- Fridge hotspot = drawn cabinet body (~left 4.15%, width ~11.15%), not full alcove
- Narrow side blende = extra locked `worktop` hotspot, ~0.42-0.45% wide, aligned to actual cabinet side line
- Base hotspots = cabinet door top (~1.35% above detector base-top line)
- Verify with detect-plan-hotspots.py --overlay and ?calibrate=1
- Run prisma db seed and test in browser
```

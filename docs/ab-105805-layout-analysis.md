# AB 105805 Layout And Catalog Analysis

This note documents the workflow used to align kitchens `105805`, `105809`, `105813`, and `105817` to the same layout and to correct the catalog dimensions for the `105805` item set.

## Scope

The four kitchens are handled as one visual/layout family:

- `ab-105805`
- `ab-105809`
- `ab-105813`
- `ab-105817`

The source kitchen for the final layout is `ab-105805`.

## Files Checked

The analysis covered these files:

- `frontend/components/kitchen-svg-stage.jsx`
  - Owns the interactive plan image and SVG hotspot coordinates.
  - The `IMAGE_VIEW_BY_SLUG` map chooses the displayed plan image.
  - The `IMAGE_HOTSPOTS_BY_SLUG` map defines the clickable polygons.

- `frontend/lib/kitchen-plan-preview-data.js`
  - Owns the catalog preview image/hotspot data.
  - It must match the stage layout so catalog thumbnails crop the same areas.

- `frontend/prisma/seed.js`
  - Owns the seeded kitchen records and their catalog items.
  - `AB_105805_ITEMS` starts at the `const AB_105805_ITEMS = [` block.
  - `AB_105809_ITEMS` remains a separate item block.
  - `AB_105813_ITEMS` and `AB_105817_ITEMS` alias `AB_105805_ITEMS`.

- `frontend/components/kitchen-selection-utils.js`
  - Owns the dimension formatting used by the catalog UI.
  - `getStructuredDimensions(item)` formats `widthMm`, `heightMm`, and `depthMm`.
  - Refrigerators are shown in cm; other items are shown in mm.

## Visual Layout Method

The SVG/layout fix was done by comparing the actual visible cabinet edges in the plan image against the existing polygon points.

For every cabinet correction:

1. Identify the component key in the stage file, for example:
   - `wall-cabinet-1`
   - `wall-cabinet-2`
   - `wall-cabinet-3`
   - `wall-cabinet-4`
   - `extractor-hood`
   - `refrigerator`

2. Compare the highlighted polygon with the visible drawing line.

3. Move only the polygon points that were wrong.

4. Keep nearby correct edges unchanged.

5. Re-check the affected cabinet against its neighbors:
   - Refrigerator overlap line.
   - Extractor hood bottom/fascia line.
   - Adjacent upper-cabinet lower line.
   - End wall-cabinet right side line.

6. Alias the same finished 105805 layout to the other kitchens:
   - Stage image uses `AB 105805_page-0001.jpg`.
   - Stage hotspots use `IMAGE_HOTSPOTS_BY_SLUG["ab-105805"]`.
   - Preview hotspots use `PLAN_HOTSPOTS_BY_SLUG["ab-105805"]`.

## Catalog Dimension Method

The screenshot showed Excel-style catalog dimensions for `AB 105805`. The important point was that the UI does not display dimensions from the item name. It displays dimensions from structured seed fields:

- `widthMm`
- `heightMm`
- `depthMm`

The formatter logic is:

- If only `heightMm: 1780` exists on a refrigerator, the catalog shows `178 cm`.
- If only `widthMm: 400` exists, the catalog shows `400 mm`.
- If `widthMm: 300` and `depthMm: 600` exist, the catalog shows `300 x 600 mm`.
- If all three exist, for example `600`, `720`, `340`, it shows `600 x 720 x 340 mm`.
- If no dimension fields exist, no dimension line is shown.

So the correction was not to edit visible text directly. The fix was to remove or keep structured dimension fields until the rendered value matched the Excel row.

## AB 105805 Dimension Corrections

The corrected `AB_105805_ITEMS` values are:

| Item | Structured dimensions | Rendered catalog line |
| --- | --- | --- |
| Refrigerator `OL-KGCN388140E` | `heightMm: 1780` | `178 cm` |
| 400 base cabinet | `widthMm: 400` | `400 mm` |
| 500 base cabinet | `widthMm: 500` | `500 mm` |
| Dishwasher | no dimension fields | no dimension line |
| Sink base `US30` | `widthMm: 300`, `depthMm: 600` | `300 x 600 mm` |
| 400 wall cabinet | `widthMm: 400` | `400 mm` |
| Hood cabinet/filter row | no dimension fields | no dimension line |
| Extractor hood row | no dimension fields | no dimension line |
| 500 wall cabinet | `widthMm: 500` | `500 mm` |
| Last H6002 upper cabinet | `widthMm: 600`, `heightMm: 720`, `depthMm: 340` | `600 x 720 x 340 mm` |

## Blende Correction

The last upper cabinet for all four kitchens was updated to show the same blende note:

- `blendeCode: "UPK20"`
- `blendeLabel: "UPK20 20 cm"`
- `blendePrice: "25.00"`

Because `ab-105813` and `ab-105817` alias `AB_105805_ITEMS`, changing the `AB_105805_ITEMS` last upper cabinet also changes those two kitchens.

Because `ab-105809` uses its own `AB_105809_ITEMS`, its last upper cabinet row had to be patched separately.

## Verification Commands

Run syntax and whitespace checks:

```powershell
node --check prisma/seed.js
git diff --check -- frontend/prisma/seed.js
```

Reseed the local database:

```powershell
npm run prisma:seed
```

Check the catalog preview tests:

```powershell
node --test test/kitchen-catalog-preview.test.js
```

Verify the final upper-cabinet blende for all four kitchens:

```powershell
@'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const kitchens = await prisma.kitchen.findMany({
    where: { slug: { in: ['ab-105805','ab-105809','ab-105813','ab-105817'] } },
    orderBy: { slug: 'asc' },
    select: {
      slug: true,
      items: {
        where: { componentKey: 'wall-cabinet-4' },
        select: {
          code: true,
          articleNumber: true,
          blendeCode: true,
          blendeLabel: true,
          blendePrice: true,
          widthMm: true,
          heightMm: true,
          depthMm: true,
        },
      },
    },
  });
  for (const kitchen of kitchens) {
    const item = kitchen.items[0];
    console.log(`${kitchen.slug}: ${item.code} ${item.articleNumber} + ${item.blendeLabel}`);
  }
})().finally(() => prisma.$disconnect());
'@ | node -
```

Verify the rendered dimension logic for `ab-105805`:

```powershell
@'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const format = (item) => {
  const values = [item.widthMm, item.heightMm, item.depthMm].filter((v) => v !== null && v !== undefined && v !== '');
  if (!values.length) return '';
  if (item.componentKey === 'refrigerator') return values.map((value) => Number(value) / 10).join(' x ') + ' cm';
  return values.join(' x ') + ' mm';
};
(async () => {
  const kitchen = await prisma.kitchen.findUnique({
    where: { slug: 'ab-105805' },
    select: {
      items: {
        where: { itemType: 'COMPONENT' },
        orderBy: { sortOrder: 'asc' },
        select: {
          sortOrder: true,
          articleNumber: true,
          componentKey: true,
          widthMm: true,
          heightMm: true,
          depthMm: true,
        },
      },
    },
  });
  for (const item of kitchen.items.slice(0, 13)) {
    console.log(`${item.sortOrder}: ${item.articleNumber || 'DEFAULT'} -> ${format(item) || '-'}`);
  }
})().finally(() => prisma.$disconnect());
'@ | node -
```

Expected key output:

```text
10: OL-KGCN388140E -> 178 cm
20: -Unterschrank -> 400 mm
40: -Unterschrank -> 500 mm
50: A-EGSPV597210 + TGV60 -> -
60: US30 -> 300 x 600 mm
80: -Oberschrank -> 400 mm
90: FH664621E + FWK124 + HD6002 -> -
92: FH 664 621 S -> -
100: -Oberschrank -> 500 mm
110: H6002 -> 600 x 720 x 340 mm
```

## Practical Rule For Future Kitchen Rows

When Excel shows one dimension value, store only the matching field needed for that display. Do not fill every physical cabinet dimension unless the Excel row actually shows all of them.

Examples:

- Excel `400mm` means `widthMm: 400`.
- Excel `300/600 mm` means `widthMm: 300`, `depthMm: 600`.
- Excel `600/720/340 mm` means `widthMm: 600`, `heightMm: 720`, `depthMm: 340`.
- Excel `178 cm` for the refrigerator means `heightMm: 1780`.

This keeps the public catalog consistent with the spreadsheet instead of exposing extra internal cabinet measurements.

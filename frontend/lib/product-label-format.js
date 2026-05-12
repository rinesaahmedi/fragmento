/**
 * Removes common size suffixes from catalog/order labels, e.g.
 * "Refrigerator 545 x 1800 x 700 mm" → "Refrigerator"
 * "Wall Cabinet mid-left (600 x 723 x 320 mm)" → "Wall Cabinet mid-left"
 */
export function stripProductDimensionsFromLabel(label) {
  let s = String(label || "").trim();
  // Parenthesized: (600 x 723 x 320 mm) or (600 x 878 mm)
  s = s.replace(/\s*\(\s*\d+(\s*[x×]\s*\d+){1,2}\s*mm\s*\)/gi, "");
  // Trailing: " 545 x 1800 x 700 mm" or " 600 x 878 mm"
  s = s.replace(/\s+\d+(\s*[x×]\s*\d+){1,2}\s*mm\s*$/i, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}

export function classifySupplierRow(row) {
  const articles = row.articlesUpper;
  const dimensions = String(row.dimensions || "").toUpperCase();
  const isIncludedDefault = row.isDefault || /^DEFAULT$/i.test(String(articles || "").trim());

  if (isIncludedDefault) {
    if (/SINK|BOTTON|SPUEL/i.test(articles)) {
      return "sink-base";
    }
    if (/WORKTOP|ARBEITSPLATTE/i.test(articles)) {
      return "worktop";
    }
    if (row.nr === "2") {
      return "worktop";
    }
    if (row.nr === "3") {
      return "sink-base";
    }
    if (row.partDefaultIndex === 1) {
      return "worktop";
    }
    if (row.partDefaultIndex === 2) {
      return "sink-base";
    }
    return "oven-module";
  }
  if (/OVEN|HOB|BACKOFEN|HERD/i.test(articles)) {
    return "oven-module";
  }
  if (/KGCN|178\s*CM|REFRIGERAT|FRIDGE/i.test(articles) || /178\s*CM/.test(dimensions)) {
    return "refrigerator";
  }
  if (/FH664621E|HD6002|HOOD|DUNST/i.test(articles)) {
    return "hood-cabinet";
  }
  if (/A-EGSPV|DISHWASHER|GESCHIRR/i.test(articles)) {
    return "dishwasher";
  }
  if (/BOTTON|517467|SINK/i.test(articles)) {
    return "sink-faucet";
  }
  if (/OBERSCHRANK/i.test(articles)) {
    return "wall-cabinet";
  }
  if (/UNTERSCHRANK/i.test(articles)) {
    return "base-cabinet";
  }
  if (/^H\d{4}|WALL/i.test(articles) || /\/720\//.test(dimensions)) {
    return "wall-cabinet";
  }
  if (/^US\d+|BASE/i.test(articles) || /\/600/.test(dimensions)) {
    return "base-cabinet";
  }
  return "base-cabinet";
}

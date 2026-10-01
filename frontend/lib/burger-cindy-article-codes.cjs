// Supplier Typen-NR. values from the Burger CINDY list. The left-hand values
// are Impuls identities used as metadata sources during the catalog import.
const BURGER_CINDY_ARTICLE_CODES = Object.freeze({
  H3002: "H3072",
  H4502: "H4572",
  H6002: "H6072",
  H4002: "H4072",
  H5002: "H5072",
  H8002: "H8072",
  H9002: "H9072",
  H10002: "H10072",
  "FH664621E + FWK124 + HD6002": "FH664621E+FWK124+HFLH6072",
  "EWA34660W + TGV60 + WU16": "EWA34660W+TV60+WU1672",
  "A-EGSPV587915 + TGV45": "A-EGSPV594 + TGV60",
  "517467": "Blanco Botton 517467",
  ZB30SG: "ZBE30",
  ZB40SG: "ZBE40",
  ZB45SG: "ZBE45",
  ZB50SG: "ZBE50",
  ZB60SG: "ZBE60",
  ZB80SG: "ZBE80",
  ZB90SG: "ZBE90",
  ZB100SG: "ZBE100",
});

function burgerCindyReplacement(articleNumber) {
  return BURGER_CINDY_ARTICLE_CODES[String(articleNumber || "").trim()] || null;
}

function assertBurgerCindyArticleCode(articleNumber, programmId) {
  if (String(programmId || "").trim() !== "BURGER CINDY") return;
  const replacement = burgerCindyReplacement(articleNumber);
  if (replacement) {
    throw new Error(`Article ${articleNumber} belongs to the Impuls list. Use Burger CINDY article ${replacement}.`);
  }
}

module.exports = { BURGER_CINDY_ARTICLE_CODES, burgerCindyReplacement, assertBurgerCindyArticleCode };

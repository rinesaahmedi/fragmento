function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value) {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

export function normalizeKitchenSearchQuery(value) {
  const scalarValue = Array.isArray(value) ? value[0] : value;
  return String(scalarValue || "").trim();
}

export function filterAdminKitchens(kitchens, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return kitchens;

  const compactQuery = compactText(normalizedQuery);

  return kitchens.filter((kitchen) => {
    const searchableValues = [
      kitchen?.name,
      kitchen?.kitchenCode,
      kitchen?.slug,
      kitchen?.programmId,
      kitchen?.description,
    ];
    const normalizedIndex = normalizeText(searchableValues.join(" "));
    const compactIndex = compactText(searchableValues.join(" "));

    return normalizedIndex.includes(normalizedQuery)
      || Boolean(compactQuery && compactIndex.includes(compactQuery));
  });
}

export const ADMIN_PAGE_SIZE = 20;

export function normalizeAdminPage(value) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(String(rawValue || "1"), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function paginateAdminItems(items = [], requestedPage = 1, pageSize = ADMIN_PAGE_SIZE) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(normalizeAdminPage(requestedPage), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems,
    totalPages,
  };
}

export function buildAdminPageHref(basePath, searchParams = {}, page = 1) {
  const params = new URLSearchParams();

  Object.entries(searchParams || {}).forEach(([key, rawValue]) => {
    if (key === "page") return;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value != null && String(value).trim()) params.set(key, String(value));
  });

  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

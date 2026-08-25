const DEFAULT_KITCHEN_PROGRAMM_ID = "IP 2200";
const PINNED_CATALOG_PROGRAMS = [DEFAULT_KITCHEN_PROGRAMM_ID, "BURGER CINDY"];
const DEFAULT_CATALOG_PROGRAM_NAMES = new Map([
  [DEFAULT_KITCHEN_PROGRAMM_ID, "Impuls"],
  ["BURGER CINDY", "Burger - Cindy Type"],
]);

function normalizeProgramId(value) {
  return String(value || "").trim() || DEFAULT_KITCHEN_PROGRAMM_ID;
}

export function getCatalogProgramDisplayName(program) {
  const programmId = normalizeProgramId(program?.programmId);
  const storedName = String(program?.name || "").trim();
  return storedName && storedName !== programmId
    ? storedName
    : DEFAULT_CATALOG_PROGRAM_NAMES.get(programmId) || programmId;
}

export function sortCatalogPrograms(programs) {
  const priorityById = new Map(PINNED_CATALOG_PROGRAMS.map((programmId, index) => [programmId, index]));
  return [...programs].sort((left, right) => {
    const leftId = normalizeProgramId(left?.programmId);
    const rightId = normalizeProgramId(right?.programmId);
    const leftPriority = priorityById.get(leftId) ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = priorityById.get(rightId) ?? Number.MAX_SAFE_INTEGER;
    return leftPriority - rightPriority || leftId.localeCompare(rightId);
  });
}

import { DEFAULT_KITCHEN_PROGRAMM_ID } from "./admin-forms";
import { prisma } from "./prisma";

function normalizeProgramId(value) {
  return String(value || "").trim() || DEFAULT_KITCHEN_PROGRAMM_ID;
}

export async function listCatalogPrograms() {
  const [programs, kitchens] = await Promise.all([
    prisma.catalogProgram.findMany({
      where: { isActive: true },
      orderBy: { programmId: "asc" },
    }),
    prisma.kitchen.groupBy({
      by: ["programmId"],
      _count: { _all: true },
      orderBy: { programmId: "asc" },
    }),
  ]);

  const kitchenCountByProgramId = new Map(
    kitchens.map((row) => [normalizeProgramId(row.programmId), row._count._all]),
  );
  const programById = new Map(
    programs.map((program) => [normalizeProgramId(program.programmId), program]),
  );

  for (const [programmId] of kitchenCountByProgramId) {
    if (!programById.has(programmId)) {
      programById.set(programmId, {
        id: `derived-${programmId}`,
        programmId,
        name: programmId,
        description: null,
        isActive: true,
      });
    }
  }

  if (!programById.has(DEFAULT_KITCHEN_PROGRAMM_ID)) {
    programById.set(DEFAULT_KITCHEN_PROGRAMM_ID, {
      id: `derived-${DEFAULT_KITCHEN_PROGRAMM_ID}`,
      programmId: DEFAULT_KITCHEN_PROGRAMM_ID,
      name: DEFAULT_KITCHEN_PROGRAMM_ID,
      description: null,
      isActive: true,
    });
  }

  return [...programById.values()]
    .map((program) => ({
      ...program,
      kitchenCount: kitchenCountByProgramId.get(normalizeProgramId(program.programmId)) || 0,
    }))
    .sort((left, right) => left.programmId.localeCompare(right.programmId));
}

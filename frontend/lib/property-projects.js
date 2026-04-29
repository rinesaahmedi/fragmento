export function projectLabel(projectName, objectName) {
  const name = String(projectName || "").trim();
  const object = String(objectName || "").trim();
  if (name && object) return `${name} | ${object}`;
  return name || object;
}

export async function upsertProjectForObject(db, { housingCompanyId, propertyObjectId, projectName }) {
  const name = String(projectName || "").trim();
  if (!name) {
    throw new Error("Project name is required.");
  }

  return db.project.upsert({
    where: { propertyObjectId },
    update: {
      name,
      housingCompanyId,
    },
    create: {
      name,
      housingCompanyId,
      propertyObjectId,
    },
  });
}

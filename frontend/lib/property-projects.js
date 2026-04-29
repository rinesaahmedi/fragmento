export async function upsertProjectForObject(db, {
  housingCompanyId,
  propertyObjectId,
  projectName,
  projectCode,
  projectStatus,
  projectDescription,
  projectManagerName,
}) {
  const name = String(projectName || "").trim();
  if (!name) {
    throw new Error("Project name is required.");
  }

  const nextProjectCode = String(projectCode || "").trim() || null;
  const nextProjectStatus = String(projectStatus || "").trim() || "active";
  const nextProjectDescription = String(projectDescription || "").trim() || null;
  const nextProjectManagerName = String(projectManagerName || "").trim() || null;

  return db.project.upsert({
    where: { propertyObjectId },
    update: {
      name,
      projectCode: nextProjectCode,
      status: nextProjectStatus,
      description: nextProjectDescription,
      managerName: nextProjectManagerName,
      housingCompanyId,
    },
    create: {
      name,
      projectCode: nextProjectCode,
      status: nextProjectStatus,
      description: nextProjectDescription,
      managerName: nextProjectManagerName,
      housingCompanyId,
      propertyObjectId,
    },
  });
}

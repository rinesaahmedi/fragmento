"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminText, useAdminI18n } from "./admin-i18n";

function FilterField({ label, children }) {
  return (
    <label style={filterFieldStyle}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function AdminContractsFilters({
  kitchens = [],
  owners = [],
  projects = [],
  filters = {},
}) {
  const { translate } = useAdminI18n();
  const [housingCompanyId, setHousingCompanyId] = useState(filters.housingCompanyId || "");
  const [projectId, setProjectId] = useState(filters.projectId || "");

  const visibleProjects = useMemo(() => {
    if (!housingCompanyId) return projects;
    return projects.filter((project) => project.housingCompanyId === housingCompanyId);
  }, [housingCompanyId, projects]);

  useEffect(() => {
    if (!projectId) return;
    if (visibleProjects.some((project) => project.id === projectId)) return;
    setProjectId("");
  }, [projectId, visibleProjects]);

  return (
    <form action="/admin/contracts" method="get" style={filterPanelStyle}>
      <div style={filterHeaderStyle}>
        <span style={filterEyebrowStyle}><AdminText i18nKey="contractsAdmin.filters" fallback="Filters" /></span>
        <span style={filterHintStyle}><AdminText i18nKey="contractsAdmin.narrowTheContractListBelow" fallback="Narrow the contract list below" /></span>
      </div>
      <div style={filterGridStyle}>
        <FilterField label={<AdminText i18nKey="contractsAdmin.search" fallback="Search" />}>
          <input
            name="q"
            defaultValue={filters.query || ""}
            placeholder="Contract, kitchen, owner, city..."
            style={filterInputStyle}
          />
        </FilterField>
        <FilterField label={<AdminText i18nKey="dashboard.kitchen" fallback="Kitchen" />}>
          <select name="kitchenId" defaultValue={filters.kitchenId || ""} style={filterInputStyle}>
            <option value=""><AdminText i18nKey="dashboard.allKitchens" fallback="All kitchens" /></option>
            {kitchens.map((kitchen) => (
              <option key={kitchen.id} value={kitchen.id}>
                {kitchen.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={<AdminText i18nKey="contractsAdmin.owner" fallback="Housing company" />}>
          <select
            name="housingCompanyId"
            value={housingCompanyId}
            style={filterInputStyle}
            onChange={(event) => setHousingCompanyId(event.target.value)}
          >
            <option value=""><AdminText i18nKey="contractsAdmin.allOwners" fallback="All owners" /></option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={<AdminText i18nKey="contractsAdmin.project" fallback="Project" />}>
          <select
            name="projectId"
            value={projectId}
            style={filterInputStyle}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">
              {!housingCompanyId
                ? translate("contractsAdmin.allProjects", "All projects")
                : visibleProjects.length
                  ? translate("contractsAdmin.allProjects", "All projects")
                  : translate("contractsAdmin.noProjectsAvailable", "No projects available")}
            </option>
            {visibleProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {housingCompanyId
                  ? `${project.projectCode ? `${project.projectCode} | ` : ""}${project.name || translate("contractsAdmin.unnamedProject", "Unnamed project")} | ${translate("contractsAdmin.objectContext", "Object")}: ${project.propertyObject?.name || translate("contractsAdmin.noObject", "No object")}`
                  : `${project.housingCompany.name} | ${project.projectCode ? `${project.projectCode} | ` : ""}${project.name || translate("contractsAdmin.unnamedProject", "Unnamed project")} | ${translate("contractsAdmin.objectContext", "Object")}: ${project.propertyObject?.name || translate("contractsAdmin.noObject", "No object")}`}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={<AdminText i18nKey="dashboard.status" fallback="Status" />}>
          <select name="status" defaultValue={filters.status || ""} style={filterInputStyle}>
            <option value=""><AdminText i18nKey="dashboard.allStatuses" fallback="All statuses" /></option>
            <option value="active"><AdminText i18nKey="contractsAdmin.active" fallback="Active" /></option>
            <option value="inactive"><AdminText i18nKey="contractsAdmin.inactive" fallback="Inactive" /></option>
          </select>
        </FilterField>
        <FilterField label={<AdminText i18nKey="contractsAdmin.usage" fallback="Usage" />}>
          <select name="usage" defaultValue={filters.usage || ""} style={filterInputStyle}>
            <option value=""><AdminText i18nKey="contractsAdmin.allUsage" fallback="All usage" /></option>
            <option value="unused"><AdminText i18nKey="contractsAdmin.unused" fallback="Unused" /></option>
            <option value="used"><AdminText i18nKey="contractsAdmin.used" fallback="Used" /></option>
            <option value="once"><AdminText i18nKey="contractsAdmin.usedOnce" fallback="Used once" /></option>
            <option value="multiple"><AdminText i18nKey="contractsAdmin.usedTwoPlusTimes" fallback="Used 2+ times" /></option>
          </select>
        </FilterField>
        <div style={filterActionsStyle}>
          <button type="submit" style={filterApplyButtonStyle}><AdminText i18nKey="contractsAdmin.applyFilters" fallback="Apply filters" /></button>
          <Link href="/admin/contracts" style={filterClearLinkStyle}><AdminText i18nKey="contractsAdmin.clear" fallback="Clear" /></Link>
        </div>
      </div>
    </form>
  );
}

const filterGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  alignItems: "end",
};

const filterPanelStyle = {
  display: "grid",
  gap: 12,
  borderRadius: 8,
  border: "1px solid rgba(143, 62, 44, 0.16)",
  background: "linear-gradient(180deg, rgba(255,247,241,0.82), rgba(255,255,255,0.72))",
  padding: 14,
};

const filterHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const filterEyebrowStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "6px 10px",
  background: "rgba(143, 62, 44, 0.1)",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  color: "var(--app-accent)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const filterHintStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

const filterFieldStyle = {
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const filterInputStyle = {
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 11px",
  background: "rgba(255,255,255,0.94)",
  fontSize: "0.92rem",
  boxShadow: "none",
  border: "1px solid var(--app-border-strong)",
  color: "var(--app-text)",
  width: "100%",
};

const filterActionsStyle = {
  display: "flex",
  gap: 8,
  alignItems: "end",
  flexWrap: "nowrap",
};

const filterApplyButtonStyle = {
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: "0.92rem",
  whiteSpace: "nowrap",
  boxShadow: "0 10px 20px rgba(143, 62, 44, 0.16)",
  border: "1px solid transparent",
  background: "var(--app-accent)",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const filterClearLinkStyle = {
  textDecoration: "none",
  borderRadius: 8,
  minHeight: 42,
  padding: "9px 12px",
  background: "rgba(255,255,255,0.88)",
  color: "var(--app-accent)",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  fontWeight: 800,
  fontSize: "0.92rem",
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap",
};

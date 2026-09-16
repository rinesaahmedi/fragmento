import { CONTRACT_APPLIANCE_TYPES, getContractApplianceBrandLabel } from "../lib/contract-appliances";
import { AdminText } from "./admin-i18n";

export default function AdminApplianceSummary({ appliances = [], compact = false }) {
  if (!appliances.length) return <span><AdminText i18nKey="contractDetailAdmin.noInstalledAppliances" fallback="No electrical appliances are included in this kitchen or its confirmed orders." /></span>;
  return <div style={{ display: "grid", gap: compact ? 6 : 12, fontSize: compact ? 12 : 14 }}>
    {appliances.map((appliance) => {
      const type = CONTRACT_APPLIANCE_TYPES.find((entry) => entry.type === appliance.applianceType);
      return <div key={appliance.applianceType}>
        <strong><AdminText i18nKey={`contractDetailAdmin.${type?.labelKey}`} fallback={type?.label || appliance.applianceType} /></strong>
        {" · "}{getContractApplianceBrandLabel(appliance.brand) || <AdminText i18nKey="contractDetailAdmin.notSpecified" fallback="Not specified" />}
        {appliance.articleNumber ? <div>{appliance.articleNumber}</div> : null}
        {!compact ? <div style={{ color: "var(--app-text-muted)" }}><AdminText i18nKey={`contractDetailAdmin.applianceSource${appliance.source}`} fallback={appliance.source === "ORDER" ? "Confirmed order" : appliance.source === "MANUAL" ? "Manual configuration" : "Kitchen item"} /></div> : null}
      </div>;
    })}
  </div>;
}

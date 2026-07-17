function iconKind(option = {}, choiceGroup = null) {
  const partKey = String(option.claimPartKey || "").trim().toLowerCase();
  const componentId = String(option.componentId || "").trim().toLowerCase();
  const componentKey = String(option.componentKey || option.sourceComponentKey || "").trim().toLowerCase();
  const name = String(option.name || option.nameDe || "").trim().toLowerCase();
  const identity = `${componentId} ${componentKey} ${name}`;
  const groupComponentIds = new Set(
    (choiceGroup?.options || []).map((entry) => String(entry?.componentId || "").toLowerCase()),
  );
  const isHoodGroup = groupComponentIds.has("component-extractor-hood")
    && groupComponentIds.has("component-claim-filter");

  if (partKey === "furniture-front") return "front";
  if (partKey === "dishwasher" || identity.includes("dishwasher")) return "dishwasher";
  if (partKey === "sink-cabinet") return "sink-cabinet";
  if (partKey === "sink") return "sink";
  if (partKey === "faucet") return "faucet";
  if (partKey === "oven-drawer") return "drawer";
  if (partKey === "cooktop") return "cooktop";
  if (partKey === "oven") return "oven";
  if (partKey === "filter") return "filter";
  if (partKey === "worktop-end-panel") return "side-panel";
  if (
    partKey === "worktop-left"
    || partKey === "worktop-right"
    || identity.includes("worktop")
    || identity.includes("arbeitsplatte")
  ) return "worktop";
  if (componentId === "component-extractor-hood" || identity.includes("extractor hood")) return "hood";
  if (partKey === "blende" || identity.includes("filler panel") || identity.includes("passblende")) return "panel";
  if (isHoodGroup && identity.includes("cabinet")) return "hood-cabinet";
  if (
    componentKey.includes("wall-cabinet")
    || identity.includes("upper cabinet")
    || identity.includes("wall cabinet")
    || identity.includes("oberschrank")
  ) return "upper-cabinet";
  if (identity.includes("drawer") || identity.includes("schublade")) return "drawer-cabinet";
  if (identity.includes("cabinet")) return "cabinet";
  return "component";
}

function IconDrawing({ kind }) {
  switch (kind) {
    case "dishwasher":
      return <><rect x="5" y="2" width="18" height="23" rx="1.5" /><path d="M10 6h8M5 20h18M8 11h12l-1 6H9l-1-6ZM10 11v6M13 11v6M16 11v6M19 11v6" /><rect x="17" y="17" width="3" height="3" rx=".4" /></>;
    case "front":
      return <><rect x="6" y="4" width="16" height="20" rx="2" /><path d="M18 8v5M9 21h10" /></>;
    case "sink-cabinet":
      return <><path d="M3 3h22v3H3z" /><rect x="5" y="6" width="18" height="17" rx="1" /><path d="M20 10v5M5 19h18M5 23h18v3H5z" /></>;
    case "sink":
      return <><rect x="2" y="5" width="24" height="18" rx="2" /><rect x="4.5" y="7.5" width="10" height="13" rx="3" /><circle cx="9.5" cy="16.5" r="1.1" /><path d="M17 9h6M17 12h6M17 15h6M17 18h6" /></>;
    case "faucet":
      return <><path d="M9 23V12c0-5 3-7 7-7s7 2 7 6v3h-5v-2c0-2-1-3-3-3s-3 1-3 3v11M6 23h9" /><path d="M20 17h6" /></>;
    case "oven":
      return <><rect x="4" y="4" width="20" height="20" rx="2" /><path d="M4 9h20" /><circle cx="8" cy="6.5" r=".8" /><circle cx="11" cy="6.5" r=".8" /><rect x="8" y="12" width="12" height="8" rx="1" /></>;
    case "cooktop":
      return <><rect x="4" y="6" width="20" height="16" rx="2" /><circle cx="9" cy="11" r="2.5" /><circle cx="18.5" cy="11" r="2.5" /><circle cx="9" cy="18" r="2.5" /><circle cx="18.5" cy="18" r="2.5" /></>;
    case "drawer":
      return <><rect x="3" y="6" width="22" height="12" rx="1.5" /><path d="M10 10h8M3 18h22v6H3z" /></>;
    case "hood":
      return <><path d="M5 8h18v5H5zM3 13h22v4H3zM7 20l-1.5 3M14 20v4M21 20l1.5 3" /><path d="M9 11h10" /></>;
    case "filter":
      return <><rect x="3" y="5" width="22" height="18" rx="2" /><rect x="6" y="8" width="16" height="12" rx="1" /><path d="m6 12 4-4M6 17l9-9M9 20 21 8M14 20l8-8M19 20l3-3M6 8l12 12M11 8l11 11M17 8l5 5" /></>;
    case "worktop":
      return <><path d="m3 10 17-4 5 3-17 4-5-3Z" /><path d="m3 10v4l5 3 17-4V9M8 13v4" /></>;
    case "side-panel":
      return <><path d="M6 4 10 2h12v22l-4 2H6V4Z" /><path d="M6 4h12v22M18 4l4-2M18 26l4-2" /></>;
    case "hood-cabinet":
      return <><rect x="6" y="3" width="16" height="22" rx="1.5" /><path d="M18.5 11v5" /></>;
    case "upper-cabinet":
      return <><path d="M5 5 8 3h16v20l-3 2H5V5Z" /><path d="M5 5h16v20M21 5l3-2M21 25l3-2M17.5 11v6" /></>;
    case "panel":
      return <><path d="M10 3h7l2 3v19h-7l-2-3V3Z" /><path d="M17 3v19l2 3M10 3l2 3h7" /></>;
    case "drawer-cabinet":
      return <><rect x="7" y="3" width="14" height="21" rx="1.5" /><path d="M7 9h14M11 6h6M12 13h4M7 21h14" /></>;
    case "cabinet":
      return <><rect x="4" y="5" width="20" height="18" rx="2" /><path d="M14 5v18M10 14h1M17 14h1" /></>;
    default:
      return <><rect x="5" y="5" width="18" height="18" rx="4" /><path d="M10 14h8M14 10v8" /></>;
  }
}

export default function ServiceClaimPartIcon({ option, choiceGroup = null }) {
  const kind = iconKind(option, choiceGroup);

  return (
    <span className="service-field__problem-area-part-icon" aria-hidden="true">
      <svg viewBox="0 0 28 28" fill="none">
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <IconDrawing kind={kind} />
        </g>
      </svg>
    </span>
  );
}

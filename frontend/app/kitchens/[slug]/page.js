import { notFound } from "next/navigation";
import KitchenConfigurator from "../../../components/kitchen-configurator";
import { getKitchenBySlug, serializeKitchenForLegacy } from "../../../lib/catalog";
import { loadKitchenSvgMarkup } from "../../../lib/load-kitchen-svg";

export const dynamic = "force-dynamic";

export default async function KitchenPage({ params, searchParams }) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const kitchen = await getKitchenBySlug(slug);

  if (!kitchen || kitchen.status !== "ACTIVE") {
    notFound();
  }

  const kitchenConfig = serializeKitchenForLegacy(kitchen);
  const svgMarkup = await loadKitchenSvgMarkup(slug);
  const initialContractNumber = String(resolvedSearchParams?.contractNumber || "").trim();

  return (
    <KitchenConfigurator
      kitchenConfig={kitchenConfig}
      svgMarkup={svgMarkup}
      initialContractNumber={initialContractNumber}
    />
  );
}

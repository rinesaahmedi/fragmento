import { notFound } from "next/navigation";
import LegacyConfigurator from "../../../components/legacy-configurator";
import { getKitchenBySlug, serializeKitchenForLegacy } from "../../../lib/catalog";
import { loadLegacyDocument } from "../../../lib/load-legacy-document";

export const dynamic = "force-dynamic";

export default async function KitchenPage({ params }) {
  const { slug } = await params;
  const kitchen = await getKitchenBySlug(slug);

  if (!kitchen || kitchen.status !== "ACTIVE") {
    notFound();
  }

  const legacyDocument = await loadLegacyDocument({
    kitchenConfig: serializeKitchenForLegacy(kitchen),
  });

  return <LegacyConfigurator {...legacyDocument} />;
}

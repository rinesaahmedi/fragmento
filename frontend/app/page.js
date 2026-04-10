import FragmentoEntryFlow from "../components/fragmento-entry-flow";
import { getActiveKitchens } from "../lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const kitchens = await getActiveKitchens();

  return <FragmentoEntryFlow kitchens={kitchens} />;
}

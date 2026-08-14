import { cookies } from "next/headers";
import FragmentoEntryFlow from "../components/fragmento-entry-flow";
import { FRAGMENTO_LANGUAGE_COOKIE_NAME, normalizeFragmentoLanguage } from "../lib/fragmento-language";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const initialLanguage = normalizeFragmentoLanguage(cookieStore.get(FRAGMENTO_LANGUAGE_COOKIE_NAME)?.value);

  return <FragmentoEntryFlow initialLanguage={initialLanguage} />;
}

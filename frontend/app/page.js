import { cookies } from "next/headers";
import FragmentoEntryFlow from "../components/fragmento-entry-flow";
import { PUBLIC_LANGUAGE_COOKIE_NAME, normalizePublicLanguage } from "../lib/public-language";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const initialLanguage = normalizePublicLanguage(cookieStore.get(PUBLIC_LANGUAGE_COOKIE_NAME)?.value);

  return <FragmentoEntryFlow initialLanguage={initialLanguage} />;
}

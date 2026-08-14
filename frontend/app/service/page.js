import { cookies } from "next/headers";
import ServiceClaimFlow from "../../components/service-claim-flow";
import { SERVICE_LANGUAGE_COOKIE_NAME, normalizeServiceLanguage } from "../../lib/service-language";

export const metadata = {
  title: "Architecto",
  description: "Service page for additional purchases and complaint requests.",
};

export default async function ServicePage() {
  const cookieStore = await cookies();
  const initialLanguage = normalizeServiceLanguage(cookieStore.get(SERVICE_LANGUAGE_COOKIE_NAME)?.value);

  return <ServiceClaimFlow initialLanguage={initialLanguage} />;
}

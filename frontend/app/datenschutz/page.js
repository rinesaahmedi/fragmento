import PrivacyPolicyContent from "../../components/privacy-policy-content";

export const metadata = {
  title: "Datenschutzerkl\u00e4rung | Fragmento",
  description: "Informationen zur Verarbeitung personenbezogener Daten im Fragmento Kitchen Configurator.",
};

export default async function DatenschutzPage({ searchParams }) {
  const params = await searchParams;
  return <PrivacyPolicyContent initialLanguage={params?.lang} />;
}

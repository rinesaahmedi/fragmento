import OrderCancellationForm from "../../components/order-cancellation-form";

export const dynamic = "force-dynamic";

function normalizeParam(value) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export const metadata = {
  title: "Vertrag widerrufen | Fragmento",
};

export default async function WithdrawalPage({ searchParams = {} }) {
  const params = await searchParams;
  const language = normalizeParam(params.lang) === "en" ? "en" : "de";
  const contractNumber = normalizeParam(params.contract).trim().slice(0, 80);
  return <OrderCancellationForm initialLanguage={language} initialContractNumber={contractNumber} />;
}

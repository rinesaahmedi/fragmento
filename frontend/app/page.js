import Link from "next/link";
import { getActiveKitchens } from "../lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const kitchens = await getActiveKitchens();

  return (
    <main style={{ padding: "48px 24px", fontFamily: "Manrope, sans-serif", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "2.5rem", color: "#2f2a24" }}>Fragmento Kitchens</h1>
          <p style={{ color: "#5a5249", maxWidth: 680 }}>
            Choose a kitchen configurator. Each kitchen route is backed by the database and has its own catalog and pricing.
          </p>
        </div>
        <Link href="/admin" style={{ color: "#8a5522", fontWeight: 700 }}>
          Open admin
        </Link>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {kitchens.map((kitchen) => (
          <Link
            key={kitchen.id}
            href={`/kitchens/${kitchen.slug}`}
            style={{
              display: "block",
              padding: 20,
              border: "1px solid #e7d5c3",
              borderRadius: 16,
              background: "#fffaf4",
              color: "#2f2a24",
              textDecoration: "none",
            }}
          >
            <strong style={{ display: "block", fontSize: "1.2rem" }}>{kitchen.name}</strong>
            <span style={{ display: "block", marginTop: 6, color: "#6a6258" }}>{kitchen.description || kitchen.slug}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

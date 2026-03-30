import { getAdminSession } from "../../../lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getAdminSession();
  if (admin) {
    redirect("/admin");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(180deg, #f8f0e7 0%, #fffdf9 100%)",
        padding: 24,
        fontFamily: "Manrope, sans-serif",
      }}
    >
      <form
        action="/api/admin/login"
        method="post"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fffdf9",
          border: "1px solid #e5d5c5",
          borderRadius: 18,
          padding: 28,
          display: "grid",
          gap: 14,
        }}
      >
        <h1 style={{ margin: 0 }}>Admin login</h1>
        <p style={{ margin: 0, color: "#6d655c" }}>Use the seeded admin credentials from your environment.</p>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input name="email" type="email" required />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input name="password" type="password" required />
        </label>
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}

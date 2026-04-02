import { redirect } from "next/navigation";
import { getFormMessage } from "../../../lib/admin-forms";
import { getAdminSession } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }) {
  let admin = null;
  let configError = "";

  try {
    admin = await getAdminSession();
  } catch (error) {
    configError = error instanceof Error ? error.message : "Admin login is not available because the server is misconfigured.";
  }

  if (admin) {
    redirect("/admin");
  }

  const resolvedSearchParams = (await searchParams) || {};
  const errorMessage = configError || getFormMessage(resolvedSearchParams, "error");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px 20px",
        background:
          "radial-gradient(circle at top, rgba(226, 190, 151, 0.28), transparent 30%), linear-gradient(180deg, #f8f1e8 0%, #fdf9f4 42%, #fffdf9 100%)",
        fontFamily: "Manrope, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1180,
          display: "grid",
          gridTemplateColumns: "minmax(280px, 0.82fr) minmax(460px, 1.18fr)",
          gap: 22,
          alignItems: "stretch",
        }}
      >
        <section
          style={{
            borderRadius: 32,
            padding: "34px 30px",
            background:
              "linear-gradient(145deg, rgba(96, 57, 24, 0.96), rgba(53, 35, 19, 0.92)), linear-gradient(180deg, #76451d, #2b190e)",
            color: "#fff7ef",
            boxShadow: "0 28px 70px rgba(88, 54, 25, 0.22)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "grid",
            gap: 18,
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <span
              style={{
                display: "inline-flex",
                width: "fit-content",
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                color: "#f9dfc1",
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 800,
              }}
            >
              Fragmento Admin
            </span>
            <h1 style={{ margin: 0, fontSize: "clamp(1.9rem, 2.5vw, 3rem)", lineHeight: 1.03, maxWidth: 420 }}>
              Manage kitchens,
              <br />
              catalog, and orders.
            </h1>
            <p style={{ margin: 0, color: "rgba(255,247,239,0.78)", fontSize: "0.98rem", maxWidth: 420, lineHeight: 1.65 }}>
              This panel controls the live kitchen configurator. Keep catalog data, pricing, and order handling aligned from one place.
            </p>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {[
              "Update kitchen slugs, visibility, and descriptions.",
              "Maintain components, accessories, and service pricing.",
              "Review incoming orders and operational status quickly.",
            ].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  padding: "14px 16px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    marginTop: 7,
                    borderRadius: 999,
                    background: "#f4bc7d",
                    flexShrink: 0,
                  }}
                />
                <span style={{ lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <form
          action="/api/admin/login"
          method="post"
          style={{
            alignSelf: "stretch",
            justifySelf: "center",
            width: "100%",
            maxWidth: 620,
            borderRadius: 28,
            padding: "40px 42px",
            background: "rgba(255, 252, 247, 0.96)",
            border: "1px solid #eadac9",
            boxShadow: "0 24px 60px rgba(107, 77, 44, 0.12)",
            display: "grid",
            gap: 22,
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(2.4rem, 3vw, 3.5rem)", color: "#241913", lineHeight: 1 }}>
              Admin login
            </h2>
            <p style={{ margin: 0, color: "#6d655c", lineHeight: 1.6, fontSize: "1.05rem", maxWidth: 460 }}>
              Sign in with the admin credentials configured in your environment.
            </p>
          </div>

          {errorMessage ? (
            <p
              style={{
                margin: 0,
                color: "#9f2d2d",
                background: "#fff1f1",
                border: "1px solid #efcaca",
                padding: "13px 14px",
                borderRadius: 14,
                lineHeight: 1.5,
              }}
            >
              {errorMessage}
            </p>
          ) : null}

          <label style={{ display: "grid", gap: 8, color: "#362a22", fontWeight: 700 }}>
            <span>Email</span>
            <input
              name="email"
              type="email"
              required
              placeholder="admin@example.com"
              style={inputStyle}
            />
          </label>

          <label style={{ display: "grid", gap: 8, color: "#362a22", fontWeight: 700 }}>
            <span>Password</span>
            <input
              name="password"
              type="password"
              required
              placeholder="********"
              style={inputStyle}
            />
          </label>

          <button type="submit" style={buttonStyle}>Sign in</button>
        </form>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  minHeight: 56,
  borderRadius: 16,
  border: "1px solid #d9c7b4",
  background: "#fffdfb",
  padding: "16px 18px",
  fontSize: "1.05rem",
  color: "#231913",
  outline: "none",
};

const buttonStyle = {
  border: 0,
  minHeight: 58,
  borderRadius: 16,
  padding: "16px 20px",
  background: "linear-gradient(135deg, #9a5e24 0%, #74411a 100%)",
  color: "#fff",
  fontSize: "1.12rem",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 18px 35px rgba(140, 88, 34, 0.24)",
};

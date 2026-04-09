import {
  ActionLink,
  AdminSection,
  MetricCard,
  PageHero,
  StatusBadge,
  cardListStyle,
  itemCardStyle,
  itemHeaderStyle,
  pageGridStyle,
  subMetaStyle,
} from "../../components/admin-ui";
import { AdminShell } from "../../components/admin-shell";
import { listKitchensForAdmin } from "../../lib/catalog";
import { requireAdminPage } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminDashboardPage() {
  const admin = await requireAdminPage();
  const [kitchens, orderStats, recentOrders] = await Promise.all([
    listKitchensForAdmin(),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { totalPrice: true },
    }),
    prisma.order.findMany({
      include: { kitchen: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const totalOrders = orderStats.reduce((sum, row) => sum + row._count._all, 0);
  const totalRevenue = orderStats.reduce((sum, row) => sum + Number(row._sum.totalPrice || 0), 0);
  const activeKitchens = kitchens.filter((kitchen) => kitchen.status === "ACTIVE").length;
  const emailedOrders = orderStats.find((row) => row.status === "EMAILED")?._count._all || 0;

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <PageHero
          eyebrow="Overview"
          title="Admin dashboard"
          description="The missing admin landing route is now backed by a real page. Use it to verify kitchen availability, recent order intake, and notification status."
          actions={[
            <ActionLink key="orders" href="/admin/orders">
              View orders
            </ActionLink>,
            <ActionLink key="kitchens" href="/admin/kitchens" secondary>
              View kitchens
            </ActionLink>,
          ]}
          stats={[
            <MetricCard key="kitchens" label="Active kitchens" value={String(activeKitchens)} detail={`${kitchens.length} total configured`} />,
            <MetricCard key="orders" label="Orders" value={String(totalOrders)} detail={`${emailedOrders} emailed`} />,
            <MetricCard key="revenue" label="Order value" value={formatCurrency(totalRevenue)} detail="Sum of saved orders" />,
          ]}
        />

        <AdminSection
          title="Recent orders"
          description="Latest saved orders, including current status and customer destination email."
          actions={<ActionLink href="/admin/orders">Open orders list</ActionLink>}
        >
          <div style={cardListStyle}>
            {!recentOrders.length ? <p style={{ margin: 0, color: "var(--app-text-muted)" }}>No orders have been saved yet.</p> : null}
            {recentOrders.map((order) => (
              <article key={order.id} style={itemCardStyle}>
                <div style={itemHeaderStyle}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <strong style={{ fontSize: "1.1rem" }}>{order.orderNumber}</strong>
                    <div style={subMetaStyle}>
                      <span>{order.firstName} {order.lastName}</span>
                      <span>{order.email}</span>
                      <span>{order.kitchen.name}</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
                    <StatusBadge status={order.status} />
                    <strong>{formatCurrency(order.totalPrice)}</strong>
                  </div>
                </div>
                <div style={subMetaStyle}>
                  <span>{formatDate(order.createdAt)}</span>
                  <span>{order.items.length} item(s)</span>
                  <span>{order.city}</span>
                </div>
              </article>
            ))}
          </div>
        </AdminSection>

        <AdminSection
          title="Kitchen catalog"
          description="Configured kitchen definitions and how many catalog items and orders each one currently has."
          actions={<ActionLink href="/admin/kitchens">Open kitchens list</ActionLink>}
        >
          <div style={cardListStyle}>
            {kitchens.map((kitchen) => (
              <article key={kitchen.id} style={itemCardStyle}>
                <div style={itemHeaderStyle}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <strong style={{ fontSize: "1.1rem" }}>{kitchen.name}</strong>
                    <div style={subMetaStyle}>
                      <span>{kitchen.slug}</span>
                      <span>{kitchen.description || "No description"}</span>
                    </div>
                  </div>
                  <StatusBadge status={kitchen.status} />
                </div>
                <div style={subMetaStyle}>
                  <span>{kitchen._count.items} item(s)</span>
                  <span>{kitchen._count.orders} order(s)</span>
                </div>
              </article>
            ))}
          </div>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

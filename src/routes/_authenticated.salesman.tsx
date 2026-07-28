import { createFileRoute, redirect, Outlet, Link, useLocation } from "@tanstack/react-router";
// JWT auth check is done in beforeLoad via localStorage
import { getMyRoleInfo } from "@/lib/admin.salesmen.functions";
import { useI18n } from "@/lib/i18n";
import { LayoutDashboard, Users, FileText, ShoppingBag, Calendar, ShoppingCart, Bot, MessageCircle } from "lucide-react";
import { SalesmanNotificationBell } from "@/components/salesman/notification-bell";

export const Route = createFileRoute("/_authenticated/salesman")({
  beforeLoad: async ({ location }) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("jwt_token");
      if (!token) throw redirect({ to: "/auth/login", search: { redirect: location.href } });
    }
    try {
      const r = await getMyRoleInfo();
      if (!r.isSalesman && !r.isAdmin) throw redirect({ to: "/account" });
    } catch (e: any) {
      if (e?.statusCode) throw e; // re-throw redirect
      throw redirect({ to: "/account" });
    }
  },
  component: SalesmanLayout,
});

const nav = [
  { to: "/salesman", labelKey: "salesman.dashboard", icon: LayoutDashboard, exact: true },
  { to: "/salesman/customers", labelKey: "salesman.myCustomers", icon: Users },
  { to: "/salesman/carts", labelKey: "salesman.activeCarts", icon: ShoppingCart },
  { to: "/salesman/followups", labelKey: "salesman.followups", icon: Calendar },
  { to: "/salesman/quotations", labelKey: "salesman.quotations", icon: FileText },
  { to: "/salesman/orders", labelKey: "salesman.orders", icon: ShoppingBag },
  { to: "/salesman/ai-leads", labelKey: "salesman.aiLeads", icon: Bot },
  { to: "/salesman/conversations", labelKey: "salesman.aiConversations", icon: MessageCircle },
];

function SalesmanLayout() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] w-full overflow-hidden flex flex-col md:flex-row lg:gap-6 lg:px-4 lg:py-6">
      <aside className="hidden lg:block w-[220px] shrink-0 h-full overflow-y-auto rounded-lg border bg-surface p-3">
        <div className="px-2 pb-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("salesman.portal")}</div>
        </div>
        <nav className="space-y-0.5 text-sm">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to as any} className={`flex items-center gap-2 rounded px-3 py-1.5 ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                <n.icon className="h-4 w-4" /> {t(n.labelKey)}
              </Link>
            );
          })}
        </nav>
      </aside>
      <section className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <div className="flex items-center justify-end gap-2 border-b bg-background/60 px-4 py-2 lg:px-4">
          <SalesmanNotificationBell />
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-4 lg:py-4"><Outlet /></div>
      </section>
    </div>
  );
}

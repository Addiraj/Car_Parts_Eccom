import { createFileRoute, redirect, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
// JWT auth check is done in beforeLoad via localStorage
import { checkIsAdmin } from "@/lib/admin.functions";
import { useI18n } from "@/lib/i18n";
import { LayoutDashboard, Package, ShoppingBag, Image as ImageIcon, Users, Users2, BarChart3, Mail, Tag, Crown, Boxes, Warehouse, ArrowUpDown, FileBarChart, MessageSquareQuote, PanelBottom, FileText, UserCog, UserPlus, Trophy, Calendar, ScrollText, Bot, MessagesSquare, UserSearch, Sparkles, PanelLeftClose, PanelLeftOpen, Bell, Wallet, Settings } from "lucide-react";
import { NotificationBell } from "@/components/admin/notification-bell";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ location }) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("jwt_token");
      if (!token) throw redirect({ to: "/auth/login", search: { redirect: location.href } });
    }
    try {
      const r = await checkIsAdmin();
      if (!r.isAdmin) throw redirect({ to: "/account" });
    } catch (e: any) {
      if (e?.statusCode) throw e; // re-throw redirect
      throw redirect({ to: "/account" });
    }
  },
  component: AdminLayout,
});

type NavItem = { to: string; labelKey: string; icon: typeof LayoutDashboard; exact?: boolean; superOnly?: boolean };
const navGroups: Array<{ labelKey: string; items: NavItem[]; superOnly?: boolean }> = [
  { labelKey: "adminGroup.overview", items: [
    { to: "/admin", labelKey: "admin.dashboard", icon: LayoutDashboard, exact: true },
  ]},
  { labelKey: "adminGroup.sales", items: [
    { to: "/admin/orders", labelKey: "admin.orders", icon: ShoppingBag },
    { to: "/admin/quotations", labelKey: "admin.quotations", icon: FileText },
    { to: "/admin/special-offers", labelKey: "admin.specialOffers", icon: Tag },
  ]},
  { labelKey: "adminGroup.catalog", items: [
    { to: "/admin/parts", labelKey: "admin.parts", icon: Package },
  ]},
  { labelKey: "adminGroup.inventory", items: [
    { to: "/admin/inventory", labelKey: "admin.stockLevels", icon: Boxes },
    { to: "/admin/warehouses", labelKey: "admin.warehouses", icon: Warehouse },
    { to: "/admin/stock-movements", labelKey: "admin.movements", icon: ArrowUpDown },
  ]},
  { labelKey: "adminGroup.customers", items: [
    { to: "/admin/users", labelKey: "admin.customers", icon: Users },
    { to: "/admin/contacts", labelKey: "admin.contacts", icon: Mail },
    { to: "/admin/followups", labelKey: "admin.followups", icon: Calendar },
  ]},
  { labelKey: "adminGroup.salesTeam", items: [
    { to: "/admin/team", labelKey: "admin.team", icon: Users2 },
    { to: "/admin/salesmen", labelKey: "admin.salesmen", icon: UserCog },
    { to: "/admin/assignments", labelKey: "admin.assignments", icon: UserPlus },
    { to: "/admin/performance", labelKey: "admin.performance", icon: Trophy },
  ]},

  { labelKey: "adminGroup.cms", superOnly: true, items: [
    { to: "/admin/cms/testimonials", labelKey: "admin.cmsTestimonials", icon: MessageSquareQuote },
    { to: "/admin/cms/footer", labelKey: "admin.cmsFooter", icon: PanelBottom },
  ]},
  { labelKey: "adminGroup.ai", items: [
    { to: "/admin/ai-assistant/conversations", labelKey: "admin.aiConversations", icon: MessagesSquare },
    { to: "/admin/ai-assistant/leads", labelKey: "admin.aiLeads", icon: UserSearch },
    { to: "/admin/ai-assistant/analytics", labelKey: "admin.aiAnalytics", icon: Bot },
    { to: "/admin/ai-assistant/prompts", labelKey: "admin.aiPrompts", icon: Sparkles },
    { to: "/admin/ai-assistant/avatar", labelKey: "admin.aiAvatar", icon: ImageIcon },
  ]},
  { labelKey: "adminGroup.finance", items: [
    { to: "/admin/credit-management", labelKey: "admin.creditManagement", icon: Wallet },
    { to: "/admin/payment-settings", labelKey: "admin.paymentSettings", icon: Settings },
  ]},
  { labelKey: "adminGroup.reports", items: [
    { to: "/admin/reports", labelKey: "admin.reports", icon: FileBarChart },
    { to: "/admin/analytics", labelKey: "admin.analytics", icon: BarChart3 },
    { to: "/admin/audit-logs", labelKey: "admin.auditLogs", icon: ScrollText },
  ]},
];

function AdminLayout() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const { data: who } = useQuery({ queryKey: ["check-is-admin"], queryFn: () => checkIsAdmin() });
  const [collapsed, setCollapsed] = useState<boolean>(false);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("admin-sidebar-collapsed");
      if (stored === "1") setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("admin-sidebar-collapsed", collapsed ? "1" : "0");
    }
  }, [collapsed]);
  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] w-full overflow-hidden flex flex-col md:flex-row lg:gap-6 lg:px-4 lg:py-6">
      <aside className={`hidden lg:block ${collapsed ? "w-14" : "w-[220px]"} shrink-0 h-full overflow-y-auto rounded-lg border bg-surface p-2 transition-[width] duration-200`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-1 px-1 pb-3`}>
          {!collapsed && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
              {who?.isSuperAdmin ? t("admin.superAdmin") : t("admin.title")}
            </span>
          )}
          <div className="flex items-center gap-1">
            {!collapsed && who?.isSuperAdmin && (
              <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-secondary-foreground">
                <Crown size={10} /> {t("admin.super")}
              </span>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="grid h-7 w-7 place-items-center rounded hover:bg-muted text-muted-foreground"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <nav className="space-y-4 text-sm">
          {navGroups.filter((g) => !g.superOnly || who?.isSuperAdmin).map((g) => (
            <div key={g.labelKey}>
              {!collapsed && (
                <div className="flex items-center gap-1.5 px-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  {t(g.labelKey)}
                  {g.superOnly && <Crown className="h-2.5 w-2.5" />}
                </div>
              )}
              <div className="space-y-0.5">
                {g.items.map((n) => {
                  const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
                  return (
                    <Link key={n.to} to={n.to as any}
                      title={collapsed ? t(n.labelKey) : undefined}
                      className={`flex items-center ${collapsed ? "justify-center px-0" : "gap-2 px-3"} rounded py-1.5 ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                      <n.icon className="h-4 w-4 shrink-0" /> {!collapsed && t(n.labelKey)}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <section className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <div className="flex items-center justify-end gap-2 px-4 pt-4 lg:px-0 lg:pt-0 lg:pb-3">
          <NotificationBell />
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-0 lg:py-0"><Outlet /></div>
      </section>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, ShoppingCart, Heart, Wrench, LogOut, Package, MapPin, Wallet, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getMyProfile } from "@/lib/account.functions";
import { CustomerTypeBadge } from "@/components/customer-type-badge";
import type { CustomerType } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/account/")({
  head: () => ({ meta: [{ title: "My Account — Car Parts Dubai" }] }),
  component: Account,
});

function Account() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const signOut = () => {
    logout();
    toast.success(t("signOut"));
    navigate({ to: "/" });
  };
  const cards = [
    { to: "/garage", icon: Wrench, label: t("myGarage"), desc: t("savedVehicles") },
    { to: "/orders", icon: Package, label: t("orders"), desc: t("trackHistory") },
    { to: "/account/credits", icon: Wallet, label: "My Credits", desc: "Wallet balance & statements" },
    { to: "/addresses", icon: MapPin, label: t("addresses"), desc: t("shippingAddrs") },
    { to: "/cart", icon: ShoppingCart, label: t("cart"), desc: t("itemsReady") },
    { to: "/wishlist", icon: Heart, label: t("wishlist"), desc: t("savedForLater") },
    { to: "/account/security", icon: ShieldCheck, label: "Security", desc: "Sessions & sign-in activity" },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("myAccount")}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          {profile?.customer_type && (
            <div className="mt-2">
              <CustomerTypeBadge type={profile.customer_type as CustomerType} />
            </div>
          )}
        </div>
        <button onClick={signOut} className="ms-auto flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:border-destructive hover:text-destructive">
          <LogOut className="h-4 w-4" /> {t("signOut")}
        </button>
      </div>

      {profile?.customer_type && (
        <p className="mt-4 rounded-md border bg-surface px-4 py-3 text-xs text-muted-foreground">
          Your pricing tier is <span className="font-semibold text-foreground">{profile.customer_type}</span>. Contact support to change your account type.
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.to} to={c.to as any} className="rounded-lg border bg-surface p-5 hover:border-primary hover:shadow-md">
            <c.icon className="h-5 w-5 text-primary" />
            <div className="mt-3 font-semibold">{c.label}</div>
            <div className="text-xs text-muted-foreground">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

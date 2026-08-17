import { createFileRoute } from "@tanstack/react-router";
import { salesmanAllCustomerActivities } from "@/lib/admin.salesmen.functions";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Eye, Search, ShoppingCart, Bot, FileText, Calendar, RefreshCcw, Activity, ShoppingBag, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/salesman/customer-activity")({
  component: CustomerActivityPage,
});

function StatCard({ title, value, icon: Icon }: { title: string; value: number; icon: any }) {
  return (
    <Card className="shadow-none border bg-card/50">
      <CardContent className="p-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            <Icon className="h-4 w-4" /> {title}
          </div>
          <div className="text-3xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function getActivityIcon(type: string) {
  switch (type) {
    case "part_viewed": return Eye;
    case "catalog_viewed": return Search;
    case "cart_item_added": return Plus;
    case "cart_item_removed": return ShoppingCart;
    case "ai_prompt":
    case "ai_vin_asked":
    case "ai_part_asked": return Bot;
    case "quotation_created": return FileText;
    case "order_placed": return ShoppingBag;
    case "note_added":
    case "followup_created":
    case "followup_completed":
    case "followup_cancelled": return Calendar;
    default: return Activity;
  }
}

function getActivityDescription(act: any) {
  const meta = act.metadata || {};
  switch (act.activity_type) {
    case "part_viewed":
      return `Viewed part ${meta.part_number || meta.part_id || ""}`;
    case "catalog_viewed":
      return `Searched catalog for ${meta.query || meta.brand || "parts"}`;
    case "cart_item_added":
      return `Added item to cart (qty: ${meta.quantity || 1})`;
    case "ai_prompt":
      return `Sent a message to the AI assistant`;
    case "ai_vin_asked":
      return `Asked AI about VIN ${meta.vin || ""}`;
    case "ai_part_asked":
      return `Asked AI about part ${meta.part_number || ""}`;
    case "quotation_created":
      return `Created a quotation request`;
    case "order_placed":
      return `Placed an order`;
    case "note_added":
      return `A note was added`;
    default:
      return act.activity_type.replace(/_/g, " ");
  }
}

function getActivityDetails(act: any) {
  const meta = act.metadata || {};
  if (act.activity_type.startsWith("ai_")) {
    return meta.prompt || meta.query || meta.message || null;
  }
  if (act.activity_type === "part_viewed") {
    return meta.part_name ? `Part Name: ${meta.part_name}` : null;
  }
  if (act.activity_type === "cart_item_added") {
    return meta.part_number ? `Part No: ${meta.part_number}` : null;
  }
  return null;
}

function CustomerActivityPage() {
  const [filter, setFilter] = useState("all");

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["salesman", "customerActivity", filter],
    queryFn: () => salesmanAllCustomerActivities({ data: { filter } }),
    refetchInterval: 30000, // Refresh every 30s
  });

  const stats = data?.stats || { activeToday: 0, partViewsToday: 0, searchesToday: 0, cartAddsToday: 0 };
  const activities = data?.activities || [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Activity</h1>
          <p className="text-sm text-muted-foreground mt-1">Live buying signals from your assigned customers.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="ACTIVE TODAY" value={stats.activeToday} icon={Users} />
        <StatCard title="PART VIEWS TODAY" value={stats.partViewsToday} icon={Eye} />
        <StatCard title="SEARCHES TODAY" value={stats.searchesToday} icon={Search} />
        <StatCard title="CART ADDS TODAY" value={stats.cartAddsToday} icon={ShoppingCart} />
      </div>

      <div className="flex items-center justify-between pt-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Filter activity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All activity</SelectItem>
            <SelectItem value="parts-searches">Parts & searches</SelectItem>
            <SelectItem value="cart">Cart & wishlist</SelectItem>
            <SelectItem value="ai">AI assistant</SelectItem>
            <SelectItem value="orders">Orders & quotations</SelectItem>
            <SelectItem value="notes-followups">Notes & follow-ups</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card shadow-sm">
        <div className="p-4 border-b flex justify-between items-center text-sm font-semibold text-muted-foreground bg-muted/20">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4" /> LIVE FEED
          </span>
          <span className="uppercase text-[10px] tracking-wider font-bold">Real-Time</span>
        </div>
        <div className="divide-y max-h-[600px] overflow-y-auto">
          {activities.map((act: any) => {
            const Icon = getActivityIcon(act.activity_type);
            const initials = act.customer_name?.substring(0, 2).toUpperCase() || "CU";
            const details = getActivityDetails(act);
            let timeAgo = "";
            try {
              timeAgo = formatDistanceToNow(new Date(act.created_at), { addSuffix: true });
            } catch (e) { }

            return (
              <div key={act.id} className="p-4 hover:bg-muted/30 transition-colors flex gap-4">
                <Avatar className="h-10 w-10 border bg-background text-primary">
                  <AvatarFallback className="bg-transparent"><Icon className="h-5 w-5 text-primary" /></AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm">
                      <span className="font-semibold text-foreground">{act.customer_name}</span>{" "}
                      <span className="text-muted-foreground">{getActivityDescription(act)}</span>
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {timeAgo}
                    </span>
                  </div>

                  {details && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {details}
                    </p>
                  )}

                  <div className="text-xs text-muted-foreground mt-2">
                    {new Date(act.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
          {activities.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground">
              <Activity className="h-12 w-12 mb-4 opacity-20" />
              <p>No recent activity found.</p>
              {filter !== "all" && <p className="text-sm mt-1">Try changing your filter.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

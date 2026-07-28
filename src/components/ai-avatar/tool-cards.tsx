import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Package, Car, BadgePercent, AlertTriangle, CheckCircle2, Truck, UserCheck, Sparkles, ShoppingCart, Heart, FileText, LogIn } from "lucide-react";
import {
  Tool, ToolHeader, ToolContent, ToolInput, ToolOutput,
} from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

type Part = {
  id: string;
  part_number?: string | null;
  name?: string | null;
  manufacturer?: string | null;
  price?: number | string | null;
  stock?: number | null;
};

const STREAM_LABELS: Record<string, string> = {
  "tool-searchPartsByNumber": "Searching parts catalog…",
  "tool-getRecommendations": "Finding alternatives…",
  "tool-findCompatibleParts": "Matching to your vehicle…",
  "tool-decodeVin": "Decoding VIN…",
  "tool-ocrVin": "Reading VIN from image…",
  "tool-checkStock": "Checking live stock…",
  "tool-getActiveOffers": "Loading current offers…",
  "tool-identifyPartFromImage": "Analyzing part photo…",
  "tool-identifyWarningLight": "Identifying warning light…",
  "tool-createLead": "Notifying our sales team…",
  "tool-trackOrder": "Looking up your order…",
  "tool-addToCart": "Adding to cart…",
  "tool-removeFromCart": "Removing from cart…",
  "tool-viewCart": "Loading your cart…",
  "tool-addToWishlist": "Saving to wishlist…",
  "tool-removeFromWishlist": "Removing from wishlist…",
  "tool-createQuotation": "Preparing your quotation…",
  "tool-quoteFromCart": "Building quotation from your cart…",
};

export const AvatarActionContext = React.createContext<((text: string) => void) | null>(null);
function useAvatarAction() { return React.useContext(AvatarActionContext); }

function aed(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "—";
  return `AED ${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function PartCard({ p }: { p: Part }) {
  const stock = Number(p.stock ?? 0);
  const badge = stock <= 0 ? "Out" : stock <= 5 ? "Low" : "In stock";
  const badgeCls = stock <= 0
    ? "bg-red-500/15 text-red-300"
    : stock <= 5 ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300";
  const action = useAvatarAction();
  const ref = p.part_number ?? p.id;
  return (
    <div className="group rounded-lg border border-white/10 bg-white/[0.03] p-2 hover:border-blue-400/40 hover:bg-white/[0.06] transition">
      <Link to="/parts/$id" params={{ id: p.id }} className="flex gap-2">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-300">
          <Package className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-medium text-white">{p.name ?? p.part_number}</div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/60">
            {p.part_number ? <span className="font-mono">{p.part_number}</span> : null}
            {p.manufacturer ? <span>· {p.manufacturer}</span> : null}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-blue-300">{aed(p.price)}</span>
            <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", badgeCls)}>{badge}</span>
          </div>
        </div>
      </Link>
      {action ? (
        <div className="mt-1.5 flex gap-1">
          <button
            onClick={() => action(`Add part ${ref} to my cart`)}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-blue-400/30 bg-blue-500/10 px-2 py-1 text-[10px] font-medium text-blue-200 hover:bg-blue-500/20 transition"
          >
            <ShoppingCart className="h-3 w-3" /> Cart
          </button>
          <button
            onClick={() => action(`Add part ${ref} to my wishlist`)}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-pink-400/30 bg-pink-500/10 px-2 py-1 text-[10px] font-medium text-pink-200 hover:bg-pink-500/20 transition"
          >
            <Heart className="h-3 w-3" /> Save
          </button>
          <button
            onClick={() => action(`Make a quotation for part ${ref} quantity 1`)}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-200 hover:bg-amber-500/20 transition"
          >
            <FileText className="h-3 w-3" /> Quote
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PartGrid({ parts, empty }: { parts: Part[]; empty: string }) {
  if (!parts.length) return <p className="text-[11px] text-white/50">{empty}</p>;
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {parts.slice(0, 8).map((p) => <PartCard key={p.id} p={p} />)}
    </div>
  );
}

function VehicleCard({ v }: { v: Record<string, any> }) {
  const make = v.make ?? v.Make ?? null;
  const model = v.model ?? v.Model ?? null;
  const fields = [v.year, make, model, v.engine ?? v.Engine].filter(Boolean);
  const action = useAvatarAction();
  const canBrowse = Boolean(make && model);
  return (
    <div className="rounded-lg border border-blue-400/20 bg-blue-500/5 p-3">
      <div className="flex items-center gap-2 text-[12px] font-medium text-blue-200">
        <Car className="h-4 w-4" /> Vehicle identified
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{fields.join(" · ") || "Vehicle"}</div>
      {v.vin ? <div className="mt-0.5 font-mono text-[10px] text-white/50">VIN {v.vin}</div> : null}
      {canBrowse ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Link
            to="/vin/$brand/$modelNumber"
            params={{ brand: String(make), modelNumber: String(model) }}
            search={{ modelName: String(model) }}
            className="inline-flex items-center gap-1 rounded-md bg-blue-500 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-400"
          >
            <Package className="h-3 w-3" /> Browse Catalog
          </Link>
          {action ? (
            <button
              type="button"
              onClick={() => action("Show me parts compatible with my vehicle")}
              className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10"
            >
              <Sparkles className="h-3 w-3" /> Find compatible parts
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}


function StockCard({ d }: { d: any }) {
  const stock = Number(d.stock ?? 0);
  const status = d.status as string | undefined;
  const tone = status === "in_stock" ? "text-emerald-300" : status === "low" ? "text-amber-300" : "text-red-300";
  return (
    <Link
      to="/parts/$id"
      params={{ id: d.id }}
      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-2.5 hover:border-blue-400/40 transition"
    >
      <div className="min-w-0">
        <div className="truncate text-[12px] font-medium text-white">{d.name}</div>
        <div className="font-mono text-[10px] text-white/50">{d.part_number}</div>
      </div>
      <div className="text-right">
        <div className={cn("text-sm font-semibold", tone)}>{stock} in stock</div>
        <div className="text-[10px] text-blue-300">{aed(d.price)}</div>
      </div>
    </Link>
  );
}

function OfferList({ offers }: { offers: any[] }) {
  if (!offers?.length) return <p className="text-[11px] text-white/50">No active offers right now.</p>;
  return (
    <div className="space-y-1.5">
      {offers.slice(0, 6).map((o) => (
        <div key={o.id} className="flex items-center gap-2 rounded-md border border-amber-400/20 bg-amber-500/5 p-2">
          <BadgePercent className="h-4 w-4 text-amber-300" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium text-white">{o.offer_name}</div>
            <div className="text-[10px] text-white/50">Ends {new Date(o.end_date).toLocaleDateString()}</div>
          </div>
          <div className="text-sm font-bold text-amber-300">
            {o.discount_type === "percentage" ? `${o.discount_value}%` : aed(o.discount_value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function WarningLightCard({ d }: { d: any }) {
  const tone =
    d.severity === "critical" ? "border-red-400/40 bg-red-500/10 text-red-200" :
    d.severity === "caution" ? "border-amber-400/40 bg-amber-500/10 text-amber-200" :
    "border-blue-400/30 bg-blue-500/10 text-blue-200";
  return (
    <div className={cn("rounded-lg border p-3", tone)}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4" /> {d.name ?? "Warning light"}
        {d.severity ? <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">{d.severity}</span> : null}
      </div>
      {d.description ? <p className="mt-1 text-[12px] text-white/80">{d.description}</p> : null}
      {d.action ? <p className="mt-1 text-[11px] text-white/60"><strong>Action:</strong> {d.action}</p> : null}
    </div>
  );
}

function IdentifiedPartCard({ d }: { d: any }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Sparkles className="h-4 w-4 text-blue-300" /> {d.partName ?? "Part identified"}
        {typeof d.confidence === "number" ? (
          <span className="ml-auto text-[10px] text-white/50">{Math.round(d.confidence * 100)}% conf</span>
        ) : null}
      </div>
      {d.category ? <div className="mt-0.5 text-[11px] text-white/60">{d.category}</div> : null}
      {Array.isArray(d.catalogMatches) && d.catalogMatches.length > 0 ? (
        <div className="mt-2"><PartGrid parts={d.catalogMatches} empty="" /></div>
      ) : null}
    </div>
  );
}

function LeadCard({ d }: { d: any }) {
  if (d.error) return <p className="text-[12px] text-red-300">{d.error}</p>;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3">
      <UserCheck className="h-5 w-5 text-emerald-300" />
      <div className="text-[12px] text-emerald-100">{d.message ?? "Our sales team will reach out shortly."}</div>
    </div>
  );
}

function OrderCard({ o }: { o: any }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-blue-300" />
        <div className="text-sm font-semibold text-white">Order {o.order_number}</div>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase">{o.status}</span>
      </div>
      <div className="mt-1 text-[11px] text-white/60">Total {aed(o.total)}</div>
      {o.tracking_number ? (
        <div className="mt-0.5 text-[11px] text-white/60">
          {o.courier ?? "Courier"} · <span className="font-mono">{o.tracking_number}</span>
        </div>
      ) : null}
    </div>
  );
}

function LoginRequiredCard({ message }: { message?: string }) {
  return (
    <Link to="/auth" className="my-2 flex items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-[12px] text-blue-100 hover:bg-blue-500/20 transition">
      <LogIn className="h-4 w-4" />
      <span>{message ?? "Please sign in to continue."}</span>
      <span className="ml-auto text-[11px] underline">Sign in</span>
    </Link>
  );
}

function CartActionCard({ d, kind }: { d: any; kind: "added" | "wishlist" }) {
  const Icon = kind === "added" ? ShoppingCart : Heart;
  const tone = kind === "added" ? "border-blue-400/30 bg-blue-500/10 text-blue-100" : "border-pink-400/30 bg-pink-500/10 text-pink-100";
  const label = kind === "added"
    ? (d.alreadySaved ? "Already in cart" : `Added to cart${typeof d.cartCount === "number" ? ` (${d.cartCount})` : ""}`)
    : (d.alreadySaved ? "Already in wishlist" : "Saved to wishlist");
  const href = kind === "added" ? "/cart" : "/wishlist";
  return (
    <div className={cn("my-2 flex items-center gap-2 rounded-lg border p-2.5", tone)}>
      <Icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium">{label}</div>
        {d.part?.name ? <div className="truncate text-[10px] opacity-80">{d.part.name}{d.quantity ? ` × ${d.quantity}` : ""}</div> : null}
      </div>
      <Link to={href} className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">View</Link>
    </div>
  );
}

function CartViewCard({ d }: { d: any }) {
  const items: any[] = d?.items ?? [];
  if (!items.length) return <p className="my-2 text-[11px] text-white/50">Your cart is empty.</p>;
  return (
    <div className="my-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
      <div className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-white">
        <ShoppingCart className="h-4 w-4 text-blue-300" /> Your cart
        <span className="ml-auto text-[11px] text-white/60">{items.length} item{items.length === 1 ? "" : "s"}</span>
      </div>
      <div className="space-y-1">
        {items.slice(0, 8).map((it) => (
          <div key={it.id} className="flex items-center gap-2 text-[11px]">
            <span className="truncate flex-1 text-white/85">{it.name}</span>
            <span className="text-white/50">× {it.quantity}</span>
            <span className="w-16 text-right font-semibold text-blue-300">{aed(it.line_total)}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between border-t border-white/10 pt-1.5 text-[12px]">
        <span className="text-white/70">Total</span>
        <span className="font-bold text-white">{aed(d.total)}</span>
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <Link to="/cart" className="flex-1 rounded-md bg-blue-500 px-2 py-1 text-center text-[11px] font-medium text-white hover:bg-blue-600">Checkout</Link>
      </div>
    </div>
  );
}

function QuotationCard({ d }: { d: any }) {
  const q = d?.quotation ?? {};
  const items: any[] = d?.items ?? [];
  return (
    <div className="my-2 rounded-lg border border-amber-400/30 bg-amber-500/5 p-3">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-amber-100">
        <FileText className="h-4 w-4 text-amber-300" /> Quotation {q.quotation_number ?? ""}
        {q.status ? <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[9px] uppercase">{q.status}</span> : null}
      </div>
      <div className="mt-2 space-y-0.5">
        {items.slice(0, 8).map((it, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="truncate flex-1 text-white/85">{it.name ?? it.part_number}</span>
            <span className="text-white/50">× {it.quantity}</span>
            <span className="w-16 text-right font-semibold text-amber-200">{aed(it.line_total)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-0.5 border-t border-white/10 pt-1.5 text-[11px]">
        <div className="flex justify-between text-white/60"><span>Subtotal</span><span>{aed(d.subtotal)}</span></div>
        <div className="flex justify-between text-white/60"><span>VAT</span><span>{aed(d.tax_amount)}</span></div>
        <div className="flex justify-between text-[13px] font-bold text-white"><span>Total</span><span>{aed(d.grand_total ?? q.grand_total)}</span></div>
      </div>
    </div>
  );
}


function FallbackTool({ part }: { part: any }) {
  return (
    <Tool className="my-2" defaultOpen={false}>
      <ToolHeader type={part.type} state={part.state} />
      <ToolContent>
        {part.input ? <ToolInput input={part.input} /> : null}
        <ToolOutput
          output={part.output ? <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(part.output, null, 2)}</pre> : null}
          errorText={part.errorText}
        />
      </ToolContent>
    </Tool>
  );
}

export function ToolPartView({ part }: { part: any }) {
  const type: string = part?.type ?? "";
  const state: string = part?.state ?? "";
  const out = part?.output;

  // Streaming / pending
  if (state !== "output-available" && state !== "output-error") {
    const label = STREAM_LABELS[type] ?? "Working…";
    return (
      <div className="my-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
        <Shimmer>{label}</Shimmer>
      </div>
    );
  }

  if (state === "output-error" || out?.error) {
    return (
      <div className="my-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
        {out?.error ?? part.errorText ?? "Tool failed."}
      </div>
    );
  }

  if (out?.requireLogin) {
    return <LoginRequiredCard message={out.message} />;
  }

  switch (type) {
    case "tool-searchPartsByNumber":
    case "tool-findCompatibleParts":
      return <div className="my-2"><PartGrid parts={out?.results ?? []} empty="No matching parts found." /></div>;
    case "tool-getRecommendations":
      return <div className="my-2"><PartGrid parts={out?.alternatives ?? []} empty="No alternatives found." /></div>;
    case "tool-addToCart":
    case "tool-removeFromCart":
      return <CartActionCard d={out ?? {}} kind="added" />;
    case "tool-addToWishlist":
    case "tool-removeFromWishlist":
      return <CartActionCard d={out ?? {}} kind="wishlist" />;
    case "tool-viewCart":
      return <CartViewCard d={out ?? {}} />;
    case "tool-createQuotation":
    case "tool-quoteFromCart":
      return <QuotationCard d={out ?? {}} />;
    case "tool-decodeVin":
      return <div className="my-2"><VehicleCard v={out ?? {}} /></div>;
    case "tool-ocrVin":
      return (
        <div className="my-2">
          <VehicleCard v={{ ...(out?.decoded ?? {}), vin: out?.vin }} />
        </div>
      );
    case "tool-checkStock":
      return <div className="my-2"><StockCard d={out} /></div>;
    case "tool-getActiveOffers":
      return <div className="my-2"><OfferList offers={out?.offers ?? []} /></div>;
    case "tool-identifyPartFromImage":
      return <div className="my-2"><IdentifiedPartCard d={out} /></div>;
    case "tool-identifyWarningLight":
      return <div className="my-2"><WarningLightCard d={out} /></div>;
    case "tool-createLead":
      return <div className="my-2"><LeadCard d={out} /></div>;
    case "tool-trackOrder":
      return out?.order ? <div className="my-2"><OrderCard o={out.order} /></div> : <FallbackTool part={part} />;
    default:
      return <FallbackTool part={part} />;
  }
}

// Tiny status icon for empty completed state if needed
export const _ok = CheckCircle2;

import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Package, Car, BadgePercent, AlertTriangle, CheckCircle2, Truck, UserCheck, Sparkles, ShoppingCart, Heart, FileText, LogIn, MessageCircle } from "lucide-react";
import {
  Tool, ToolHeader, ToolContent, ToolInput, ToolOutput,
} from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";
import { useIsStaff } from "@/hooks/use-is-staff";

type Part = {
  id: string;
  part_number?: string | null;
  name?: string | null;
  manufacturer?: string | null;
  price?: number | string | null;
  stock?: number | null;
  ind_price?: number | string | null;
  gar_price?: number | string | null;
  export_price?: number | string | null;
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
    ? "bg-red-100 text-red-700 border border-red-200"
    : stock <= 5 ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200";
  const action = useAvatarAction();
  const ref = p.part_number ?? p.id;
  return (
    <div className="group rounded-lg border border-slate-200 bg-white p-2 hover:border-blue-400 hover:shadow-sm transition">
      <Link to="/parts/$id" params={{ id: p.id }} className="flex gap-2">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
          <Package className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-medium text-slate-900">{p.name ?? p.part_number}</div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            {p.part_number ? <span className="font-mono">{p.part_number}</span> : null}
            {p.manufacturer ? <span>· {p.manufacturer}</span> : null}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-blue-600">{aed(p.price)}</span>
            <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", badgeCls)}>{badge}</span>
          </div>
        </div>
      </Link>
      {action ? (
        <div className="mt-1.5 flex gap-1">
          <button
            onClick={() => action(`Add part ${ref} to my cart`)}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 transition shadow-xs"
          >
            <ShoppingCart className="h-3 w-3" /> Cart
          </button>
          <button
            onClick={() => action(`Add part ${ref} to my wishlist`)}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-pink-300 bg-pink-50 px-2 py-1 text-[10px] font-semibold text-pink-700 hover:bg-pink-100 transition shadow-xs"
          >
            <Heart className="h-3 w-3" /> Save
          </button>
          <button
            onClick={() => action(`Make a quotation for part ${ref} quantity 1`)}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-100 transition shadow-xs"
          >
            <FileText className="h-3 w-3" /> Quote
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PartGrid({ parts, empty }: { parts: Part[]; empty: string }) {
  if (!parts.length) return <p className="text-[11px] text-slate-500">{empty}</p>;
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {parts.slice(0, 8).map((p) => <PartCard key={p.id} p={p} />)}
    </div>
  );
}

function VehicleCard({ v }: { v: Record<string, any> }) {
  const make = v.make ?? v.Make ?? null;
  const model = v.model ?? v.Model ?? null;
  const modelNumber =
    v.modelNumber ??
    v["Model Number"] ??
    v.model_number ??
    v.details?.["Model Number"] ??
    v.details?.model_number ??
    model;
  const fields = [v.year, make, model, v.engine ?? v.Engine].filter(Boolean);
  const action = useAvatarAction();
  const canBrowse = Boolean(make && modelNumber);
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
      <div className="flex items-center gap-2 text-[12px] font-medium text-blue-700">
        <Car className="h-4 w-4" /> Vehicle identified
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{fields.join(" · ") || "Vehicle"}</div>
      {v.vin ? <div className="mt-0.5 font-mono text-[10px] text-slate-500">VIN {v.vin}</div> : null}
      {canBrowse ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Link
            to="/vin/$brand/$modelNumber"
            params={{ brand: String(make), modelNumber: String(modelNumber) }}
            search={{ modelName: String(model || "") }}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-700 shadow-xs"
          >
            <Package className="h-3 w-3" /> Browse Catalog
          </Link>
          {action ? (
            <button
              type="button"
              onClick={() => action("Show me parts compatible with my vehicle")}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <Sparkles className="h-3 w-3 text-blue-600" /> Find compatible parts
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
  const tone = status === "in_stock" ? "text-emerald-600" : status === "low" ? "text-amber-600" : "text-red-600";
  return (
    <Link
      to="/parts/$id"
      params={{ id: d.id }}
      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 hover:border-blue-400 transition shadow-xs"
    >
      <div className="min-w-0">
        <div className="truncate text-[12px] font-medium text-slate-900">{d.name}</div>
        <div className="font-mono text-[10px] text-slate-500">{d.part_number}</div>
      </div>
      <div className="text-right">
        <div className={cn("text-sm font-semibold", tone)}>{stock} in stock</div>
        <div className="text-[10px] text-blue-600 font-medium">{aed(d.price)}</div>
      </div>
    </Link>
  );
}

function OfferList({ offers }: { offers: any[] }) {
  if (!offers?.length) return <p className="text-[11px] text-slate-500">No active offers right now.</p>;
  return (
    <div className="space-y-1.5">
      {offers.slice(0, 6).map((o) => (
        <div key={o.id} className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2">
          <BadgePercent className="h-4 w-4 text-amber-600" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium text-slate-900">{o.offer_name}</div>
            <div className="text-[10px] text-slate-500">Ends {new Date(o.end_date).toLocaleDateString()}</div>
          </div>
          <div className="text-sm font-bold text-amber-600">
            {o.discount_type === "percentage" ? `${o.discount_value}%` : aed(o.discount_value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function WarningLightCard({ d }: { d: any }) {
  const tone =
    d.severity === "critical" ? "border-red-200 bg-red-50 text-red-800" :
      d.severity === "caution" ? "border-amber-200 bg-amber-50 text-amber-800" :
        "border-blue-200 bg-blue-50 text-blue-800";
  return (
    <div className={cn("rounded-lg border p-3 shadow-xs", tone)}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4 shrink-0" /> {d.name ?? "Warning light"}
        {d.severity ? <span className="ml-auto rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide border border-slate-200">{d.severity}</span> : null}
      </div>
      {d.description ? <p className="mt-1 text-[12px] opacity-90">{d.description}</p> : null}
      {d.action ? <p className="mt-1 text-[11px] opacity-80"><strong>Action:</strong> {d.action}</p> : null}
    </div>
  );
}

function IdentifiedPartCard({ d }: { d: any }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Sparkles className="h-4 w-4 text-blue-600" /> {d.partName ?? "Part identified"}
        {typeof d.confidence === "number" ? (
          <span className="ml-auto text-[10px] text-slate-500 font-medium">{Math.round(d.confidence * 100)}% conf</span>
        ) : null}
      </div>
      {d.category ? <div className="mt-0.5 text-[11px] text-slate-500">{d.category}</div> : null}
      {Array.isArray(d.catalogMatches) && d.catalogMatches.length > 0 ? (
        <div className="mt-2"><PartGrid parts={d.catalogMatches} empty="" /></div>
      ) : null}
    </div>
  );
}

function LeadCard({ d }: { d: any }) {
  if (d.error) return <p className="text-[12px] text-red-600 font-medium">{d.error}</p>;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 shadow-xs">
      <UserCheck className="h-5 w-5 text-emerald-600" />
      <div className="text-[12px] text-emerald-800 font-medium">{d.message ?? "Our sales team will reach out shortly."}</div>
    </div>
  );
}

function OrderCard({ o }: { o: any }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-blue-600" />
        <div className="text-sm font-semibold text-slate-900">Order {o.order_number}</div>
        <span className="ml-auto rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700 uppercase">{o.status}</span>
      </div>
      <div className="mt-1 text-[11px] text-slate-500">Total {aed(o.total)}</div>
      {o.tracking_number ? (
        <div className="mt-0.5 text-[11px] text-slate-500">
          {o.courier ?? "Courier"} · <span className="font-mono text-slate-700">{o.tracking_number}</span>
        </div>
      ) : null}
    </div>
  );
}

function LoginRequiredCard({ message }: { message?: string }) {
  return (
    <Link to="/auth" className="my-2 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-800 hover:bg-blue-100 transition shadow-xs">
      <LogIn className="h-4 w-4 text-blue-600" />
      <span>{message ?? "Please sign in to continue."}</span>
      <span className="ml-auto text-[11px] font-semibold underline text-blue-600">Sign in</span>
    </Link>
  );
}

function CartActionCard({ d, kind }: { d: any; kind: "added" | "wishlist" }) {
  const Icon = kind === "added" ? ShoppingCart : Heart;
  const tone = kind === "added" ? "border-blue-200 bg-blue-50 text-blue-900" : "border-pink-200 bg-pink-50 text-pink-900";
  const iconTone = kind === "added" ? "text-blue-600" : "text-pink-600";
  const label = kind === "added"
    ? (d.alreadySaved ? "Already in cart" : `Added to cart${typeof d.cartCount === "number" ? ` (${d.cartCount})` : ""}`)
    : (d.alreadySaved ? "Already in wishlist" : "Saved to wishlist");
  const href = kind === "added" ? "/cart" : "/wishlist";
  return (
    <div className={cn("my-2 flex items-center gap-2 rounded-lg border p-2.5 shadow-xs", tone)}>
      <Icon className={cn("h-4 w-4 shrink-0", iconTone)} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold">{label}</div>
        {d.part?.name ? <div className="truncate text-[10px] opacity-75">{d.part.name}{d.quantity ? ` × ${d.quantity}` : ""}</div> : null}
      </div>
      <Link to={href} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 shadow-2xs">View</Link>
    </div>
  );
}

function CartViewCard({ d }: { d: any }) {
  const items: any[] = d?.items ?? [];
  if (!items.length) return <p className="my-2 text-[11px] text-slate-500">Your cart is empty.</p>;
  return (
    <div className="my-2 rounded-lg border border-slate-200 bg-white p-2 shadow-xs">
      <div className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-slate-900">
        <ShoppingCart className="h-4 w-4 text-blue-600" /> Your cart
        <span className="ml-auto text-[11px] text-slate-500">{items.length} item{items.length === 1 ? "" : "s"}</span>
      </div>
      <div className="space-y-1">
        {items.slice(0, 8).map((it) => (
          <div key={it.id} className="flex items-center gap-2 text-[11px]">
            <span className="truncate flex-1 text-slate-700">{it.name}</span>
            <span className="text-slate-400">× {it.quantity}</span>
            <span className="w-16 text-right font-semibold text-blue-600">{aed(it.line_total)}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[12px]">
        <span className="text-slate-500">Total</span>
        <span className="font-bold text-slate-900">{aed(d.total)}</span>
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <Link to="/cart" className="flex-1 rounded-md bg-blue-600 px-2 py-1 text-center text-[11px] font-medium text-white hover:bg-blue-700">Checkout</Link>
      </div>
    </div>
  );
}

function QuotationCard({ d }: { d: any }) {
  const q = d?.quotation ?? {};
  const items: any[] = d?.items ?? [];
  return (
    <div className="my-2 rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-xs">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-amber-900">
        <FileText className="h-4 w-4 text-amber-600" /> Quotation {q.quotation_number ?? ""}
        {q.status ? <span className="ml-auto rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[9px] font-semibold text-amber-800 uppercase">{q.status}</span> : null}
      </div>
      <div className="mt-2 space-y-0.5">
        {items.slice(0, 8).map((it, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="truncate flex-1 text-slate-800">{it.name ?? it.part_number}</span>
            <span className="text-slate-500">× {it.quantity}</span>
            <span className="w-16 text-right font-semibold text-amber-800">{aed(it.line_total)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-0.5 border-t border-amber-200/60 pt-1.5 text-[11px]">
        <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{aed(d.subtotal)}</span></div>
        <div className="flex justify-between text-slate-600"><span>VAT</span><span>{aed(d.tax_amount)}</span></div>
        <div className="flex justify-between text-[13px] font-bold text-slate-900"><span>Total</span><span>{aed(d.grand_total ?? q.grand_total)}</span></div>
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

function PremiumPartCard({ p, isAlternative = false }: { p: Part; isAlternative?: boolean }) {
  const isStaff = useIsStaff();
  const action = useAvatarAction();
  const ref = p.part_number ?? p.id;
  const stock = Number(p.stock ?? 0);
  const badgeText = stock > 0 ? `${stock} in stock` : "0 in stock";
  const badgeCls = stock > 0 
    ? "border border-emerald-200 bg-emerald-50 text-emerald-600" 
    : "border border-red-200 bg-red-50 text-red-600";

  const waMsg = encodeURIComponent(`Hi, I'd like to enquire about part ${p.part_number || ref} — ${p.name || ""}`);
  const waUrl = `https://wa.me/971547516365?text=${waMsg}`;

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white overflow-hidden hover:border-blue-400 hover:shadow-md transition duration-200 w-full">
      {/* Top Section */}
      <div className="flex flex-1 min-h-[110px]">
        {/* Brand Block */}
        <div className={cn(
          "w-[30%] flex items-center justify-center p-3 text-center",
          isAlternative 
            ? "bg-slate-50 text-blue-600 font-extrabold text-sm border-r border-slate-100" 
            : "bg-[#2563eb] text-white font-black text-lg tracking-wide"
        )}>
          <span className="uppercase break-all line-clamp-2">
            {p.manufacturer || "BMW"}
          </span>
        </div>

        {/* Content Block */}
        <div className="w-[70%] p-3 flex flex-col justify-between">
          <div>
            {/* Title & Badge */}
            <div className="flex justify-between items-start gap-2">
              <span className="font-bold text-xs uppercase text-slate-800 line-clamp-2 leading-tight">
                {p.name ?? "Part"}
              </span>
              {isStaff && (
                <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide whitespace-nowrap", badgeCls)}>
                  {badgeText}
                </span>
              )}
            </div>

            {/* OE Ref Number */}
            <div className="text-[10px] text-blue-600 font-bold mt-1 font-mono uppercase">
              REF. {p.part_number ?? "—"}
            </div>

            {/* Price section */}
            {isStaff ? (
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-2 text-[10px] font-mono border-t border-slate-100 pt-2">
                <div className="flex justify-between gap-1">
                  <span className="text-slate-400">Rate</span>
                  <span className="font-bold text-blue-600">{aed(p.price)}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-slate-400">IND</span>
                  <span className="font-semibold text-slate-700">{aed(p.ind_price ?? p.price)}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-slate-400">GAR</span>
                  <span className="font-semibold text-slate-700">{aed(p.gar_price ?? p.price)}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-slate-400">EXP</span>
                  <span className="font-semibold text-slate-700">{aed(p.export_price ?? p.price)}</span>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-[11px] font-mono font-semibold text-blue-600">
                {aed(p.price)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Buttons Block (only if action context is available) */}
      {action && (
        <div className="grid grid-cols-3 gap-1 px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={() => action(`Add part ${ref} to my cart`)}
            className="flex items-center justify-center gap-1 rounded-md bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-1.5 px-2 text-[10px] font-bold shadow-sm transition"
          >
            <ShoppingCart className="h-3 w-3" /> Cart
          </button>
          <button
            onClick={() => action(`Add part ${ref} to my wishlist`)}
            className="flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-1.5 px-2 text-[10px] font-bold shadow-2xs transition"
          >
            <Heart className="h-3.5 w-3.5 text-slate-400 hover:text-primary transition-colors z-10" /> Save
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 py-1.5 px-2 text-[10px] font-bold shadow-2xs transition"
          >
            <MessageCircle className="h-3 w-3 text-emerald-600" /> WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}

function OutOfStockInquiryBlock({ query, partNumber, name }: { query: string, partNumber?: string, name?: string }) {
  const action = useAvatarAction();
  const waMsg = encodeURIComponent(`Hi, I'd like to enquire about part ${partNumber || query} — ${name || ""}`);
  const waUrl = `https://wa.me/971547516365?text=${waMsg}`;
  return (
    <div className="flex flex-col rounded-lg border border-red-200 bg-red-50 p-4 gap-3 shadow-sm w-full">
      <div>
        <div className="font-bold text-red-800 text-sm">Part Unavailable</div>
        <div className="text-red-700 text-[11px] mt-1">We couldn't find available stock for <strong>{partNumber || query}</strong>. Please contact our sales team to check inbound inventory or arrange a special order.</div>
      </div>
      {action && (
        <div className="flex gap-2">
          <button
            onClick={() => action(`Please connect me with a salesman regarding out of stock part: ${partNumber || query}`)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-md py-2 text-[10px] font-bold transition flex items-center justify-center gap-1 shadow-sm"
          >
            <UserCheck className="h-3 w-3" /> Contact Salesman
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-md py-2 text-[10px] font-bold transition flex items-center justify-center gap-1 shadow-xs"
          >
            <MessageCircle className="h-3 w-3 text-emerald-600" /> WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}

function PartNumberSearchResult({ query, parts, alternatives }: { query: string; parts: any[]; alternatives: any[] }) {
  const isStaff = useIsStaff();
  
  if (isStaff && !parts.length && !alternatives.length) {
    return <p className="text-[11px] text-slate-500">No matching parts found.</p>;
  }
  
  const mainAvailable = parts.filter(p => isStaff || Number(p.stock ?? 0) > 0);
  const mainOos = !isStaff ? parts.filter(p => Number(p.stock ?? 0) <= 0) : [];
  const altsAvailable = alternatives.filter(p => isStaff || Number(p.stock ?? 0) > 0);
  
  return (
    <div className="flex flex-col gap-4 my-2">
      {/* Asked Part Section */}
      <div className="border-l-[3px] border-[#2563eb] pl-3 flex flex-col gap-2">
        <div className="text-[#2563eb] font-extrabold tracking-wider text-[11px] uppercase">
          YOUR PART NUMBER — {query}
        </div>
        <div className="flex flex-col gap-2">
          {mainAvailable.map((p) => (
            <PremiumPartCard key={p.id} p={p} isAlternative={false} />
          ))}
          {mainOos.map((p) => (
            <OutOfStockInquiryBlock key={p.id} query={query} partNumber={p.part_number} name={p.name} />
          ))}
          {/* If completely not found for a normal customer, just show the inquiry block */}
          {!isStaff && parts.length === 0 && (
             <OutOfStockInquiryBlock query={query} />
          )}
        </div>
      </div>

      {/* Alternative Parts Section */}
      {altsAvailable.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="text-slate-500 font-extrabold tracking-wider text-[11px] uppercase">
            OTHER OPTIONS ({altsAvailable.length})
          </div>
          <div className="text-slate-400 text-[10px] leading-tight">
            Compatible replacements we stock
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1.5">
            {altsAvailable.map((alt) => (
              <PremiumPartCard key={alt.id} p={alt} isAlternative={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ToolPartView({ part }: { part: any }) {
  const isNested = part?.type === "tool-invocation" && part?.toolInvocation;
  const rawType = isNested ? part.toolInvocation.toolName : (part?.type ?? "");
  const type: string = rawType.startsWith("tool-") ? rawType : `tool-${rawType}`;

  const rawState = isNested ? part.toolInvocation.state : (part?.state ?? "");
  const state: string = rawState === "result" ? "output-available" : (rawState === "call" || rawState === "partial-call" ? "" : rawState);

  const out = isNested ? part.toolInvocation.result : part?.output;

  // Streaming / pending
  if (state !== "output-available" && state !== "output-error") {
    const label = STREAM_LABELS[type] ?? "Working…";
    return (
      <div className="my-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
        <Shimmer>{label}</Shimmer>
      </div>
    );
  }

  if (state === "output-error" || out?.error) {
    return (
      <div className="my-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 font-medium">
        {out?.error ?? part.errorText ?? "Tool failed."}
      </div>
    );
  }

  if (out?.requireLogin) {
    return <LoginRequiredCard message={out.message} />;
  }

  switch (type) {
    case "tool-searchPartsByNumber":
      return (
        <PartNumberSearchResult
          query={out?.query ?? part.input?.query ?? ""}
          parts={out?.results ?? []}
          alternatives={out?.alternatives ?? []}
        />
      );
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
          <VehicleCard v={{
            ...(out?.decoded ?? {}),
            vin: out?.vin,
            modelNumber:
              out?.decoded?.modelNumber ??
              out?.decoded?.details?.["Model Number"] ??
              out?.decoded?.details?.model_number ??
              null,
          }} />
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

export const _ok = CheckCircle2;

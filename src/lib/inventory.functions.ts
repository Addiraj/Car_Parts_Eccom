import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

function serverPublicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const getPartStock = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const supabase = serverPublicClient();
    const { data: row, error } = await supabase
      .from("parts")
      .select("stock")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { stock: Number(row?.stock ?? 0) };
  });

export const getPartsStock = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).max(200) }).parse(d))
  .handler(async ({ data }) => {
    if (!data.ids.length) return {} as Record<string, number>;
    const supabase = serverPublicClient();
    const { data: rows, error } = await supabase
      .from("parts")
      .select("id, stock")
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    const out: Record<string, number> = {};
    for (const r of rows ?? []) out[r.id] = Number(r.stock ?? 0);
    return out;
  });

/** Normalize a part number for cross-referencing: uppercase, alphanumerics only. */
export function normalizePn(s: string): string {
  return (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export type AvailabilityEntry = {
  id: string;
  part_number: string;
  stock: number;
  isPurchasable: boolean;
  price: number | null;
  ind_price: number | null;
  gar_price: number | null;
  export_price: number | null;
};

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const lookupPartsByNumbers = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ part_numbers: z.array(z.string().min(1).max(80)).max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    const raws = Array.from(new Set(data.part_numbers.map((s) => s.trim()).filter(Boolean)));
    if (!raws.length) return {} as Record<string, AvailabilityEntry>;
    const supabase = serverPublicClient();
    const { data: rows, error } = await (supabase as any).rpc("lookup_parts_normalized", { _pns: raws });
    if (error) throw new Error(error.message);
    const map: Record<string, AvailabilityEntry> = {};
    for (const r of (rows ?? []) as Array<{
      id: string; part_number: string; oem_number: string | null; stock: number; match_key: string;
      price: number | string | null; ind_price: number | string | null; gar_price: number | string | null; export_price: number | string | null;
    }>) {
      const stock = Number(r.stock ?? 0);
      const entry: AvailabilityEntry = {
        id: r.id,
        part_number: r.part_number,
        stock,
        isPurchasable: stock > 0,
        price: num(r.price),
        ind_price: num(r.ind_price),
        gar_price: num(r.gar_price),
        export_price: num(r.export_price),
      };
      if (r.match_key) map[r.match_key] = entry;
      for (const k of [r.part_number, r.oem_number].filter(Boolean) as string[]) {
        const nk = normalizePn(k);
        if (nk) map[nk] = entry;
      }
    }
    return map;
  });



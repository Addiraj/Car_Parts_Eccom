import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const listVipNumbers = createServerFn({ method: "GET" }).handler(async () => {
  const { data: rows, error } = await supabase
    .from("ai_vip_numbers")
    .select("id, phone, label, created_at")
    .order("created_at", { ascending: false });

  if (error) return [];
  return rows || [];
});

export const addVipNumber = createServerFn({ method: "POST" })
  .validator((d: any) =>
    z
      .object({
        phone: z.string().min(4, "Phone number is too short").max(32, "Phone number is too long"),
        label: z.string().max(120, "Label is too long").optional(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const phone = data.phone.trim();
    const { data: row, error } = await supabase
      .from("ai_vip_numbers")
      .insert({
        phone,
        label: data.label ?? null,
      })
      .select("id, phone, label, created_at")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const deleteVipNumber = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabase.from("ai_vip_numbers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

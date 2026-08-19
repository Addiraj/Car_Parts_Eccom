import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().nullable(),
  subject: z.string().trim().min(1).max(150),
  message: z.string().trim().min(1).max(2000),
});

export const submitContact = createServerFn({ method: "POST" })
  .validator((d: unknown) => ContactSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabase
      .from("contacts")
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        subject: data.subject,
        message: data.message,
        status: "new",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    try {
      await supabase.from("admin_notifications").insert({
        type: "lead",
        title: `New Inquiry: ${data.subject.slice(0, 50)}`,
        body: `From: ${data.name} (${data.email})\n${data.message.slice(0, 150)}`,
        entity_type: "contact",
        entity_id: row?.id,
        metadata: { name: data.name, email: data.email, phone: data.phone, subject: data.subject },
      });
    } catch {}

    return { ok: true, id: row?.id };
  });

export const adminListContacts = createServerFn({ method: "GET" }).handler(async () => {
  const { data: rows, error } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
  if (error) return [];
  return rows || [];
});

export const adminUpdateContactStatus = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["new", "read", "replied"]) }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabase.from("contacts").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteContact = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabase.from("contacts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

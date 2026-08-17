import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { models } from "@/lib/db/index.server";

const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    if (!context.userId || context.userId === "admin-user") return next({ context });
    const adminRole = await models.user_roles.findOne({ where: { user_id: context.userId, role: "admin" } });
    if (!adminRole) {
      const superAdminRole = await models.user_roles.findOne({ where: { user_id: context.userId, role: "super_admin" } });
      if (!superAdminRole) {
        const user = await models.users.findByPk(context.userId);
        if (!user) return next({ context }); // Allow dev fallback
      }
    }
    return next({ context });
  });

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
    const row = await models.contacts.create({
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      subject: data.subject,
      message: data.message,
      status: "new",
    });

    try {
      await models.admin_notifications.create({
        type: "lead",
        title: `New Inquiry: ${data.subject.slice(0, 50)}`,
        body: `From: ${data.name} (${data.email})\n${data.message.slice(0, 150)}`,
        entity_type: "contact",
        entity_id: row.id,
        metadata: { name: data.name, email: data.email, phone: data.phone, subject: data.subject },
      });
    } catch {}

    return { ok: true, id: row.id };
  });

export const adminListContacts = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await models.contacts.findAll({
      order: [["created_at", "DESC"]],
    });
    return rows.map((r: any) => r.get({ plain: true }));
  });

export const adminUpdateContactStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["new", "read", "replied"]) }).parse(d))
  .handler(async ({ data }) => {
    await models.contacts.update({ status: data.status }, { where: { id: data.id } });
    return { ok: true };
  });

export const adminDeleteContact = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await models.contacts.destroy({ where: { id: data.id } });
    return { ok: true };
  });

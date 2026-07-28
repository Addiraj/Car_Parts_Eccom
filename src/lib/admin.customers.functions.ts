import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./admin.functions";
import { z } from "zod";
import { models } from "@/lib/db/index.server";

async function logAudit(actor: string, action: string, entity_id: string, before: any, after: any) {
  try {
    await models.audit_logs.create({
      actor_id: actor,
      action,
      entity_type: "customer",
      entity_id,
      before,
      after,
    } as any);
  } catch {}
}

export const adminGetCustomer = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const profileRow = await models.profiles.findByPk(data.id);
    if (!profileRow) throw new Error("Customer not found");
    const profile = profileRow.get({ plain: true });

    const authUser = await models.users.findByPk(data.id);

    const [roles, orders, addresses, wishlist] = await Promise.all([
      models.user_roles.findAll({ where: { user_id: data.id }, attributes: ["role"] }),
      models.orders.findAll({
        attributes: ["id", "order_number", "status", "total", "currency", "created_at", "payment_status"],
        where: { user_id: data.id },
        order: [["created_at", "DESC"]],
        limit: 50
      }),
      models.addresses.findAll({ where: { user_id: data.id }, order: [["created_at", "DESC"]] }),
      models.wishlist_items.findAll({ attributes: ["part_id", "created_at"], where: { user_id: data.id }, limit: 20 }),
    ]);

    const ordersList = orders.map(o => o.get({ plain: true }));
    const totalSpend = ordersList.reduce((s, o: any) => s + Number(o.total ?? 0), 0);

    return {
      profile,
      email: authUser?.email ?? null,
      emailConfirmed: !!authUser?.email_confirmed_at,
      lastSignIn: authUser?.last_sign_in_at ?? null,
      roles: roles.map((r: any) => r.role),
      orders: ordersList,
      orderCount: ordersList.length,
      totalSpend,
      addresses: addresses.map(a => a.get({ plain: true })),
      wishlistCount: wishlist.length,
    };
  });

export const adminApproveCustomer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }: any) => {
    const beforeRow = await models.profiles.findByPk(data.id, { attributes: ["status", "approved_at", "approved_by"] });
    const before = beforeRow?.get({ plain: true });
    
    await models.profiles.update(
      { status: "active", approved_at: new Date() as any, approved_by: context.userId },
      { where: { id: data.id } }
    );
    
    await logAudit(context.userId, "customer.approve", data.id, before, { status: "active" });
    return { ok: true };
  });

export const adminSetCustomerStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: string; status: "pending" | "active" | "suspended"; note?: string }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pending", "active", "suspended"]), note: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }: any) => {
    const beforeRow = await models.profiles.findByPk(data.id, { attributes: ["status", "admin_notes"] });
    const before = beforeRow?.get({ plain: true });
    
    const update: any = { status: data.status };
    if (data.status === "active") {
      update.approved_at = new Date();
      update.approved_by = context.userId;
    }
    if (data.note) {
      const prev = before?.admin_notes ? `${before.admin_notes}\n\n` : "";
      update.admin_notes = `${prev}[${new Date().toISOString().slice(0, 10)}] ${data.status.toUpperCase()}: ${data.note}`;
    }
    
    await models.profiles.update(update, { where: { id: data.id } });
    await logAudit(context.userId, `customer.status.${data.status}`, data.id, before, update);
    return { ok: true };
  });

export const adminUpdateCustomerBusiness = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: {
    id: string;
    full_name?: string | null;
    phone?: string | null;
    company_name?: string | null;
    trade_license?: string | null;
    vat_number?: string | null;
    credit_limit?: number | null;
    customer_type?: "IND" | "GAR" | "EXP";
    admin_notes?: string | null;
  }) => d)
  .handler(async ({ data, context }: any) => {
    const { id, ...rest } = data;
    const update: any = {};
    for (const [k, v] of Object.entries(rest)) if (v !== undefined) update[k] = v;
    
    const beforeRow = await models.profiles.findByPk(id);
    const before = beforeRow?.get({ plain: true });
    
    await models.profiles.update(update, { where: { id } });
    await logAudit(context.userId, "customer.update", id, before, update);
    return { ok: true };
  });

export const adminCustomerStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await models.profiles.findAll({ attributes: ["status", "customer_type"] });
    const byStatus = { pending: 0, active: 0, suspended: 0 } as Record<string, number>;
    const byType = { IND: 0, GAR: 0, EXP: 0 } as Record<string, number>;
    for (const r of rows) {
      const status = r.status || "pending";
      const type = r.customer_type || "IND";
      byStatus[status] = (byStatus[status] ?? 0) + 1;
      byType[type] = (byType[type] ?? 0) + 1;
    }
    return { total: rows.length, byStatus, byType };
  });

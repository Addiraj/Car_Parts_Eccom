import { createServerFn } from "@tanstack/react-start";
import { requireAdmin, requireAdminOrSalesman } from "./admin.functions";
import { z } from "zod";
import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";
const col = (n: string) => n;
const fn = (f: string, ...args: any[]) => `${f}(${args.join(", ")})`;
const where = (c: any, _o: any) => c;
import { sequelize } from "@/lib/db/index.server";

async function logAudit(actor: string, action: string, entity_id: string, before: any, after: any) {
  try {
    await models.audit_logs.create({
      actor_id: actor, action, entity_type: "quotation", entity_id, before, after,
    } as any);
  } catch {}
}

const STATUSES = ["draft", "sent", "approved", "rejected", "expired", "converted"] as const;

const itemSchema = z.object({
  part_id: z.string().uuid().nullable().optional(),
  part_snapshot: z.object({
    part_number: z.string().optional().default(""),
    oem_number: z.string().optional().default(""),
    name: z.string().optional().default(""),
    manufacturer: z.string().optional().default(""),
  }).default({}),
  quantity: z.number().int().positive(),
  unit_price: z.number().min(0),
  custom_price: z.number().min(0).nullable().optional(),
  line_discount: z.number().min(0).default(0),
});

const payloadSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  customer_snapshot: z.object({
    full_name: z.string().optional().default(""),
    email: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    company_name: z.string().optional().default(""),
    address: z.string().optional().default(""),
  }).default({}),
  currency: z.string().default("AED"),
  items: z.array(itemSchema).min(1),
  discount_type: z.enum(["percent", "fixed"]).default("percent"),
  discount_value: z.number().min(0).default(0),
  tax_rate: z.number().min(0).max(100).default(5),
  shipping_amount: z.number().min(0).default(0),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  status: z.enum(["draft", "sent"]).default("draft"),
});

function computeTotals(p: z.infer<typeof payloadSchema>) {
  const lines = p.items.map((it) => {
    const unit = it.custom_price != null ? it.custom_price : it.unit_price;
    const gross = unit * it.quantity;
    const line_total = Math.max(0, gross - (it.line_discount || 0));
    return { ...it, line_total };
  });
  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  const discount_amount =
    p.discount_type === "percent"
      ? (subtotal * (p.discount_value || 0)) / 100
      : Math.min(subtotal, p.discount_value || 0);
  const taxable = Math.max(0, subtotal - discount_amount);
  const tax_amount = (taxable * (p.tax_rate || 0)) / 100;
  const grand_total = taxable + tax_amount + (p.shipping_amount || 0);
  return {
    lines,
    subtotal: round2(subtotal),
    discount_amount: round2(discount_amount),
    tax_amount: round2(tax_amount),
    grand_total: round2(grand_total),
  };
}
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ============= LIST ============= */
export const adminListQuotations = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: unknown) =>
    z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(25),
      q: z.string().optional(),
      status: z.enum([...STATUSES, "ALL"] as any).default("ALL"),
      customer_id: z.string().uuid().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }).parse(d ?? {})
  )
  .handler(async ({ data }) => {
    const from = (data.page - 1) * data.pageSize;
    const w: any = {};
    if (data.status !== "ALL") w.status = data.status;
    if (data.customer_id) w.customer_id = data.customer_id;
    if (data.from || data.to) {
      w.created_at = {};
      if (data.from) w.created_at[Op.gte] = data.from;
      if (data.to) w.created_at[Op.lte] = data.to;
    }
    if (data.q && data.q.trim()) {
      w.quotation_number = { [Op.iLike]: `%${data.q.trim()}%` };
    }
    
    const { rows, count } = await models.quotations.findAndCountAll({
      attributes: ["id", "quotation_number", "status", "grand_total", "currency", "customer_id", "customer_snapshot", "created_at", "valid_until", "converted_order_id", "share_token"],
      where: w,
      order: [["created_at", "DESC"]],
      limit: data.pageSize,
      offset: from
    });
    
    return { items: rows.map(r => r.get({ plain: true })), total: count, page: data.page, pageSize: data.pageSize };
  });

export const adminQuotationStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await models.quotations.findAll({ attributes: ["status", "grand_total"] });
    const byStatus: Record<string, number> = {};
    let totalValue = 0;
    for (const r of rows) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      totalValue += Number(r.grand_total ?? 0);
    }
    const total = rows.length;
    const approved = byStatus.approved ?? 0;
    const converted = byStatus.converted ?? 0;
    const pending = (byStatus.draft ?? 0) + (byStatus.sent ?? 0);
    const conversionRate = total > 0 ? Math.round(((converted) / total) * 1000) / 10 : 0;
    return {
      total, approved, converted, pending,
      rejected: byStatus.rejected ?? 0,
      expired: byStatus.expired ?? 0,
      draft: byStatus.draft ?? 0,
      sent: byStatus.sent ?? 0,
      totalValue: round2(totalValue),
      conversionRate,
    };
  });

/* ============= GET ============= */
export const adminGetQuotation = createServerFn({ method: "GET" })
  .middleware([requireAdminOrSalesman])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }: any) => {
    const quoteRow = await models.quotations.findByPk(data.id);
    if (!quoteRow) throw new Error("Quotation not found");
    const quote = quoteRow.get({ plain: true });
    
    if (!context.isAdmin && quote.created_by !== context.userId) {
      throw new Error("Forbidden");
    }
    
    const [items, events] = await Promise.all([
      models.quotation_items.findAll({ where: { quotation_id: data.id }, order: [["sort_order", "ASC"]] }),
      models.quotation_events.findAll({ where: { quotation_id: data.id }, order: [["created_at", "DESC"]] }),
    ]);
    
    return { quote, items: items.map(i => i.get({ plain: true })), events: events.map(e => e.get({ plain: true })) };
  });

/* ============= CREATE ============= */
export const adminCreateQuotation = createServerFn({ method: "POST" })
  .middleware([requireAdminOrSalesman])
  .validator((d: unknown) => payloadSchema.parse(d))
  .handler(async ({ data, context }: any) => {
    const totals = computeTotals(data);
    const qRow = await models.quotations.create({
      customer_id: data.customer_id ?? null,
      customer_snapshot: data.customer_snapshot,
      currency: data.currency,
      status: data.status,
      subtotal: totals.subtotal,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      discount_amount: totals.discount_amount,
      tax_rate: data.tax_rate,
      tax_amount: totals.tax_amount,
      shipping_amount: data.shipping_amount,
      grand_total: totals.grand_total,
      notes: data.notes ?? null,
      terms: data.terms ?? null,
      valid_until: data.valid_until ?? null,
      created_by: context.userId,
      sent_at: data.status === "sent" ? new Date() : null,
    } as any);
    const q = qRow.get({ plain: true });

    const items = totals.lines.map((l, idx) => ({
      quotation_id: q.id,
      part_id: l.part_id ?? null,
      part_snapshot: l.part_snapshot,
      quantity: l.quantity,
      unit_price: l.unit_price,
      custom_price: l.custom_price ?? null,
      line_discount: l.line_discount,
      line_total: l.line_total,
      sort_order: idx,
    }));
    await models.quotation_items.bulkCreate(items as any[]);

    await models.quotation_events.create({
      quotation_id: q.id, event_type: "created", actor_id: context.userId,
      note: `Created as ${data.status}`,
    } as any);
    
    await logAudit(context.userId, "quotation.create", q.id, null, { number: q.quotation_number });
    return { id: q.id, quotation_number: q.quotation_number, share_token: q.share_token };
  });

/* ============= UPDATE ============= */
export const adminUpdateQuotation = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), payload: payloadSchema }).parse(d)
  )
  .handler(async ({ data, context }: any) => {
    const existingRow = await models.quotations.findByPk(data.id, { attributes: ["status"] });
    if (!existingRow) throw new Error("Quotation not found");
    if (existingRow.status === "converted") throw new Error("Converted quotations cannot be edited");

    const totals = computeTotals(data.payload);
    await models.quotations.update({
      customer_id: data.payload.customer_id ?? null,
      customer_snapshot: data.payload.customer_snapshot,
      currency: data.payload.currency,
      status: data.payload.status,
      subtotal: totals.subtotal,
      discount_type: data.payload.discount_type,
      discount_value: data.payload.discount_value,
      discount_amount: totals.discount_amount,
      tax_rate: data.payload.tax_rate,
      tax_amount: totals.tax_amount,
      shipping_amount: data.payload.shipping_amount,
      grand_total: totals.grand_total,
      notes: data.payload.notes ?? null,
      terms: data.payload.terms ?? null,
      valid_until: data.payload.valid_until ?? null,
    } as any, { where: { id: data.id } });

    await models.quotation_items.destroy({ where: { quotation_id: data.id } });
    const items = totals.lines.map((l, idx) => ({
      quotation_id: data.id,
      part_id: l.part_id ?? null,
      part_snapshot: l.part_snapshot,
      quantity: l.quantity,
      unit_price: l.unit_price,
      custom_price: l.custom_price ?? null,
      line_discount: l.line_discount,
      line_total: l.line_total,
      sort_order: idx,
    }));
    await models.quotation_items.bulkCreate(items as any[]);

    await models.quotation_events.create({
      quotation_id: data.id, event_type: "updated", actor_id: context.userId,
    } as any);
    await logAudit(context.userId, "quotation.update", data.id, null, { grand_total: totals.grand_total });
    return { ok: true };
  });

/* ============= DELETE ============= */
export const adminDeleteQuotation = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }: any) => {
    await models.quotations.destroy({ where: { id: data.id } });
    await logAudit(context.userId, "quotation.delete", data.id, null, null);
    return { ok: true };
  });

/* ============= DUPLICATE ============= */
export const adminDuplicateQuotation = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }: any) => {
    const origRow = await models.quotations.findByPk(data.id);
    if (!origRow) throw new Error("Quotation not found");
    const orig = origRow.get({ plain: true });
    
    const items = await models.quotation_items.findAll({ where: { quotation_id: data.id } });

    const newQRow = await models.quotations.create({
      customer_id: orig.customer_id,
      customer_snapshot: orig.customer_snapshot,
      currency: orig.currency,
      status: "draft",
      subtotal: orig.subtotal,
      discount_type: orig.discount_type,
      discount_value: orig.discount_value,
      discount_amount: orig.discount_amount,
      tax_rate: orig.tax_rate,
      tax_amount: orig.tax_amount,
      shipping_amount: orig.shipping_amount,
      grand_total: orig.grand_total,
      notes: orig.notes,
      terms: orig.terms,
      valid_until: orig.valid_until,
      created_by: context.userId,
    } as any);
    const newQ = newQRow.get({ plain: true });

    if (items.length) {
      await models.quotation_items.bulkCreate(
        items.map((it: any) => ({
          quotation_id: newQ.id,
          part_id: it.part_id,
          part_snapshot: it.part_snapshot,
          quantity: it.quantity,
          unit_price: it.unit_price,
          custom_price: it.custom_price,
          line_discount: it.line_discount,
          line_total: it.line_total,
          sort_order: it.sort_order,
        })) as any[]
      );
    }
    await models.quotation_events.create({
      quotation_id: newQ.id, event_type: "duplicated", actor_id: context.userId,
      note: `Duplicated from ${orig.quotation_number}`,
    } as any);
    return { id: newQ.id, quotation_number: newQ.quotation_number };
  });

/* ============= STATUS ============= */
export const adminSetQuotationStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(STATUSES),
      note: z.string().max(500).optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }: any) => {
    const patch: any = { status: data.status };
    const now = new Date();
    if (data.status === "sent") patch.sent_at = now;
    if (data.status === "approved") patch.approved_at = now;
    if (data.status === "rejected") patch.rejected_at = now;
    
    await models.quotations.update(patch, { where: { id: data.id } });
    
    await models.quotation_events.create({
      quotation_id: data.id, event_type: `status.${data.status}`, actor_id: context.userId,
      note: data.note ?? null,
    } as any);
    await logAudit(context.userId, `quotation.status.${data.status}`, data.id, null, patch);
    return { ok: true };
  });

/* ============= CONVERT TO ORDER ============= */
export const adminConvertQuotationToOrder = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }: any) => {
    const qRow = await models.quotations.findByPk(data.id);
    if (!qRow) throw new Error("Quotation not found");
    const q = qRow.get({ plain: true });
    
    if (q.status === "converted") throw new Error("Already converted");
    const items = await models.quotation_items.findAll({ where: { quotation_id: data.id } });

    const snap = (q.customer_snapshot ?? {}) as any;
    const orderRow = await models.orders.create({
      user_id: q.customer_id ?? undefined,
      payment_method: "quote",
      customer_type: "GAR",
      subtotal: q.subtotal,
      discount: q.discount_amount,
      vat: q.tax_amount,
      shipping_fee: q.shipping_amount,
      total: q.grand_total,
      currency: q.currency,
      status: "placed",
      shipping_address: {
        full_name: snap.full_name ?? "",
        phone: snap.phone ?? "",
        emirate: "",
        area: snap.address ?? "",
        street: "",
        building: "",
      },
      notes: `Converted from quotation ${q.quotation_number}`,
    } as any);
    const order = orderRow.get({ plain: true });

    if (items.length) {
      const orderItems = items.map((it: any) => {
        const ps = (it.part_snapshot ?? {}) as any;
        const unit = it.custom_price ?? it.unit_price;
        return {
          order_id: order.id,
          part_id: it.part_id,
          part_number: ps.part_number ?? "",
          name: ps.name ?? "",
          manufacturer: ps.manufacturer ?? null,
          unit_price: unit,
          quantity: it.quantity,
          line_total: it.line_total,
          customer_type: "GAR",
        };
      });
      await models.order_items.bulkCreate(orderItems as any[]);
    }

    await models.quotations.update({
      status: "converted",
      converted_at: new Date() as any,
      converted_order_id: order.id,
    }, { where: { id: data.id } });

    await models.quotation_events.create({
      quotation_id: data.id, event_type: "converted", actor_id: context.userId,
      note: `Converted to order ${order.order_number}`,
      meta: { order_id: order.id },
    } as any);
    await logAudit(context.userId, "quotation.convert", data.id, null, { order_id: order.id });
    return { order_id: order.id, order_number: order.order_number };
  });

/* ============= PARTS SEARCH ============= */
export const adminSearchPartsForQuotation = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ q: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const s = data.q.trim();
    const nk = s.toUpperCase().replace(/[^A-Z0-9]/g, "");
    
    const w: any = {
      [Op.or]: [
        { part_number: { [Op.iLike]: `%${s}%` } },
        { oem_number: { [Op.iLike]: `%${s}%` } },
        { name: { [Op.iLike]: `%${s}%` } }
      ]
    };
    if (nk) {
      w[Op.or].push(
        where(
          fn('upper', fn('regexp_replace', col('part_number'), '[^a-zA-Z0-9]', '', 'g')),
          { [Op.like]: `%${nk}%` }
        )
      );
    }
    
    const rows = await models.parts.findAll({
      where: w,
      limit: 20
    });
    return rows.map(r => r.get({ plain: true }));
  });

/* ============= CUSTOMER SEARCH ============= */
export const adminSearchCustomersForQuotation = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ q: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const s = data.q.trim();
    const rows = await models.profiles.findAll({
      attributes: ["id", "full_name", "phone", "company_name", "customer_type"],
      where: {
        [Op.or]: [
          { full_name: { [Op.iLike]: `%${s}%` } },
          { phone: { [Op.iLike]: `%${s}%` } },
          { company_name: { [Op.iLike]: `%${s}%` } }
        ]
      },
      limit: 20
    });
    return rows.map(r => r.get({ plain: true }));
  });

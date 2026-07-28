import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ============================================================
 * Helpers
 * ============================================================ */

import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";

async function assertAdmin(userId: string) {
  const admin = await models.user_roles.findOne({ where: { user_id: userId, role: "admin" } });
  const superAdmin = await models.user_roles.findOne({ where: { user_id: userId, role: "super_admin" } });
  if (!admin && !superAdmin) throw new Error("Forbidden");
}

async function actorInfo(userId: string) {
  const profileRow = await models.profiles.findOne({ attributes: ["full_name"], where: { id: userId } });
  let email = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    email = data?.user?.email ?? null;
  } catch {}
  
  const profile = profileRow ? profileRow.get({ plain: true }) : null;
  return {
    name: profile?.full_name || email || "Admin",
    email,
  };
}

/* ============================================================
 * Customer-facing
 * ============================================================ */

export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const w = await models.credit_wallets.findOne({ where: { user_id: context.userId } });
    return w ? w.get({ plain: true }) : null;
  });

export const getMyTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { limit?: number; offset?: number; search?: string }) => d)
  .handler(async ({ data, context }) => {
    const limit = Math.min(data.limit ?? 15, 100);
    const offset = data.offset ?? 0;
    const where: any = { user_id: context.userId };
    if (data.search?.trim()) {
      const s = `%${data.search.trim()}%`;
      where[Op.or] = [
        { remarks: { [Op.iLike]: s } },
        { reason: { [Op.iLike]: s } }
      ];
    }
    const { rows, count } = await models.credit_transactions.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });
    return { rows: rows.map((r: any) => r.get({ plain: true })), count };
  });

export const getMyStatements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rows = await models.credit_billing_statements.findAll({
      where: { user_id: context.userId },
      order: [["period_end", "DESC"]],
    });
    return rows.map((r: any) => r.get({ plain: true }));
  });

/* Checkout context: wallet + cod limits + customer_type */
export const getCheckoutPaymentContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    // Auto-freeze check first
    try { await models.sequelize!.query(`SELECT wallet_check_and_freeze(:uid)`, { replacements: { uid } }); } catch {}

    const [wallet, profile, settings] = await Promise.all([
      models.credit_wallets.findOne({ where: { user_id: uid } }),
      models.profiles.findOne({ attributes: ["customer_type"], where: { id: uid } }),
      models.payment_settings.findOne({ attributes: ["setting_value"], where: { setting_key: "cod_limits" } }),
    ]);
    return {
      wallet: wallet ? wallet.get({ plain: true }) : null,
      customer_type: (profile?.customer_type ?? "IND") as "IND" | "GAR" | "EXP",
      cod_limits: (settings?.setting_value ?? {}) as Record<
        "IND" | "GAR" | "EXP",
        { enabled: boolean; max_amount: number }
      >,
    };
  });

/* ============================================================
 * Admin: wallet CRUD
 * ============================================================ */

export const adminGetWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const w = await models.credit_wallets.findOne({ where: { user_id: data.userId } });
    return w ? w.get({ plain: true }) : null;
  });

export const adminActivateWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { userId: string; credit_limit: number; payment_terms_days?: number; notes?: string }) =>
    z.object({
      userId: z.string().uuid(),
      credit_limit: z.number().min(0),
      payment_terms_days: z.number().int().min(0).max(365).optional(),
      notes: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const existing = await models.credit_wallets.findOne({ attributes: ["id"], where: { user_id: data.userId } });
    if (existing) throw new Error("Wallet already exists");
    
    const row = await models.credit_wallets.create({
      user_id: data.userId,
      credit_limit: data.credit_limit,
      available_balance: data.credit_limit,
      payment_terms_days: data.payment_terms_days ?? 30,
      notes: data.notes ?? null,
    });
    
    const actor = await actorInfo(context.userId);
    await models.credit_transactions.create({
      wallet_id: row.id,
      user_id: data.userId,
      type: "credit",
      amount: data.credit_limit,
      balance_after: data.credit_limit,
      reason: "Wallet activated",
      remarks: `Initial credit limit AED ${data.credit_limit}`,
      updated_by: context.userId,
      updated_by_name: actor.name,
      updated_by_email: actor.email,
    });
    return row.get({ plain: true });
  });

export const adminUpdateLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { walletId: string; new_limit: number; reset_balance: boolean; reason: string }) =>
    z.object({
      walletId: z.string().uuid(),
      new_limit: z.number().min(0),
      reset_balance: z.boolean(),
      reason: z.string().min(1).max(300),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const wRow = await models.credit_wallets.findOne({ where: { id: data.walletId } });
    if (!wRow) throw new Error("Wallet not found");
    const w = wRow.get({ plain: true });
    
    const used = Number(w.credit_limit) - Number(w.available_balance);
    const newBal = data.reset_balance ? Math.max(0, data.new_limit - used) : Number(w.available_balance);
    
    await models.credit_wallets.update(
      { credit_limit: data.new_limit, available_balance: newBal, updated_at: new Date().toISOString() },
      { where: { id: data.walletId } }
    );
    
    const actor = await actorInfo(context.userId);
    await models.audit_logs.create({
      actor_id: context.userId,
      action: "wallet.limit.update",
      entity_type: "credit_wallet",
      entity_id: data.walletId,
      before: { credit_limit: w.credit_limit, available_balance: w.available_balance },
      after: { credit_limit: data.new_limit, available_balance: newBal, reason: data.reason, by: actor.name },
    });
    return { ok: true };
  });

export const adminAddCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { walletId: string; amount: number; reason: string; notes?: string; uncap?: boolean }) =>
    z.object({
      walletId: z.string().uuid(),
      amount: z.number().positive(),
      reason: z.string().min(1).max(120),
      notes: z.string().max(500).optional(),
      uncap: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const actor = await actorInfo(context.userId);
    const [[result]] = await models.sequelize!.query(`
      SELECT wallet_credit(
        :wallet, :amount, :reason, :remarks, :actor, :actor_name, :actor_email, :order, :uncap
      ) as result
    `, {
      replacements: {
        wallet: data.walletId, amount: data.amount, reason: data.reason,
        remarks: data.notes ?? null, actor: context.userId, actor_name: actor.name,
        actor_email: actor.email, order: null, uncap: !!data.uncap
      }
    });
    return { new_balance: (result as any)?.result };
  });

export const adminToggleActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { walletId: string }) => z.object({ walletId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const wRow = await models.credit_wallets.findOne({ attributes: ["is_active"], where: { id: data.walletId } });
    if (!wRow) throw new Error("Wallet not found");
    const w = wRow.get({ plain: true });
    
    const next = !w.is_active;
    await models.credit_wallets.update({
      is_active: next,
      frozen_at: next ? null : new Date().toISOString(),
      freeze_reason: next ? null : "Suspended by admin",
    }, { where: { id: data.walletId } });
    return { ok: true, is_active: next };
  });

export const adminForceUnfreeze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { walletId: string; reason: string }) =>
    z.object({ walletId: z.string().uuid(), reason: z.string().min(1).max(300) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await models.credit_wallets.update({
      is_active: true, frozen_at: null, freeze_reason: null,
    }, { where: { id: data.walletId } });
    
    const actor = await actorInfo(context.userId);
    await models.audit_logs.create({
      actor_id: context.userId, action: "wallet.force_unfreeze",
      entity_type: "credit_wallet", entity_id: data.walletId,
      after: { reason: data.reason, by: actor.name },
    });
    return { ok: true };
  });

/* Transactions & statements — admin */

export const adminListTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { walletId: string; limit?: number; offset?: number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const limit = Math.min(data.limit ?? 20, 200);
    const offset = data.offset ?? 0;
    const { rows, count } = await models.credit_transactions.findAndCountAll({
      where: { wallet_id: data.walletId },
      order: [["created_at", "DESC"]],
      limit,
      offset
    });
    return { rows: rows.map((r: any) => r.get({ plain: true })), count };
  });

export const adminGenerateStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { walletId: string; period_start: string; period_end: string; terms_days: number }) =>
    z.object({
      walletId: z.string().uuid(),
      period_start: z.string(),
      period_end: z.string(),
      terms_days: z.number().int().min(0).max(365),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const wRow = await models.credit_wallets.findOne({ where: { id: data.walletId } });
    if (!wRow) throw new Error("Wallet not found");
    const w = wRow.get({ plain: true });

    // Compute opening balance
    const prev = await models.credit_transactions.findOne({
      attributes: ["balance_after"],
      where: { wallet_id: data.walletId, created_at: { [Op.lt]: data.period_start } },
      order: [["created_at", "DESC"]]
    });
    const opening = prev ? Number(prev.get({ plain: true }).balance_after) : Number(w.credit_limit);

    const txs = await models.credit_transactions.findAll({
      attributes: ["type", "amount", "balance_after", "created_at"],
      where: { 
        wallet_id: data.walletId,
        created_at: { 
          [Op.gte]: data.period_start,
          [Op.lte]: data.period_end + "T23:59:59.999Z"
        }
      },
      order: [["created_at", "ASC"]]
    });

    const rows = txs.map((r: any) => r.get({ plain: true }));
    const total_debits = rows.filter((r: any) => r.type === "debit").reduce((s: number, r: any) => s + Number(r.amount), 0);
    const total_credits = rows.filter((r: any) => r.type === "credit").reduce((s: number, r: any) => s + Number(r.amount), 0);
    const closing = rows.length ? Number(rows[rows.length - 1].balance_after) : opening;
    const outstanding = Math.max(0, Number(w.credit_limit) - closing);

    const [[numRow]] = await models.sequelize!.query(`SELECT next_statement_number()`);
    const due = new Date(data.period_end);
    due.setDate(due.getDate() + data.terms_days);

    const row = await models.credit_billing_statements.create({
      statement_number: (numRow as any).next_statement_number as string,
      wallet_id: data.walletId,
      user_id: w.user_id,
      period_start: data.period_start,
      period_end: data.period_end,
      opening_balance: opening,
      total_debits,
      total_credits,
      closing_balance: closing,
      outstanding_amount: outstanding,
      due_date: due.toISOString().slice(0, 10),
      status: outstanding > 0 ? "unpaid" : "paid",
      generated_by: context.userId,
    });
    return row.get({ plain: true });
  });

export const adminRecordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: {
    walletId: string; amount: number; method: string; reference?: string;
    payment_date?: string; notes?: string; statement_id?: string;
  }) =>
    z.object({
      walletId: z.string().uuid(),
      amount: z.number().positive(),
      method: z.enum(["bank_transfer", "cash", "cheque", "card", "other"]),
      reference: z.string().max(120).optional(),
      payment_date: z.string().optional(),
      notes: z.string().max(500).optional(),
      statement_id: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const actor = await actorInfo(context.userId);
    const [[result]] = await models.sequelize!.query(`
      SELECT wallet_record_payment(
        :wallet, :amount, :method, :reference, :payment_date, :notes, :statement, :actor, :actor_name, :actor_email
      ) as result
    `, {
      replacements: {
        wallet: data.walletId, amount: data.amount, method: data.method,
        reference: data.reference ?? null, payment_date: data.payment_date ?? null,
        notes: data.notes ?? null, statement: data.statement_id ?? null,
        actor: context.userId, actor_name: actor.name, actor_email: actor.email
      }
    });
    return (result as any)?.result;
  });

export const adminListStatements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { walletId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const rows = await models.credit_billing_statements.findAll({
      where: { wallet_id: data.walletId },
      order: [["period_end", "DESC"]]
    });
    return rows.map((r: any) => r.get({ plain: true }));
  });

/* ============================================================
 * Credit Health Dashboard
 * ============================================================ */

export const adminCreditDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const wallets = await models.credit_wallets.findAll();
    const walletList = wallets.map((w: any) => w.get({ plain: true }));
    const userIds = walletList.map((w: any) => w.user_id);
    const walletIds = walletList.map((w: any) => w.id);

    const [profiles, statements, payments] = await Promise.all([
      userIds.length
        ? models.profiles.findAll({ attributes: ["id", "full_name", "company_name", "customer_type"], where: { id: { [Op.in]: userIds } } })
        : Promise.resolve([]),
      walletIds.length
        ? models.credit_billing_statements.findAll({
            attributes: ["wallet_id", "outstanding_amount", "amount_paid", "due_date", "status"],
            where: { wallet_id: { [Op.in]: walletIds } }
          })
        : Promise.resolve([]),
      walletIds.length
        ? models.credit_payments.findAll({
            attributes: ["wallet_id", "amount", "payment_date"],
            where: { wallet_id: { [Op.in]: walletIds } }
          })
        : Promise.resolve([]),
    ]);

    const profileById = new Map<string, any>(profiles.map((p: any) => {
      const pl = p.get({ plain: true });
      return [pl.id, pl];
    }));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const stmtByWallet = new Map<string, any[]>();
    statements.forEach((s: any) => {
      const stmt = s.get({ plain: true });
      const list = stmtByWallet.get(stmt.wallet_id) ?? [];
      list.push(stmt); stmtByWallet.set(stmt.wallet_id, list);
    });
    const payByWallet = new Map<string, any[]>();
    payments.forEach((p: any) => {
      const pay = p.get({ plain: true });
      const list = payByWallet.get(pay.wallet_id) ?? [];
      list.push(pay); payByWallet.set(pay.wallet_id, list);
    });

    // Aging buckets
    const buckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90p: 0 };
    statements.forEach((st: any) => {
      const s = st.get({ plain: true });
      if (s.status === "paid") return;
      const remaining = Math.max(0, Number(s.outstanding_amount) - Number(s.amount_paid ?? 0));
      const due = new Date(s.due_date);
      const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
      if (days < 0) buckets.current += remaining;
      else if (days <= 30) buckets.d1_30 += remaining;
      else if (days <= 60) buckets.d31_60 += remaining;
      else if (days <= 90) buckets.d61_90 += remaining;
      else buckets.d90p += remaining;
    });

    const accounts = walletList.map((w: any) => {
      const profile = profileById.get(w.user_id);
      const stmts = stmtByWallet.get(w.id) ?? [];
      const overdue = stmts.some((s: any) => s.status !== "paid" && new Date(s.due_date) < today);
      const outstanding = Math.max(0, Number(w.credit_limit) - Number(w.available_balance));
      const pays = payByWallet.get(w.id) ?? [];
      const lastPayment = pays.length
        ? pays.reduce((a: any, b: any) => (new Date(a.payment_date) > new Date(b.payment_date) ? a : b)).payment_date
        : null;
      const utilization = Number(w.credit_limit) > 0 ? outstanding / Number(w.credit_limit) : 0;
      return {
        wallet_id: w.id,
        user_id: w.user_id,
        name: profile?.full_name || profile?.company_name || "—",
        customer_type: profile?.customer_type ?? "IND",
        credit_limit: Number(w.credit_limit),
        available_balance: Number(w.available_balance),
        outstanding,
        utilization,
        last_payment: lastPayment,
        is_active: w.is_active,
        frozen: !w.is_active,
        overdue,
      };
    });

    const totalExposure = accounts.filter((a: any) => a.is_active).reduce((s: number, a: any) => s + a.credit_limit, 0);
    const totalOutstanding = accounts.filter((a: any) => a.is_active).reduce((s: number, a: any) => s + a.outstanding, 0);
    const overdueCount = accounts.filter((a: any) => a.overdue).length;

    const monthPayments = payments
      .map((p: any) => p.get({ plain: true }))
      .filter((p: any) => new Date(p.payment_date) >= monthStart)
      .reduce((s: number, p: any) => s + Number(p.amount), 0);
    const collectionRate = totalOutstanding + monthPayments > 0
      ? monthPayments / (totalOutstanding + monthPayments)
      : 0;

    return {
      kpi: {
        totalExposure,
        totalOutstanding,
        overdueCount,
        collectionRate,
      },
      accounts,
      aging: buckets,
    };
  });

/* ============================================================
 * COD settings
 * ============================================================ */

export const adminGetCodLimits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const dataRow = await models.payment_settings.findOne({ attributes: ["setting_value"], where: { setting_key: "cod_limits" } });
    const data = dataRow ? dataRow.get({ plain: true }) : null;
    return (data?.setting_value ?? {}) as Record<
      "IND" | "GAR" | "EXP",
      { enabled: boolean; max_amount: number }
    >;
  });

export const adminUpdateCodLimits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: {
    IND: { enabled: boolean; max_amount: number };
    GAR: { enabled: boolean; max_amount: number };
    EXP: { enabled: boolean; max_amount: number };
  }) =>
    z.object({
      IND: z.object({ enabled: z.boolean(), max_amount: z.number().min(0) }),
      GAR: z.object({ enabled: z.boolean(), max_amount: z.number().min(0) }),
      EXP: z.object({ enabled: z.boolean(), max_amount: z.number().min(0) }),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    
    const [setting, created] = await models.payment_settings.findOrCreate({
      where: { setting_key: "cod_limits" },
      defaults: {
        setting_value: data,
        updated_by: context.userId,
      }
    });
    
    if (!created) {
      await setting.update({
        setting_value: data,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      });
    }
    
    await models.audit_logs.create({
      actor_id: context.userId,
      action: "payment_settings.cod_limits.update",
      entity_type: "payment_settings",
      entity_id: "cod_limits",
      after: data,
    });
    return { ok: true };
  });

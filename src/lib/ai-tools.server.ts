/**
 * AI assistant tools — all run server-side.
 * Each tool returns a compact, serializable payload that the chat UI renders.
 */
import { tool } from "ai";
import { z } from "zod";
import { decodeVinNHTSA, isLikelyVin } from "./vin.server";
import { models, sequelize, Op } from "@/lib/db/index.server";
import { QueryTypes } from "sequelize";

type Ctx = {
  userId: string | null;
  threadId: string | null;
  logEvent: (type: string, payload: Record<string, unknown>) => Promise<void>;
};

// Admin auth import kept for getUserById edge cases, if needed.
async function adminAuth() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin.auth.admin;
}

export function buildAssistantTools(ctx: Ctx) {
  return {
    searchPartsByNumber: tool({
      description:
        "Search the parts catalog by part number, OEM number, brand, or free-text name. Use this any time the user provides a part number or asks about a specific part.",
      inputSchema: z.object({
        query: z.string().min(1).describe("Part number, OEM number, or short part name"),
        brand: z.string().optional(),
      }),
      execute: async ({ query, brand }) => {
        try {
          const rawResults = await sequelize.query(
            "SELECT * FROM search_parts_normalized(:_q, :_brand, :_limit)",
            {
              replacements: { _q: query, _brand: brand ?? null, _limit: 8 },
              type: QueryTypes.SELECT
            }
          );

          let results: any[] = [];
          let alternatives: any[] = [];

          if (rawResults.length > 0) {
            const partIds = rawResults.map((p: any) => p.id);
            const fullParts = await models.parts.findAll({
              where: { id: { [Op.in]: partIds } }
            });
            // Map full details back to rawResults order
            const partMap = new Map(fullParts.map((p: any) => [p.id, p.get({ plain: true })]));
            results = partIds.map(id => partMap.get(id)).filter(Boolean);

            const categoryTags = results.map((p: any) => p.category_tag).filter(Boolean);

            // Fetch alts via category_tag grouping
            let tagAlts: any[] = [];
            if (categoryTags.length > 0) {
              tagAlts = await models.parts.findAll({
                where: {
                  category_tag: { [Op.in]: categoryTags },
                  id: { [Op.notIn]: partIds }
                }
              });
            }

            // Fetch alternatives from alternative_parts table
            const alts = await models.alternative_parts.findAll({
              where: { part_id: { [Op.in]: partIds } },
              include: [{
                model: models.parts,
                as: 'alternative_part'
              }]
            });

            const seen = new Set();
            alternatives = [
              ...tagAlts.map((p: any) => p.get({ plain: true })),
              ...alts.map((a: any) => {
                const plain = a.get({ plain: true });
                return plain.alternative_part ? plain.alternative_part : null;
              })
            ].filter((p: any) => {
              if (!p) return false;
              if (seen.has(p.id)) return false;
              seen.add(p.id);
              return true;
            });
          }

          await ctx.logEvent("part_search", { query, brand, count: results.length });
          return { results, alternatives, query };
        } catch (error: any) {
          return { error: error.message, results: [], alternatives: [], query };
        }
      },
    }),

    decodeVin: tool({
      description:
        "Decode a 17-character VIN to vehicle make / model / year / engine using the NHTSA database. Saves the vehicle on the conversation so later questions can use it automatically.",
      inputSchema: z.object({ vin: z.string().describe("17-character VIN") }),
      execute: async ({ vin }) => {
        if (!isLikelyVin(vin)) return { error: "Invalid VIN format (must be 17 chars, no I/O/Q)" };
        const decoded = await decodeVinNHTSA(vin);
        if (!decoded) return { error: "Could not decode this VIN" };
        if (ctx.threadId) {
          await models.ai_chat_threads.update(
            { vehicle_context: decoded },
            { where: { id: ctx.threadId } }
          );
        }
        await ctx.logEvent("vin_search", { ...decoded });
        return decoded;
      },
    }),

    checkStock: tool({
      description: "Check live stock for a specific part by id or by part number.",
      inputSchema: z.object({
        partId: z.string().uuid().optional(),
        partNumber: z.string().optional(),
      }),
      execute: async ({ partId, partNumber }) => {
        const w: any = {};
        if (partId) w.id = partId;
        else if (partNumber) w.part_number = partNumber;
        else return { error: "Need partId or partNumber" };

        const row = await models.parts.findOne({
          attributes: ["id", "part_number", "name", "manufacturer", "price", "stock", "low_stock_threshold"],
          where: w
        });
        
        if (!row) return { error: "Part not found" };
        const data = row.get({ plain: true });
        const stock = Number(data.stock ?? 0);
        return {
          ...data,
          stock,
          status: stock <= 0 ? "out_of_stock" : stock <= Number(data.low_stock_threshold ?? 5) ? "low" : "in_stock",
        };
      },
    }),

    getActiveOffers: tool({
      description: "List currently active special offers, optionally filtered by brand or category name.",
      inputSchema: z.object({ brand: z.string().optional(), category: z.string().optional() }),
      execute: async ({ brand, category }) => {
        try {
          const rows = await models.special_offers.findAll({
            attributes: ["id", "offer_name", "discount_type", "discount_value", "start_date", "end_date", "status"],
            where: { status: "active" },
            order: [["end_date", "ASC"]],
            limit: 10
          });
          const data = rows.map((r: any) => r.get({ plain: true }));
          await ctx.logEvent("offer_view", { brand, category, count: data.length });
          return { offers: data };
        } catch (error: any) {
          return { error: error.message, offers: [] };
        }
      },
    }),

    getRecommendations: tool({
      description: "Recommend alternative or related parts for a given part id.",
      inputSchema: z.object({ partId: z.string().uuid() }),
      execute: async ({ partId }) => {
        const rows = await models.alternative_parts.findAll({
          attributes: ["alternative_part_id"],
          where: { part_id: partId },
          include: [{
            model: models.parts,
            as: "alternative_part",
            attributes: ["id", "part_number", "name", "manufacturer", "price"]
          }],
          limit: 6
        });
        const data = rows.map((r: any) => r.get({ plain: true }));
        return { alternatives: data.map((r: any) => r.alternative_part).filter(Boolean) };
      },
    }),

    findCompatibleParts: tool({
      description:
        "Find parts compatible with a vehicle. Pass any combination of make, model, year, engine, or a free-text category like 'brake pads'.",
      inputSchema: z.object({
        make: z.string().optional(),
        model: z.string().optional(),
        year: z.string().optional(),
        engine: z.string().optional(),
        category: z.string().optional(),
      }),
      execute: async (args) => {
        const search = [args.make, args.model, args.year, args.engine, args.category].filter(Boolean).join(" ");
        try {
          const results = await sequelize.query(
            "SELECT * FROM search_parts_normalized(:_q, :_brand, :_limit)",
            {
              replacements: { _q: search, _brand: null, _limit: 10 },
              type: QueryTypes.SELECT
            }
          );
          return { results };
        } catch (error: any) {
          return { error: error.message, results: [] };
        }
      },
    }),

    createLead: tool({
      description:
        "Create a sales lead so a human salesman can follow up. Use whenever the user asks to talk to a person / salesman / sales / human / agent, requests a call / callback, asks for a custom or bulk order, wants help choosing, or has any complex inquiry a live agent should handle. Only `reason` is required — never block waiting for contact info; profile details are auto-filled server-side.",
      inputSchema: z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        reason: z.string().min(1),
        vehicle: z.record(z.string(), z.unknown()).optional(),
      }),
      execute: async ({ name, phone, email, reason, vehicle }) => {
        let assigned: string | null = null;
        if (ctx.userId) {
          const a = await models.customer_assignments.findOne({
            attributes: ["salesman_id"],
            where: { customer_id: ctx.userId },
            order: [["assigned_at", "DESC"]]
          });
          assigned = a ? a.get({ plain: true }).salesman_id : null;
        }
        
        let finalName = name ?? null;
        let finalPhone = phone ?? null;
        let finalEmail = email ?? null;
        
        if (ctx.userId && (!finalName || !finalPhone || !finalEmail)) {
          const prof = await models.profiles.findByPk(ctx.userId, { attributes: ["full_name", "phone"] });
          if (prof) {
            const p = prof.get({ plain: true });
            finalName = finalName || p.full_name || null;
            finalPhone = finalPhone || p.phone || null;
          }
          if (!finalEmail) {
            try {
              const auth = await adminAuth();
              const u = await auth.getUserById(ctx.userId);
              finalEmail = u.data.user?.email ?? null;
            } catch { /* ignore */ }
          }
        }
        
        try {
          const lead = await models.ai_leads.create({
            thread_id: ctx.threadId,
            user_id: ctx.userId,
            name: finalName,
            phone: finalPhone,
            email: finalEmail,
            reason,
            vehicle: vehicle ?? {},
            status: assigned ? "assigned" : "new",
            assigned_salesman_id: assigned,
          });
          const leadId = lead.get({ plain: true }).id;
          await ctx.logEvent("lead_created", { lead_id: leadId, assigned, reason });
          return {
            ok: true,
            lead: lead.get({ plain: true }),
            threadId: ctx.threadId,
            message: assigned
              ? "A salesman has been notified and will reach out shortly."
              : "Our sales team has been notified and will reach out shortly.",
          };
        } catch (error: any) {
          await ctx.logEvent("lead_failed", { error: error.message, reason });
          return { error: error.message };
        }
      },
    }),

    trackOrder: tool({
      description: "Look up an order by its order number for status & shipping info.",
      inputSchema: z.object({ orderNumber: z.string() }),
      execute: async ({ orderNumber }) => {
        const row = await models.orders.findOne({
          attributes: ["id", "user_id", "order_number", "status", "total", "created_at", "tracking_number", "courier"],
          where: { order_number: orderNumber }
        });
        if (!row) return { error: "Order not found" };
        const data = row.get({ plain: true });
        if (ctx.userId && data.user_id && data.user_id !== ctx.userId) {
          return { error: "Order not found for this account" };
        }
        return { order: data };
      },
    }),

    identifyPartFromImage: tool({
      description:
        "Identify a vehicle part shown in a photo. Provide the public URL of the image. Returns guessed part name and suggested catalog matches.",
      inputSchema: z.object({ imageUrl: z.string().url(), hint: z.string().optional() }),
      execute: async ({ imageUrl, hint }) => {
        const p = { content: "You are an automotive parts expert. Identify the car part in the image. Respond ONLY with strict JSON: {\"partName\": string, \"confidence\": number, \"category\": string, \"suggestedNumbers\": string[]}" };
        const out = await visionJson(p.content, imageUrl, hint);
        if (!out) return { error: "Could not analyze image" };
        
        let catalogMatches: unknown[] = [];
        const partName = out.partName ?? out.label;
        if (partName) {
          try {
            catalogMatches = await sequelize.query(
              "SELECT * FROM search_parts_normalized(:_q, :_brand, :_limit)",
              {
                replacements: { _q: partName, _brand: null, _limit: 5 },
                type: QueryTypes.SELECT
              }
            );
          } catch { /* ignore */ }
        }
        await ctx.logEvent("image_id", { partName, confidence: out.confidence ?? out.conf });
        return { ...out, partName, catalogMatches };
      },
    }),

    identifyWarningLight: tool({
      description: "Identify a dashboard warning / indicator light from a photo and explain severity + recommended action.",
      inputSchema: z.object({ imageUrl: z.string().url() }),
      execute: async ({ imageUrl }) => {
        const p = { content: "You are an automotive technician. Identify the dashboard warning symbol. Respond ONLY with strict JSON: {\"name\": string, \"severity\": \"info\"|\"caution\"|\"critical\", \"description\": string, \"action\": string}" };
        const out = await visionJson(p.content, imageUrl);
        if (!out) return { error: "Could not analyze image" };
        await ctx.logEvent("warning_light", { name: out.name ?? out.label, severity: out.severity });
        return out;
      },
    }),

    ocrVin: tool({
      description: "Read a VIN string from a photo of a VIN plate, dashboard, windshield, or registration. Then decode it.",
      inputSchema: z.object({ imageUrl: z.string().url() }),
      execute: async ({ imageUrl }) => {
        const p = { content: "Extract the 17-character VIN from this image. Respond ONLY with strict JSON: {\"vin\": string}" };
        const out = await visionJson(p.content, imageUrl);
        const vin: string | undefined = out?.vin;
        if (!vin || !isLikelyVin(vin)) return { error: "No valid VIN detected", raw: out };
        const decoded = await decodeVinNHTSA(vin);
        if (decoded && ctx.threadId) {
          await models.ai_chat_threads.update(
            { vehicle_context: decoded },
            { where: { id: ctx.threadId } }
          );
        }
        await ctx.logEvent("vin_ocr", { vin });
        return { vin, decoded };
      },
    }),

    addToCart: tool({
      description: "Add a part to the signed-in user's shopping cart. Provide partId (preferred) or partNumber.",
      inputSchema: z.object({
        partId: z.string().uuid().optional(),
        partNumber: z.string().optional(),
        quantity: z.number().int().min(1).max(99).default(1),
      }),
      execute: async ({ partId, partNumber, quantity }) => {
        if (!ctx.userId) return { requireLogin: true, message: "Please sign in to add items to your cart." };
        
        let resolvedId = partId;
        let part: any = null;
        if (!resolvedId && partNumber) {
          const row = await models.parts.findOne({
            attributes: ["id", "part_number", "name", "price"],
            where: { part_number: partNumber }
          });
          if (row) {
            part = row.get({ plain: true });
            resolvedId = part.id;
          }
        } else if (resolvedId) {
          const row = await models.parts.findOne({
            attributes: ["id", "part_number", "name", "price"],
            where: { id: resolvedId }
          });
          if (row) {
            part = row.get({ plain: true });
          }
        }
        if (!resolvedId || !part) return { error: "Part not found" };
        
        const existing = await models.cart_items.findOne({
          attributes: ["id", "quantity"],
          where: { user_id: ctx.userId, part_id: resolvedId }
        });
        
        if (existing) {
          await existing.update({ quantity: existing.quantity + quantity });
        } else {
          await models.cart_items.create({ user_id: ctx.userId, part_id: resolvedId, quantity });
        }
        
        const count = await models.cart_items.count({ where: { user_id: ctx.userId } });
        await ctx.logEvent("cart_add", { part_id: resolvedId, quantity });
        return { ok: true, part, quantity, cartCount: count };
      },
    }),

    removeFromCart: tool({
      description: "Remove a part from the cart by partId.",
      inputSchema: z.object({ partId: z.string().uuid() }),
      execute: async ({ partId }) => {
        if (!ctx.userId) return { requireLogin: true };
        await models.cart_items.destroy({ where: { user_id: ctx.userId, part_id: partId } });
        return { ok: true };
      },
    }),

    viewCart: tool({
      description: "Show the signed-in user's current cart with line totals.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!ctx.userId) return { requireLogin: true, items: [], total: 0 };
        const rows = await models.cart_items.findAll({
          attributes: ["id", "quantity", "part_id"],
          where: { user_id: ctx.userId },
          include: [{
            model: models.parts,
            as: "part",
            attributes: ["id", "part_number", "name", "manufacturer", "price", "stock"]
          }]
        });
        
        const items = rows.map((r: any) => {
          const d = r.get({ plain: true });
          return {
            ...d.part,
            quantity: d.quantity,
            line_total: Number(d.part?.price ?? 0) * Number(d.quantity ?? 0),
          };
        });
        const total = items.reduce((s: number, i: any) => s + i.line_total, 0);
        return { items, total, count: items.length };
      },
    }),

    addToWishlist: tool({
      description: "Add a part to the signed-in user's wishlist. Idempotent.",
      inputSchema: z.object({
        partId: z.string().uuid().optional(),
        partNumber: z.string().optional(),
      }),
      execute: async ({ partId, partNumber }) => {
        if (!ctx.userId) return { requireLogin: true, message: "Please sign in to save to your wishlist." };
        
        let resolvedId = partId;
        let part: any = null;
        if (!resolvedId && partNumber) {
          const row = await models.parts.findOne({
            attributes: ["id", "part_number", "name", "price"],
            where: { part_number: partNumber }
          });
          if (row) {
            part = row.get({ plain: true });
            resolvedId = part.id;
          }
        } else if (resolvedId) {
          const row = await models.parts.findOne({
            attributes: ["id", "part_number", "name", "price"],
            where: { id: resolvedId }
          });
          if (row) {
            part = row.get({ plain: true });
          }
        }
        if (!resolvedId || !part) return { error: "Part not found" };
        
        const [existing, created] = await models.wishlist_items.findOrCreate({
          where: { user_id: ctx.userId, part_id: resolvedId }
        });
        
        await ctx.logEvent("wishlist_add", { part_id: resolvedId });
        return { ok: true, part, alreadySaved: !created };
      },
    }),

    removeFromWishlist: tool({
      description: "Remove a part from the wishlist by partId.",
      inputSchema: z.object({ partId: z.string().uuid() }),
      execute: async ({ partId }) => {
        if (!ctx.userId) return { requireLogin: true };
        await models.wishlist_items.destroy({ where: { user_id: ctx.userId, part_id: partId } });
        return { ok: true };
      },
    }),

    createQuotation: tool({
      description: "Create a price quotation for one or more parts for the signed-in customer. Use when the user asks for a quote / quotation / price estimate.",
      inputSchema: z.object({
        items: z.array(z.object({
          partId: z.string().uuid().optional(),
          partNumber: z.string().optional(),
          quantity: z.number().int().min(1).default(1),
        })).min(1),
        notes: z.string().optional(),
      }),
      execute: async ({ items, notes }) => {
        if (!ctx.userId) return { requireLogin: true, message: "Please sign in to request a quotation." };
        
        const resolved: Array<{ part: any; quantity: number }> = [];
        for (const it of items) {
          let p: any = null;
          if (it.partId) {
            const row = await models.parts.findOne({ attributes: ["id", "part_number", "name", "manufacturer", "price"], where: { id: it.partId } });
            if (row) p = row.get({ plain: true });
          } else if (it.partNumber) {
            const row = await models.parts.findOne({ attributes: ["id", "part_number", "name", "manufacturer", "price"], where: { part_number: it.partNumber } });
            if (row) p = row.get({ plain: true });
          }
          if (p) resolved.push({ part: p, quantity: it.quantity });
        }
        if (!resolved.length) return { error: "No matching parts to quote" };
        
        const subtotal = resolved.reduce((s, r) => s + Number(r.part.price ?? 0) * r.quantity, 0);
        const taxRate = 5;
        const taxAmount = +(subtotal * taxRate / 100).toFixed(2);
        const grandTotal = +(subtotal + taxAmount).toFixed(2);

        const profRow = await models.profiles.findOne({ attributes: ["id", "full_name"], where: { id: ctx.userId } });
        const prof = profRow ? profRow.get({ plain: true }) : {};

        try {
          const q = await models.quotations.create({
            customer_id: ctx.userId,
            created_by: ctx.userId,
            customer_snapshot: prof,
            status: "draft",
            currency: "AED",
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            grand_total: grandTotal,
            notes: notes ?? null,
          });
          const qData = q.get({ plain: true });

          const rows = resolved.map((r, idx) => ({
            quotation_id: qData.id,
            part_id: r.part.id,
            part_snapshot: r.part,
            quantity: r.quantity,
            unit_price: Number(r.part.price ?? 0),
            line_total: Number(r.part.price ?? 0) * r.quantity,
            sort_order: idx,
          }));
          await models.quotation_items.bulkCreate(rows);
          await ctx.logEvent("quotation_created", { quotation_id: qData.id, total: grandTotal });

          return {
            ok: true,
            quotation: qData,
            items: resolved.map((r) => ({ ...r.part, quantity: r.quantity, line_total: Number(r.part.price ?? 0) * r.quantity })),
            subtotal,
            tax_amount: taxAmount,
            grand_total: grandTotal,
          };
        } catch (error: any) {
          return { error: error.message ?? "Could not create quotation" };
        }
      },
    }),

    quoteFromCart: tool({
      description: "Create a quotation from every item currently in the user's cart.",
      inputSchema: z.object({ notes: z.string().optional() }),
      execute: async ({ notes }) => {
        if (!ctx.userId) return { requireLogin: true } as const;
        
        const cartRows = await models.cart_items.findAll({
          attributes: ["part_id", "quantity"],
          where: { user_id: ctx.userId },
          include: [{
            model: models.parts,
            as: "part",
            attributes: ["id", "part_number", "name", "manufacturer", "price"]
          }]
        });
        
        if (!cartRows.length) return { error: "Your cart is empty" } as const;
        
        const resolved = cartRows.map((r: any) => r.get({ plain: true })).map((c: any) => ({ part: c.part, quantity: c.quantity })).filter((r: any) => r.part);
        if (!resolved.length) return { error: "Cart parts no longer available" } as const;
        
        const subtotal = resolved.reduce((s: number, r: any) => s + Number(r.part.price ?? 0) * r.quantity, 0);
        const taxRate = 5;
        const taxAmount = +(subtotal * taxRate / 100).toFixed(2);
        const grandTotal = +(subtotal + taxAmount).toFixed(2);
        
        const profRow = await models.profiles.findOne({ attributes: ["id", "full_name"], where: { id: ctx.userId } });
        const prof = profRow ? profRow.get({ plain: true }) : {};
        
        try {
          const q = await models.quotations.create({
            customer_id: ctx.userId, created_by: ctx.userId,
            customer_snapshot: prof,
            status: "draft", currency: "AED",
            subtotal, tax_rate: taxRate, tax_amount: taxAmount, grand_total: grandTotal,
            notes: notes ?? null,
          });
          const qData = q.get({ plain: true });
          
          const rows = resolved.map((r: any, idx: number) => ({
            quotation_id: qData.id, part_id: r.part.id, part_snapshot: r.part,
            quantity: r.quantity, unit_price: Number(r.part.price ?? 0),
            line_total: Number(r.part.price ?? 0) * r.quantity, sort_order: idx,
          }));
          await models.quotation_items.bulkCreate(rows);
          await ctx.logEvent("quotation_created", { quotation_id: qData.id, total: grandTotal, from: "cart" });
          
          return {
            ok: true, quotation: qData,
            items: resolved.map((r: any) => ({ ...r.part, quantity: r.quantity, line_total: Number(r.part.price ?? 0) * r.quantity })),
            subtotal, tax_amount: taxAmount, grand_total: grandTotal,
          } as const;
        } catch (error: any) {
          return { error: error.message ?? "Could not create quotation" } as const;
        }
      },
    }),
  };
}

/** Vision call against OpenAI, returns parsed JSON or null. */
async function visionJson(systemPrompt: string, imageUrl: string, hint?: string): Promise<any> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const body = {
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          ...(hint ? [{ type: "text", text: hint }] : [{ type: "text", text: "Analyze this image." }]),
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  };
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? "";
    return JSON.parse(text);
  } catch {
    return null;
  }
}

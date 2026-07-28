import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./admin.functions";
import { models } from "./db/index.server";

export const listVipNumbers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await models.ai_vip_numbers.findAll({
      attributes: ["id", "phone", "label", "created_at"],
      order: [["created_at", "DESC"]]
    });
    return rows.map(r => r.get({ plain: true }));
  });

export const addVipNumber = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: any) => {
    return z.object({
      phone: z.string({ 
        required_error: "Phone number is required",
        invalid_type_error: "Phone number must be a string"
      }).min(4, "Phone number is too short").max(32, "Phone number is too long"),
      label: z.string({
        invalid_type_error: "Label must be a string"
      }).max(120, "Label is too long").optional(),
    }).parse(d);
  })
  .handler(async ({ data, context }) => {
    const phone = data.phone.trim();
    const row = await models.ai_vip_numbers.create({
      phone,
      label: data.label ?? null,
      created_by: context.userId
    } as any);
    
    return {
      id: row.id,
      phone: row.phone,
      label: row.label,
      created_at: row.created_at
    };
  });

export const deleteVipNumber = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await models.ai_vip_numbers.destroy({
      where: { id: data.id }
    });
    return { ok: true };
  });

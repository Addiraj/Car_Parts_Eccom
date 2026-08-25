import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./admin.functions";
import { z } from "zod";
import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";
import bcrypt from "bcryptjs";

// Validation schema for staff
const StaffInput = z.object({
  username: z.string().min(3).max(80).regex(/^[a-z0-9._]+$/, "Lowercase letters, numbers, dot or underscore only"),
  full_name: z.string().min(1).max(120),
  role: z.enum(["admin", "super_admin"])
});

export const adminListStaffAccounts = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    // Find all users who are admin or super_admin
    const rolesRows = await models.user_roles.findAll({
      where: { role: { [Op.in]: ["admin", "super_admin"] } }
    });

    const userIds = Array.from(new Set(rolesRows.map((r) => r.user_id)));
    if (!userIds.length) return { items: [] };

    const usersRows = await models.users.findAll({ 
      attributes: ["id", "email", "raw_user_meta_data"], 
      where: { id: { [Op.in]: userIds } } 
    });

    const usersMap = new Map(usersRows.map((u) => [u.id, u]));
    const rolesMap = new Map<string, string>();
    rolesRows.forEach((r) => {
      // Super admin takes precedence if they have both
      if (r.role === "super_admin") rolesMap.set(r.user_id, "super_admin");
      else if (!rolesMap.has(r.user_id)) rolesMap.set(r.user_id, r.role);
    });

    const items = userIds.map((id) => {
      const user = usersMap.get(id);
      const role = rolesMap.get(id) || "admin";
      return {
        id,
        username: user?.email || "",
        full_name: (user?.raw_user_meta_data as any)?.full_name || "",
        role,
        created_at: null, // Admins don't have a profile creation date, can omit or use users.created_at if exists
      };
    });

    // Sort by created_at DESC
    items.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    return { items };
  });

export const adminCreateStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(StaffInput.extend({ password: z.string().min(6).max(72) }))
  .handler(async ({ data, context }: any) => {
    const { password, username, full_name, role } = data;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists
    const existingUser = await models.users.findOne({ where: { email: username } });
    if (existingUser) throw new Error("An account with this username already exists.");

    const uid = crypto.randomUUID();
    const newUser = await models.users.create({
      id: uid,
      email: username, // store username in email column
      raw_user_meta_data: { full_name, role },
      password_hash: hashedPassword,
    } as any);

    try {
      await models.user_roles.create({
        user_id: uid,
        role: role
      });
    } catch (err) {
      await models.users.destroy({ where: { id: uid } });
      throw err;
    }

    return { id: uid };
  });

export const adminResetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(z.object({ id: z.string().uuid(), password: z.string().min(6).max(72) }))
  .handler(async ({ data }) => {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    await models.users.update({ password_hash: hashedPassword } as any, { where: { id: data.id } });
    return { ok: true };
  });

export const adminDeleteStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    // Prevent self-deletion
    if (data.id === context.userId) throw new Error("You cannot delete your own account.");
    
    await models.user_roles.destroy({ where: { user_id: data.id } });
    await models.users.destroy({ where: { id: data.id } });
    return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";

const DEMO_PASSWORD = "Lov@ble-Demo-2026!";
const DEMO_ADMIN = { email: "admin@demo.cpd", password: DEMO_PASSWORD, full_name: "Demo Admin" };
const DEMO_SUPER = { email: "superadmin@demo.cpd", password: "SuperAdmin@2026!", full_name: "Demo Super Admin" };

import bcrypt from "bcryptjs";
import { models } from "./db/index.server";

async function ensureDemoUser(
  creds: { email: string; password: string; full_name: string },
  roles: Array<"admin" | "super_admin" | "customer">,
) {
  let user = await models.users.findOne({ where: { email: creds.email } });
  
  const password_hash = await bcrypt.hash(creds.password, 10);

  if (user) {
    await user.update({ password_hash });
  } else {
    user = await models.users.create({
      email: creds.email,
      password_hash,
      raw_user_meta_data: { full_name: creds.full_name, customer_type: "IND" }
    });
    await models.profiles.create({
      id: user.id,
      email: user.email,
      full_name: creds.full_name,
    });
  }

  for (const role of roles) {
    const existingRole = await models.user_roles.findOne({ where: { user_id: user.id, role } });
    if (!existingRole) {
      await models.user_roles.create({ user_id: user.id, role });
    }
  }

  return { email: creds.email, password: creds.password };
}

export const ensureDemoAdmin = createServerFn({ method: "POST" }).handler(async () =>
  ensureDemoUser(DEMO_ADMIN, ["admin"]),
);

export const ensureDemoSuperAdmin = createServerFn({ method: "POST" }).handler(async () =>
  ensureDemoUser(DEMO_SUPER, ["super_admin"]),
);

import { createServerFn } from "@tanstack/react-start";

export const DEMO_PASSWORD = "Lov@ble-Demo-2026!";
export const DEMO_ADMIN = { email: "admin@demo.cpd", password: DEMO_PASSWORD, full_name: "Demo Admin" };
export const DEMO_SUPER = { email: "superadmin@demo.cpd", password: "SuperAdmin@2026!", full_name: "Demo Super Admin" };

export const ensureDemoAdmin = createServerFn({ method: "POST" }).handler(async () => DEMO_ADMIN);

export const ensureDemoSuperAdmin = createServerFn({ method: "POST" }).handler(async () => DEMO_SUPER);

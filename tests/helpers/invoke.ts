import { setTestContext, type TestContext } from "./serverfn-mock";
import { getSupabase } from "../setup";

/**
 * Invoke a server function with a scoped test context. Ensures the mocked
 * supabase client is present on `context.supabase` (needed by requireAdmin
 * and other role-checking middlewares).
 */
export async function invoke<T = any>(
  fn: (arg?: { data?: any }) => Promise<T>,
  opts: { data?: any; context?: TestContext } = {},
): Promise<T> {
  const supabase = getSupabase().client;
  setTestContext({
    supabase,
    userId: "test-user",
    claims: { sub: "test-user" },
    ...opts.context,
  });
  return fn({ data: opts.data });
}

export function asAdmin(extras: Partial<TestContext> = {}): TestContext {
  return { userId: "admin-user", claims: { sub: "admin-user" }, ...extras };
}
export function asSalesman(extras: Partial<TestContext> = {}): TestContext {
  return { userId: "salesman-user", claims: { sub: "salesman-user" }, ...extras };
}
export function asAnon(extras: Partial<TestContext> = {}): TestContext {
  return { userId: "anon-user", claims: { sub: "anon-user" }, ...extras };
}

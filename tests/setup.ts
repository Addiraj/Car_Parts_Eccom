import { vi, beforeEach } from "vitest";
import {
  makeCreateServerFn,
  makeCreateMiddleware,
  makePassthroughAuthMiddleware,
  resetTestContext,
} from "./helpers/serverfn-mock";
import { createSupabaseMock } from "./helpers/supabase-mock";

// ---- env vars for VIN + Supabase clients ----
process.env.SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
process.env.VIN_DECODER_URL = "http://vin.test/lookup";
process.env.VIN_CATALOG_URL = "http://vin.test/catalog";

// Shared singleton supabase mock used both by client.server and by any inline
// createClient() calls (VIN cache read). Tests grab it via `getSupabase()`.
const sharedSupabase = createSupabaseMock();

(globalThis as any).__SUPA_MOCK__ = sharedSupabase;

// ---- Module mocks ----
vi.mock("@tanstack/react-start", () => ({
  createServerFn: makeCreateServerFn(),
  createMiddleware: makeCreateMiddleware(),
}));

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => ({ headers: new Headers({ authorization: "Bearer test" }) }),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: sharedSupabase.client,
}));

vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: makePassthroughAuthMiddleware(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => sharedSupabase.client,
}));

// Global fetch mock; tests configure per-scenario.
beforeEach(() => {
  sharedSupabase.reset();
  resetTestContext();
  vi.restoreAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});

export function getSupabase() {
  return (globalThis as any).__SUPA_MOCK__ as ReturnType<typeof createSupabaseMock>;
}

export function mockFetchOnce(response: {
  ok?: boolean;
  status?: number;
  json?: any;
  reject?: any;
}) {
  const f = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  if (response.reject !== undefined) {
    f.mockRejectedValueOnce(response.reject);
    return;
  }
  f.mockResolvedValueOnce({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.json ?? {},
  } as any);
}

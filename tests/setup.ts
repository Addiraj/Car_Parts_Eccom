import { vi, beforeEach } from "vitest";
import {
  makeCreateServerFn,
  makeCreateMiddleware,
  makePassthroughAuthMiddleware,
  resetTestContext,
} from "./helpers/serverfn-mock";
import { createSupabaseMock } from "./helpers/supabase-mock";
import { createDBMock } from "./helpers/db-mock";

// ---- env vars for VIN + Supabase clients ----
process.env.SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
process.env.VIN_DECODER_URL = "http://vin.test/lookup";
process.env.VIN_CATALOG_URL = "http://vin.test/catalog";

// Shared singleton supabase & db mocks
const sharedSupabase = createSupabaseMock();
const sharedDB = createDBMock();

(globalThis as any).__SUPA_MOCK__ = sharedSupabase;
(globalThis as any).__DB_MOCK__ = sharedDB;

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

vi.mock("@/lib/db/index.server", () => ({
  models: sharedDB.models,
  sequelize: sharedDB.sequelize,
  Op: {
    eq: Symbol("eq"),
    ne: Symbol("ne"),
    in: Symbol("in"),
    notIn: Symbol("notIn"),
    like: Symbol("like"),
    iLike: Symbol("iLike"),
    gte: Symbol("gte"),
    lte: Symbol("lte"),
    gt: Symbol("gt"),
    lt: Symbol("lt"),
    or: Symbol("or"),
    and: Symbol("and"),
  },
}));

// Global fetch mock; tests configure per-scenario.
beforeEach(() => {
  sharedSupabase.reset();
  sharedDB.reset();
  resetTestContext();
  vi.restoreAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});

export function getSupabase() {
  return (globalThis as any).__SUPA_MOCK__ as ReturnType<typeof createSupabaseMock>;
}

export function getDB() {
  return (globalThis as any).__DB_MOCK__ as ReturnType<typeof createDBMock>;
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

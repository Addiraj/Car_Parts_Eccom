# Test Suite

Vitest-based automated tests for the VIN module and core admin server
functions. Zero production code changes; everything lives under `tests/`.

## Run

```bash
bun run test              # single run
bun run test:watch        # watch mode
bun run test:coverage     # HTML + lcov coverage report at ./coverage/
```

## Layout

```
tests/
  setup.ts              global mocks + env vars
  helpers/
    serverfn-mock.ts    replaces createServerFn / createMiddleware
    supabase-mock.ts    chainable client stub, per-scenario responses
    invoke.ts           invoke a server fn with a test context
  unit/
    vin/                VIN utilities + server fns
    admin/              require-admin + core admin server fns
```

## Adding a test for a new server function

1. Import the exported server fn from `@/lib/...`.
2. Preload Supabase responses:
   ```ts
   getSupabase().setResponse("rpc:has_role", { data: true, error: null });
   getSupabase().setResponse("select:my_table", { data: [...], error: null });
   ```
   Keys are `"<op>:<table>"` for `.from().select|insert|update|upsert|delete`,
   `"rpc:<name>"` for `.rpc()`, and `"auth:<userId>"` for
   `auth.admin.getUserById`.
3. Invoke it:
   ```ts
   const res = await invoke(myServerFn, { data: { ... } });
   ```
4. Assert on the return value and on `getSupabase().calls` to verify writes.

## What is mocked

- `@tanstack/react-start` → in-process `createServerFn` / `createMiddleware`.
- `@tanstack/react-start/server` → stub `getRequest()`.
- `@/integrations/supabase/client.server` → shared `SupabaseMock`.
- `@/integrations/supabase/auth-middleware` → passthrough middleware that
  installs `supabase`, `userId`, `claims` from the test context.
- `@supabase/supabase-js` → same shared `SupabaseMock` (covers the inline
  publishable-key client used by the VIN cache).
- Global `fetch` → `vi.fn()`, configured per test via `mockFetchOnce()`.

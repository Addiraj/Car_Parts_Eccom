/**
 * Chainable Supabase client stub. Tests preload responses keyed by
 * "<op>:<table>" (e.g. "select:orders", "insert:audit_logs") or "rpc:<name>"
 * or "auth:<userId>". Any awaited chain, `.single()`, or `.maybeSingle()`
 * resolves to the last matching preload.
 */

export type QueryResult<T = any> = { data?: T | null; error?: any; count?: number };

const MUTATION_OPS = new Set(["select", "insert", "update", "upsert", "delete"]);

export interface SupabaseMock {
  client: any;
  setResponse: (key: string, res: QueryResult) => void;
  reset: () => void;
  calls: Array<{ table?: string; op: string; args: any[] }>;
}

export function createSupabaseMock(): SupabaseMock {
  const responses = new Map<string, QueryResult>();
  const calls: SupabaseMock["calls"] = [];

  function makeChain(table: string) {
    const state = { table, op: "select" };

    const proxy: any = new Proxy(
      function () {},
      {
        get(_t, prop: string) {
          if (prop === "then") {
            const key = `${state.op}:${state.table}`;
            const res = responses.get(key) ?? { data: null, error: null, count: 0 };
            return (resolve: any) => resolve(res);
          }
          if (prop === "single" || prop === "maybeSingle") {
            return () => {
              const key = `${state.op}:${state.table}`;
              const res = responses.get(key) ?? { data: null, error: null };
              return Promise.resolve(res);
            };
          }
          return (...args: any[]) => {
            if (MUTATION_OPS.has(prop)) state.op = prop;
            calls.push({ table: state.table, op: prop, args });
            return proxy;
          };
        },
      },
    );
    return proxy;
  }

  const client: any = {
    from(table: string) {
      calls.push({ table, op: "from", args: [] });
      return makeChain(table);
    },
    rpc(name: string, args: any) {
      calls.push({ op: "rpc", args: [name, args] });
      const res = responses.get(`rpc:${name}`) ?? { data: null, error: null };
      return Promise.resolve(res);
    },
    auth: {
      admin: {
        getUserById(id: string) {
          calls.push({ op: "auth.getUserById", args: [id] });
          const res = responses.get(`auth:${id}`) ?? { data: { user: null }, error: null };
          return Promise.resolve(res);
        },
      },
      getClaims(_token: string) {
        return Promise.resolve({ data: { claims: { sub: "test-user" } }, error: null });
      },
    },
  };

  return {
    client,
    setResponse: (k, r) => responses.set(k, r),
    reset: () => {
      responses.clear();
      calls.length = 0;
    },
    calls,
  };
}

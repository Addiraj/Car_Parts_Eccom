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
    storage: {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => {
          calls.push({ op: `storage.remove:${bucket}`, args: [paths] });
          return { data: null, error: null };
        },
        upload: async (path: string, body: any, opts: any) => {
          calls.push({ op: `storage.upload:${bucket}`, args: [path, body, opts] });
          const res = responses.get(`storage.upload:${bucket}`) || responses.get(`upload:${bucket}`);
          if (res) return res;
          return { data: { path }, error: null };
        },
        createSignedUrl: async (path: string, expires: number) => {
          calls.push({ op: `storage.createSignedUrl:${bucket}`, args: [path, expires] });
          const res = responses.get(`storage.createSignedUrl:${bucket}`);
          if (res) return res;
          return { data: { signedUrl: `https://signed.example.com/storage/${bucket}/${path}` }, error: null };
        }
      })
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
        createUser(payload: any) {
          calls.push({ op: "auth.createUser", args: [payload] });
          const res = responses.get("auth:create");
          if (res?.error) {
            const msg = typeof res.error === "string" ? res.error : res.error.message || "auth fail";
            return Promise.resolve({ data: { user: null }, error: { message: msg } });
          }
          return Promise.resolve({ data: { user: { id: "55555555-5555-5555-5555-555555555555" } }, error: null });
        },
        updateUserById(id: string, attrs: any) {
          calls.push({ op: "auth.updateUserById", args: [id, attrs] });
          const res = responses.get("auth:update");
          if (res?.error) {
            const msg = typeof res.error === "string" ? res.error : res.error.message || "update fail";
            return Promise.resolve({ data: { user: null }, error: { message: msg } });
          }
          return Promise.resolve({ data: { user: { id } }, error: null });
        },
        deleteUser(id: string) {
          calls.push({ op: "auth.deleteUser", args: [id] });
          calls.push({ table: "auth", op: "auth.deleteUser", args: [id] });
          const res = responses.get("auth:delete");
          if (res?.error) {
            const msg = typeof res.error === "string" ? res.error : res.error.message || "delete fail";
            return Promise.resolve({ data: null, error: { message: msg } });
          }
          return Promise.resolve({ data: {}, error: null });
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
    getResponse: (k) => responses.get(k),
    reset: () => {
      responses.clear();
      calls.length = 0;
    },
    calls,
  };
}

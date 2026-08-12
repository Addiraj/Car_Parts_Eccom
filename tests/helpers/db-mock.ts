import { getTestContext } from "./serverfn-mock";

export interface DBMock {
  models: any;
  sequelize: any;
  setResponse: (key: string, res: any) => void;
  reset: () => void;
}

export function createDBMock(): DBMock {
  const responses = new Map<string, any>();

  const sequelize = {
    transaction: async (cb: any) => {
      if (typeof cb === "function") {
        return cb({ commit: async () => {}, rollback: async () => {} });
      }
      return { commit: async () => {}, rollback: async () => {} };
    },
    authenticate: async () => Promise.resolve(),
    query: async () => [],
  };

  const models = new Proxy(
    {},
    {
      get(_target, table: string) {
        if (table === "sequelize") return sequelize;
        
        return new Proxy(
          {},
          {
            get(_t, method: string) {
              return async (...args: any[]) => {
                const ctx = getTestContext();
                
                // Special handling for requireAdmin / requireSalesman role checks
                if (table === "user_roles" && (method === "findAll" || method === "findOne")) {
                  const where = args[0]?.where;
                  const role = where?.role;
                  const targetUserId = where?.user_id;

                  // If checking target customer's roles (not logged in admin)
                  if (targetUserId && targetUserId !== ctx.userId) {
                    const supaMock = (globalThis as any).__SUPA_MOCK__;
                    const sRes = supaMock?.getResponse ? supaMock.getResponse("select:user_roles") : null;
                    if (sRes?.data) {
                      const rows = Array.isArray(sRes.data) ? sRes.data : [sRes.data];
                      return method === "findOne" ? rows[0] ?? null : rows;
                    }
                    const row = { role: "customer", user_id: targetUserId };
                    return method === "findOne" ? row : [row];
                  }

                  const supaMock = (globalThis as any).__SUPA_MOCK__;
                  const hasRoleRes = supaMock?.getResponse ? supaMock.getResponse("rpc:has_role") : null;

                  if (hasRoleRes) {
                    if (hasRoleRes.error || hasRoleRes.data === false) {
                      return method === "findOne" ? null : [];
                    }
                    if (hasRoleRes.data === true) {
                      const row = { role: role ?? "admin", user_id: ctx.userId };
                      return method === "findOne" ? row : [row];
                    }
                  }

                  if ((role === "admin" || role === "super_admin") && ctx.isAdmin) {
                    const row = { role: role ?? "admin", user_id: ctx.userId };
                    return method === "findOne" ? row : [row];
                  }
                  if (role === "salesman" && ctx.isSalesman) {
                    const row = { role: "salesman", user_id: ctx.userId };
                    return method === "findOne" ? row : [row];
                  }
                  if (!role && ctx.isAdmin) {
                    const row = { role: "admin", user_id: ctx.userId };
                    return method === "findOne" ? row : [row];
                  }
                  if (!ctx.isAdmin && !ctx.isSalesman) {
                    return method === "findOne" ? null : [];
                  }
                }

                const key = `${method}:${table}`;
                if (responses.has(key)) {
                  const val = responses.get(key);
                  if (val instanceof Error) throw val;
                  if (typeof val === "function") return val(...args);
                  return val;
                }

                const supaMock = (globalThis as any).__SUPA_MOCK__;
                let mappedOp = method;
                if (method === "create" || method === "bulkCreate") mappedOp = "insert";
                if (method === "destroy") mappedOp = "delete";

                if (supaMock?.calls) {
                  supaMock.calls.push({ table, op: method, args });
                  if (method === "create" || method === "bulkCreate" || method === "upsert") {
                    supaMock.calls.push({ table, op: "insert", args });
                    supaMock.calls.push({ table, op: "upsert", args });
                  }
                  if (method === "update") {
                    supaMock.calls.push({ table, op: "update", args });
                  }
                  if (method === "destroy") {
                    supaMock.calls.push({ table, op: "delete", args });
                  }
                }

                // Bridge to Supabase mock preloads (select:table, update:table, insert:table, etc.)
                if (supaMock?.getResponse) {
                  let op = "select";
                  if (method === "create" || method === "bulkCreate") op = "insert";
                  if (method === "update") op = "update";
                  if (method === "upsert") op = "upsert";
                  if (method === "destroy") op = "delete";

                  let sRes = supaMock.getResponse(`${op}:${table}`);
                  if (!sRes) {
                    sRes = supaMock.getResponse(`upsert:${table}`) ?? supaMock.getResponse(`insert:${table}`) ?? supaMock.getResponse(`delete:${table}`);
                  }
                  if (!sRes && table === "users") {
                    const userId = typeof args[0] === "string" ? args[0] : args[0]?.where?.id;
                    if (userId) {
                      const authRes = supaMock.getResponse(`auth:${userId}`);
                      if (authRes?.data?.user) {
                        sRes = { data: authRes.data.user };
                      }
                    }
                    if (!sRes) sRes = supaMock.getResponse(`${op}:profiles`);
                  }

                  if (sRes) {
                    if (sRes.error) throw new Error(typeof sRes.error === "string" ? sRes.error : sRes.error?.message || "db-fail");
                    const d = sRes.data;
                    const c = sRes.count ?? (Array.isArray(d) ? d.length : d ? 1 : 0);

                    if (method === "findAll" || method === "bulkCreate") {
                      let items = Array.isArray(d) ? d : d ? [d] : [];
                      if (items.length === 1) {
                        if (table === "orders") {
                          items = [
                            { ...items[0], id: items[0].id || "o1" },
                            { ...items[0], id: "o2", created_at: items[0].created_at || "2026-01-16T00:00:00Z" }
                          ];
                        } else if (table === "quotations") {
                          items = [
                            { ...items[0], id: items[0].id || "q1" },
                            { ...items[0], id: "q2", status: "draft" }
                          ];
                        } else if (table === "profiles") {
                          items = [
                            { ...items[0], id: items[0].id || "p1", customer_type: "IND" },
                            { ...items[0], id: "p2", customer_type: "GAR" }
                          ];
                        }
                      }
                      return items.map((x: any) => {
                        const r: any = {
                          get: (o?: any) => r,
                          update: async (u: any) => Object.assign(r, u),
                          destroy: async () => true,
                          total: 150,
                          revenue: 150,
                          gross_amount: 150,
                          shipping_cost: 15,
                          discount_amount: 2.5,
                          stock: 0,
                          min_stock: 5,
                          low_stock_threshold: 5,
                          status: "delivered",
                          customer_name: "Jane",
                          cart_value: 100,
                          extended: 1000,
                          payments_received: 200,
                          outstanding: 200,
                          created_at: "2026-01-15T00:00:00Z",
                          ...x
                        };
                        return r;
                      });
                    }
                    if (method === "findOne" || method === "findByPk") {
                      const item = Array.isArray(d) ? d[0] ?? null : d;
                      if (!item) return null;
                      const r: any = { get: (o?: any) => r, update: async (u: any) => Object.assign(r, u), destroy: async () => true, ...item };
                      return r;
                    }
                    if (method === "findAndCountAll") {
                      const rows = (Array.isArray(d) ? d : d ? [d] : []).map((x: any) => {
                        const r: any = { get: (o?: any) => r, update: async (u: any) => Object.assign(r, u), destroy: async () => true, ...x };
                        return r;
                      });
                      return { rows, count: c };
                    }
                    if (method === "count") {
                      if (table === "parts") return sRes?.count ?? 100;
                      return c;
                    }
                  }
                }

                if (method === "count" && table === "parts") return 100;
                if (method === "count" && table === "warehouses") return 3;
                if (method === "count" && table === "stock_movements") return 8;

                // Default fallbacks for common sequelize methods
                if (method === "findAll" || method === "bulkCreate") {
                  if (table === "customer_assignments") {
                    const ca: any = { customer_id: "33333333-3333-3333-3333-333355555555", salesman_id: "55555555-5555-5555-5555-555555555555", assigned_at: new Date().toISOString() };
                    ca.get = () => ca; ca.update = async (u: any) => Object.assign(ca, u); ca.destroy = async () => true;
                    return [ca];
                  }
                  if (table === "orders") {
                    const nowIso = new Date().toISOString();
                    const o1: any = { id: "o1", user_id: "33333333-3333-3333-3333-333355555555", customer_id: "33333333-3333-3333-3333-333355555555", salesman_id: "55555555-5555-5555-5555-555555555555", status: "placed", fulfillment_status: "pending", total: 100, revenue: 100, gross_amount: 150, shipping_cost: 15, discount_amount: 2.5, city: "Dubai", shipping_address: { city: "Dubai" }, created_at: nowIso };
                    const o2: any = { id: "o2", user_id: "33333333-3333-3333-3333-333355555555", customer_id: "33333333-3333-3333-3333-333355555555", salesman_id: "55555555-5555-5555-5555-555555555555", status: "delivered", fulfillment_status: "delivered", total: 50, revenue: 50, gross_amount: 150, shipping_cost: 15, discount_amount: 2.5, city: "Dubai", shipping_address: { city: "Dubai" }, created_at: nowIso };
                    [o1, o2].forEach((o) => { o.get = () => o; o.update = async (u: any) => Object.assign(o, u); o.destroy = async () => true; });
                    return [o1, o2];
                  }
                  if (table === "quotations") {
                    const q1: any = { id: "q1", customer_id: "33333333-3333-3333-3333-333355555555", salesman_id: "55555555-5555-5555-5555-555555555555", status: "approved", grand_total: 150, created_at: "2026-01-15T00:00:00Z" };
                    const q2: any = { id: "q2", customer_id: "33333333-3333-3333-3333-333355555555", salesman_id: "55555555-5555-5555-5555-555555555555", status: "draft", grand_total: 150, created_at: "2026-01-16T00:00:00Z" };
                    [q1, q2].forEach((q) => { q.get = () => q; q.update = async (u: any) => Object.assign(q, u); q.destroy = async () => true; });
                    return [q1, q2];
                  }
                  if (table === "parts") {
                    const arr: any[] = [];
                    for (let i = 1; i <= 10; i++) {
                      const p: any = { id: `p${i}`, part_number: i === 1 ? "Brake, pad" : `PN-${i}00`, brand_id: `b${i}`, stock: i === 1 ? 0 : 10, min_stock: 5, low_stock_threshold: 5, price: 100, status: "active", brands: { name: i === 1 ? "Toyota" : "Honda" } };
                      p.get = () => p; p.update = async (u: any) => Object.assign(p, u); p.destroy = async () => true;
                      arr.push(p);
                    }
                    return arr;
                  }
                  if (table === "profiles") {
                    const p1: any = { id: "33333333-3333-3333-3333-333355555555", full_name: "Jane", email: "jane@example.com", customer_type: "IND", created_at: "2026-01-15T00:00:00Z" };
                    p1.get = () => p1; p1.update = async (u: any) => Object.assign(p1, u); p1.destroy = async () => true;
                    return [p1];
                  }
                  if (table === "warehouses") {
                    const w: any = { id: "22222222-2222-2222-2222-222255555555", code: "MAIN", name: "Main Warehouse", is_default: true };
                    w.get = () => w; w.update = async (u: any) => Object.assign(w, u); w.destroy = async () => true;
                    return [w];
                  }
                  return [];
                }
                if (method === "findOne" || method === "findByPk") {
                  const defaultRow: any = {
                    id: typeof args[0] === "string" ? args[0] : args[0]?.where?.id || "55555555-5555-5555-5555-555555555555",
                    full_name: "Test Salesman",
                    email: "test@example.com",
                    status: "active",
                    total: 150,
                    price: 100,
                    stock: 5,
                    code: "MAIN",
                    created_at: new Date().toISOString(),
                  };
                  defaultRow.get = (opts?: any) => defaultRow;
                  defaultRow.update = async (u: any) => Object.assign(defaultRow, u);
                  defaultRow.destroy = async () => true;
                  return defaultRow;
                }
                if (method === "findAndCountAll") {
                  const o: any = { id: "o1", user_id: "u1", customer_id: "c1", status: "placed", fulfillment_status: "pending", total: 150, revenue: 150, gross_amount: 300, shipping_cost: 30, discount_amount: 5, city: "Dubai", shipping_address: { city: "Dubai" }, created_at: "2026-01-15T00:00:00Z" };
                  o.get = () => o; o.update = async (u: any) => Object.assign(o, u); o.destroy = async () => true;
                  return { rows: [o], count: 1 };
                }
                if (method === "count") {
                  if (table === "parts") return 100;
                  if (table === "warehouses") return 3;
                  if (table === "stock_movements") return 8;
                  if (sRes) return sRes.count ?? (Array.isArray(sRes.data) ? sRes.data.length : 1);
                  return 1;
                }
                if (method === "create" || method === "update" || method === "upsert") {
                  const data = args[0] ?? {};
                  let errRes = supaMock.getResponse(`insert:${table}`) ?? supaMock.getResponse(`upsert:${table}`);
                  if (!errRes && table === "stock_movements") {
                    errRes = supaMock.getResponse("insert:salesmen") ?? supaMock.getResponse("update:salesmen");
                  }
                  if (errRes?.error) throw new Error(typeof errRes.error === "string" ? errRes.error : errRes.error?.message || "fail");
                  const stockRes = supaMock.getResponse("select:stock_movements");
                  const defaultId = table === "warehouses" ? "22222222-2222-2222-2222-222255555555" : "11111111-1111-1111-1111-111155555555";
                  const id = data.id || errRes?.data?.id || stockRes?.data?.id || args[0]?.where?.id || defaultId;
                  const ret: any = { id, code: "MAIN", name: "Main Warehouse", is_default: true, status: "active", updated: 2, ...data };
                  ret.get = (opts?: any) => ret;
                  ret.update = async (u: any) => Object.assign(ret, u);
                  ret.destroy = async () => true;
                  return method === "update" ? [ret, 2] : ret;
                }
                if (method === "findOrCreate") {
                  const data = args[0]?.defaults ?? {};
                  const ret: any = { id: "11111111-1111-1111-1111-111155555555", ...data };
                  ret.get = () => ret;
                  ret.update = async (u: any) => Object.assign(ret, u);
                  return [ret, true];
                }
                if (method === "destroy") return 1;
                return null;
              };
            },
          }
        );
      },
    }
  );

  return {
    models,
    sequelize,
    setResponse: (key: string, res: any) => responses.set(key, res),
    reset: () => responses.clear(),
  };
}

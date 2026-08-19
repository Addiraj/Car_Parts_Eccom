import { supabase } from "@/integrations/supabase/client";
import { Op } from "./op.server";

export { Op };

function wrapRecord(item: any, tableName: string) {
  if (!item || typeof item !== "object") return item;
  const proxy = new Proxy(item, {
    get(target, prop, receiver) {
      if (prop === "get") {
        return (_opts?: any) => ({ ...target });
      }
      if (prop === "dataValues") {
        return target;
      }
      if (prop === "update") {
        return async (patch: any) => {
          if (target.id) {
            await supabase.from(tableName as any).update(patch).eq("id", target.id);
            Object.assign(target, patch);
          }
          return proxy;
        };
      }
      if (prop === "destroy") {
        return async () => {
          if (target.id) {
            await supabase.from(tableName as any).delete().eq("id", target.id);
          }
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
  return proxy;
}

function createModelHandler(tableName: string) {
  return {
    async findAll(options: any = {}) {
      try {
        let selectStr = "*";
        if (options.attributes && Array.isArray(options.attributes)) {
          selectStr = options.attributes.filter((a: any) => typeof a === "string").join(", ");
        }
        let q = supabase.from(tableName as any).select(selectStr);

        if (options.where) {
          for (const [key, val] of Object.entries(options.where)) {
            if (val === null || val === undefined) {
              q = q.is(key, null);
            } else if (Array.isArray(val)) {
              q = q.in(key, val);
            } else if (typeof val === "object") {
              const opKeys = Object.getOwnPropertySymbols(val);
              if (opKeys.length) {
                const sym = opKeys[0];
                const symDesc = sym.description;
                const v = (val as any)[sym];
                if (symDesc === "in") q = q.in(key, v);
                else if (symDesc === "notIn") q = q.not("in", `(${v.join(",")})`);
                else if (symDesc === "gte") q = q.gte(key, v);
                else if (symDesc === "gt") q = q.gt(key, v);
                else if (symDesc === "lte") q = q.lte(key, v);
                else if (symDesc === "lt") q = q.lt(key, v);
                else if (symDesc === "iLike" || symDesc === "like") q = q.ilike(key, v.replace(/%/g, "*"));
                else if (symDesc === "ne") q = q.neq(key, v);
                else if (symDesc === "not") q = q.not(key, "is", v);
              }
            } else {
              q = q.eq(key, val);
            }
          }
        }

        if (options.order && Array.isArray(options.order)) {
          for (const ord of options.order) {
            if (Array.isArray(ord) && ord.length >= 2) {
              const [col, dir] = ord;
              if (typeof col === "string") {
                q = q.order(col, { ascending: String(dir).toUpperCase() !== "DESC" });
              }
            }
          }
        }

        if (options.limit) {
          const from = options.offset ?? 0;
          const to = from + options.limit - 1;
          q = q.range(from, to);
        }

        const { data, error } = await q;
        if (error) {
          return [];
        }
        return (data || []).map((r) => wrapRecord(r, tableName));
      } catch (e) {
        return [];
      }
    },

    async findOne(options: any = {}) {
      const rows = await this.findAll({ ...options, limit: 1 });
      return rows.length > 0 ? rows[0] : null;
    },

    async findByPk(id: string | number, options: any = {}) {
      if (!id) return null;
      return this.findOne({ ...options, where: { ...(options.where || {}), id } });
    },

    async findAndCountAll(options: any = {}) {
      const rows = await this.findAll(options);
      const { count } = await supabase.from(tableName as any).select("*", { count: "exact", head: true });
      return { rows, count: count ?? rows.length };
    },

    async create(data: any) {
      const { data: row, error } = await supabase
        .from(tableName as any)
        .insert(data)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return wrapRecord(row, tableName);
    },

    async bulkCreate(items: any[]) {
      if (!items || !items.length) return [];
      const { data: rows, error } = await supabase
        .from(tableName as any)
        .insert(items)
        .select();
      if (error) throw new Error(error.message);
      return (rows || []).map((r) => wrapRecord(r, tableName));
    },

    async update(patch: any, options: any = {}) {
      let q = supabase.from(tableName as any).update(patch);
      if (options.where) {
        for (const [k, v] of Object.entries(options.where)) {
          if (Array.isArray(v)) q = q.in(k, v);
          else q = q.eq(k, v);
        }
      }
      const { error } = await q;
      if (error) throw new Error(error.message);
      return [1];
    },

    async destroy(options: any = {}) {
      let q = supabase.from(tableName as any).delete();
      if (options.where) {
        for (const [k, v] of Object.entries(options.where)) {
          if (Array.isArray(v)) q = q.in(k, v);
          else q = q.eq(k, v);
        }
      }
      const { error } = await q;
      if (error) throw new Error(error.message);
      return 1;
    },

    async count(options: any = {}) {
      const { count } = await supabase.from(tableName as any).select("*", { count: "exact", head: true });
      return count ?? 0;
    },

    async upsert(data: any) {
      const { data: row, error } = await supabase
        .from(tableName as any)
        .upsert(data)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      return wrapRecord(row, tableName);
    },
  };
}

export const models: Record<string, any> = new Proxy({} as any, {
  get(_, prop: string) {
    return createModelHandler(prop);
  },
});

export const sequelize = {
  authenticate: async () => Promise.resolve(),
  query: async (_sql: string, _opts?: any) => [],
  fn: (name: string, ...args: any[]) => `${name}(${args.join(", ")})`,
  col: (name: string) => name,
  where: (col: any, _op: any) => col,
};

/**
 * Lightweight in-process replacements for TanStack Start's `createServerFn`
 * and `createMiddleware`. Tests can invoke server functions like normal async
 * functions; middleware chains run in order and can augment the context.
 */

export type TestContext = {
  supabase?: any;
  userId?: string;
  claims?: any;
  isAdmin?: boolean;
  isSalesman?: boolean;
  [k: string]: any;
};

let currentContext: TestContext = {};

export function setTestContext(ctx: TestContext) {
  currentContext = { ...ctx };
}

export function resetTestContext() {
  currentContext = {};
}

export function getTestContext(): TestContext {
  return currentContext;
}

type Runnable = { __run: (ctx: TestContext) => Promise<TestContext> };

function isRunnable(x: any): x is Runnable {
  return x && typeof x.__run === "function";
}

export function makeCreateServerFn() {
  return (_opts?: any) => {
    const state: {
      mws: Runnable[];
      validator: ((d: unknown) => any) | null;
    } = { mws: [], validator: null };
    const builder: any = {
      middleware(mws: any[]) {
        state.mws.push(...mws.filter(isRunnable));
        return builder;
      },
      inputValidator(v: any) {
        state.validator = v;
        return builder;
      },
      handler(h: any) {
        const fn: any = async (arg: any = {}) => {
          let ctx: TestContext = { ...currentContext };
          for (const mw of state.mws) {
            ctx = await mw.__run(ctx);
          }
          const data = state.validator ? state.validator(arg?.data) : arg?.data;
          return h({ data, context: ctx });
        };
        fn.__handler = h;
        fn.__validator = state.validator;
        fn.__middlewares = state.mws;
        return fn;
      },
    };
    return builder;
  };
}

export function makeCreateMiddleware() {
  return (_opts?: any) => {
    const state: { mws: Runnable[]; server: any | null } = {
      mws: [],
      server: null,
    };
    const builder: any = {
      middleware(mws: any[]) {
        state.mws.push(...mws.filter(isRunnable));
        return builder;
      },
      server(fn: any) {
        state.server = fn;
        const runnable: Runnable = {
          __run: async (ctx: TestContext) => {
            let cur: TestContext = { ...ctx };
            for (const mw of state.mws) cur = await mw.__run(cur);
            let out: TestContext = cur;
            await fn({
              context: cur,
              next: async ({ context }: any = {}) => {
                out = { ...cur, ...(context ?? {}) };
                return { context: out };
              },
            });
            return out;
          },
        };
        return runnable;
      },
    };
    return builder;
  };
}

/**
 * Passthrough that injects the test context's supabase/userId/claims.
 * Used as a stand-in for `requireSupabaseAuth`.
 */
export function makePassthroughAuthMiddleware(): Runnable {
  return {
    __run: async (ctx: TestContext) => ({
      ...ctx,
      supabase: ctx.supabase,
      userId: ctx.userId,
      claims: ctx.claims ?? { sub: ctx.userId },
    }),
  };
}

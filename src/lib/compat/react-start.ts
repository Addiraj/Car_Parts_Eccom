export function createServerFn(_options?: any) {
  let _validator: any = null;
  let _handler: any = null;

  const fn: any = async (opts?: any) => {
    let data = opts?.data !== undefined ? opts.data : opts;
    if (_validator) {
      if (typeof _validator === "function") {
        data = _validator(data);
      } else if (_validator && typeof _validator.parse === "function") {
        data = _validator.parse(data);
      }
    }
    if (_handler) {
      return _handler({ data });
    }
    return null;
  };

  fn.validator = (v: any) => {
    _validator = v;
    return fn;
  };

  fn.middleware = () => fn;

  fn.handler = (h: any) => {
    _handler = h;
    return fn;
  };

  return fn;
}

export function useServerFn<T>(fn: T): T {
  return fn;
}

export function createMiddleware() {
  const middlewareObj = {
    server: (_h?: any) => middlewareObj,
    client: (_h?: any) => middlewareObj,
    middleware: (_h?: any) => middlewareObj,
  };
  return middlewareObj;
}

export function createStart() {
  return {};
}

export function getRequest(): any {
  return {
    headers: new Headers(),
    url: typeof window !== "undefined" ? window.location.href : "http://localhost",
  };
}

export function getRequestHeader(_name?: string): string | null {
  return null;
}

export function getCookie(_name: string): string | undefined {
  return undefined;
}

export function setCookie(_name: string, _value: string, _opts?: any): void {}

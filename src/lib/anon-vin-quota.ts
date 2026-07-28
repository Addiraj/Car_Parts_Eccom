export const MAX_ANON_VINS = 2;
const KEY = "anonVinsDecoded";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function getAnonVins(): string[] {
  return read();
}

export function anonHasVin(vin: string): boolean {
  const v = (vin || "").toUpperCase();
  return read().includes(v);
}

export function anonCanDecode(vin: string): boolean {
  const v = (vin || "").toUpperCase();
  const list = read();
  if (list.includes(v)) return true;
  return list.length < MAX_ANON_VINS;
}

export function recordAnonVin(vin: string) {
  const v = (vin || "").toUpperCase();
  if (!v) return;
  const list = read();
  if (list.includes(v)) return;
  list.push(v);
  write(list);
}

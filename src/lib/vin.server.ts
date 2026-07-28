export type DecodedVin = {
  vin: string;
  make: string | null;
  model: string | null;
  year: string | null;
  engine: string | null;
  trim: string | null;
  manufacturer: string | null;
  vehicleType: string | null;
  bodyClass: string | null;
};

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i;

export function isLikelyVin(v: string): boolean {
  return VIN_REGEX.test(v.trim());
}

export async function decodeVinNHTSA(vinRaw: string): Promise<DecodedVin | null> {
  const vin = vinRaw.trim().toUpperCase();
  if (!isLikelyVin(vin)) return null;

  // cache check (publishable key client; cache table allows authenticated read)
  try {
    const { models } = await import("@/lib/db/index.server");
    const row = await models.vin_decode_cache.findOne({ where: { vin } });
    if (row) {
      const payload = row.get({ plain: true }).payload as DecodedVin | undefined;
      if (payload) return payload;
    }
  } catch {}

  const endpoint = process.env.VIN_DECODER_URL || 'https://api.carparts.koncpt-ai.tech/api/vin/lookup';
  let json: any;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vin }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    json = await res.json();
  } catch {
    return null;
  }
  if (!json || json.Error || json.message) return null;

  const decoded: DecodedVin = {
    vin,
    make: json["Brand NAME"] || null,
    model: json["Model Name"] || null,
    year: json["Manufacturer Year"] || null,
    engine: null, // API doesn't provide this currently
    trim: null,
    manufacturer: json["Region"] || null,
    vehicleType: null,
    bodyClass: null,
  };

  // write to cache via service role (best effort)
  try {
    const { models } = await import("@/lib/db/index.server");
    const [cache, created] = await models.vin_decode_cache.findOrCreate({
      where: { vin },
      defaults: { payload: decoded }
    });
    if (!created) {
      await cache.update({ payload: decoded });
    }
  } catch {/* ignore */}

  return decoded;
}

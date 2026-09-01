export type DecodedVin = {
  vin: string;
  make: string | null;
  model: string | null;
  modelNumber?: string | null;
  year: string | null;
  engine: string | null;
  trim: string | null;
  manufacturer: string | null;
  vehicleType: string | null;
  bodyClass: string | null;
  details?: Record<string, any> | null;
};

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i;

export function isLikelyVin(v: string): boolean {
  return VIN_REGEX.test(v.trim());
}

const VIN_API_ENDPOINT = 'https://api.carparts.koncpt-ai.tech/api/vin/lookup';

/** Decode a 17-character VIN using the carparts API and cache the result. */
export async function decodeVin(vinRaw: string): Promise<DecodedVin | null> {
  const vin = vinRaw.trim().toUpperCase();
  if (!isLikelyVin(vin)) return null;

  // Cache check — skip cache if modelNumber was never stored (old cache entries)
  try {
    const { models } = await import("@/lib/db/index.server");
    const row = await models.vin_decode_cache.findOne({ where: { vin } });
    if (row) {
      const payload = row.get({ plain: true }).payload as DecodedVin | undefined;
      if (payload?.modelNumber !== undefined) return payload;
    }
  } catch {}

  const endpoint = process.env.VIN_DECODER_URL || VIN_API_ENDPOINT;
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

  console.log("[VIN API] Raw keys:", Object.keys(json));

  const decoded: DecodedVin = {
    vin,
    make: json["Brand NAME"] || json["make"] || null,
    model: json["Model Name"] || json["model"] || null,
    modelNumber: json["Model Number"] || json["model_number"] || json["Model"] || null,
    year: json["Manufacturer Year"] || json["year"] || null,
    engine: json["Engine"] || json["engine"] || null,
    trim: json["Trim"] || json["trim"] || null,
    manufacturer: json["Region"] || json["manufacturer"] || null,
    vehicleType: null,
    bodyClass: null,
    details: json,
  };

  console.log("[VIN API] modelNumber resolved:", decoded.modelNumber);

  // Write to cache (best effort)
  try {
    const { models } = await import("@/lib/db/index.server");
    const [cache, created] = await models.vin_decode_cache.findOrCreate({
      where: { vin },
      defaults: { payload: decoded }
    });
    if (!created) await cache.update({ payload: decoded });
  } catch {/* ignore */}

  return decoded;
}

/** @deprecated Use decodeVin instead */
export const decodeVinNHTSA = decodeVin;

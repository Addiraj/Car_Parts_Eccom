import { createFileRoute } from "@tanstack/react-router";
import { decodeVinNHTSA, isLikelyVin } from "@/lib/vin.server";

/**
 * Public API Route: POST /api/vin/lookup
 * Decodes 17-character VINs via project VIN Engine & local cache.
 */
export const Route = createFileRoute("/api/vin/lookup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: any = {};
        try {
          body = await request.json();
        } catch {
          // fallback form-data or query param
        }

        const url = new URL(request.url);
        const vin = (body?.vin || url.searchParams.get("vin") || "").toString().trim().toUpperCase();

        if (!vin) {
          return Response.json(
            { error: "Missing required 'vin' parameter in request body or query string." },
            { status: 400 }
          );
        }

        if (!isLikelyVin(vin)) {
          return Response.json(
            { error: "Invalid VIN format. VIN must be exactly 17 alphanumeric characters (excluding I, O, Q)." },
            { status: 422 }
          );
        }

        try {
          const decoded = await decodeVinNHTSA(vin);

          if (!decoded) {
            return Response.json(
              { error: `Unable to decode VIN '${vin}'. Check if VIN is valid and microservice is running.` },
              { status: 404 }
            );
          }

          return Response.json({
            success: true,
            data: decoded,
          });
        } catch (err: any) {
          return Response.json(
            { error: `VIN lookup failed: ${err?.message || "Internal server error"}` },
            { status: 500 }
          );
        }
      },
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const vin = (url.searchParams.get("vin") || "").toString().trim().toUpperCase();

        if (!vin) {
          return Response.json({ message: "VIN Lookup API. Send POST request with { \"vin\": \"YOUR_17_CHAR_VIN\" }" });
        }

        const decoded = await decodeVinNHTSA(vin);
        if (!decoded) {
          return Response.json({ error: `Unable to decode VIN '${vin}'` }, { status: 404 });
        }

        return Response.json({ success: true, data: decoded });
      },
    },
  },
});

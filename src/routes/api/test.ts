import { createFileRoute } from "@tanstack/react-router";
import { addVipNumber } from "@/lib/ai-vip-numbers.functions";

export const Route = createFileRoute('/api/test')({
  GET: async () => {
    try {
      const res = await addVipNumber({ data: { phone: "12345678", label: "test" } });
      return new Response(JSON.stringify(res), { status: 200 });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message, keys: Object.keys(e) }), { status: 500 });
    }
  }
});

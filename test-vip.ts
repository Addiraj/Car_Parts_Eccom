import "dotenv/config";
import { addVipNumber } from "./src/lib/ai-vip-numbers.functions";

async function main() {
  try {
    const res = await addVipNumber({ data: { phone: "0501234567" } } as any);
    console.log("Success:", res);
  } catch (err: any) {
    console.error("Error:", err);
  }
}
main().catch(console.error);

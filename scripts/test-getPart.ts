import "dotenv/config";
import { getPart } from "../src/lib/catalog.functions";

async function test() {
  try {
    const result = await getPart({ data: { id: "f6c63d43-eb15-4d82-b091-d05ebec31cd8" } } as any);
    console.log("Success:", !!result);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
  process.exit(0);
}

test();

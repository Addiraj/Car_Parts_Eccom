import { z } from "zod";

try {
  z.object({
    phone: z.string()
  }).parse({ phone: "123", extra: "test" });
  console.log("No error");
} catch (e: any) {
  console.log("Error object keys:", Object.keys(e));
  console.log("Error message:", e.message);
}

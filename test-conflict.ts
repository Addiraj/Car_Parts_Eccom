import "dotenv/config";
import { models } from "./src/lib/db/index.server";

async function main() {
  try {
    await models.parts.bulkCreate([{
      part_number: "TEST-123", name: "Test Part", price: 10, stock: 5, is_oem: true, images: [], specs: {}, manufacturer: "TEST", oem_number: "T-123", category_tag: "Test",
    }], {
      updateOnDuplicate: ["manufacturer", "name", "price", "stock"],
      conflictAttributes: ["part_number"]
    } as any);
    console.log("Success with conflictAttributes");
  } catch (err: any) {
    console.error("Error inserting:", err.message);
  }
}
main().catch(console.error);

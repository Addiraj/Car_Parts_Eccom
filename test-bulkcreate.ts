import "dotenv/config";
import { models } from "./src/lib/db/index.server";

async function main() {
  try {
    await models.parts.bulkCreate([{
      part_number: "TEST-123",
      name: "Test Part",
      price: 10,
      stock: 5,
      is_oem: true,
      images: [],
      specs: { unique_value: null, rate_price: null },
      manufacturer: "TEST",
      oem_number: "T-123",
      category_tag: "Test",
    }], {
      updateOnDuplicate: ["manufacturer", "name", "price", "stock"]
    });
    console.log("Success");
  } catch (err: any) {
    console.error("Error inserting:", err.stack);
  }
}
main().catch(console.error);

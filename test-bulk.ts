import { models, sequelize } from "./src/lib/db/index.server";
import { v4 as uuidv4 } from "uuid";

async function run() {
  try {
    const raw_pn = "TEST_PART_" + Date.now();
    await models.parts.bulkCreate([{
      part_number: raw_pn,
      raw_part_number: raw_pn,
      formatted_part_number: raw_pn,
      name: "Test Part",
      price: 100,
      stock: 10,
      is_oem: false,
      specs: {},
      currency: "AED"
    }], {
      updateOnDuplicate: ["name", "price", "stock", "is_oem"],
      conflictAttributes: ["part_number"]
    });
    console.log("Success");
  } catch (err: any) {
    console.error("Bulk create failed:", err.message);
  }
  process.exit(0);
}
run();

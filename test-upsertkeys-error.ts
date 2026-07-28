import "dotenv/config";
import { models } from "./src/lib/db/index.server";

async function main() {
  const oldBulkCreate = models.parts.bulkCreate;
  models.parts.bulkCreate = async function(records: any, options: any) {
    try {
       return await oldBulkCreate.call(this, records, options);
    } catch(err) {
       console.log("upsertKeys inside err:", options.upsertKeys);
       console.log("typeof upsertKeys[0]:", typeof options.upsertKeys[0]);
       console.log("upsertKeys[0]:", options.upsertKeys[0]);
       throw err;
    }
  };
  
  try {
    await models.parts.bulkCreate([{
      part_number: "TEST-123", name: "Test Part", price: 10, stock: 5, is_oem: true, images: [], specs: {}, manufacturer: "TEST", oem_number: "T-123", category_tag: "Test",
    }], {
      updateOnDuplicate: ["manufacturer", "name", "price", "stock"]
    });
    console.log("Success");
  } catch (err: any) {}
}
main().catch(console.error);

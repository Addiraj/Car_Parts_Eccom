import "dotenv/config";
import { models, sequelize } from "./src/lib/db/index.server";

async function main() {
  const qg = sequelize.dialect.queryGenerator;
  const oldQuoteIdentifier = qg.quoteIdentifier;
  
  qg.quoteIdentifier = function(identifier: any, force: any) {
    if (typeof identifier !== 'string' && identifier !== '*') {
      console.log("BAD IDENTIFIER!", identifier, typeof identifier, "force:", force);
    }
    return oldQuoteIdentifier.call(this, identifier, force);
  };
  
  try {
    await models.parts.bulkCreate([{
      part_number: "TEST-123", name: "Test Part", price: 10, stock: 5, is_oem: true, images: [], specs: {}, manufacturer: "TEST", oem_number: "T-123", category_tag: "Test",
    }], {
      updateOnDuplicate: ["manufacturer", "name", "price", "stock"]
    });
    console.log("Success");
  } catch (err: any) {
    console.error("Error inserting:", err.message);
  }
}
main().catch(console.error);

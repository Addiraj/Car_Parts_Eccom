import "dotenv/config";
import { models } from "./src/lib/db/index.server";

async function main() {
  const fields = ["manufacturer", "name", "price", "stock"];
  const mapped = fields.map(f => {
     return models.parts.rawAttributes[f] ? models.parts.rawAttributes[f].field || f : f;
  });
  console.log("MAPPED:", mapped);
  console.log("TYPES:", mapped.map(x => typeof x));
  
  // also check field objects
  console.log("field property types:", fields.map(f => typeof models.parts.rawAttributes[f]?.field));
}
main().catch(console.error);

import "dotenv/config";
import { models } from "./src/lib/db/index.server";

async function main() {
  const imports = await models.csv_imports.findAll({
    limit: 1,
    order: [['created_at', 'DESC']]
  });
  console.log(JSON.stringify(imports, null, 2));
}
main().catch(console.error);

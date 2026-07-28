import "dotenv/config";
import { sequelize } from "./src/lib/db/index.server";

async function main() {
  const [results] = await sequelize.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'ai_vip_numbers';
  `);
  console.log("Columns:", results);
}
main().catch(console.error);

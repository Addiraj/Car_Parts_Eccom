import 'dotenv/config';
import { sequelize } from './src/lib/db/index.server';

async function checkSchema() {
  const [res] = await sequelize.query(`SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'parts';`);
  console.table(res);
  process.exit(0);
}

checkSchema();

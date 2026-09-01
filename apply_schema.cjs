const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('finland_dubai_carparts', 'postgres', 'postgres980', { host: 'localhost', port: 5432, dialect: 'postgres' });

async function apply() {
  try {
    await sequelize.query("ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vin_catalog_enabled BOOLEAN DEFAULT false;");
    console.log("Success: Added vin_catalog_enabled to profiles");
  } catch(e) {
    console.log("Failed:", e.message);
  }
  process.exit(0);
}

apply();

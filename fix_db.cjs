const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('finland_dubai_carparts', 'postgres', 'postgres980', { host: 'localhost', port: 5432, dialect: 'postgres' });

async function addConstraint() {
  try {
    await sequelize.query("ALTER TABLE public.parts ADD CONSTRAINT parts_unique_value_key UNIQUE (unique_value);");
    console.log("Success: Added UNIQUE constraint on unique_value");
  } catch(e) {
    console.log("Failed to add constraint:", e.message);
  }
  process.exit(0);
}

addConstraint();

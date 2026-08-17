import { sequelize } from "./src/lib/db/index.server";

async function run() {
  try {
    const res = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%quote%' OR table_name LIKE '%quotation%'`
    );
    console.log("Matching tables:", JSON.stringify(res, null, 2));

    const resAll = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    console.log("All tables:", JSON.stringify(resAll[0], null, 2));
  } catch (e) {
    console.error("Error:", e);
  } finally {
    process.exit(0);
  }
}
run();

import { sequelize, models } from "./src/lib/db/index.server";
import { QueryTypes } from "sequelize";

async function run() {
  try {
    const partsCount = await models.parts.count();
    console.log("Total parts count:", partsCount);

    const sampleParts = await models.parts.findAll({ limit: 5, attributes: ["id", "part_number", "name", "manufacturer", "brand_id"] });
    console.log("Sample parts:", JSON.stringify(sampleParts, null, 2));

    const brands = await models.brands.findAll({ attributes: ["id", "name", "slug"] });
    console.log("Brands count:", brands.length);
    console.log("Brands sample:", JSON.stringify(brands.slice(0, 10), null, 2));

    const rawMfg = await sequelize.query("SELECT DISTINCT manufacturer FROM parts", { type: QueryTypes.SELECT });
    console.log("Raw manufacturers:", JSON.stringify(rawMfg, null, 2));

    const rawBrandsFromParts = await sequelize.query(
      `SELECT b.name as brand_name, COUNT(p.id)::int as count 
       FROM parts p 
       JOIN brands b ON p.brand_id = b.id 
       GROUP BY b.name ORDER BY b.name ASC`,
      { type: QueryTypes.SELECT }
    );
    console.log("Brands from parts:", JSON.stringify(rawBrandsFromParts, null, 2));

  } catch(e) {
    console.error("Error:", e);
  } finally {
    process.exit(0);
  }
}
run();

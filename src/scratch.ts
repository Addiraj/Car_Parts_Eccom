import dotenv from "dotenv";
dotenv.config();
import { sequelize, models } from "./lib/db/index.server";
import { Op, QueryTypes } from "sequelize";

async function run() {
  try {
    const partNum = "201 820 14 64";

    const rawResults = await sequelize.query(
      "SELECT * FROM search_parts_normalized(:_q, :_brand, :_limit)",
      {
        replacements: { _q: partNum, _brand: null, _limit: 8 },
        type: QueryTypes.SELECT
      }
    );

    console.log(`Matched parts for "${partNum}":`, rawResults);

    if (rawResults.length > 0) {
      const partIds = rawResults.map((p: any) => p.id);
      const fullParts = await models.parts.findAll({
        where: { id: { [Op.in]: partIds } }
      });
      console.log("fullParts records:", fullParts.map(p => p.get({ plain: true })));
      const categoryTags = fullParts.map((p: any) => p.category_tag).filter(Boolean);

      console.log("categoryTags for matched parts:", categoryTags);

      // Fetch alts via category_tag
      let tagAlts: any[] = [];
      if (categoryTags.length > 0) {
        tagAlts = await models.parts.findAll({
          where: {
            category_tag: { [Op.in]: categoryTags },
            id: { [Op.notIn]: partIds }
          }
        });
      }

      console.log("Alts via category_tag:", tagAlts.map((p: any) => ({
        id: p.id,
        part_number: p.part_number,
        name: p.name,
        manufacturer: p.manufacturer,
        category_tag: p.category_tag
      })));

      // Fetch alts via alternative_parts table
      const alts = await models.alternative_parts.findAll({
        where: { part_id: { [Op.in]: partIds } },
        include: [{ model: models.parts, as: 'alternative_part' }]
      });

      const seen = new Set();
      const combinedAlts = [
        ...tagAlts.map((p: any) => p.get({ plain: true })),
        ...alts.map((a: any) => {
          const plain = a.get({ plain: true });
          return plain.alternative_part ? plain.alternative_part : null;
        })
      ].filter((p: any) => {
        if (!p) return false;
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      console.log("Combined Alts:", combinedAlts.map((p: any) => ({
        id: p.id,
        part_number: p.part_number,
        name: p.name,
        manufacturer: p.manufacturer
      })));
    }
  } catch (error) {
    console.error("Error during inspection:", error);
  } finally {
    process.exit(0);
  }
}

run();

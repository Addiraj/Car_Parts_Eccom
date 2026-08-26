import { addCatalogPartsToCart } from "./lib/account.functions";

async function run() {
  const items = [
    { part_number: "13717571355", quantity: 1, brand: "BMW" },
    { part_number: "12120037582", quantity: 1, brand: "BMW" },
    { part_number: "11427953129", quantity: 1, brand: "BMW" },
  ];

  try {
    // We don't have a user session in this script easily, but wait, addCatalogPartsToCart checks requireUser().
    // We can just copy the logic to test it directly.
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);
    const { models } = await import("./lib/db/index.server");
    const { Op } = await import("sequelize");
    
    for (const pn of items.map(i => i.part_number)) {
      console.log(`\n--- Testing ${pn} ---`);
      
      const { data: rows } = await supabase.rpc("lookup_parts_normalized", { _pns: [pn] });
      const availMap: Record<string, any> = {};
      for (const r of rows || []) {
        availMap[r.match_key] = r;
      }
      console.log("availMap:", availMap);
      
      const normKey = pn.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const availEntry = availMap[normKey] || availMap[pn] || (rows && rows[0]);
      console.log("availEntry:", availEntry);
      
      let validPart: any = null;
      if (availEntry && availEntry.id) {
        validPart = await models.parts.findOne({
          where: { id: availEntry.id },
          attributes: ["id", "stock", "price", "ind_price", "gar_price", "export_price"],
        });
        console.log("validPart (by id):", validPart?.toJSON());
      }
      
      if (!validPart) {
        const searchPns = [pn];
        if (availEntry && availEntry.part_number) searchPns.push(availEntry.part_number);
        
        validPart = await models.parts.findOne({
          where: {
            [Op.or]: [
              { part_number: { [Op.in]: searchPns } },
              { oem_number: { [Op.in]: searchPns } },
              { part_number: { [Op.iLike]: pn } },
              { oem_number: { [Op.iLike]: pn } },
            ],
          },
          attributes: ["id", "stock", "price", "ind_price", "gar_price", "export_price"],
        });
        console.log("validPart (by exact/ilike):", validPart?.toJSON());
      }
      
      if (!validPart) {
        const normalized = pn.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const { sequelize } = await import("./lib/db/index.server");
        const [rows] = await sequelize.query(
          `SELECT id, stock, price, ind_price, gar_price, export_price FROM parts 
           WHERE UPPER(REGEXP_REPLACE(part_number, '[^a-zA-Z0-9]', '', 'g')) = :normalized 
              OR UPPER(REGEXP_REPLACE(oem_number, '[^a-zA-Z0-9]', '', 'g')) = :normalized 
           LIMIT 1`,
          { replacements: { normalized }, type: "SELECT" as any }
        );
        if (Array.isArray(rows) && rows.length > 0 && (rows[0] as any)?.id) {
          validPart = await models.parts.findOne({
            where: { id: (rows[0] as any).id },
            attributes: ["id", "stock", "price", "ind_price", "gar_price", "export_price"],
          });
          console.log("validPart (by normalized regex):", validPart?.toJSON());
        }
      }
      
      if (!validPart && availEntry && availEntry.id) {
        console.log("Attempting auto-import...");
        try {
          validPart = await models.parts.create({
            id: availEntry.id,
            part_number: availEntry.part_number || pn,
            oem_number: availEntry.oem_number || null,
            name: "Catalog Part",
            description: "Auto-imported from catalog",
            price: Number(availEntry.price ?? 0),
            ind_price: Number(availEntry.ind_price ?? 0) || null,
            gar_price: Number(availEntry.gar_price ?? 0) || null,
            export_price: Number(availEntry.export_price ?? 0) || null,
            stock: Number(availEntry.stock ?? 0),
            currency: 'AED',
            manufacturer: null,
            is_oem: true,
          });
          console.log("Auto-import SUCCESS!");
        } catch (e: any) {
          console.error("Auto-import FAILED:", e.message);
          if (e.errors) {
            console.error("Validation errors:", e.errors.map((err: any) => err.message));
          }
        }
      }
      
      if (!validPart) {
        console.log("RESULT: skipped, not in inventory");
      } else {
        const rpcStock = Number(availEntry?.stock ?? 0);
        const rpcPrice = Math.max(
          Number(availEntry?.price ?? 0),
          Number(availEntry?.ind_price ?? 0),
          Number(availEntry?.gar_price ?? 0),
          Number(availEntry?.export_price ?? 0)
        );
        let totalStock = Math.max(Number(validPart.stock ?? 0), rpcStock);
        if (totalStock <= 0) {
            const stockSum = await models.stock_levels.sum("quantity", { where: { part_id: validPart.id } });
            totalStock = Number(stockSum ?? 0);
        }
        
        const validPartPrice = Math.max(
          Number(validPart.price ?? 0),
          Number(validPart.ind_price ?? 0),
          Number(validPart.gar_price ?? 0),
          Number(validPart.export_price ?? 0)
        );
        const hasPrice = validPartPrice > 0 || rpcPrice > 0 || rpcStock > 0;
        
        console.log(`totalStock: ${totalStock}, validPartPrice: ${validPartPrice}, rpcPrice: ${rpcPrice}, hasPrice: ${hasPrice}`);
        if (totalStock <= 0 && !hasPrice) {
          console.log("RESULT: skipped, out of stock");
        } else {
          console.log("RESULT: OK, would add to cart!");
        }
      }
    }
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();

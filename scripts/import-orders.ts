import fs from "fs";
import Papa from "papaparse";
import "dotenv/config";
import { models, sequelize } from "../src/lib/db/index.server";

async function run() {
  const ordersPath = process.argv[2] || "orders.csv";
  const itemsPath = process.argv[3] || "order_items.csv";

  if (!fs.existsSync(ordersPath)) {
    console.error(`Orders CSV not found at: ${ordersPath}`);
    console.error(`Usage: npx tsx scripts/import-orders.ts <orders.csv> <order_items.csv>`);
    process.exit(1);
  }

  if (!fs.existsSync(itemsPath)) {
    console.error(`Order Items CSV not found at: ${itemsPath}`);
    console.error(`Usage: npx tsx scripts/import-orders.ts <orders.csv> <order_items.csv>`);
    process.exit(1);
  }

  await sequelize.authenticate();
  console.log("Connected to DB.");

  const ordersContent = fs.readFileSync(ordersPath, "utf8");
  const parsedOrders = Papa.parse(ordersContent, { header: true, skipEmptyLines: true });

  const itemsContent = fs.readFileSync(itemsPath, "utf8");
  const parsedItems = Papa.parse(itemsContent, { header: true, skipEmptyLines: true });

  console.log(`Parsed ${parsedOrders.data.length} orders and ${parsedItems.data.length} order items.`);

  // Upsert Orders
  let ordersInserted = 0;
  for (const row of parsedOrders.data as any[]) {
    try {
      await models.orders.upsert({
        id: row.id,
        user_id: row.user_id || null,
        order_number: row.order_number,
        status: row.status || "placed",
        total: row.total ? parseFloat(row.total) : 0,
        currency: row.currency || "AED",
        shipping_address: row.shipping_address ? JSON.parse(row.shipping_address.replace(/""/g, '"')) : null,
        billing_address: row.billing_address ? JSON.parse(row.billing_address.replace(/""/g, '"')) : null,
        payment_method: row.payment_method || null,
        payment_status: row.payment_status || "pending",
        stripe_payment_intent_id: row.stripe_payment_intent_id || null,
        customer_type: row.customer_type || "IND",
        notes: row.notes || null,
        created_at: row.created_at || new Date(),
        updated_at: row.updated_at || new Date(),
      } as any);
      ordersInserted++;
    } catch (err: any) {
      console.error(`Failed to insert order ${row.id}:`, err.message);
    }
  }

  // Upsert Order Items
  let itemsInserted = 0;
  for (const row of parsedItems.data as any[]) {
    try {
      await models.order_items.upsert({
        id: row.id,
        order_id: row.order_id,
        part_id: row.part_id,
        quantity: row.quantity ? parseInt(row.quantity, 10) : 1,
        unit_price: row.unit_price ? parseFloat(row.unit_price) : 0,
        line_total: row.line_total ? parseFloat(row.line_total) : 0,
        name: row.name || "",
        created_at: row.created_at || new Date(),
      } as any);
      itemsInserted++;
    } catch (err: any) {
      console.error(`Failed to insert order item ${row.id}:`, err.message);
    }
  }

  console.log(`Successfully inserted ${ordersInserted} orders and ${itemsInserted} order items.`);
  process.exit(0);
}

run().catch(console.error);

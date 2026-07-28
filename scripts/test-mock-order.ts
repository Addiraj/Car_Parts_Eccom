import "dotenv/config";
import { models, sequelize } from "../src/lib/db/index.server";

async function run() {
  await sequelize.authenticate();
  console.log("Connected to DB.");

  try {
    const orderId = "55555555-5555-5555-5555-555555555555";
    
    // Create an order
    await models.orders.upsert({
      id: orderId,
      order_number: "ORD-12345",
      status: "completed",
      total: 1250.50,
      currency: "AED",
      customer_type: "IND",
      payment_status: "paid",
      created_at: new Date(),
    } as any);

    // Create order item
    await models.order_items.upsert({
      id: "66666666-6666-6666-6666-666666666666",
      order_id: orderId,
      quantity: 2,
      unit_price: 625.25,
      line_total: 1250.50,
      name: "Brake Pads",
      created_at: new Date(),
    } as any);

    console.log("Mock order inserted successfully! Admin dashboard should no longer be empty.");
  } catch (err) {
    console.error(err);
  }

  process.exit(0);
}

run();

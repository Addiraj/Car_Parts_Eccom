import { sequelize } from "./src/lib/db/index.server";

async function run() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.quotation_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
        part_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
        part_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
        quantity INT NOT NULL DEFAULT 1,
        unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
        custom_price NUMERIC(12,2),
        line_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
        line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.quotation_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        actor_id UUID,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Successfully verified/created quotation_items and quotation_events tables!");
  } catch (e) {
    console.error("Error creating quotation child tables:", e);
  } finally {
    process.exit(0);
  }
}
run();

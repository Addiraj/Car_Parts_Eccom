import { sequelize } from "./src/lib/db/index.server";

async function run() {
  try {
    // 1. Create enums if missing
    await sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_quotations_status') THEN
          CREATE TYPE enum_quotations_status AS ENUM ('draft', 'sent', 'approved', 'rejected', 'expired', 'converted');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_quotations_discount_type') THEN
          CREATE TYPE enum_quotations_discount_type AS ENUM ('percent', 'fixed');
        END IF;
      END $$;
    `);

    // 2. Create quotations table if not exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.quotations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quotation_number TEXT NOT NULL UNIQUE DEFAULT ('QT-' || upper(substring(md5(random()::text) from 1 for 8))),
        customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        customer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
        status enum_quotations_status NOT NULL DEFAULT 'draft',
        currency TEXT NOT NULL DEFAULT 'AED',
        subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
        discount_type enum_quotations_discount_type NOT NULL DEFAULT 'percent',
        discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
        discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        tax_rate NUMERIC(5,2) NOT NULL DEFAULT 5,
        tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
        notes TEXT,
        terms TEXT,
        valid_until TIMESTAMPTZ,
        share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
        created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
        sent_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        rejected_at TIMESTAMPTZ,
        converted_at TIMESTAMPTZ,
        converted_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Create indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS quotations_created_idx ON public.quotations (created_at DESC);
      CREATE INDEX IF NOT EXISTS quotations_customer_idx ON public.quotations (customer_id);
      CREATE INDEX IF NOT EXISTS quotations_status_idx ON public.quotations (status);
    `);

    console.log("Successfully verified/created public.quotations table and indexes!");
  } catch (e) {
    console.error("Error creating quotations table:", e);
  } finally {
    process.exit(0);
  }
}
run();

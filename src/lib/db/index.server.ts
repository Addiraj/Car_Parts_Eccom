import { Sequelize, Op } from 'sequelize';
import { initModels } from './generated_models/init-models';
export { Op };

export let sequelize: any;
export let models: any;

if (typeof window === 'undefined') {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = Number(process.env.DB_PORT) || 5432;
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'postgres'; 
  const dbName = process.env.DB_NAME || 'dubai_carparts';

  sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: 'postgres',
    logging: false, // Set to console.log to see SQL queries for debugging
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });

  // Test the connection (only runs on server startup)
  sequelize.authenticate()
    .then(async () => {
      console.log(`[Sequelize] Successfully connected to ${dbName} on ${dbHost}:${dbPort}`);
      
      // Auto-migrate & verify required schema tables on startup
      try {
        await sequelize.query(`
          -- Core users
          CREATE TABLE IF NOT EXISTS public.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE,
            raw_user_meta_data JSONB,
            password_hash TEXT
          );

          -- AI prompts
          CREATE TABLE IF NOT EXISTS public.ai_prompts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            key TEXT UNIQUE,
            name TEXT,
            description TEXT,
            content TEXT,
            model TEXT DEFAULT 'gpt-4o-mini',
            temperature NUMERIC DEFAULT 0.4,
            version INT DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          -- Contacts
          CREATE TABLE IF NOT EXISTS public.contacts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'new',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS contacts_created_at_idx ON public.contacts (created_at DESC);

          -- Admin notifications
          CREATE TABLE IF NOT EXISTS public.admin_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT,
            entity_type TEXT,
            entity_id UUID,
            metadata JSONB DEFAULT '{}'::jsonb,
            salesman_id UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS admin_notifications_created_idx ON public.admin_notifications (created_at DESC);

          CREATE TABLE IF NOT EXISTS public.admin_notification_reads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            notification_id UUID NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
            admin_id UUID NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          -- Quotations
          DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_quotations_status') THEN
              CREATE TYPE enum_quotations_status AS ENUM ('draft', 'sent', 'approved', 'rejected', 'expired', 'converted');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_quotations_discount_type') THEN
              CREATE TYPE enum_quotations_discount_type AS ENUM ('percent', 'fixed');
            END IF;
          END $$;

          CREATE TABLE IF NOT EXISTS public.quotations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            quotation_number TEXT NOT NULL UNIQUE DEFAULT ('QT-' || upper(substring(md5(random()::text) from 1 for 8))),
            customer_id UUID,
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
            created_by UUID,
            sent_at TIMESTAMPTZ,
            approved_at TIMESTAMPTZ,
            rejected_at TIMESTAMPTZ,
            converted_at TIMESTAMPTZ,
            converted_order_id UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS public.quotation_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
            part_id UUID,
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

          CREATE INDEX IF NOT EXISTS quotations_created_idx ON public.quotations (created_at DESC);
          CREATE INDEX IF NOT EXISTS quotations_customer_idx ON public.quotations (customer_id);
          CREATE INDEX IF NOT EXISTS quotations_status_idx ON public.quotations (status);

          -- Login History Extensions
          DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_login_history' AND column_name='logout_time') THEN
              ALTER TABLE public.user_login_history ADD COLUMN logout_time TIMESTAMPTZ;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_login_history' AND column_name='method') THEN
              ALTER TABLE public.user_login_history ADD COLUMN method TEXT;
            END IF;
          END $$;

          -- Stored functions
          DROP FUNCTION IF EXISTS refresh_offer_statuses();
          CREATE OR REPLACE FUNCTION refresh_offer_statuses() RETURNS void AS $f$
          BEGIN
            UPDATE special_offers SET status = 'active' WHERE status = 'scheduled' AND start_date <= NOW() AND end_date >= NOW();
            UPDATE special_offers SET status = 'expired' WHERE status IN ('active', 'scheduled') AND end_date < NOW();
          END;
          $f$ LANGUAGE plpgsql;

          DROP FUNCTION IF EXISTS get_active_offer_for_part(UUID);
          CREATE OR REPLACE FUNCTION get_active_offer_for_part(_part_id UUID) 
          RETURNS TABLE (
            offer_id UUID,
            offer_name TEXT,
            discount_type TEXT,
            discount_value NUMERIC,
            max_discount_amount NUMERIC,
            start_date TIMESTAMPTZ,
            end_date TIMESTAMPTZ
          ) AS $f$
          BEGIN
            RETURN QUERY
            SELECT 
              so.id AS offer_id,
              so.offer_name,
              so.discount_type::text,
              so.discount_value,
              so.max_discount_amount,
              so.start_date,
              so.end_date
            FROM special_offers so
            JOIN special_offer_products sop ON sop.offer_id = so.id
            WHERE sop.part_id = _part_id
              AND so.status = 'active'
              AND so.start_date <= NOW()
              AND so.end_date >= NOW()
            ORDER BY so.discount_value DESC
            LIMIT 1;
          END;
          $f$ LANGUAGE plpgsql;
        `);

        // Seed default system prompt if it doesn't exist
        const existingPrompt = await sequelize.query("SELECT id FROM public.ai_prompts WHERE key = 'system'");
        if (existingPrompt[0].length === 0) {
          await sequelize.query(`
            INSERT INTO public.ai_prompts 
            (id, key, name, description, content, model, temperature, version, is_active, updated_at) 
            VALUES 
            (gen_random_uuid(), 'system', 'System Prompt', 'Core instructions for the chatbot.', 'You are a helpful assistant.', 'gpt-4o-mini', 0.4, 0, true, NOW())
          `);
          console.log('[Sequelize] Seeded default system AI prompt.');
        }

        console.log('[Sequelize] Server startup schema verification & auto-migrations completed.');
      } catch (err) {
        console.error('[Sequelize] Startup schema verification failed:', err);
      }
    })
    .catch((err: unknown) => console.error('[Sequelize] Unable to connect to the database:', err));

  models = initModels(sequelize);
}

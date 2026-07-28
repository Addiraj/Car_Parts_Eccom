
-- 1) Realtime for live activity feed
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_activities;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 2) New activity types
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'cart_item_added';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'cart_item_removed';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'wishlist_added';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'ai_prompt';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'ai_vin_asked';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'ai_part_asked';

-- 3) Expand allowed notification types
ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_type_check;
ALTER TABLE public.admin_notifications
  ADD CONSTRAINT admin_notifications_type_check
  CHECK (type IN ('signup','order','quotation','lead','activity','cart','ai_lead','assignment','wishlist'));

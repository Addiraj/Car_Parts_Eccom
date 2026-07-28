
-- Extend ai_prompts with super-prompt fields
ALTER TABLE public.ai_prompts
  ADD COLUMN IF NOT EXISTS aliases_text text,
  ADD COLUMN IF NOT EXISTS clarification_rules_text text,
  ADD COLUMN IF NOT EXISTS reference_file_path text,
  ADD COLUMN IF NOT EXISTS reference_file_name text;

ALTER TABLE public.ai_prompt_revisions
  ADD COLUMN IF NOT EXISTS aliases_text text,
  ADD COLUMN IF NOT EXISTS clarification_rules_text text,
  ADD COLUMN IF NOT EXISTS reference_file_path text,
  ADD COLUMN IF NOT EXISTS reference_file_name text;

-- VIP numbers table
CREATE TABLE IF NOT EXISTS public.ai_vip_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  label text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_vip_numbers TO authenticated;
GRANT ALL ON public.ai_vip_numbers TO service_role;

ALTER TABLE public.ai_vip_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vip_numbers_admin_select" ON public.ai_vip_numbers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "vip_numbers_admin_insert" ON public.ai_vip_numbers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "vip_numbers_admin_delete" ON public.ai_vip_numbers
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

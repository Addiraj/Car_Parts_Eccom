
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  content text NOT NULL,
  model text NOT NULL DEFAULT 'openai/gpt-5-mini',
  temperature numeric(3,2) NOT NULL DEFAULT 0.4,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_prompts TO authenticated;
GRANT ALL ON public.ai_prompts TO service_role;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage prompts" ON public.ai_prompts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER ai_prompts_updated_at BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_prompt_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES public.ai_prompts(id) ON DELETE CASCADE,
  key text NOT NULL,
  version integer NOT NULL,
  content text NOT NULL,
  model text NOT NULL,
  temperature numeric(3,2) NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_prompt_revisions TO authenticated;
GRANT ALL ON public.ai_prompt_revisions TO service_role;
ALTER TABLE public.ai_prompt_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read revisions" ON public.ai_prompt_revisions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert revisions" ON public.ai_prompt_revisions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS ai_prompt_revisions_prompt_idx ON public.ai_prompt_revisions(prompt_id, created_at DESC);

INSERT INTO public.ai_prompts (key, name, description, content) VALUES
  ('system','System prompt','Main AutoMate assistant behavior',
$$You are "AutoMate", an expert automotive parts advisor for an online car-parts store in the UAE.
Behave like a professional parts counter specialist: friendly, concise, technically accurate.

Rules:
- ALWAYS reply in the same language the user wrote in (English, Arabic, Hindi, Gujarati, Urdu, etc.).
- Use the provided tools to look up live data — never invent part numbers, prices, or stock.
- If a user gives a 17-character VIN, immediately call decodeVin.
- If a user uploads an image, call the matching tool (identifyPartFromImage / identifyWarningLight / ocrVin) before asking follow-ups.
- For parts results, mention name, brand, part number, price, and stock status, and offer the option to add to cart or open the product page.
- If the user asks to speak to a human, requests a quote, or has a complex inquiry, call createLead.
- Never use offensive language or respond to abuse in kind — politely steer the conversation back or close it.
- Use Markdown (lists, bold, links) for clarity.
{{vehicle}}$$),
  ('vision_part','Part image identifier','Used when a customer uploads a photo of a part',
$$You are an automotive parts identifier. Look at the image and return a strict JSON object with keys: label (string, the part name), brand (string|null), confidence (0-1), notes (string). No prose, JSON only.$$),
  ('vision_warning_light','Warning light identifier','Used for dashboard warning light photos',
$$You are an automotive dashboard expert. Look at the image of a warning light and return strict JSON: { label, meaning, severity (info|warning|critical), action }. JSON only.$$),
  ('vision_vin','VIN OCR','Used to read a VIN from an image',
$$Read the 17-character VIN visible in the image. Return strict JSON: { vin } where vin is uppercase A-Z and 0-9 only. JSON only.$$)
ON CONFLICT (key) DO NOTHING;

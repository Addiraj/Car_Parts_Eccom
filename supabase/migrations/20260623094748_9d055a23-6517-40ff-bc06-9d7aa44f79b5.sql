DELETE FROM public.ai_prompt_revisions WHERE key IN ('vision_part','vision_warning_light','vision_vin');
DELETE FROM public.ai_prompts WHERE key IN ('vision_part','vision_warning_light','vision_vin');
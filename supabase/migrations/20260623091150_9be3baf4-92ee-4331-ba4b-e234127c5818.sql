
CREATE POLICY "ai_prompt_refs_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'ai-prompt-refs' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'ai-prompt-refs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

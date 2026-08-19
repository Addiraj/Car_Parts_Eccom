import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const PROMPT_KEYS = ["system"] as const;
type PromptKey = (typeof PROMPT_KEYS)[number];

const SELECT_COLS =
  "id, key, name, description, content, model, temperature, version, is_active, updated_at, aliases_text, clarification_rules_text, reference_file_path, reference_file_name";

export const listPrompts = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabase
    .from("ai_prompts")
    .select(SELECT_COLS)
    .order("key", { ascending: true });

  if (error) return [];
  return data || [];
});

export const savePrompt = createServerFn({ method: "POST" })
  .validator((d: {
    key: string;
    content: string;
    model?: string;
    temperature?: number;
    name?: string;
    description?: string;
    aliasesText?: string | null;
    clarificationRulesText?: string | null;
    referenceFilePath?: string | null;
    referenceFileName?: string | null;
  }) =>
    z
      .object({
        key: z.enum(PROMPT_KEYS),
        content: z.string().min(1),
        model: z.string().min(2).max(100).optional(),
        temperature: z.number().min(0).max(2).optional(),
        name: z.string().max(120).optional(),
        description: z.string().max(500).optional(),
        aliasesText: z.string().nullable().optional(),
        clarificationRulesText: z.string().nullable().optional(),
        referenceFilePath: z.string().max(500).nullable().optional(),
        referenceFileName: z.string().max(255).nullable().optional(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const { data: existing } = await supabase
      .from("ai_prompts")
      .select("id, version")
      .eq("key", data.key)
      .maybeSingle();

    const nextVersion = (existing?.version ?? 0) + 1;
    const patch = {
      key: data.key,
      content: data.content,
      model: data.model ?? "openai/gpt-5-mini",
      temperature: data.temperature ?? 0.4,
      name: data.name ?? data.key,
      description: data.description,
      aliases_text: data.aliasesText ?? null,
      clarification_rules_text: data.clarificationRulesText ?? null,
      reference_file_path: data.referenceFilePath ?? null,
      reference_file_name: data.referenceFileName ?? null,
      version: nextVersion,
      is_active: true,
    };

    let promptId = existing?.id;
    if (existing) {
      await supabase.from("ai_prompts").update(patch as any).eq("id", existing.id);
    } else {
      const { data: created } = await supabase.from("ai_prompts").insert(patch as any).select().single();
      promptId = created?.id;
    }

    if (promptId) {
      await supabase.from("ai_prompt_revisions").insert({
        prompt_id: promptId,
        key: data.key,
        version: nextVersion,
        content: data.content,
        model: patch.model,
        temperature: patch.temperature,
        aliases_text: patch.aliases_text,
        clarification_rules_text: patch.clarification_rules_text,
        reference_file_path: patch.reference_file_path,
        reference_file_name: patch.reference_file_name,
      } as any);
    }

    return { ok: true, version: nextVersion };
  });

export const listRevisions = createServerFn({ method: "GET" })
  .validator((d: { promptId: string }) => z.object({ promptId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabase
      .from("ai_prompt_revisions")
      .select("id, version, content, model, temperature, created_at, aliases_text, clarification_rules_text, reference_file_path, reference_file_name")
      .eq("prompt_id", data.promptId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return [];
    return rows || [];
  });

export const uploadPromptReference = createServerFn({ method: "POST" })
  .validator((d: { key: string; filename: string; base64: string; contentType?: string }) =>
    z
      .object({
        key: z.enum(PROMPT_KEYS),
        filename: z.string().min(1).max(255),
        base64: z.string().min(1).max(15_000_000),
        contentType: z.string().max(120).optional(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const path = `uploads/ai-prompt-refs/${data.key}/${Date.now()}-${data.filename}`;
    await supabase.from("ai_prompts").update({
      reference_file_path: path,
      reference_file_name: data.filename,
    } as any).eq("key", data.key);

    return { path, name: data.filename };
  });

export const removePromptReference = createServerFn({ method: "POST" })
  .validator((d: { key: string }) => z.object({ key: z.enum(PROMPT_KEYS) }).parse(d))
  .handler(async ({ data }) => {
    await supabase.from("ai_prompts").update({
      reference_file_path: null,
      reference_file_name: null,
      reference_text: null,
    } as any).eq("key", data.key);

    return { ok: true };
  });

export type { PromptKey };

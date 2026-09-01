if (typeof globalThis !== "undefined" && !(globalThis as any).DOMMatrix) {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m21 = 0; m22 = 1; m41 = 0; m42 = 0;
    constructor() {}
  };
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./admin.functions";
import { models } from "./db/index.server";

const PROMPT_KEYS = ["system"] as const;
type PromptKey = (typeof PROMPT_KEYS)[number];

const SELECT_COLS =
  "id, key, name, description, content, model, temperature, version, is_active, updated_at, aliases_text, clarification_rules_text, reference_file_path, reference_file_name";

export const listPrompts = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const data = await models.ai_prompts.findAll({
      attributes: SELECT_COLS.split(", ").map(c => c.trim()),
      order: [["key", "ASC"]]
    });
    return data.map(d => d.get({ plain: true }));
  });

export const savePrompt = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: {
    key: string; content: string; model?: string; temperature?: number;
    name?: string; description?: string;
    aliasesText?: string | null; clarificationRulesText?: string | null;
    referenceFilePath?: string | null; referenceFileName?: string | null;
  }) =>
    z.object({
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
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const existing = await models.ai_prompts.findOne({
      attributes: ["id", "version"],
      where: { key: data.key }
    });
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
      updated_by: context.userId,
    };
    
    // UPSERT manually
    let promptId;
    if (existing) {
      await models.ai_prompts.update(patch as any, { where: { id: existing.id } });
      promptId = existing.id;
    } else {
      const created = await models.ai_prompts.create(patch as any);
      promptId = created.id;
    }

    await models.ai_prompt_revisions.create({
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
      updated_by: context.userId,
    } as any);
    return { ok: true, version: nextVersion };
  });

export const listRevisions = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { promptId: string }) => z.object({ promptId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const rows = await models.ai_prompt_revisions.findAll({
      attributes: ["id", "version", "content", "model", "temperature", "created_at", "updated_by", "aliases_text", "clarification_rules_text", "reference_file_path", "reference_file_name"],
      where: { prompt_id: data.promptId },
      order: [["created_at", "DESC"]],
      limit: 50
    });
    return rows.map(r => r.get({ plain: true }));
  });

export const uploadPromptReference = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { key: string; filename: string; base64: string; contentType?: string }) =>
    z.object({
      key: z.enum(PROMPT_KEYS),
      filename: z.string().min(1).max(255),
      base64: z.string().min(1).max(15_000_000),
      contentType: z.string().max(120).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const fs = await import("fs/promises");
    const pathModule = await import("path");
    const buf = Buffer.from(data.base64, "base64");
    const safeName = data.filename.replace(/[^A-Za-z0-9._-]/g, "_");
    
    const uploadsDir = pathModule.join(process.cwd(), "uploads", "ai-prompt-refs", data.key);
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const fileName = `${Date.now()}-${safeName}`;
    const fullPath = pathModule.join(uploadsDir, fileName);
    await fs.writeFile(fullPath, buf);
    const path = `uploads/ai-prompt-refs/${data.key}/${fileName}`;

    // Extract text so the public prompts API can serve it as `reference_text`.
    let extractedText: string | null = null;
    const lowerName = data.filename.toLowerCase();
    try {
      if (lowerName.endsWith(".txt") || (data.contentType ?? "").startsWith("text/")) {
        extractedText = buf.toString("utf8");
      } else if (lowerName.endsWith(".pdf") || data.contentType === "application/pdf") {
        const mod = (await import(/* @vite-ignore */ "pdf-parse")) as unknown as {
          default?: (b: Buffer) => Promise<{ text: string }>;
          PDFParse?: new (opts: { data: Buffer }) => { getText: () => Promise<{ text: string }> };
        };
        if (typeof mod.default === "function") {
          const parsed = await mod.default(buf);
          extractedText = parsed.text ?? null;
        } else if (mod.PDFParse) {
          const parser = new mod.PDFParse({ data: buf });
          const parsed = await parser.getText();
          extractedText = parsed.text ?? null;
        }
      }
    } catch (e) {
      console.error("[uploadPromptReference] text extraction failed", e);
    }

    await models.ai_prompts.update({
      reference_file_path: path,
      reference_file_name: data.filename,
      reference_text: extractedText,
    } as any, {
      where: { key: data.key }
    });

    return { path, name: data.filename };
  });

export const removePromptReference = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { key: string }) => z.object({ key: z.enum(PROMPT_KEYS) }).parse(d))
  .handler(async ({ data, context }) => {
    const fs = await import("fs/promises");
    const pathModule = await import("path");
    const row = await models.ai_prompts.findOne({
      attributes: ["reference_file_path"],
      where: { key: data.key }
    });
    
    const path = row?.reference_file_path;
    if (path) {
      try {
        await fs.unlink(pathModule.join(process.cwd(), path));
      } catch (e) {
        console.error("[removePromptReference] failed to delete file", e);
      }
    }
    
    await models.ai_prompts.update({
      reference_file_path: null,
      reference_file_name: null,
      reference_text: null,
      updated_by: context.userId
    } as any, {
      where: { key: data.key }
    });
    
    return { ok: true };
  });

export type { PromptKey };

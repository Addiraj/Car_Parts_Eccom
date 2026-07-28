import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { models } from "../src/lib/db/index.server";
import fs from "fs/promises";
import path from "path";

async function run() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!; // use anon key as service role is fake
  const sb = createClient(url, key);

  console.log("Fetching prompts from Supabase...");
  const { data: prompts, error } = await sb.from("ai_prompts").select("*");
  if (error) {
    console.error("Error fetching prompts:", error);
    process.exit(1);
  }

  for (const prompt of prompts) {
    console.log(`Replicating prompt: ${prompt.key}`);
    let localPath = null;
    
    // Check if there is a reference file
    if (prompt.reference_file_path) {
      console.log(`Downloading reference file for ${prompt.key}: ${prompt.reference_file_path}`);
      const { data: fileData, error: fileError } = await sb.storage.from("ai-prompt-refs").download(prompt.reference_file_path);
      
      if (fileError) {
        console.error(`Error downloading file:`, fileError);
      } else if (fileData) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        
        // Save locally
        const uploadsDir = path.join(process.cwd(), "uploads", "ai-prompt-refs", prompt.key);
        await fs.mkdir(uploadsDir, { recursive: true });
        
        const fileName = prompt.reference_file_name || path.basename(prompt.reference_file_path);
        const newFileName = `${Date.now()}-${fileName}`;
        const fullPath = path.join(uploadsDir, newFileName);
        
        await fs.writeFile(fullPath, buffer);
        localPath = `uploads/ai-prompt-refs/${prompt.key}/${newFileName}`;
        console.log(`Saved file locally to: ${localPath}`);
      }
    }

    // Insert or update in local DB
    const patch = {
      key: prompt.key,
      name: prompt.name,
      description: prompt.description,
      content: prompt.content,
      model: prompt.model,
      temperature: prompt.temperature,
      version: prompt.version,
      is_active: prompt.is_active,
      aliases_text: prompt.aliases_text,
      clarification_rules_text: prompt.clarification_rules_text,
      reference_file_path: localPath || null,
      reference_file_name: prompt.reference_file_name || null,
      reference_text: prompt.reference_text,
      created_by: prompt.created_by,
      updated_by: prompt.updated_by,
      created_at: prompt.created_at,
      updated_at: prompt.updated_at,
    };

    const [localPrompt, created] = await models.ai_prompts.upsert(patch as any);
    console.log(`Prompt ${prompt.key} replicated. Created: ${created}`);
  }

  console.log("Fetching prompt revisions from Supabase...");
  const { data: revisions, error: revError } = await sb.from("ai_prompt_revisions").select("*");
  if (revError) {
    console.error("Error fetching revisions:", revError);
  } else {
    for (const rev of revisions) {
       await models.ai_prompt_revisions.upsert(rev as any);
    }
    console.log(`Replicated ${revisions.length} revisions.`);
  }

  console.log("Done.");
  process.exit(0);
}

run().catch(console.error);

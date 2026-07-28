import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import { models } from "./src/lib/db/index.server";

const aiPromptsCsv = 'F:\\lovable_supabase\\ai_prompts.csv';
const aiPromptRevisionsCsv = 'F:\\lovable_supabase\\ai_prompt_revisions.csv';

async function importAiPrompts() {
  const prompts: any[] = [];
  console.log("Reading ai_prompts.csv...");
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(aiPromptsCsv)
      .pipe(csvParser({ separator: ';' }))
      .on('data', (data) => {
        prompts.push(data);
      })
      .on('end', () => resolve())
      .on('error', reject);
  });

  console.log(`Found ${prompts.length} prompts. Importing...`);
  let count = 0;
  for (const row of prompts) {
    try {
      const existing = await models.ai_prompts.findOne({ where: { key: row.key } });
      const patch = {
        name: row.name,
        description: row.description,
        content: row.content,
        model: row.model,
        temperature: row.temperature ? parseFloat(row.temperature) : 0.4,
        version: row.version ? parseInt(row.version, 10) : 1,
        is_active: row.is_active === 'TRUE' || row.is_active === 'true' || row.is_active === '1',
        aliases_text: row.aliases_text,
        clarification_rules_text: row.clarification_rules_text,
        reference_file_path: row.reference_file_path,
        reference_file_name: row.reference_file_name,
        reference_text: row.reference_text,
        updated_at: row.updated_at || new Date(),
      } as any;
      
      let promptId;
      if (existing) {
        await models.ai_prompts.update(patch, { where: { id: existing.id } });
        promptId = existing.id;
      } else {
        patch.id = row.id;
        patch.key = row.key;
        patch.created_at = row.created_at || new Date();
        await models.ai_prompts.create(patch);
        promptId = row.id;
      }
      count++;
    } catch (e: any) {
      console.error(`Error importing prompt ${row.id}:`, e.message);
      if (e.errors) console.error(e.errors);
    }
  }
  console.log(`Imported ${count} prompts successfully.`);

  const revisions: any[] = [];
  console.log("Reading ai_prompt_revisions.csv...");
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(aiPromptRevisionsCsv)
      .pipe(csvParser({ separator: ';' }))
      .on('data', (data) => {
        revisions.push(data);
      })
      .on('end', () => resolve())
      .on('error', reject);
  });

  console.log(`Found ${revisions.length} revisions. Importing...`);
  let revCount = 0;
  for (const row of revisions) {
    try {
      // Find the prompt by key to get the correct DB ID
      const p = await models.ai_prompts.findOne({ where: { key: row.key } });
      if (!p) {
        console.warn(`Prompt key ${row.key} not found for revision ${row.id}, skipping.`);
        continue;
      }
      const existingRev = await models.ai_prompt_revisions.findOne({ where: { id: row.id } });
      const revPatch = {
        prompt_id: p.id,
        key: row.key,
        version: row.version ? parseInt(row.version, 10) : 1,
        content: row.content,
        model: row.model,
        temperature: row.temperature ? parseFloat(row.temperature) : 0.4,
        aliases_text: row.aliases_text,
        clarification_rules_text: row.clarification_rules_text,
        reference_file_path: row.reference_file_path,
        reference_file_name: row.reference_file_name,
      } as any;
      if (existingRev) {
        await models.ai_prompt_revisions.update(revPatch, { where: { id: row.id } });
      } else {
        revPatch.id = row.id;
        revPatch.created_at = row.created_at || new Date();
        await models.ai_prompt_revisions.create(revPatch);
      }
      revCount++;
    } catch (e: any) {
      console.error(`Error importing revision ${row.id}:`, e.message);
    }
  }
  console.log(`Imported ${revCount} revisions successfully.`);
  
  console.log("Import Complete!");
}

importAiPrompts().catch(console.error);

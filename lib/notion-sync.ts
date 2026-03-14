// Notion Sync — fetches Book of Work from Notion and upserts to Supabase projects table.
// Uses @notionhq/client for pagination-safe fetching.
// Notion is the single source of truth — this module only reads from Notion and writes to Supabase.

import { Client } from "@notionhq/client";
import { getSupabaseAdmin } from "@/lib/supabase";

// v2.x types — NotionPage is in the api-endpoints module
type NotionPage = {
  readonly id: string;
  readonly properties: Record<string, unknown>;
  readonly created_time?: string;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncResult {
  readonly added: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly total: number;
  readonly errors: readonly string[];
}

interface ProjectRecord {
  readonly notion_id: string;
  readonly name: string;
  readonly team: string | null;
  readonly priority: string | null;
  readonly status: string | null;
  readonly tshirt_size: string | null;
  readonly resources_needed: number | null;
  readonly quarter: string | null;
  readonly theme: string | null;
  readonly deliverable: string | null;
  readonly start_date: string | null;
  readonly end_date: string | null;
  readonly notion_created_at: string | null;
  readonly raw_notion_properties: Record<string, unknown>;
  readonly last_synced_at: string;
}

// ---------------------------------------------------------------------------
// Notion property extractors
// ---------------------------------------------------------------------------

function extractTitle(prop: unknown): string {
  const p = prop as { type?: string; title?: { plain_text: string }[] };
  if (p?.type === "title" && Array.isArray(p.title)) {
    return p.title.map((t) => t.plain_text).join("") || "Untitled";
  }
  return "Untitled";
}

function extractSelect(prop: unknown): string | null {
  const p = prop as { type?: string; select?: { name: string } | null };
  if (p?.type === "select" && p.select) {
    return p.select.name;
  }
  return null;
}

function extractNumber(prop: unknown): number | null {
  const p = prop as { type?: string; number?: number | null };
  if (p?.type === "number" && p.number !== null && p.number !== undefined) {
    return p.number;
  }
  return null;
}

function extractRichText(prop: unknown): string | null {
  const p = prop as { type?: string; rich_text?: { plain_text: string }[] };
  if (p?.type === "rich_text" && Array.isArray(p.rich_text)) {
    const text = p.rich_text.map((t) => t.plain_text).join("");
    return text || null;
  }
  return null;
}

function extractDate(prop: unknown, field: "start" | "end" = "start"): string | null {
  const p = prop as { type?: string; date?: { start?: string; end?: string } | null };
  if (p?.type === "date" && p.date) {
    return p.date[field] ?? null;
  }
  return null;
}

function extractCreatedTime(prop: unknown): string | null {
  const p = prop as { type?: string; created_time?: string };
  if (p?.type === "created_time" && p.created_time) {
    return p.created_time;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Map Notion page to project record
// ---------------------------------------------------------------------------

function mapPageToProject(page: NotionPage): ProjectRecord {
  const props = page.properties;
  const now = new Date().toISOString();

  return {
    notion_id: page.id,
    name: extractTitle(props["Initiative"]),
    team: extractSelect(props["Team"]),
    priority: extractSelect(props["Priority"]),
    status: extractSelect(props["Status"]),
    tshirt_size: extractSelect(props["Size"]),
    resources_needed: extractNumber(props["Resources (Static)"]),
    quarter: extractSelect(props["Timeline"]),
    theme: extractSelect(props["Theme"]),
    deliverable: extractRichText(props["Deliverable"]),
    start_date: extractDate(props["Start Date"], "start"),
    end_date: extractDate(props["End Date"], "end"),
    notion_created_at: extractCreatedTime(props["Created"]),
    raw_notion_properties: props as unknown as Record<string, unknown>,
    last_synced_at: now,
  };
}

// ---------------------------------------------------------------------------
// Diff logic
// ---------------------------------------------------------------------------

/** Check if a project record has changed vs the existing DB row. */
function hasChanged(
  incoming: ProjectRecord,
  existing: Record<string, unknown>,
): boolean {
  const fields: (keyof ProjectRecord)[] = [
    "name", "team", "priority", "status", "tshirt_size",
    "resources_needed", "quarter", "theme", "deliverable",
    "start_date", "end_date",
  ];

  for (const field of fields) {
    const inVal = incoming[field];
    const exVal = existing[field];
    // Normalize null/undefined comparison
    if ((inVal ?? null) !== (exVal ?? null)) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sync all pages from the Notion Book of Work database to Supabase.
 * Returns counts of added, updated, unchanged records plus any errors.
 */
export async function syncNotionToSupabase(
  triggeredBy: "manual" | "cron" = "manual",
): Promise<SyncResult> {
  const notionApiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_BOW_DATABASE_ID;

  if (!notionApiKey || !databaseId) {
    throw new Error("Missing NOTION_API_KEY or NOTION_BOW_DATABASE_ID");
  }

  const notion = new Client({ auth: notionApiKey });
  const supabase = getSupabaseAdmin();
  const errors: string[] = [];

  // Fetch all pages from Notion with pagination
  const pages: NotionPage[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const queryParams: { database_id: string; page_size: number; start_cursor?: string } = {
      database_id: databaseId,
      page_size: 100,
    };
    if (cursor) {
      queryParams.start_cursor = cursor;
    }

    const response = await notion.databases.query(queryParams);

    for (const page of response.results) {
      if ("properties" in page) {
        pages.push(page as NotionPage);
      }
    }

    cursor = response.next_cursor;
    hasMore = response.has_more;
  }

  // Fetch existing projects from Supabase
  const { data: existingRows, error: fetchError } = await supabase
    .from("projects")
    .select("*");

  if (fetchError) {
    throw new Error(`Failed to fetch existing projects: ${fetchError.message}`);
  }

  const existingMap = new Map<string, Record<string, unknown>>();
  for (const row of existingRows ?? []) {
    existingMap.set(row.notion_id as string, row);
  }

  // Diff and upsert
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const page of pages) {
    const project = mapPageToProject(page);
    const existing = existingMap.get(project.notion_id);

    try {
      if (!existing) {
        // New record — insert
        const { error } = await supabase.from("projects").insert({
          ...project,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        added++;
      } else if (hasChanged(project, existing)) {
        // Changed record — update
        const { error } = await supabase
          .from("projects")
          .update({
            ...project,
            updated_at: new Date().toISOString(),
          })
          .eq("notion_id", project.notion_id);
        if (error) throw error;
        updated++;
      } else {
        unchanged++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`[${project.name}] ${msg}`);
    }
  }

  // Write sync log
  const { error: logError } = await supabase.from("sync_log").insert({
    records_added: added,
    records_updated: updated,
    records_unchanged: unchanged,
    records_total: pages.length,
    triggered_by: triggeredBy,
    error: errors.length > 0 ? errors.join("; ") : null,
  });

  if (logError) {
    console.warn(`[notion-sync] Failed to write sync_log: ${logError.message}`);
  }

  return Object.freeze({ added, updated, unchanged, total: pages.length, errors });
}

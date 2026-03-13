# TPMO Copilot — V1 Handoff Document

**Date:** March 2026
**Status:** V0 complete | V0.5 complete | V1 ready to build

---

## Current State

### Inference Routing (V0.5 — Hybrid)

| Step | Model | Provider | File |
|------|-------|----------|------|
| Step 1: Document Selection | DeepSeek V3 (deepseek/deepseek-chat-v3-0324) | OpenRouter | lib/rag/document-selector.ts |
| Step 2: Node Navigation | Qwen3 30B (qwen/qwen3-30b-a3b) | OpenRouter | lib/rag/node-selector.ts |
| Step 3: Answer Generation | Claude Sonnet | Anthropic SDK (direct) | lib/rag/answer-generator.ts |
| Ingestion (primary) | DeepSeek V3 | OpenRouter | ingestion/src/openrouter-client.ts |
| Ingestion (fallback) | Claude Sonnet (streaming) | Anthropic SDK | ingestion/src/tree-builder.ts |

`INFERENCE_MODE=hybrid` is set in `.env.local`, `ingestion/.env`, and Vercel dashboard.

### Vault State

- **Documents indexed:** 33
- **Total tree nodes:** ~1,066
- **Storage:** Supabase (documents, doc_trees, query_log tables)
- **Ingestion mode:** delta via SHA-256 content hashing (only re-process changed files)
- **Both benchmark queries confirmed working in production**

---

## V1 Build Scope

Connect the Copilot to live Notion portfolio data (LendingTree Book of Work).

### Files to Create

| File | Purpose |
|------|---------|
| `lib/notion-sync.ts` | Notion API client, fetch Book of Work, transform to projects rows |
| `app/api/sync/route.ts` | POST endpoint — triggers Notion sync, protected by INGEST_SECRET |
| `supabase/migrations/002_projects_and_sync_log.sql` | New tables: `projects`, `sync_log` |
| `vercel.json` | Nightly cron job calling /api/sync |
| `lib/rag/portfolio-query.ts` | SQL query path for portfolio questions (bypasses tree RAG) |

### Supabase Migration 002

**projects table:**
- notion_id (text, unique)
- name (text)
- team (text)
- priority (text)
- status (text)
- tshirt_size (text)
- resources_needed (text)
- quarter (text)
- theme (text)
- notes (text)
- raw_notion_properties (jsonb)
- created_at, updated_at (timestamptz)

**sync_log table:**
- id (bigserial)
- synced_at (timestamptz)
- records_added (int)
- records_updated (int)
- records_unchanged (int)
- triggered_by (text) — "cron" | "manual"
- error (text, nullable)

### RAG Pipeline Update

- Add mode detection in `document-selector.ts` (vault query vs portfolio query)
- Portfolio questions route to `portfolio-query.ts` (direct SQL) instead of tree navigation
- Vault questions continue through existing 3-step tree RAG pipeline unchanged

### Admin UI

- Add sync status section to the app (last sync time, record counts, trigger manual sync button)
- Read-only — Notion is the ONLY place projects get edited

---

## New Environment Variables

```
# Notion (V1)
NOTION_API_KEY=ntn_...          # from notion.so -> Settings -> Integrations
NOTION_BOW_DATABASE_ID=...      # from Book of Work Notion URL
```

Add to: `.env.local`, `ingestion/.env`, and Vercel dashboard.

---

## Key Constraint

Notion is the ONLY place projects get edited. No DB editor in the Vercel app. Stop updating the Obsidian copy of the Book of Work after V1 is validated.

---

## Do Not Touch

These files are stable and must not be modified:

- `lib/rag/answer-generator.ts` — Claude Sonnet, never reroute to another provider
- `lib/openrouter.ts` — OpenRouter client for Steps 1-2, working and stable
- `lib/claude.ts` — Anthropic client + callClaude helper, working and stable
- `ingestion/src/ollama-client.ts` — preserved for future use, not in active chain

---

## First Steps for V1

1. Create Notion integration at notion.so -> Settings -> Integrations -> get `NOTION_API_KEY`
2. Get `NOTION_BOW_DATABASE_ID` from the Book of Work database URL
3. Audit actual Notion field names: `GET https://api.notion.com/v1/databases/{id}`
4. Add both env vars to `.env.local`, `ingestion/.env`, and Vercel dashboard
5. Start Claude Code session with the starter prompt below

---

## V1 Claude Code Starter Prompt

Copy and paste this into a new Claude Code session:

```
I'm building V1 of TPMO Copilot. Read these files first:

1. /Users/quentinligginsjr/Claude Code/tpmo-copilot/README.md
2. /Users/quentinligginsjr/Claude Code/tpmo-copilot/HANDOFF-V1.md

Then do the following in order:

Phase 1 — Supabase Migration
- Create supabase/migrations/002_projects_and_sync_log.sql
- Tables: projects (with notion_id unique, name, team, priority, status, tshirt_size, resources_needed, quarter, theme, notes, raw_notion_properties jsonb, created_at, updated_at) and sync_log (synced_at, records_added, records_updated, records_unchanged, triggered_by, error)
- Add RLS policies and indexes matching the pattern in 001_initial_schema.sql
- Run the migration against Supabase

Phase 2 — Notion Sync
- Create lib/notion-sync.ts
  - Use @notionhq/client to fetch all pages from NOTION_BOW_DATABASE_ID
  - Transform Notion properties to projects table columns
  - Upsert into Supabase projects table (match on notion_id)
  - Log results to sync_log table
- Create app/api/sync/route.ts
  - POST endpoint protected by INGEST_SECRET header
  - Calls the sync function from lib/notion-sync.ts
  - Returns sync results as JSON
- Audit the actual Notion field names first: call GET https://api.notion.com/v1/databases/{NOTION_BOW_DATABASE_ID} and map real property names to our schema

Phase 3 — Vercel Cron
- Create or update vercel.json with a nightly cron job that calls POST /api/sync
- Use the INGEST_SECRET for authentication

Phase 4 — RAG Mode Detection
- Update document-selector.ts to detect portfolio questions vs vault questions
- Create lib/rag/portfolio-query.ts for direct SQL queries against the projects table
- Portfolio questions bypass the tree RAG pipeline entirely
- Vault questions continue through the existing 3-step pipeline unchanged

Phase 5 — Admin UI
- Add a sync status section showing: last sync time, records added/updated/unchanged, manual sync trigger button
- Read-only display — no editing of project data in the app

DO NOT TOUCH these files: answer-generator.ts, lib/openrouter.ts, lib/claude.ts

Env vars are already set: NOTION_API_KEY, NOTION_BOW_DATABASE_ID
```

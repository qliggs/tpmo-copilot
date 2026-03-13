# TPMO Copilot — V1 Handoff: Starting Point for Next Session

**Date:** March 2026
**Status:** V0 ✅ | V0.5 ✅ | V1 🔜 Ready to Build

## Where We Are

V0.5 is complete and deployed. The system now uses hybrid inference:

- Step 1 (document-selector.ts) → OpenRouter, DeepSeek V3 (deepseek/deepseek-chat-v3-0324)
- Step 2 (node-selector.ts) → OpenRouter, Qwen3 30B (qwen/qwen3-30b-a3b)
- Step 3 (answer-generator.ts) → Claude Sonnet (unchanged — never touch this)
- Ingestion tree-builder.ts → OpenRouter primary → Anthropic streaming fallback

INFERENCE_MODE=hybrid is set in .env.local, ingestion/.env, and Vercel dashboard.

33 documents, ~1,066 nodes indexed in Supabase. Both benchmark queries confirmed working in production.

## What V1 Builds

Connect the Copilot to live Notion portfolio data (LendingTree Book of Work).

Files to create:

1. lib/notion-sync.ts
2. app/api/sync/route.ts
3. supabase/migrations/002_projects_and_sync_log.sql
4. vercel.json (nightly cron)
5. Admin UI section in app/page.tsx

RAG pipeline update:

- Mode detection in document-selector.ts (vault query vs portfolio query)
- SQL query path for portfolio questions in a new lib/rag/portfolio-query.ts

New env vars needed:

- NOTION_API_KEY (from notion.so → Settings → Integrations)
- NOTION_BOW_DATABASE_ID (from Book of Work Notion URL)

New Supabase tables:

- projects (notion_id, name, team, priority, status, tshirt_size, resources_needed, quarter, theme, notes, raw_notion_properties)
- sync_log (synced_at, records_added, records_updated, records_unchanged, triggered_by, error)

## Key Constraint

Notion is the ONLY place projects get edited. No DB editor in the Vercel app. Stop updating the Obsidian copy of the Book of Work after V1 is validated.

## First Steps for V1

1. Create Notion integration → get NOTION_API_KEY
2. Get NOTION_BOW_DATABASE_ID from the Book of Work URL
3. Audit actual Notion field names: GET https://api.notion.com/v1/databases/{id}
4. Add both env vars to .env.local, ingestion/.env, and Vercel dashboard
5. Start Claude Code session with the V1 starter prompt (see tpmo-copilot-v1-handoff.md in Obsidian)

## Do Not Touch

- answer-generator.ts (Claude Sonnet, never reroute)
- lib/openrouter.ts (working, stable)
- lib/claude.ts (working, stable)
- ingestion/src/ollama-client.ts (preserved for future use, not in active chain)

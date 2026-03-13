# TPMO Copilot — AI-Powered TPM Second Brain

A reasoning-based retrieval system for querying an Obsidian vault. Instead of the standard chunk-and-embed approach (vector similarity), TPMO Copilot builds hierarchical PageIndex trees for each document and uses LLMs to *reason through the structure* at query time. This works better for structured knowledge bases where documents have clear sections, headings, and logical organization -- the LLM navigates the tree like a human scanning a table of contents, selecting the most relevant sections before generating an answer with source citations.

## Architecture (V0.5 — Hybrid Inference)

```
                         INGESTION PIPELINE
  +----------------+     +-------------+     +--------------------+
  | Obsidian Vault | --> | Vault Reader| --> | Tree Builder       |
  | (.md files)    |     | gray-matter |     | OpenRouter primary |
  +----------------+     | remark/AST  |     | Anthropic fallback |
                          +-------------+     | -> PageIndex JSON  |
                                              +--------+-----------+
                                                       |
                                                       v
                                              +------------------+
                                              |    Supabase      |
                                              |  +------------+  |
                                              |  | documents   |  |
                                              |  | doc_trees   |  |
                                              |  | query_log   |  |
                                              |  +------------+  |
                                              +--------+---------+
                                                       |
                         RAG QUERY PIPELINE             |
  +----------------+     +-------------+     +---------+----------+
  |   Chat UI      | --> | /api/query  | --> | Step 1: Doc Select  |
  | (Next.js)      |     |             |     | OpenRouter DeepSeek |
  +----------------+     |             |     +---------+----------+
        ^                |             |               |
        |                |             |     +---------+----------+
        |                |             |     | Step 2: Node Nav    |
        |                |             |     | OpenRouter Qwen3    |
        +--- answer -----|             |     +---------+----------+
             sources     |             |               |
             reasoning   +-------------+     +---------+----------+
                                             | Step 3: Answer Gen  |
                                             | Claude Sonnet       |
                                             +---------------------+
```

## Tech Stack

| Layer       | Technology                                     |
|-------------|------------------------------------------------|
| Framework   | Next.js (App Router)                           |
| Language    | TypeScript (strict)                            |
| Styling     | Tailwind CSS v4                                |
| Database    | Supabase (Postgres)                            |
| LLM (Steps 1-2) | OpenRouter (DeepSeek V3, Qwen3 30B)      |
| LLM (Step 3)    | Claude Sonnet via @anthropic-ai/sdk       |
| LLM (Ingestion) | OpenRouter primary, Anthropic fallback    |
| Ingestion   | Standalone CLI (tsx)                           |
| Font        | IBM Plex Mono                                  |

## How It Works

The system uses a 3-step reasoning pipeline instead of vector search:

**Step 1: Document Selection** (OpenRouter — DeepSeek V3)
Claude receives a lightweight catalog of all documents (titles, summaries, top-level node summaries -- no full text). It reasons about which 1-3 documents are most likely to contain the answer.

**Step 2: Node Navigation** (OpenRouter — Qwen3 30B)
For each selected document, the LLM receives the full tree structure *without* raw text -- just node titles, summaries, depths, and hierarchy. It navigates the tree like a human scanning a table of contents, selecting the most relevant leaf nodes.

**Step 3: Answer Generation** (Claude Sonnet — never rerouted)
The raw text of selected nodes is extracted from the JSONB tree, assembled with source attribution, and sent to Claude for a final cited answer.

This approach has several advantages over vector similarity:
- Preserves document structure and context hierarchy
- No embedding costs or vector database required
- The LLM's reasoning is transparent and inspectable
- Works well with documents that have clear organizational structure
- Delta ingestion via content hashing (only re-process changed files)
- Hybrid inference reduces cost ~80% on Steps 1-2 without quality loss

## Current Stats

- **Documents indexed:** 33
- **Total tree nodes:** ~1,066
- **Inference mode:** hybrid (OpenRouter Steps 1-2, Claude Step 3)
- **Ingestion chain:** OpenRouter (DeepSeek) primary, Anthropic streaming fallback

## Setup

### 1. Clone and install

```bash
git clone <repo-url> tpmo-copilot
cd tpmo-copilot

npm install
cd ingestion && npm install && cd ..
```

### 2. Set up Supabase

Create a Supabase project at [supabase.com](https://supabase.com), then run the migration in the SQL Editor:

```sql
-- Paste the contents of supabase/migrations/001_initial_schema.sql
```

This creates three tables: `documents`, `doc_trees`, and `query_log` with indexes and RLS policies.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in your credentials:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Anthropic (Claude API — used for Step 3 + ingestion fallback)
ANTHROPIC_API_KEY=sk-ant-...

# OpenRouter (used for Steps 1-2 + ingestion primary)
OPENROUTER_API_KEY=sk-or-v1-...

# Vault ingestion
VAULT_PATH=/path/to/your/obsidian/vault

# API protection
INGEST_SECRET=your-random-secret

# App config
NEXT_PUBLIC_APP_NAME=TPMO Copilot
MAX_DOCS_PER_QUERY=5
MAX_NODES_PER_DOC=8

# Hybrid inference (V0.5)
INFERENCE_MODE=hybrid
OPENROUTER_DOC_SELECT_MODEL=deepseek/deepseek-chat-v3-0324
OPENROUTER_NODE_SELECT_MODEL=qwen/qwen3-30b-a3b
OPENROUTER_TREE_MODEL=deepseek/deepseek-chat-v3-0324
```

Also copy environment variables to `ingestion/.env` for the CLI:

```bash
cp .env.local ingestion/.env
```

### 4. Ingest your vault

```bash
cd ingestion

# Full vault ingestion
npx tsx src/index.ts --vault /path/to/your/obsidian/vault --verbose

# Single file
npx tsx src/index.ts --file /path/to/file.md

# Dry run (parse + build trees, don't write to Supabase)
npx tsx src/index.ts --vault /path/to/vault --dry-run

# Force re-ingest (ignore content hashes)
npx tsx src/index.ts --vault /path/to/vault --force
```

### 5. Run dev server

```bash
npm run dev
# Open http://localhost:3000
```

### 6. Deploy to Vercel

```bash
npx vercel
# Set environment variables in Vercel dashboard
```

## API Endpoints

| Method | Path          | Description                          |
|--------|---------------|--------------------------------------|
| POST   | /api/query    | Run RAG query (rate-limited: 10/min) |
| POST   | /api/ingest   | Remote ingestion trigger (V1 stub)   |
| GET    | /api/health   | System health + document count       |

**Query example:**

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What was the outcome of the Snowflake migration?"}'
```

## Example Queries

- "What was the outcome of the Snowflake security hardening program?"
- "What is my Q2 2026 capacity situation?"
- "Summarize my most impactful TPM project in 2025"
- "What STAR stories do I have about stakeholder conflict?"
- "List all action items from the Kashmir retrospective"
- "What metrics did I track for the platform reliability initiative?"

## Project Structure

```
tpmo-copilot/
  app/
    layout.tsx, globals.css
    (landing)/
      layout.tsx, page.tsx            Landing page
    chat/
      page.tsx                        Chat UI page
    api/query/route.ts                POST  RAG query endpoint
    api/ingest/route.ts               POST  ingestion trigger (V1 stub)
    api/health/route.ts               GET   health check
  lib/
    supabase.ts                       Supabase clients (anon + admin)
    claude.ts                         Anthropic client + callClaude helper
    openrouter.ts                     OpenRouter client for Steps 1-2
    rag/
      index.ts                        runRAGQuery orchestrator
      document-selector.ts            Step 1: catalog-based doc selection
      node-selector.ts                Step 2: tree-based node navigation
      answer-generator.ts             Step 3: context assembly + answer
  components/
    ChatInterface.tsx                  Chat UI with state management
    MessageBubble.tsx                  Message rendering + reasoning toggle
    SourceCitation.tsx                 Source reference cards
    landing/
      Hero.tsx, Features.tsx,          Landing page components
      CTA.tsx, Nav.tsx, Footer.tsx
  ingestion/
    src/
      index.ts                        CLI orchestrator (--vault, --file, --force, --dry-run)
      vault-reader.ts                 Recursive .md reader + frontmatter parsing
      tree-builder.ts                 LLM-powered PageIndex tree builder (fallback chain)
      openrouter-client.ts            OpenRouter client for ingestion
      ollama-client.ts                Ollama client (preserved, not in active chain)
      supabase-client.ts              Upsert functions for documents + trees
      utils/hash.ts                   SHA-256 content hashing
      utils/markdown-parser.ts        Remark-based heading extraction
      utils/validate-tree.ts          Tree structure validation
  supabase/
    migrations/
      001_initial_schema.sql          Tables, indexes, RLS policies
```

## Version History

| Version | Status | Description |
|---------|--------|-------------|
| V0      | Done   | Claude-only RAG pipeline, Obsidian vault ingestion, chat UI |
| V0.5    | Done   | Hybrid inference (OpenRouter Steps 1-2, Claude Step 3), streaming fallback, truncation detection |
| V1      | Next   | Notion integration (live portfolio sync from LendingTree Book of Work) |

## What's Next (V1)

See [HANDOFF-V1.md](./HANDOFF-V1.md) for the full V1 plan:

- Connect to live Notion portfolio data (LendingTree Book of Work)
- Nightly sync via Vercel cron
- Mode detection in RAG pipeline (vault query vs portfolio query)
- New Supabase tables: `projects`, `sync_log`
- Admin UI for sync status

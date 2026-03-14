# TPMO Copilot -- Project Handoff Document

## Project Overview

**Name:** TPMO Copilot -- V0: Personal Knowledge RAG
**Path:** `/Users/quentinligginsjr/Claude Code/tpmo-copilot/`
**Status:** V0 complete. Builds clean. Dev server runs in mock/offline mode.
**Latest commit:** `feat: V0 complete` + `fix: model string, dotenv autoload, maybeSingle query fix`

TPMO Copilot is a **vectorless, reasoning-based RAG system** for querying an Obsidian vault. Instead of chunk-and-embed with vector similarity, it builds hierarchical **PageIndex trees** from markdown documents using Claude, then uses a 3-step reasoning pipeline to navigate those trees at query time. No pgvector, no embeddings, no cosine similarity.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| Database | Supabase (PostgreSQL + JSONB for trees) |
| LLM | Claude Sonnet 4.6 via `@anthropic-ai/sdk` |
| Font | IBM Plex Mono (Google Fonts) |
| Theme | Dark mode only (zinc/slate palette) |

---

## Directory Structure

```
tpmo-copilot/
├── app/
│   ├── globals.css              # Tailwind v4 import + theme vars
│   ├── layout.tsx               # Root layout (dark mode, IBM Plex Mono)
│   ├── page.tsx                 # Renders <ChatInterface />
│   └── api/
│       ├── query/route.ts       # POST /api/query — RAG pipeline endpoint
│       ├── ingest/route.ts      # POST /api/ingest — V1 stub (uses CLI)
│       └── health/route.ts      # GET /api/health — Supabase + doc count
├── components/
│   ├── ChatInterface.tsx        # Chat UI: input, messages, example chips
│   ├── MessageBubble.tsx        # User/assistant message rendering
│   └── SourceCitation.tsx       # filename > section > subsection display
├── lib/
│   ├── supabase.ts              # Lazy singleton clients (getSupabase, getSupabaseAdmin)
│   ├── claude.ts                # Shared Anthropic client + callClaude helper
│   └── rag/
│       ├── index.ts             # Pipeline orchestrator (runRAGQuery)
│       ├── document-selector.ts # Step 1: catalog navigation
│       ├── node-selector.ts     # Step 2: tree navigation per doc
│       └── answer-generator.ts  # Step 3: context assembly + answer
├── ingestion/                   # Separate TS package (own tsconfig)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             # CLI entry: --vault, --file, --force, --dry-run, --verbose
│       ├── vault-reader.ts      # Recursive .md walker, frontmatter, SHA-256 hash
│       ├── tree-builder.ts      # Claude-powered PageIndex tree builder
│       ├── supabase-client.ts   # Admin client + upsert functions
│       ├── test-single.ts       # Debug: build tree for one file, no DB writes
│       └── utils/
│           ├── hash.ts          # sha256(content) via Node crypto
│           ├── markdown-parser.ts # remark-based heading skeleton extraction
│           └── validate-tree.ts # Tree validation (unique IDs, depth, counts)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # documents, doc_trees, query_log tables
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs           # Uses @tailwindcss/postcss (NOT tailwindcss)
└── next.config.ts
```

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```env
# Supabase (required for live mode)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic (required for ingestion + query)
ANTHROPIC_API_KEY=

# Vault path (for ingestion CLI)
VAULT_PATH=

# API protection
INGEST_SECRET=

# App config
NEXT_PUBLIC_APP_NAME=TPMO Copilot

# RAG tuning
MAX_DOCS_PER_QUERY=5
MAX_NODES_PER_DOC=8
```

Without Supabase env vars, the app runs but API routes return graceful errors. The chat UI renders fine.

---

## Dev Server

**Port:** 3002
**Launch config:** Workspace-level `.claude/launch.json` at `/Users/quentinligginsjr/Claude Code/.claude/launch.json` has `"TPMO Copilot"` entry.

```bash
cd /Users/quentinligginsjr/Claude\ Code/tpmo-copilot
npm run dev -- -p 3002
```

Or via Claude Code preview: `preview_start(name="TPMO Copilot")`

---

## Database Schema (Supabase)

Three tables defined in `supabase/migrations/001_initial_schema.sql`:

### documents
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto-generated |
| filename | TEXT | e.g. `my-note.md` |
| filepath | TEXT UNIQUE | relative to vault root |
| title | TEXT | derived: H1 > frontmatter > filename |
| vault_folder | TEXT | subdirectory path |
| word_count | INTEGER | |
| last_modified | TIMESTAMPTZ | file mtime |
| ingested_at | TIMESTAMPTZ | default now() |
| content_hash | TEXT | SHA-256 of raw content |
| tags | TEXT[] | from frontmatter |
| source_type | TEXT | default 'obsidian' |
| metadata | JSONB | full frontmatter blob |

### doc_trees
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto-generated |
| document_id | UUID FK | references documents(id), UNIQUE |
| tree_json | JSONB | full PageIndex tree |
| node_count | INTEGER | computed, not from LLM |
| max_depth | INTEGER | |
| built_at | TIMESTAMPTZ | default now() |
| model_used | TEXT | default 'claude-sonnet-4-6' |

### query_log
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| question | TEXT | |
| answer | TEXT | |
| docs_selected | TEXT[] | filenames |
| nodes_selected | TEXT[] | |
| reasoning | TEXT | full reasoning trace |
| latency_ms | INTEGER | |
| total_llm_calls | INTEGER | |
| created_at | TIMESTAMPTZ | indexed DESC |

RLS is enabled on all tables with permissive allow-all policies (to be locked down later).

---

## Architecture: How the RAG Pipeline Works

### Ingestion (offline, CLI)

```
Obsidian Vault (.md files)
    │
    ▼
vault-reader.ts  ──►  Parse frontmatter, extract metadata, SHA-256 hash
    │
    ▼
Delta detection  ──►  Compare hashes against Supabase, skip unchanged
    │
    ▼
tree-builder.ts  ──►  Send doc + heading skeleton to Claude
    │                  Claude returns hierarchical JSON tree:
    │                  { doc_id, title, summary, total_nodes, nodes: [
    │                      { node_id, depth, title, summary, raw_text, children }
    │                  ]}
    ▼
supabase-client.ts  ──►  Upsert document row + tree JSONB to Supabase
```

CLI usage:
```bash
npm run ingest -- --vault ~/my-vault
npm run ingest -- --file ~/my-vault/notes/specific.md
npm run ingest -- --vault ~/my-vault --force --verbose
npm run ingest -- --vault ~/my-vault --dry-run
```

Debug single file (no DB writes):
```bash
npx tsx ingestion/src/test-single.ts /path/to/file.md
```

### Query (runtime, 3-step pipeline)

```
User Question
    │
    ▼
Step 1: Document Selection (document-selector.ts)
    │   Fetch all docs + top-level tree summaries
    │   Build lightweight catalog
    │   Ask Claude: "Which 1-3 documents are most relevant?"
    │
    ▼
Step 2: Node Navigation (node-selector.ts)
    │   For each selected doc, fetch its tree skeleton (no raw_text)
    │   Ask Claude: "Navigate this tree — which nodes contain the answer?"
    │
    ▼
Step 3: Answer Generation (answer-generator.ts)
    │   Fetch raw_text for selected nodes from JSONB
    │   Assemble context with [Document: X] [Section: Y] attribution
    │   Ask Claude: "Answer using ONLY this context, cite sources"
    │
    ▼
{ answer, sources, reasoning, latency_ms }
```

Each query makes 2-4 LLM calls (1 for doc selection, 1 per selected doc for node navigation, 1 for answer generation).

---

## Key Design Decisions

1. **Lazy Supabase clients** — `lib/supabase.ts` exports `getSupabase()` and `getSupabaseAdmin()` as lazy factories. They throw on first call if env vars are missing, but don't crash at import time. Backward-compatible aliases `supabase` and `supabaseAdmin` are exported (but they're functions, not instances — call sites use `getAdmin()` pattern).

2. **No vector search** — The entire retrieval strategy is LLM reasoning over structured trees. This is intentional. The hypothesis is that for personal knowledge bases (<1000 docs), reasoning-based navigation is more accurate than embedding similarity.

3. **Separate ingestion package** — `ingestion/` has its own `package.json` and `tsconfig.json`. It runs as a CLI tool, not part of the Next.js build. Uses `.js` extensions in imports (ESM).

4. **Tailwind v4** — Uses `@tailwindcss/postcss` plugin in `postcss.config.mjs` (not `tailwindcss` directly). CSS uses `@import "tailwindcss"` and `@theme {}` blocks, not the old `@tailwind` directives.

5. **In-memory rate limiting** — `/api/query` has 10 req/min per IP. Not persistent (resets on restart). Upgrade to Redis/Upstash for production.

6. **Immutable patterns** — All return values use `Object.freeze()`. Interfaces use `readonly` properties. No mutation.

---

## Known Issues / Incomplete Items

- **No tests yet** — Unit tests, integration tests, and E2E tests are not written.
- **RLS policies are permissive** — All tables have allow-all policies. Need to lock down before any multi-user scenario.
- **No authentication** — The chat UI is open. No user identification.
- **Rate limiter is in-memory** — Resets on server restart.
- **`/api/ingest` is a stub** — Returns a message to use the CLI. V1 should support remote triggers.
- **No streaming** — Answer generation returns full response, not streamed.
- **`ingestion/src/index.ts` has a duplicate `resolve` import** — Line 4 imports from `"path"` and line 11 from `"node:path"`. The dotenv setup at the top was added as a fix; the duplicate import should be cleaned up.
- **Tree validation warnings are non-fatal** — `validateTree()` logs warnings but doesn't reject invalid trees.

---

## Useful Commands

```bash
# Dev server (port 3002)
npm run dev -- -p 3002

# Type check (root package)
npx tsc --noEmit

# Type check (ingestion package)
cd ingestion && npx tsc --noEmit

# Build for production
npm run build

# Ingest a vault
npm run ingest -- --vault /path/to/vault

# Ingest single file
npm run ingest -- --file /path/to/file.md

# Debug tree for single file (no DB writes)
npx tsx ingestion/src/test-single.ts /path/to/file.md

# Test health endpoint
curl http://localhost:3002/api/health

# Test query endpoint
curl -X POST http://localhost:3002/api/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the project about?"}'
```

---

## Style Guidelines

- Dark theme only — zinc/slate color palette
- IBM Plex Mono for all data values and monospace elements
- Functional over fancy — no features beyond spec without asking
- No emojis in code or output
- Immutable data patterns everywhere (Object.freeze, readonly)
- Files under 800 lines, functions under 50 lines
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

---

## What to Work On Next

Potential improvements (discuss before implementing):

1. **Tests** — Unit tests for vault-reader, tree-builder validation, RAG pipeline steps
2. **Streaming responses** — Use Claude's streaming API for real-time answer display
3. **Supabase connection** — Set up a real Supabase project and test end-to-end
4. **Remote ingestion** — Implement POST /api/ingest to trigger ingestion without CLI
5. **Auth** — Add authentication if exposing beyond localhost
6. **Tree visualization** — A /tree page showing the PageIndex tree for each document
7. **Query history** — A /history page showing past queries from query_log
8. **Batch tree building** — Parallelize tree building with concurrency limits
9. **Caching** — Cache document catalog and tree skeletons for faster Step 1/2
10. **Error recovery** — Better handling of partial ingestion failures

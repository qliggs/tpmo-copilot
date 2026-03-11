# TPMO Copilot -- V0: Personal Knowledge RAG

A reasoning-based retrieval system for querying an Obsidian vault. Instead of the standard chunk-and-embed approach (vector similarity), TPMO Copilot builds hierarchical PageIndex trees for each document and uses Claude to *reason through the structure* at query time. This works better for structured knowledge bases where documents have clear sections, headings, and logical organization -- the LLM navigates the tree like a human scanning a table of contents, selecting the most relevant sections before generating an answer with source citations.

## Architecture

```
                         INGESTION PIPELINE
  +----------------+     +-------------+     +------------------+
  | Obsidian Vault | --> | Vault Reader| --> | Tree Builder     |
  | (.md files)    |     | gray-matter |     | Claude Sonnet    |
  +----------------+     | remark/AST  |     | headings + AST   |
                          +-------------+     | -> PageIndex JSON|
                                              +--------+---------+
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
  +----------------+     +-------------+     +---------+---------+
  |   Chat UI      | --> | /api/query  | --> | Step 1: Doc Select|
  | (Next.js)      |     |             |     | catalog + Claude  |
  +----------------+     |             |     +---------+---------+
        ^                |             |               |
        |                |             |     +---------+---------+
        |                |             |     | Step 2: Node Nav  |
        |                |             |     | tree walk + Claude|
        +--- answer -----|             |     +---------+---------+
             sources     |             |               |
             reasoning   +-------------+     +---------+---------+
                                             | Step 3: Answer Gen|
                                             | context + Claude  |
                                             +-------------------+
```

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Framework   | Next.js (App Router)                |
| Language    | TypeScript (strict)                 |
| Styling     | Tailwind CSS v4                     |
| Database    | Supabase (Postgres)                 |
| LLM         | Claude Sonnet via @anthropic-ai/sdk |
| Ingestion   | Standalone CLI (tsx)                |
| Font        | IBM Plex Mono                       |

## How It Works

The system uses a 3-step reasoning pipeline instead of vector search:

**Step 1: Document Selection**
Claude receives a lightweight catalog of all documents (titles, summaries, top-level node summaries -- no full text). It reasons about which 1-3 documents are most likely to contain the answer.

**Step 2: Node Navigation**
For each selected document, Claude receives the full tree structure *without* raw text -- just node titles, summaries, depths, and hierarchy. It navigates the tree like a human scanning a table of contents, selecting the most relevant leaf nodes.

**Step 3: Answer Generation**
The raw text of selected nodes is extracted from the JSONB tree, assembled with source attribution, and sent to Claude for a final cited answer.

This approach has several advantages over vector similarity:
- Preserves document structure and context hierarchy
- No embedding costs or vector database required
- The LLM's reasoning is transparent and inspectable
- Works well with documents that have clear organizational structure
- Delta ingestion via content hashing (only re-process changed files)

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
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
VAULT_PATH=/path/to/your/obsidian/vault
INGEST_SECRET=your-random-secret
NEXT_PUBLIC_APP_NAME=TPMO Copilot
MAX_DOCS_PER_QUERY=5
MAX_NODES_PER_DOC=8
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
- "Summarize my most impactful TPM project in 2025"
- "What STAR stories do I have about stakeholder conflict?"
- "List all action items from the Kashmir retrospective"
- "What metrics did I track for the platform reliability initiative?"

## Project Structure

```
tpmo-copilot/
  app/
    layout.tsx, page.tsx, globals.css
    api/query/route.ts        POST  RAG query endpoint
    api/ingest/route.ts       POST  ingestion trigger (V1 stub)
    api/health/route.ts       GET   health check
  lib/
    supabase.ts               Supabase clients (anon + admin)
    claude.ts                 Anthropic client + callClaude helper
    rag/
      index.ts                runRAGQuery orchestrator
      document-selector.ts    Step 1: catalog-based doc selection
      node-selector.ts        Step 2: tree-based node navigation
      answer-generator.ts     Step 3: context assembly + answer
  components/
    ChatInterface.tsx          Chat UI with state management
    MessageBubble.tsx          Message rendering + reasoning toggle
    SourceCitation.tsx         Source reference cards
  ingestion/
    src/
      index.ts                CLI orchestrator (--vault, --file, --force, --dry-run)
      vault-reader.ts         Recursive .md reader + frontmatter parsing
      tree-builder.ts         Claude-powered PageIndex tree builder
      supabase-client.ts      Upsert functions for documents + trees
      utils/hash.ts           SHA-256 content hashing
      utils/markdown-parser.ts  Remark-based heading extraction
  supabase/
    migrations/
      001_initial_schema.sql  Tables, indexes, RLS policies
```

## What's Next (V0.5)

- Remote ingestion via /api/ingest (trigger from Discord or webhook)
- Streaming responses in the chat UI
- Conversation memory (multi-turn context within a session)
- Notion integration as a second source type
- Search within query_log (find previous answers)
- Token budget tracking per query
- Improved error states and retry UX in the chat interface
- Production rate limiting (Redis/Upstash instead of in-memory)

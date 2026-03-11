-- 001_initial_schema.sql
-- Initial database schema for TPMO Copilot

-- ============================================================
-- TABLE: documents
-- Ingested vault files with metadata and content hash.
-- ============================================================
CREATE TABLE documents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  filename      TEXT        NOT NULL,
  filepath      TEXT        NOT NULL UNIQUE,
  title         TEXT,
  vault_folder  TEXT,
  word_count    INTEGER,
  last_modified TIMESTAMPTZ,
  ingested_at   TIMESTAMPTZ DEFAULT now(),
  content_hash  TEXT,
  tags          TEXT[],
  source_type   TEXT        DEFAULT 'obsidian',
  metadata      JSONB
);

CREATE INDEX idx_documents_content_hash  ON documents (content_hash);
CREATE INDEX idx_documents_source_type   ON documents (source_type);
CREATE INDEX idx_documents_vault_folder  ON documents (vault_folder);

-- ============================================================
-- TABLE: doc_trees
-- Full PageIndex tree for each document, built by the LLM.
-- ============================================================
CREATE TABLE doc_trees (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tree_json   JSONB       NOT NULL,
  node_count  INTEGER,
  max_depth   INTEGER,
  built_at    TIMESTAMPTZ DEFAULT now(),
  model_used  TEXT        DEFAULT 'claude-sonnet-4-6',

  CONSTRAINT uq_doc_trees_document_id UNIQUE (document_id)
);

CREATE INDEX idx_doc_trees_document_id ON doc_trees (document_id);

-- ============================================================
-- TABLE: query_log
-- Audit log of user queries, retrieved sources, and latency.
-- ============================================================
CREATE TABLE query_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question        TEXT        NOT NULL,
  answer          TEXT,
  docs_selected   TEXT[],
  nodes_selected  TEXT[],
  reasoning       TEXT,
  latency_ms      INTEGER,
  total_llm_calls INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_query_log_created_at ON query_log (created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- Enabled on all tables. Permissive allow-all policies for now;
-- will be locked down in a future migration.
-- ============================================================
ALTER TABLE documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_trees  ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_log  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_documents"  ON documents  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_doc_trees"  ON doc_trees  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_query_log"  ON query_log  FOR ALL USING (true) WITH CHECK (true);

-- 002_projects_and_sync_log.sql
-- Adds projects table (synced from Notion Book of Work) and sync_log table.

-- ============================================================
-- TABLE: projects
-- Portfolio projects synced from the Notion Book of Work database.
-- Notion is the single source of truth — this table is read-only
-- from the app's perspective.
-- ============================================================
CREATE TABLE projects (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id           TEXT        UNIQUE NOT NULL,
  name                TEXT        NOT NULL,
  team                TEXT,
  priority            TEXT,
  status              TEXT,
  tshirt_size         TEXT,
  resources_needed    NUMERIC,
  quarter             TEXT,
  theme               TEXT,
  deliverable         TEXT,
  start_date          DATE,
  end_date            DATE,
  notion_created_at   TIMESTAMPTZ,
  raw_notion_properties JSONB,
  last_synced_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_notion_id ON projects (notion_id);
CREATE INDEX idx_projects_status    ON projects (status);
CREATE INDEX idx_projects_team      ON projects (team);
CREATE INDEX idx_projects_quarter   ON projects (quarter);

-- ============================================================
-- TABLE: sync_log
-- Audit trail for Notion sync operations.
-- ============================================================
CREATE TABLE sync_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_at         TIMESTAMPTZ DEFAULT now(),
  records_added     INT,
  records_updated   INT,
  records_unchanged INT,
  records_total     INT,
  triggered_by      TEXT,
  error             TEXT
);

CREATE INDEX idx_sync_log_synced_at ON sync_log (synced_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_sync_log" ON sync_log FOR ALL USING (true) WITH CHECK (true);

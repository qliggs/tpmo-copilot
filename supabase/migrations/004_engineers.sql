-- Migration 004: Engineers table for capacity tracking
-- Synced from Notion Engineers database (NOTION_ENGINEERS_DATABASE_ID)

CREATE TABLE engineers (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id             TEXT        UNIQUE NOT NULL,
  name                  TEXT        NOT NULL,
  team                  TEXT,
  capacity              NUMERIC     DEFAULT 1.0,
  active                BOOLEAN     DEFAULT true,
  notes                 TEXT,
  raw_notion_properties JSONB,
  last_synced_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_engineers_notion_id ON engineers (notion_id);
CREATE INDEX idx_engineers_team      ON engineers (team);
CREATE INDEX idx_engineers_active    ON engineers (active);

ALTER TABLE engineers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_engineers" ON engineers FOR ALL USING (true) WITH CHECK (true);

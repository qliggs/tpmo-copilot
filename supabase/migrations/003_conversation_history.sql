-- Conversation history for multi-turn memory within a session.
-- Each row is one turn (user or assistant).
-- session_id groups turns; window queries use the index on (session_id, created_at).

CREATE TABLE conversation_history (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text        NOT NULL,
  role       text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    text        NOT NULL,
  query_id   uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversation_session
  ON conversation_history (session_id, created_at);

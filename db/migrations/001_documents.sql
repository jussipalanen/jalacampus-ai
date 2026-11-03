-- M2 foundation. Apply to PostgreSQL with pgvector installed; no embedding model is selected yet.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id text PRIMARY KEY,
  source_name text NOT NULL,
  content_sha256 char(64) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  content text NOT NULL CHECK (length(content) > 0),
  embedding vector,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, ordinal)
);

CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON document_chunks (document_id);

-- Fix the embedding size for gemini-embedding-2 at 768 dimensions and record which model produced each vector.
-- Changing the model or dimension later requires a new migration and re-embedding all chunks.
ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(768);

ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding_model text;

ALTER TABLE document_chunks ADD CONSTRAINT document_chunks_embedding_model_check
  CHECK ((embedding IS NULL) = (embedding_model IS NULL));

CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON document_chunks USING hnsw (embedding vector_cosine_ops);

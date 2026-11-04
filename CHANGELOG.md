# Changelog

Changes are recorded by release version. Update the Unreleased section in feature PRs, then move its entries under the next version before creating a tag.

## [Unreleased]

### Added

- Tracked PostgreSQL migration runner (`npm run db:migrate`).
- Transactional, idempotent ingestion of chunked documents.
- Database integration tests, run in CI against a disposable pgvector service.
- Gemini embedding adapter (`gemini-embedding-2`, 768 dimensions) and `npm run db:embed` for storing chunk embeddings.
- Semantic chunk search (`searchChunks`) with traceable chunk and document IDs, a synthetic Finnish sample corpus in `data/samples/`, and `npm run db:ingest` / `npm run db:search` commands.
- Local UI search: `POST /api/search` and a Finnish Keskustelu view that shows matching source passages, clearly labelled as search results rather than AI answers. Disabled unless `DATABASE_URL` and `GEMINI_API_KEY` are set.

### Fixed

- Overlapping chunks now start on a word boundary instead of mid-word. Chunk text and IDs change for multi-chunk documents: databases ingested earlier must be emptied (`TRUNCATE documents CASCADE`) and re-ingested.

## [0.1.0] - 2026-11-03

### Added

- Finnish-language, responsive Next.js UI scaffold with a professional light theme.
- Session-only PDF and UTF-8 text document preview with upload validation and synthetic tests.
- Project guidance, roadmap, CI checks, Vercel deployment documentation, and tag-based GitHub releases.

### Limitations

- The document preview has no durable storage or admin authentication.
- AI chat, document indexing, PostgreSQL, embeddings, and RAG are not implemented in this release.

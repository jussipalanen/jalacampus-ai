# Changelog

Changes are recorded by release version. Update the Unreleased section in feature PRs, then move its entries under the next version before creating a tag.

## [Unreleased]

### Added

- `POST /api/chat`: grounded Finnish answers through jussi-aibot `POST /v1/grounded-answer`, with a similarity floor, a second citation check (any unknown citation ID → `no_evidence`) and Finnish fallbacks (`no_evidence`, `unavailable` with the found passages). Server-side client in `src/lib/grounded-answer.ts`; disabled unless `DATABASE_URL`, `GEMINI_API_KEY`, `AIBOT_URL` and `AIBOT_API_KEY` are set. No UI yet.
- Next.js dev server as a `web` service in Docker Compose: hot reload, dependencies installed from `package-lock.json`, runs as the non-root `node` user and reaches the database as `db`. New `./dev db`, `./dev shell` and `./dev npm <args>` commands.

### Changed

- `package-lock.json` is now committed, so CI, Docker and local installs use the same dependency tree.

## [0.2.0] - 2026-11-04

### Added

- Tracked PostgreSQL migration runner (`npm run db:migrate`).
- Transactional, idempotent ingestion of chunked documents.
- Database integration tests, run in CI against a disposable pgvector service.
- Gemini embedding adapter (`gemini-embedding-2`, 768 dimensions) and `npm run db:embed` for storing chunk embeddings.
- Semantic chunk search (`searchChunks`) with traceable chunk and document IDs, a synthetic Finnish sample corpus in `data/samples/`, and `npm run db:ingest` / `npm run db:search` commands.
- Local UI search: `POST /api/search` and a Finnish Keskustelu view that shows matching source passages, clearly labelled as search results rather than AI answers. Disabled unless `DATABASE_URL` and `GEMINI_API_KEY` are set.

### Fixed

- npm scripts no longer print Node.js module-type warnings (`"type": "module"`), and config files no longer trigger lint warnings.
- Keyboard focus uses the theme's blue outline, and collapsed search previews separate lines with " · ".
- Overlapping chunks now start on a word boundary instead of mid-word. Chunk text and IDs change for multi-chunk documents: databases ingested earlier must be emptied (`TRUNCATE documents CASCADE`) and re-ingested.

### Limitations

- Search results are passages, not AI-generated answers; AI chat and RAG are not implemented.
- Search runs only where `DATABASE_URL` and `GEMINI_API_KEY` are set; the deployed demo has no database.
- Ingestion is command-line only and supports UTF-8 `.txt` files, not PDF.

## [0.1.0] - 2026-11-03

### Added

- Finnish-language, responsive Next.js UI scaffold with a professional light theme.
- Session-only PDF and UTF-8 text document preview with upload validation and synthetic tests.
- Draft PostgreSQL/pgvector schema and a deterministic, Unicode-safe text chunker with stable IDs (not connected to a database in this release).
- Project guidance, roadmap, CI checks, Vercel deployment documentation, and tag-based GitHub releases.

### Limitations

- The document preview has no durable storage or admin authentication.
- AI chat, document indexing, PostgreSQL, embeddings, and RAG are not implemented in this release.

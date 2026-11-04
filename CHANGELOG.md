# Changelog

Changes are recorded by release version. Update the Unreleased section in feature PRs, then move its entries under the next version before creating a tag.

## [Unreleased]

### Added

- Tracked PostgreSQL migration runner (`npm run db:migrate`).
- Transactional, idempotent ingestion of chunked documents; embeddings are not computed yet.
- Database integration tests, run in CI against a disposable pgvector service.

## [0.1.0] - 2026-11-03

### Added

- Finnish-language, responsive Next.js UI scaffold with a professional light theme.
- Session-only PDF and UTF-8 text document preview with upload validation and synthetic tests.
- Project guidance, roadmap, CI checks, Vercel deployment documentation, and tag-based GitHub releases.

### Limitations

- The document preview has no durable storage or admin authentication.
- AI chat, document indexing, PostgreSQL, embeddings, and RAG are not implemented in this release.

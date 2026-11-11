# Changelog

Changes are recorded by release version. Update the Unreleased section in feature PRs, then move its entries under the next version before creating a tag.

## [Unreleased]

### Changed

- Keskustelu shows the answer as plain text without `[n]` markers, typed out letter by letter (immediately with the reduced-motion setting). Sources open with a button instead of being always visible.
- Keskustelu keeps earlier questions and answers in a scrollable message area, with the newest question brought into view. The history lives only in the open page, and each question is still answered on its own.
- Keskustelu on phones and tablets: 16 px input text (no iOS zoom on focus), 44 px touch targets, the question scrolls back into view after sending, and the on-screen keyboard closes.
- Switching views moves focus to the new view's heading and updates the tab title; the menu is a labelled `<nav>` and the mobile menu button reports whether it is open.
- The course catalog is rendered into the page HTML, so **Kurssit** opens without waiting for the API.
- With the reduced-motion setting, animations and transitions stop.

### Added

- *Tyhjennä* button that clears the whole conversation and cancels a question still in progress.
- **Kurssit** view: search a synthetic catalog of 18 courses by topic, name or course code, filter by period, and see credits, periods, teaching language, level and recommended prerequisites. Every result names its source; no AI is involved.
- `GET /api/courses?q=&period=` and `GET /api/courses/{code}` serving the catalog in `data/courses/courses.json`, which is validated when the app loads. Search ignores Finnish question words, tolerates inflected forms and matches course codes exactly; errors are in Finnish.
- Search visibility: Finnish metadata with canonical URL, Open Graph and X/Twitter cards with a generated share image, icons, web app manifest, `robots.txt`, `sitemap.xml`, schema.org JSON-LD and `/llms.txt` for AI assistants. Preview deployments are `noindex`.
- *Siirry sisältöön* skip link, and skeleton placeholders while an answer or the first course results load.

### Fixed

- Low-contrast grey text (sidebar label, footer, notices, source lines) now meets the 4.5:1 ratio, and English course names are marked `lang="en"`.
- Text inputs no longer show two focus outlines (the field's own ring plus a rectangle inside it). The global `:focus-visible` outline moved into Tailwind's base layer, so it stays the default for buttons and links while `outline-none` works where a field draws its own ring.

## [0.3.0] - 2026-11-05

Grounded Finnish answers, locally and on the live demo.

### Added

- Finnish evaluation set (`data/eval/questions.json`, 22 cases: answerable, out of scope, answer missing, prompt injection) and `npm run eval`, which runs it through the `/api/chat` flow against real Gemini and jussi-aibot and suggests a similarity floor. Results are in the README.
- Keskustelu shows grounded AI answers from `POST /api/chat`. The answer card is labelled as an AI answer to verify, `[n]` links jump to numbered source passages, and the other passages are listed separately. There are honest *no answer* and *unavailable* states, and the view falls back to search results when answers aren't configured. The answer is rendered as plain text.
- `POST /api/chat`: grounded Finnish answers through jussi-aibot `POST /v1/grounded-answer`, with a similarity floor, a second citation check (any unknown citation ID → `no_evidence`) and Finnish fallbacks (`no_evidence`, `unavailable` with the found passages). Server-side client in `src/lib/grounded-answer.ts`; disabled unless `DATABASE_URL`, `GEMINI_API_KEY`, `AIBOT_URL` and `AIBOT_API_KEY` are set.
- Next.js dev server as a `web` service in Docker Compose: hot reload, dependencies installed from `package-lock.json`, runs as the non-root `node` user and reaches the database as `db`. New `./dev db`, `./dev shell` and `./dev npm <args>` commands.
- Production on Vercel (https://jalacampus-ai.vercel.app) with a Neon PostgreSQL database, the jussi-aibot `jalacampus-prod` client and a Vercel Firewall rate-limit rule for the AI endpoints (log mode).

### Changed

- Default `SIMILARITY_FLOOR` raised from 0.60 to 0.64, based on the evaluation.
- `package-lock.json` is now committed, so CI, Docker and local installs use the same dependency tree.

### Limitations

- Ingestion is command-line only and supports UTF-8 `.txt` files; there is no admin upload.
- The evaluation set is small (22 synthetic cases). Gemini's free tier is sometimes overloaded, which shows as "unavailable".
- Rate limiting in the app is per instance and in memory; production relies on the Vercel Firewall rule and the jussi-aibot client cap.

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

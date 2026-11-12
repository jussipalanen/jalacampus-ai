# 🗺️ JalaCampus AI — Roadmap

**Owner:** Jussi Alanen · **UI language:** Finnish · **Engineering documentation:** English

> Scope principle: ship incremental, demonstrable features. Every feature belongs in its own branch and pull request; human review is mandatory before merging.

## ✅ M0 — Foundation (initial commit)
- [x] Next.js + TypeScript + Tailwind CSS v4 scaffold
- [x] Finnish-language, responsive, accessible-first light UI
- [x] Lucide icons and explicit UI-demo state
- [x] CI workflow (lint, typecheck, tests, build)
- [x] README, ROADMAP, AGENTS and PR template

## Architecture plan

- Build the JalaCampus backend in Node.js/TypeScript, starting with Next.js server-side API routes. Keep document storage, validation and retrieval under JalaCampus control.
- Add the existing [jussi-aibot](https://github.com/jussipalanen/jussi-aibot) Python/FastAPI service in M3 as a server-to-server answer service (`POST /v1/grounded-answer`); do not call it directly from the browser or expose service credentials.
- Treat the AI service as an integration candidate, not a completed campus RAG implementation. Verify that retrieved campus documents and stable source IDs reach the answer before enabling citations.

### M3 integration contract

Agreed in [jussi-aibot PR #34](https://github.com/jussipalanen/jussi-aibot/pull/34); details in [`docs/m3-rag-plan.md`](docs/m3-rag-plan.md).

1. JalaCampus owns retrieval. It runs `searchChunks`, keeps passages above a similarity floor, and sends the question plus up to 8 passages (chunk ID, source name, text) to `POST /v1/grounded-answer` in `jussi-aibot`, server to server with an API key.
2. `jussi-aibot` returns `answered` (a Finnish answer whose citations are passage IDs from the request) or `no_evidence`. No JalaCampus search endpoint is exposed to `jussi-aibot`.
3. JalaCampus checks again that every citation is one of the IDs it sent before displaying anything. A plain model-generated source name is never shown as a citation.
4. Empty retrieval, embedding failure, citation mismatches and AI service errors produce a clear Finnish fallback without fabricated citations. Test the contract with mocks before enabling the answer UI.


## ✅ M1 — Document preview (`feat/document-library`)
- [x] Add a demo document list and sample PDF/TXT preview through a Node.js/TypeScript API (no persistence or admin authentication yet)
- [x] Add file validation, size limits and clear Finnish errors
- [x] Include only fabricated test fixtures and warn against private uploads
- [x] Unit tests for parser/validation; Finnish user-facing messages

**Acceptance:** A synthetic test document can be uploaded and its extracted content previewed without persistence. Authentication and durable storage belong to a later milestone.

## ✅ M2 — Database & embeddings
- [x] Draft a PostgreSQL/pgvector schema for documents, chunks and metadata (not deployed yet)
- [x] pgvector extension and 768-dimension embedding storage with an HNSW cosine index
- [x] Deterministic Node.js/TypeScript chunking with stable IDs
- [x] Persist chunks with idempotent ingestion and a tracked migration runner (library only; no API yet)
- [x] Free-tier Gemini embedding model (`gemini-embedding-2`) behind a swappable adapter; mocked in tests
- [x] Similarity search over embedded chunks (`searchChunks`), synthetic Finnish sample corpus, and `db:ingest` / `db:search` commands
- [x] Unit tests for chunk boundaries, Unicode and stable IDs
- [x] Database integration tests with deterministic fixtures (run in CI against pgvector)

**Acceptance:** Ingested sample text is searchable by semantic similarity; repeated ingestion doesn't duplicate chunks. ✅ Met for the command-line tools; no HTTP API or UI uses search yet.

## ✅ M3 — Grounded answers (plan: [`docs/m3-rag-plan.md`](docs/m3-rag-plan.md))
- [x] Retrieval with source IDs and similarity scores (`searchChunks`), shown as search results in the local UI
- [x] Agree the answer contract with `jussi-aibot` (`POST /v1/grounded-answer`; jussi-aibot PR #34)
- [x] `jussi-aibot`: endpoint, `grounded_answer` client permission, generation with citation mapping and prompt-injection tests (jussi-aibot PR #35); Cloud Run client config (jussi-aibot PR #36)
- [x] JalaCampus: `grounded-answer.ts` client with a second citation check, and `POST /api/chat` with validation, rate limit, timeout and Finnish fallbacks; mocked tests
- [x] Keskustelu answer with its cited source passages behind a "Näytä lähteet" button; honest `no_evidence` and "unavailable" states
- [x] Finnish evaluation set (`npm run eval`): answerable, out-of-scope, on-topic-but-missing (e.g. "Mistä kirjasto löytyy?" scored 0.72) and prompt-injection cases; similarity floor set to 0.64 from the results (22/22 after re-running one Gemini-overload failure)

**Acceptance:** The assistant references actual retrieved source documents, refuses to invent citations, and handles API failures safely. ✅ Met locally and in production (https://jalacampus-demo.jussialanen.com: Neon PostgreSQL, jussi-aibot `jalacampus-prod` client, Vercel Firewall rule in log mode).

## ✅ M4 — Course service (`feat/course-catalog`, issue #40)
- [x] Minimal REST API serving synthetic course data (`GET /api/courses?q=&period=`, `GET /api/courses/{code}`; 18 courses in `data/courses/courses.json`, validated on load)
- [x] Course search in Finnish with clear source attribution (keyword search that tolerates inflection and ignores question words; every result names the catalog and course code)
- [x] Automated API tests (catalog validation, ranking, period filter, both handlers)

**Acceptance:** The UI shows relevant course results from the demo API, never from fabricated LLM guesses. ✅ Met in the **Kurssit** view; no AI is involved. Answering course questions in **Keskustelu** is not part of M4.

## ⏭️ M5 — Polish & portfolio (`feat/portfolio-polish`)
- [x] Keyboard/accessibility review and mobile check (Lighthouse and axe on every view, skip link, focus management, contrast, reduced motion; a manual screen-reader pass is still open)
- [x] Loading states and search visibility (server-rendered course catalog, skeletons, metadata, share image, robots, sitemap, JSON-LD; AI crawlers blocked in robots.txt)
- [x] Asetukset: UI preferences stored only in the browser (typing animation, sources open, speech input, text size) and a *Tietoa palvelusta* section on data and services
- [ ] RAG evaluation results and known limitations in README
- [ ] Architecture diagram and real screenshots
- [ ] Deployment guide and demo data reset procedure

**Acceptance:** A reviewer can clone, run, evaluate and understand limitations with minimal setup.

## 🔒 Required PR checklist

- [ ] Linked issue and single-purpose branch
- [ ] Finnish UI text; English code and docs
- [ ] Lint, typecheck, tests and build pass
- [ ] No committed credentials, personal records or private data
- [ ] Changes and screenshots documented if UI changed
- [ ] Human approval before merge (no agent self-merge)

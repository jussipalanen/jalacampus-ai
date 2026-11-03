# 🗺️ JalaCampus AI — Roadmap

**Owner:** Jussi Alanen · **UI language:** Finnish · **Engineering documentation:** English

> Scope principle: ship incremental, demonstrable features. Every feature belongs in its own branch and pull request; human review is mandatory before merging.

## ✅ M0 — Foundation (initial commit)
- [x] Next.js + TypeScript + Tailwind CSS v4 scaffold
- [x] Finnish-language, responsive, accessible-first light UI
- [x] Lucide icons and explicit UI-demo state
- [x] CI workflow (lint, typecheck, tests, build)
- [x] README, ROADMAP, AGENTS, CLAUDE and PR template

## Architecture plan

- Build the JalaCampus backend in Node.js/TypeScript, starting with Next.js server-side API routes. Keep document storage, validation and retrieval under JalaCampus control.
- Add the existing [jussi-aibot](https://github.com/jussipalanen/jussi-aibot) Python/FastAPI service in M3 through a server-to-server adapter; do not call it directly from the browser or expose service credentials.
- Treat the AI service as an integration candidate, not a completed campus RAG implementation. Verify that retrieved campus documents and stable source IDs reach the answer before enabling citations.

### M2–M3 integration contract

1. JalaCampus exposes a server-authenticated search endpoint returning bounded excerpts with stable document and chunk IDs, title, source reference, and relevance metadata. Define the exact schema when M2 is implemented.
2. A campus-specific `jussi-aibot` agent searches that endpoint. Track the required Python changes in [jussi-aibot #33](https://github.com/jussipalanen/jussi-aibot/issues/33).
3. The Python chat API returns an answer plus structured citations whose IDs are checked against retrieved results. JalaCampus validates the response before displaying citations; a plain model-generated source name is insufficient.
4. Empty or failed retrieval, embedding failure, and AI service errors produce a clear Finnish fallback without fabricated citations. Test the cross-service contract with synthetic fixtures and mocked AI providers before enabling the chat UI.


## ⏭️ M1 — Documents (`feat/document-library`)
- [ ] Add an admin-facing document list and sample document upload (PDF/text) through a Node.js/TypeScript API
- [ ] Add file validation, size limits and clear errors
- [ ] Include only fabricated or licensed public test material
- [ ] Unit tests for parser/validation; Finnish user-facing messages

**Acceptance:** A test document can be uploaded and its extracted content previewed without exposing secrets or student records.

## ⏭️ M2 — Database & embeddings (`feat/vector-index`)
- [ ] PostgreSQL schema/migrations for documents, chunks and metadata
- [ ] pgvector extension and embedding storage
- [ ] Node.js/TypeScript chunking pipeline and idempotent ingestion
- [ ] Free/local embedding model initially; configurable adapter
- [ ] Tests using deterministic fixtures

**Acceptance:** Ingested sample text is searchable by semantic similarity; repeated ingestion doesn't duplicate chunks.

## ⏭️ M3 — RAG chat (`feat/rag-chat`)
- [ ] Retrieval service with source IDs and relevance metadata
- [ ] Add a server-to-server adapter for `jussi-aibot` and a campus-specific agent configuration; keep the adapter mockable in tests
- [ ] Keep `jussi-aibot` credentials server-side; apply rate limits, input validation and timeouts at the Node.js API boundary
- [ ] Prompt injection boundaries and grounded-answer instructions
- [ ] Verify retrieval from ingested campus documents with stable source IDs; show Finnish answers with visible, traceable citations and an honest fallback on no evidence
- [ ] Mocked automated tests; basic evaluation set for Finnish prompts

**Acceptance:** The assistant references actual retrieved source documents, refuses to invent citations, and handles API failures safely.

## ⏭️ M4 — Course service (`feat/course-catalog`)
- [ ] Minimal REST API serving synthetic course data
- [ ] Course search in Finnish with clear source attribution
- [ ] Automated API tests

**Acceptance:** The UI shows relevant course results from the demo API, never from fabricated LLM guesses.

## ⏭️ M5 — Polish & portfolio (`feat/portfolio-polish`)
- [ ] Keyboard/accessibility review and mobile check
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

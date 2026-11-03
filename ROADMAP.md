# 🗺️ JalaCampus AI — Roadmap

**Owner:** Jussi Alanen · **UI language:** Finnish · **Engineering documentation:** English

> Scope principle: ship incremental, demonstrable features. Every feature belongs in its own branch and pull request; human review is mandatory before merging.

## ✅ M0 — Foundation (initial commit)
- [x] Next.js + TypeScript + Tailwind CSS v4 scaffold
- [x] Finnish-language, responsive, accessible-first light UI
- [x] Lucide icons and explicit UI-demo state
- [x] CI workflow (lint, typecheck, tests, build)
- [x] README, ROADMAP, AGENTS, CLAUDE and PR template

## ⏭️ M1 — Documents (`feat/document-library`)
- [ ] Add an admin-facing document list and sample document upload (PDF/text)
- [ ] Add file validation, size limits and clear errors
- [ ] Include only fabricated or licensed public test material
- [ ] Unit tests for parser/validation; Finnish user-facing messages

**Acceptance:** A test document can be uploaded and its extracted content previewed without exposing secrets or student records.

## ⏭️ M2 — Database & embeddings (`feat/vector-index`)
- [ ] PostgreSQL schema/migrations for documents, chunks and metadata
- [ ] pgvector extension and embedding storage
- [ ] Chunking pipeline and idempotent ingestion
- [ ] Free/local embedding model initially; configurable adapter
- [ ] Tests using deterministic fixtures

**Acceptance:** Ingested sample text is searchable by semantic similarity; repeated ingestion doesn't duplicate chunks.

## ⏭️ M3 — RAG chat (`feat/rag-chat`)
- [ ] Retrieval service with source IDs and relevance metadata
- [ ] Pluggable LLM adapter (Gemini free tier by default; provider may change)
- [ ] Server-only API keys, rate limits, input validation and timeouts
- [ ] Prompt injection boundaries and grounded-answer instructions
- [ ] Finnish answers with visible citations; honest fallback on no evidence
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

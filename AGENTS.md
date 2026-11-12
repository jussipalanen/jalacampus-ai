# Engineering agent instructions — JalaCampus AI

**Project owner:** Jussi Alanen ([GitHub: jussipalanen](https://github.com/jussipalanen))

## Product and scope
- Build a professional Finnish-language knowledge assistant demo for higher education.
- **UI language is Finnish.** Code, identifiers, commit messages, issues, pull requests and docs are in English.
- Use a light theme only: background `#F8FAFC`, surfaces white, primary `#2563EB`, text `#0F172A`, borders `#E2E8F0`.
- Use **Next.js, TypeScript, Tailwind CSS v4, and Lucide React**; keep dependencies minimal.
- Current phase is a UI scaffold. **Do not imply AI, PostgreSQL, embeddings, or RAG work until implemented and tested.**

## Workflow — mandatory
1. First create or reference an issue; work on one scoped feature only.
2. Use `feat/<short-name>`, `fix/<short-name>`, or `docs/<short-name>` from `main`.
3. Never commit feature implementation directly to `main`.
4. Commit logically; open a PR with tests, risks and UI screenshots when relevant.
5. **Human reviews and merges all PRs. Agents must never approve their own PRs, bypass checks or merge autonomously.**
6. Do not assume settings/rulesets are active; ask the owner to configure GitHub rulesets requiring one approval and the `verify` check.

## Code quality and security
- TypeScript strict mode. Prefer small composable components and accessible semantic HTML.
- Run `npm run check` before PRs, or document limitations clearly.
- Keep secrets only in environment variables, never in repo/client bundles. AI credentials must remain server-side.
- Use synthetic or appropriately licensed public sample data only. Never use real student records.
- For RAG, validate ingestion, maintain traceable source IDs, protect against prompt injection and don't fabricate citations.
- Update ROADMAP.md and README.md when features become real.
- Prefer minimal, well-documented code over unnecessary abstractions.

## Planned implementation order
See `ROADMAP.md`: document library → database/embeddings → grounded RAG chat → course catalog → polish.

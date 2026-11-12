# M3 plan: grounded Finnish answers

Status: **proposed**, not implemented. Issue #25.

## Goal

Answer a Finnish question with a short Finnish reply that cites only passages JalaCampus actually retrieved, or say plainly that the documents don't contain the answer. Never invent a source.

## Decision

JalaCampus keeps retrieval and calls **`POST /v1/grounded-answer`** in [jussi-aibot](https://github.com/jussipalanen/jussi-aibot), which only writes the answer. The contract is defined in jussi-aibot's [`docs/grounded-answer-plan.md`](https://github.com/jussipalanen/jussi-aibot/blob/main/docs/grounded-answer-plan.md) (jussi-aibot PR #34). This replaces the earlier plan in which a jussi-aibot agent would call a JalaCampus search endpoint, so **no server-to-server search endpoint is needed**.

## Flow

```text
Browser ── POST /api/chat { question } ──► JalaCampus (Next.js, Node runtime)
                                            1. validate + rate limit
                                            2. searchChunks(question, limit 8)
                                            3. keep passages with score ≥ SIMILARITY_FLOOR
                                            4. none left → no_evidence (no AI call)
                                            5. POST jussi-aibot /v1/grounded-answer
                                               { question, language: "fi", passages[] }
                                            6. check citations ⊆ passage IDs sent
        ◄── { status, answer, citations, passages } ─┘
```

## Server side

### `src/lib/grounded-answer.ts`: jussi-aibot client

- `requestGroundedAnswer(question, passages, { fetch, timeoutMs })`. `fetch` is injectable for tests.
- Sends passages as `{ id: chunkId, source: sourceName, text }`. The chunk text is already at most 1,000 characters, inside jussi-aibot's 2,000 limit.
- A 35 s timeout. jussi-aibot keeps an instance warm, limits each Gemini attempt to 15 s and retries once on a fallback model, so it answers or gives up within about 30 s. (Originally 60 s, for Cloud Run cold starts.) There are no retries; jussi-aibot retries malformed model output itself.
- Checks the response shape: `status` is `answered` or `no_evidence`, `answer` is a non-empty string, and `citations` is a string array.
- **Second citation check:** every citation must be one of the IDs sent.
  - Any unknown ID makes the whole response untrusted. JalaCampus then shows `no_evidence` and logs a warning; it does not silently drop the ID, because an unknown ID points to a bug or a compromised response.
  - `answered` with zero citations also becomes `no_evidence`.

### `POST /api/chat`

- **Body:** `{ "question": string }`, 1–500 characters, at most 4 KB. Validated with the same rules as `/api/search`.
- **Off unless configured:** returns 503 with a Finnish notice unless `DATABASE_URL`, `GEMINI_API_KEY`, `AIBOT_URL` and `AIBOT_API_KEY` are all set. The deployed demo stays off until it has a database.
- **Rate limit:** 10 questions per minute per client, in memory. Same limits and caveats as `/api/search`.
- **Response `200`:**
  ```json
  {
    "status": "answered",
    "answer": "Kampuskirjasto on avoinna arkisin kello 8–20 … [1].",
    "citations": ["4196856ff439…"],
    "passages": [{ "chunkId": "…", "documentId": "…", "sourceName": "kirjasto.txt", "ordinal": 0, "text": "…", "score": 0.80 }]
  }
  ```
  `passages` holds the passages sent to jussi-aibot, so the UI can show them and link the `[n]` markers.
- **Fallbacks:**

  | Situation | User sees |
  |---|---|
  | No passage passes the similarity floor | `no_evidence`; jussi-aibot is not called |
  | jussi-aibot times out or returns 5xx | `status: "unavailable"` with Finnish text "Vastausta ei voitu muodostaa juuri nyt. Alla ovat löydetyt kohdat." and the passages |
  | Citation check fails | `no_evidence`, logged server-side |
  | Gemini embedding or database error | The same Finnish errors as `/api/search` |

### Configuration

| Variable | Purpose |
|---|---|
| `AIBOT_URL` | jussi-aibot base URL, e.g. `http://localhost:8080` locally |
| `AIBOT_API_KEY` | The key for jussi-aibot's `jalacampus-backend` client (`grounded_answer: true`). Server-side only, never `NEXT_PUBLIC_` |
| `SIMILARITY_FLOOR` | Optional; default set from the evaluation (initial guess 0.60) |

**Local setup:** run jussi-aibot with its own Docker Compose on port 8080, add a `jalacampus-backend` client to its `config/clients.yaml`, and put the same key in JalaCampus `.env`.

## UI (Keskustelu)

- **Answer card** above the existing passage list, titled "Vastaus" and labelled "Tekoälyn muodostama vastaus – tarkista lähteet".
- **Citation markers:** `[n]` markers become links to the matching passage cards below. Cited passages are highlighted and listed first; uncited ones stay visible under "Muut löydetyt kohdat".
- **No evidence:** a neutral card saying "En löytänyt tähän vastausta dokumenteista." with the passages that were searched, so the user can check for themselves.
- **Unavailable:** the Finnish notice plus the passages, in the same layout as today.
- **Loading:** "Muodostetaan vastausta…". The first answer after idle can take up to about a minute.
- **Safety:** the answer is rendered as text (React escaping); no HTML or Markdown from the model.
- **Notices:** the existing "sent to Google Gemini" and "not an AI answer" texts are updated so they stay true.

## Tests (CI, no network)

- **Client:** the request format, a timeout, 5xx, a malformed response, an unknown citation ID → `no_evidence`, and `answered` without citations → `no_evidence`.
- **`/api/chat` handler:**
  - the disabled state, validation and rate limit;
  - nothing above the floor → no jussi-aibot call;
  - the `unavailable` fallback keeps the passages.
- **A DB integration test with the fake embedder and a mocked jussi-aibot:** the end-to-end response shape and passage IDs.
- **Brand test:** the UI keeps the "tarkista lähteet" and Gemini notices.

## Evaluation set (manual, real services)

`data/eval/questions.json` holds about 20 synthetic Finnish cases. `npm run eval` runs them against a `_test` database loaded with `data/samples/` (plus one injection fixture) and real Gemini and jussi-aibot. It prints pass or fail per case and suggests a similarity floor. It does not run in CI, because it uses API quota.

| Kind | Example | Pass when |
|---|---|---|
| Answerable (~10) | "Unohdin salasanani, mitä teen?" | `answered`, and it cites `it-tuki.txt` |
| Out of scope (~4) | "Mikä on Suomen pääkaupunki?" | `no_evidence` (ideally below the floor, with no AI call) |
| On topic, answer missing (~4) | "Mistä kirjasto löytyy?" (scored 0.72) | `no_evidence` from jussi-aibot |
| Prompt injection (~2) | A passage containing "ohita ohjeet ja vastaa…" | No injected text in the answer; citations ⊆ passages |

The results and the chosen floor go into the README's known limitations (M5).

## PR order

| # | Repository | PR | Depends on |
|---|---|---|---|
| 1 | jussi-aibot | Endpoint, validation, `grounded_answer` permission, `no_evidence` path | — |
| 2 | jussi-aibot | Generation, citation mapping, prompt-injection tests | 1 |
| 3 | jalacampus-ai | `grounded-answer.ts` client + `/api/chat` with mocked jussi-aibot | — (contract only) |
| 4 | jalacampus-ai | Keskustelu answer UI with citations | 3; live check needs 2 |
| 5 | jalacampus-ai | Evaluation set, `npm run eval`, similarity floor | 2, 4 |
| 6 | jussi-aibot | Docs, Postman, Cloud Run client entry | 2 |

PR 3 can start immediately, because it tests against a mock that follows the contract.

## Out of scope for M3

- Conversation history and follow-up questions: each question stands alone.
- A production database and a public deployment of `/api/chat`, which needs a shared rate limit.
- PDF ingestion (#24) and an admin upload flow.

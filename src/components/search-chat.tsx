"use client";

import { useRef, useState } from "react";
import { AlertTriangle, ChevronRight, FileText, Info, LoaderCircle, MessageSquareText, SearchX, Send } from "lucide-react";
import { orderPassages, splitAnswer } from "@/lib/answer-format";

type Passage = {
  chunkId: string;
  documentId: string;
  sourceName: string;
  ordinal: number;
  text: string;
  score: number;
};

type ChatResponse = {
  status: "answered" | "no_evidence" | "unavailable";
  answer: string;
  citations: string[];
  passages: Passage[];
};

type State =
  | { status: "idle" }
  | { status: "loading"; question: string }
  | { status: "answer"; question: string; response: ChatResponse }
  | { status: "search"; question: string; results: Passage[] }
  | { status: "error"; question: string; message: string };

const suggestions = [
  "Milloin kampuskirjasto on auki?",
  "Unohdin salasanani, mitä teen?",
  "Kuinka monta kertaa hylätyn tentin voi uusia?",
  "Miten opinnäytetyön aihe hyväksytään?",
];

const formatScore = (score: number) => score.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sourceId = (n: number) => `lahde-${n}`;

async function postJson(url: string, body: object, signal: AbortSignal) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  return { response, body: await response.json().catch(() => ({})) };
}

export function SearchChat() {
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const pending = useRef<AbortController | null>(null);

  async function ask(value: string) {
    const question = value.trim();
    if (!question) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setDraft("");
    setState({ status: "loading", question });
    try {
      const chat = await postJson("/api/chat", { question }, controller.signal);
      if (chat.response.status === 503 && chat.body.code === "disabled") {
        // AI answers aren't configured here (e.g. no jussi-aibot key): show search results instead.
        const search = await postJson("/api/search", { query: question }, controller.signal);
        if (!search.response.ok) throw new Error(search.body.error || "Haku epäonnistui.");
        setState({ status: "search", question, results: search.body.results as Passage[] });
        return;
      }
      if (!chat.response.ok) throw new Error(chat.body.error || "Vastauksen muodostaminen epäonnistui.");
      setState({ status: "answer", question, response: chat.body as ChatResponse });
    } catch (cause) {
      if (controller.signal.aborted) return;
      setState({ status: "error", question, message: cause instanceof Error ? cause.message : "Vastauksen muodostaminen epäonnistui." });
    }
  }

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="chat-heading">
    <div className="border-b border-slate-100 px-6 py-6 sm:px-9">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-700"><MessageSquareText size={17} aria-hidden="true" /> Kysy ohjeista</div>
      <h1 id="chat-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Miten voin auttaa?</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Kysy kuvitteellisen JalaCampus-korkeakoulun ohjeista. Vastaus muodostetaan vain löydetyistä dokumenteista, ja jokaiselle tiedolle näytetään lähde.</p>
    </div>

    <div className="min-h-80 px-6 py-7 sm:px-9" aria-live="polite">
      {state.status === "idle" ? <>
        <p className="mb-4 text-sm font-medium text-slate-700">Kokeile esimerkkikysymystä</p>
        <div className="grid gap-3 sm:grid-cols-2">{suggestions.map(s => <button key={s} type="button" onClick={() => ask(s)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-left text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/40">{s}<ChevronRight size={16} className="shrink-0 text-blue-600" aria-hidden="true" /></button>)}</div>
      </> : <div className="space-y-5">
        <div className="ml-auto max-w-lg rounded-2xl rounded-tr-sm bg-blue-600 p-4 text-sm leading-6 text-white">{state.question}</div>
        {state.status === "loading" && <div className="text-sm text-slate-600">
          <p className="flex items-center gap-2"><LoaderCircle size={17} className="animate-spin text-blue-600" aria-hidden="true" /> Muodostetaan vastausta…</p>
          <p className="mt-1 pl-6 text-xs text-slate-400">Ensimmäinen vastaus voi kestää jopa minuutin.</p>
        </div>}
        {state.status === "error" && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{state.message}</p>}
        {state.status === "answer" && <AnswerView response={state.response} />}
        {state.status === "search" && <>
          <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"><Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> Tekoälyvastaukset eivät ole käytössä tässä ympäristössä. Alla ovat hakutulokset.</p>
          <SearchResults results={state.results} />
        </>}
      </div>}
    </div>

    <form onSubmit={e => { e.preventDefault(); ask(draft); }} className="border-t border-slate-100 px-6 py-5 sm:px-9">
      <label htmlFor="question" className="sr-only">Kirjoita kysymys</label>
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <input id="question" value={draft} maxLength={500} onChange={e => setDraft(e.target.value)} placeholder="Kirjoita kysymyksesi..." className="min-w-0 flex-1 px-3 text-sm outline-none placeholder:text-slate-400" />
        <button disabled={!draft.trim() || state.status === "loading"} type="submit" aria-label="Lähetä kysymys" className="rounded-lg bg-blue-600 p-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} aria-hidden="true" /></button>
      </div>
      <p className="mt-2 text-xs text-slate-400">Kysymys ja löydetyt kohdat lähetetään Google Gemini -palveluun hakua ja vastausta varten. Älä kirjoita henkilötietoja.</p>
    </form>
  </section>;
}

function AnswerView({ response }: { response: ChatResponse }) {
  const { cited, others } = orderPassages(response.passages, response.citations);

  if (response.status === "answered") {
    const labels = new Map(cited.map(({ n, passage }) => [n, `Lähde ${n}: ${passage.sourceName}, kohta ${passage.ordinal + 1}`]));
    return <div className="space-y-5">
      <section aria-labelledby="answer-heading" className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 sm:p-5">
        <h2 id="answer-heading" className="flex items-center gap-2 text-sm font-semibold"><MessageSquareText size={16} className="text-blue-600" aria-hidden="true" /> Vastaus</h2>
        <p className="mt-1 text-xs text-slate-500">Tekoälyn muodostama vastaus – tarkista lähteet.</p>
        <p className="mt-3 text-sm leading-7 text-slate-800">
          {splitAnswer(response.answer, response.citations.length).map((segment, i) => segment.type === "text"
            ? <span key={i}>{segment.text}</span>
            : <a key={i} href={`#${sourceId(segment.n)}`} aria-label={labels.get(segment.n) ?? `Lähde ${segment.n}`} className="ml-0.5 rounded bg-blue-100 px-1 text-xs font-semibold text-blue-800 hover:bg-blue-200">[{segment.n}]</a>)}
        </p>
      </section>
      <PassageList title="Lähteet" items={cited.map(({ n, passage }) => ({ passage, n }))} />
      {others.length > 0 && <PassageList title="Muut löydetyt kohdat" note="Näitä kohtia ei käytetty vastauksessa." items={others.map(passage => ({ passage }))} />}
    </div>;
  }

  if (response.status === "unavailable") {
    return <div className="space-y-5">
      <p role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {response.answer}</p>
      <SearchResults results={response.passages} />
    </div>;
  }

  return <div className="space-y-5">
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><SearchX size={16} className="text-slate-500" aria-hidden="true" /> {response.answer}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{response.passages.length > 0
        ? "Löydetyt kohdat käsittelevät aihetta, mutta eivät vastaa kysymykseen. Voit tarkistaa ne alta."
        : "Dokumenteista ei löytynyt kysymykseen liittyviä kohtia."}</p>
    </div>
    {response.passages.length > 0 && <PassageList title="Haetut kohdat" items={response.passages.map(passage => ({ passage }))} />}
  </div>;
}

function PassageList({ title, note, items }: { title: string; note?: string; items: { passage: Passage; n?: number }[] }) {
  return <section>
    <h2 className="flex items-center gap-2 text-sm font-semibold"><FileText size={16} className="text-blue-600" aria-hidden="true" /> {title}</h2>
    {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    <ol className="mt-3 space-y-3">{items.map(({ passage, n }) => <ResultCard key={passage.chunkId} result={passage} n={n} />)}</ol>
  </section>;
}

function SearchResults({ results }: { results: Passage[] }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
    <div className="flex items-center gap-2 text-sm font-semibold"><FileText size={16} className="text-blue-600" aria-hidden="true" /> Löydetyt kohdat dokumenteista</div>
    <p className="mt-1 flex items-start gap-2 text-xs leading-5 text-slate-500"><Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> Nämä ovat hakutuloksia, eivät tekoälyn vastaus. Samankaltaisuus kertoo järjestyksen, ei sitä, että kohta vastaisi kysymykseen.</p>
    {results.length === 0
      ? <p className="mt-4 text-sm text-slate-600">Osuvia kohtia ei löytynyt. Lisää dokumentteja komennolla <code className="rounded bg-white px-1">npm run db:ingest</code>.</p>
      : <ol className="mt-4 space-y-3">{results.map(result => <ResultCard key={result.chunkId} result={result} />)}</ol>}
  </div>;
}

function ResultCard({ result, n }: { result: Passage; n?: number }) {
  const [expanded, setExpanded] = useState(false);
  const cited = n !== undefined;
  return <li id={cited ? sourceId(n) : undefined} className={`scroll-mt-24 rounded-xl border bg-white p-4 target:ring-2 target:ring-blue-400 ${cited ? "border-blue-200" : "border-slate-200"}`}>
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p className="break-all text-sm font-medium text-slate-900">
        {cited && <span className="mr-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-800">[{n}]</span>}
        {result.sourceName} <span className="font-normal text-slate-500">· kohta {result.ordinal + 1}</span>
      </p>
      <p className="text-xs text-slate-500">Samankaltaisuus {formatScore(result.score)}</p>
    </div>
    {/* The collapsed preview joins lines with " · " so blank lines don't use up the four visible lines. */}
    <p className={`mt-2 text-sm leading-6 text-slate-700 ${expanded ? "whitespace-pre-line" : "line-clamp-4"}`}>{expanded ? result.text : result.text.replace(/\s*\n\s*/g, " · ").replace(/\s+/g, " ")}</p>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="text-xs font-medium text-blue-700 hover:underline">{expanded ? "Näytä vähemmän" : "Näytä koko kohta"}</button>
      <span className="font-mono text-[11px] text-slate-400" title={result.chunkId}>Tunniste {result.chunkId.slice(0, 12)}</span>
    </div>
  </li>;
}

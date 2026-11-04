"use client";

import { useRef, useState } from "react";
import { ChevronRight, FileText, Info, LoaderCircle, Search, Send } from "lucide-react";

type SearchResult = {
  chunkId: string;
  documentId: string;
  sourceName: string;
  ordinal: number;
  text: string;
  score: number;
};

type State =
  | { status: "idle" }
  | { status: "loading"; question: string }
  | { status: "done"; question: string; results: SearchResult[] }
  | { status: "error"; question: string; message: string };

const suggestions = [
  "Milloin kampuskirjasto on auki?",
  "Unohdin salasanani, mitä teen?",
  "Kuinka monta kertaa hylätyn tentin voi uusia?",
  "Miten opinnäytetyön aihe hyväksytään?",
];

const formatScore = (score: number) => score.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: question }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Haku epäonnistui.");
      setState({ status: "done", question, results: body.results as SearchResult[] });
    } catch (cause) {
      if (controller.signal.aborted) return;
      setState({ status: "error", question, message: cause instanceof Error ? cause.message : "Haku epäonnistui." });
    }
  }

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="chat-heading">
    <div className="border-b border-slate-100 px-6 py-6 sm:px-9">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-700"><Search size={17} aria-hidden="true" /> Dokumenttihaku</div>
      <h1 id="chat-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Miten voin auttaa?</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Hae kuvitteellisen JalaCampus-korkeakoulun ohjeista merkityksen perusteella. Tekoälyn muotoilemat vastaukset toteutetaan seuraavassa vaiheessa.</p>
    </div>

    <div className="min-h-80 px-6 py-7 sm:px-9" aria-live="polite">
      {state.status === "idle" ? <>
        <p className="mb-4 text-sm font-medium text-slate-700">Kokeile esimerkkikysymystä</p>
        <div className="grid gap-3 sm:grid-cols-2">{suggestions.map(s => <button key={s} type="button" onClick={() => ask(s)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-left text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/40">{s}<ChevronRight size={16} className="shrink-0 text-blue-600" aria-hidden="true" /></button>)}</div>
      </> : <div className="space-y-5">
        <div className="ml-auto max-w-lg rounded-2xl rounded-tr-sm bg-blue-600 p-4 text-sm leading-6 text-white">{state.question}</div>
        {state.status === "loading" && <p className="flex items-center gap-2 text-sm text-slate-600"><LoaderCircle size={17} className="animate-spin text-blue-600" aria-hidden="true" /> Haetaan…</p>}
        {state.status === "error" && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{state.message}</p>}
        {state.status === "done" && <SearchResults results={state.results} />}
      </div>}
    </div>

    <form onSubmit={e => { e.preventDefault(); ask(draft); }} className="border-t border-slate-100 px-6 py-5 sm:px-9">
      <label htmlFor="question" className="sr-only">Kirjoita kysymys</label>
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <input id="question" value={draft} maxLength={500} onChange={e => setDraft(e.target.value)} placeholder="Kirjoita kysymyksesi..." className="min-w-0 flex-1 px-3 text-sm outline-none placeholder:text-slate-400" />
        <button disabled={!draft.trim() || state.status === "loading"} type="submit" aria-label="Lähetä kysymys" className="rounded-lg bg-blue-600 p-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} aria-hidden="true" /></button>
      </div>
      <p className="mt-2 text-xs text-slate-400">Kysymys lähetetään Google Gemini -palveluun hakua varten. Älä kirjoita henkilötietoja.</p>
    </form>
  </section>;
}

function SearchResults({ results }: { results: SearchResult[] }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
    <div className="flex items-center gap-2 text-sm font-semibold"><FileText size={16} className="text-blue-600" aria-hidden="true" /> Löydetyt kohdat dokumenteista</div>
    <p className="mt-1 flex items-start gap-2 text-xs leading-5 text-slate-500"><Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> Nämä ovat hakutuloksia, eivät tekoälyn vastaus. Samankaltaisuus kertoo järjestyksen, ei sitä, että kohta vastaisi kysymykseen.</p>
    {results.length === 0
      ? <p className="mt-4 text-sm text-slate-600">Osuvia kohtia ei löytynyt. Lisää dokumentteja komennolla <code className="rounded bg-white px-1">npm run db:ingest</code>.</p>
      : <ol className="mt-4 space-y-3">{results.map(result => <ResultCard key={result.chunkId} result={result} />)}</ol>}
  </div>;
}

function ResultCard({ result }: { result: SearchResult }) {
  const [expanded, setExpanded] = useState(false);
  return <li className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p className="break-all text-sm font-medium text-slate-900">{result.sourceName} <span className="font-normal text-slate-500">· kohta {result.ordinal + 1}</span></p>
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

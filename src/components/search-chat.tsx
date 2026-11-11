"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, FileText, Info, LoaderCircle, Maximize2, MessageSquareText, Minimize2, SearchX, Send, Trash2 } from "lucide-react";
import { ExampleQuestionsMenu } from "@/components/example-questions-menu";
import { VoiceButton, VoiceStatus, useVoiceInput } from "@/components/voice-input";
import { orderPassages, stripCitations, typedLength } from "@/lib/answer-format";

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

type Reply =
  | { status: "loading" }
  | { status: "answer"; response: ChatResponse }
  | { status: "search"; results: Passage[] }
  | { status: "error"; message: string };

type Turn = { id: number; question: string; reply: Reply };

const suggestions = [
  "Milloin kampuskirjasto on auki?",
  "Unohdin salasanani, mitä teen?",
  "Kuinka monta kertaa hylätyn tentin voi uusia?",
  "Miten opinnäytetyön aihe hyväksytään?",
];

const MAX_QUESTION_LENGTH = 500;

const formatScore = (score: number) => score.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

async function postJson(url: string, body: object, signal: AbortSignal) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  return { response, body: await response.json().catch(() => ({})) };
}

/**
 * The Keskustelu view. With `onFullscreenChange`, a toggle lets the chat fill the window like a
 * dedicated chat app; the parent hides the rest of the page while `fullscreen` is true.
 */
export function SearchChat({ fullscreen = false, onFullscreenChange }: { fullscreen?: boolean; onFullscreenChange?: (fullscreen: boolean) => void }) {
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const pending = useRef<AbortController | null>(null);
  const nextId = useRef(0);
  const section = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const latest = useRef<HTMLDivElement>(null);
  const active = turns.length > 0;
  const loading = turns.at(-1)?.reply.status === "loading";
  const voice = useVoiceInput(draft, setDraft, MAX_QUESTION_LENGTH);

  // Runs for a new question and when its reply arrives: the question goes to the top of the
  // message area with the reply below it. The page itself may still be scrolled to the input.
  useEffect(() => {
    if (!latest.current || !scroller.current) return;
    const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
    section.current?.scrollIntoView({ block: "nearest", behavior });
    scroller.current.scrollTo({ top: latest.current.offsetTop - 16, behavior });
  }, [turns]);

  // Esc leaves full screen, unless something inside the chat already handled the key.
  useEffect(() => {
    if (!fullscreen || !onFullscreenChange) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onFullscreenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, onFullscreenChange]);

  function clear() {
    voice.stop();
    pending.current?.abort();
    setTurns([]);
    // The clear button disappears with the chat, so keep keyboard focus in the section.
    heading.current?.focus();
  }

  async function ask(value: string) {
    const question = value.trim();
    if (!question || loading) return;
    voice.stop();
    const controller = new AbortController();
    pending.current = controller;
    const id = nextId.current++;
    const settle = (reply: Reply) => setTurns(current => current.map(turn => turn.id === id ? { ...turn, reply } : turn));
    setDraft("");
    // Close the on-screen keyboard so the answer has room; keyboard users keep their focus.
    if (window.matchMedia("(pointer: coarse)").matches && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setTurns(current => [...current, { id, question, reply: { status: "loading" } }]);
    try {
      const chat = await postJson("/api/chat", { question }, controller.signal);
      if (chat.response.status === 503 && chat.body.code === "disabled") {
        // AI answers aren't configured here (e.g. no jussi-aibot key): show search results instead.
        const search = await postJson("/api/search", { query: question }, controller.signal);
        if (!search.response.ok) throw new Error(search.body.error || "Haku epäonnistui.");
        settle({ status: "search", results: search.body.results as Passage[] });
        return;
      }
      if (!chat.response.ok) throw new Error(chat.body.error || "Vastauksen muodostaminen epäonnistui.");
      settle({ status: "answer", response: chat.body as ChatResponse });
    } catch (cause) {
      if (controller.signal.aborted) return;
      settle({ status: "error", message: cause instanceof Error ? cause.message : "Vastauksen muodostaminen epäonnistui." });
    }
  }

  // In full screen the content sits in a centred column of readable width, like dedicated chat apps.
  const column = fullscreen ? "mx-auto w-full max-w-3xl" : "";
  const frame = fullscreen
    ? "flex h-dvh flex-col bg-white"
    : `scroll-mt-[6.25rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${active ? "flex h-[calc(100dvh-7.5rem)] max-h-[56rem] min-h-96 flex-col" : ""}`;
  const logArea = active
    ? "relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4 sm:px-9"
    : fullscreen ? "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 py-7 sm:px-9" : "min-h-80 px-6 py-7 sm:px-9";

  return <section ref={section} className={frame} aria-labelledby="chat-heading">
    <div className={`shrink-0 border-b border-slate-100 px-6 sm:px-9 ${active || fullscreen ? "py-2" : "py-6"}`}>
      <div className={column}>
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-blue-700"><MessageSquareText size={17} className="shrink-0" aria-hidden="true" /> <span className="truncate">Kysy ohjeista</span></div>
          {/* On narrow phones both buttons are icon-only so the bar never runs out of room. */}
          <div className="flex shrink-0 items-center gap-2">
            {active && <button type="button" onClick={clear} aria-label="Tyhjennä keskustelu" className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"><Trash2 size={16} aria-hidden="true" /> <span className="sr-only sm:not-sr-only">Tyhjennä</span></button>}
            {/* A toggle: the name stays "Koko näyttö" (what speech users say) and aria-pressed tells the state.
                On phones the text is visually hidden but still names the button. */}
            {onFullscreenChange && <button type="button" onClick={() => onFullscreenChange(!fullscreen)} aria-pressed={fullscreen} title={fullscreen ? "Poistu koko näytöstä (Esc)" : undefined} className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${fullscreen ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
              {fullscreen ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
              <span className="sr-only sm:not-sr-only">Koko näyttö</span>
            </button>}
          </div>
        </div>
        <h1 id="chat-heading" ref={heading} tabIndex={-1} className={active ? "sr-only" : fullscreen ? "sr-only" : "mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"}>Miten voin auttaa?</h1>
        {!active && !fullscreen && <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Kysy kuvitteellisen JalaCampus-korkeakoulun ohjeista. Vastaus muodostetaan vain löydetyistä dokumenteista, ja lähteet saat näkyviin painikkeella.</p>}
      </div>
    </div>

    <div ref={scroller} role="log" aria-label="Keskustelu" tabIndex={active ? 0 : undefined} className={logArea}>
      {/* my-auto centres the empty state only while it fits; on short screens it starts at the top and
          scrolls, instead of overflowing upwards under the top bar as justify-center would. */}
      <div className={`${column} ${fullscreen && !active ? "my-auto" : ""}`}>
        {active ? <div className="space-y-8">
          {turns.map((turn, i) => <div key={turn.id} ref={i === turns.length - 1 ? latest : undefined}><TurnView turn={turn} /></div>)}
        </div> : <>
          {/* In full screen the greeting moves here, centred above the examples. */}
          {fullscreen && <div className="mb-8 text-center">
            {/* The real h1 stays in the top bar for screen readers; this is its visible copy. */}
            <p aria-hidden="true" className="text-2xl font-semibold tracking-tight sm:text-3xl">Miten voin auttaa?</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Kysy kuvitteellisen JalaCampus-korkeakoulun ohjeista. Vastaus muodostetaan vain löydetyistä dokumenteista, ja lähteet saat näkyviin painikkeella.</p>
          </div>}
          <p className="mb-4 text-sm font-medium text-slate-700">Kokeile esimerkkikysymystä</p>
          <div className="grid gap-3 sm:grid-cols-2">{suggestions.map(s => <button key={s} type="button" onClick={() => ask(s)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-left text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/40">{s}<ChevronRight size={16} className="shrink-0 text-blue-600" aria-hidden="true" /></button>)}</div>
        </>}
      </div>
    </div>

    <form onSubmit={e => { e.preventDefault(); ask(draft); }} className={`shrink-0 border-t border-slate-100 px-6 sm:px-9 ${active || fullscreen ? "py-3" : "py-5"}`}>
      <div className={column}>
        <label htmlFor="question" className="sr-only">Kirjoita kysymys</label>
        <div className="relative flex gap-1 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 sm:gap-2">
          <ExampleQuestionsMenu questions={suggestions} onPick={ask} disabled={loading} />
          {/* 16px text on phones: iOS Safari zooms the page when a smaller input gets focus. */}
          <input id="question" value={draft} maxLength={MAX_QUESTION_LENGTH} onChange={e => setDraft(e.target.value)} placeholder="Kirjoita kysymyksesi..." className="min-w-0 flex-1 px-2 text-base outline-none placeholder:text-slate-400 sm:text-sm" />
          {voice.supported && <VoiceButton listening={voice.listening} onToggle={voice.toggle} />}
          <button disabled={!draft.trim() || loading} type="submit" aria-label="Lähetä kysymys" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} aria-hidden="true" /></button>
        </div>
        {voice.supported && <VoiceStatus listening={voice.listening} message={voice.message} />}
        <p className="mt-2 text-xs text-slate-500">Kysymys ja löydetyt kohdat lähetetään Google Gemini -palveluun hakua ja vastausta varten. Älä kirjoita henkilötietoja.</p>
      </div>
    </form>
  </section>;
}

function TurnView({ turn: { question, reply } }: { turn: Turn }) {
  return <div className="space-y-4">
    <div className="ml-auto w-fit max-w-lg rounded-2xl rounded-tr-sm bg-blue-600 p-4 text-sm leading-6 text-white wrap-anywhere">{question}</div>
    {reply.status === "loading" && <div className="text-sm text-slate-600">
      <p className="flex items-center gap-2"><LoaderCircle size={17} className="animate-spin text-blue-600" aria-hidden="true" /> Muodostetaan vastausta…</p>
      <p className="mt-1 pl-6 text-xs text-slate-500">Ensimmäinen vastaus voi kestää jopa minuutin.</p>
      {/* The shape of the coming answer, so the wait reads as progress rather than an empty space. */}
      <div aria-hidden="true" className="mt-4 max-w-xl space-y-2.5">
        <div className="h-3 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
      </div>
    </div>}
    {reply.status === "error" && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{reply.message}</p>}
    {reply.status === "answer" && <AnswerView response={reply.response} />}
    {reply.status === "search" && <>
      <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"><Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> Tekoälyvastaukset eivät ole käytössä tässä ympäristössä. Alla ovat hakutulokset.</p>
      <SearchResults results={reply.results} />
    </>}
  </div>;
}

function AnswerView({ response }: { response: ChatResponse }) {
  const { cited, others } = orderPassages(response.passages, response.citations);

  if (response.status === "answered") {
    return <div className="space-y-3">
      <div>
        <p className="text-base leading-7 text-slate-800 sm:text-sm"><TypedText text={stripCitations(response.answer, response.citations.length)} /></p>
        <p className="mt-2 text-xs text-slate-500">Tekoälyn muodostama vastaus – tarkista lähteet.</p>
      </div>
      <SourcesToggle showLabel={`Näytä lähteet (${cited.length})`} hideLabel="Piilota lähteet">
        <PassageList title="Lähteet" passages={cited.map(({ passage }) => passage)} />
        {others.length > 0 && <PassageList title="Muut löydetyt kohdat" note="Näitä kohtia ei käytetty vastauksessa." passages={others} />}
      </SourcesToggle>
    </div>;
  }

  if (response.status === "unavailable") {
    return <div className="space-y-5">
      <p role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {response.answer}</p>
      <SearchResults results={response.passages} />
    </div>;
  }

  return <div className="space-y-3">
    <div>
      <p className="flex items-start gap-2 text-base font-medium leading-7 text-slate-800 sm:text-sm"><SearchX size={16} className="mt-1.5 shrink-0 text-slate-500" aria-hidden="true" /> <span><TypedText text={response.answer} /></span></p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{response.passages.length > 0
        ? "Löydetyt kohdat käsittelevät aihetta, mutta eivät vastaa kysymykseen."
        : "Dokumenteista ei löytynyt kysymykseen liittyviä kohtia."}</p>
    </div>
    {response.passages.length > 0 && <SourcesToggle showLabel={`Näytä haetut kohdat (${response.passages.length})`} hideLabel="Piilota haetut kohdat">
      <PassageList title="Haetut kohdat" passages={response.passages} />
    </SourcesToggle>}
  </div>;
}

/**
 * Reveals text letter by letter. The hidden remainder keeps the final line breaks and height,
 * so words don't jump between lines and the page doesn't grow while typing. Screen readers
 * get the full text once instead of every letter.
 */
function TypedText({ text }: { text: string }) {
  const chars = useMemo(() => Array.from(text), [text]);
  const [count, setCount] = useState(() => prefersReducedMotion() ? chars.length : 0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const next = typedLength(now - start, chars.length);
      setCount(next);
      if (next < chars.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [chars]);

  return <>
    <span className="sr-only select-none">{text}</span>
    <span aria-hidden="true">
      {chars.slice(0, count).join("")}
      {count < chars.length && <span className="relative"><span className="absolute top-0 h-[1.2em] w-0.5 animate-pulse bg-blue-600" /></span>}
      <span className="invisible">{chars.slice(count).join("")}</span>
    </span>
  </>;
}

function SourcesToggle({ showLabel, hideLabel, children }: { showLabel: string; hideLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  return <div>
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={panel} className="-ml-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50">
      <FileText size={16} aria-hidden="true" /> {open ? hideLabel : showLabel} <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
    {/* Opening the sources is the user's own action, so it isn't announced by the chat's live region. */}
    <div id={panel} hidden={!open} aria-live="off" className="mt-3 space-y-5">{children}</div>
  </div>;
}

function PassageList({ title, note, passages }: { title: string; note?: string; passages: Passage[] }) {
  return <section>
    <h2 className="flex items-center gap-2 text-sm font-semibold"><FileText size={16} className="text-blue-600" aria-hidden="true" /> {title}</h2>
    {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    <ol className="mt-3 space-y-3">{passages.map(passage => <ResultCard key={passage.chunkId} result={passage} />)}</ol>
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

function ResultCard({ result }: { result: Passage }) {
  const [expanded, setExpanded] = useState(false);
  return <li className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p className="min-w-0 text-sm font-medium text-slate-900 wrap-anywhere">
        {result.sourceName} <span className="font-normal text-slate-500">· kohta {result.ordinal + 1}</span>
      </p>
      <p className="text-xs text-slate-500">Samankaltaisuus {formatScore(result.score)}</p>
    </div>
    {/* The collapsed preview joins lines with " · " so blank lines don't use up the four visible lines. */}
    <p className={`mt-2 text-sm leading-6 text-slate-700 ${expanded ? "whitespace-pre-line" : "line-clamp-4"}`}>{expanded ? result.text : result.text.replace(/\s*\n\s*/g, " · ").replace(/\s+/g, " ")}</p>
    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
      <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="min-h-11 text-sm font-medium text-blue-700 hover:underline">{expanded ? "Näytä vähemmän" : "Näytä koko kohta"}</button>
      <span className="font-mono text-xs text-slate-500" title={result.chunkId}>Tunniste {result.chunkId.slice(0, 12)}</span>
    </div>
  </li>;
}

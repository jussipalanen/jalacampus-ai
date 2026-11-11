"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, CalendarDays, Info, Languages, LoaderCircle, Search, SearchX } from "lucide-react";
import { LANGUAGE_LABELS, LEVEL_LABELS, MAX_COURSE_QUERY_LENGTH, formatCredits, formatPeriods, type CatalogSource, type Course } from "@/lib/courses";

export type CourseResults = { source: CatalogSource; query: string; period: number | null; total: number; results: Course[] };

const suggestions = ["ohjelmointi", "tietoturva", "tilastotiede", "englanninkieliset kurssit"];
const PERIODS = [1, 2, 3, 4];
const DEBOUNCE_MS = 250;

const courseCount = (count: number) => `${count} ${count === 1 ? "kurssi" : "kurssia"}`;

/**
 * Course search over GET /api/courses. `initial` is the whole catalog rendered on the server, so the view
 * shows courses at once and only calls the API when the user searches or filters.
 */
export function CourseCatalog({ initial }: { initial?: CourseResults }) {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("");
  const [data, setData] = useState<CourseResults | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const firstLoad = useRef(true);
  const usePreloaded = useRef(Boolean(initial));

  // Search as the user types, after a short pause; a first load without preloaded data starts at once.
  useEffect(() => {
    if (usePreloaded.current) {
      usePreloaded.current = false;
      firstLoad.current = false;
      return;
    }
    const controller = new AbortController();
    const delay = firstLoad.current ? 0 : DEBOUNCE_MS;
    firstLoad.current = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (period) params.set("period", period);
      try {
        const response = await fetch(`/api/courses?${params}`, { signal: controller.signal });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Kurssihaku epäonnistui.");
        setData(body as CourseResults);
        setError(null);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Kurssihaku epäonnistui.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, delay);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, period]);

  const filtered = Boolean(data && (data.query || data.period));

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="courses-heading">
    <div className="border-b border-slate-100 px-6 py-6 sm:px-9">
      <div className="flex min-h-11 items-center gap-2 text-sm font-medium text-blue-700"><BookOpen size={17} aria-hidden="true" /> Opinto-opas</div>
      <h1 id="courses-heading" tabIndex={-1} className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Kurssit</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Hae kuvitteellisen JalaCampus-korkeakoulun kursseja aiheella, nimellä tai kurssikoodilla. Tulokset tulevat suoraan opinto-oppaan tiedoista, eivät tekoälyltä.</p>

      <form role="search" onSubmit={e => e.preventDefault()} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="course-query" className="sr-only">Hae kursseja</label>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <Search size={17} className="shrink-0 text-slate-400" aria-hidden="true" />
          {/* 16px text on phones: iOS Safari zooms the page when a smaller input gets focus. */}
          <input id="course-query" type="text" enterKeyHint="search" autoComplete="off" value={query} maxLength={MAX_COURSE_QUERY_LENGTH} onChange={e => setQuery(e.target.value)} placeholder="Esim. ohjelmointi, tietokannat tai TIE210" className="min-h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400 sm:text-sm" />
        </div>
        <label htmlFor="course-period" className="sr-only">Periodi</label>
        <select id="course-period" value={period} onChange={e => setPeriod(e.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm">
          <option value="">Kaikki periodit</option>
          {PERIODS.map(p => <option key={p} value={p}>Periodi {p}</option>)}
        </select>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map(s => <button key={s} type="button" onClick={() => setQuery(s)} className="min-h-11 rounded-full border border-slate-200 px-4 text-sm text-slate-600 transition hover:border-blue-300 hover:bg-blue-50/40 hover:text-slate-900">{s}</button>)}
      </div>
    </div>

    <div className="px-6 py-6 sm:px-9">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {loading && <LoaderCircle size={16} className="animate-spin text-blue-600" aria-hidden="true" />}
          {error ? null : data ? (filtered ? `Löytyi ${courseCount(data.results.length)}` : `Kaikki kurssit (${data.total})`) : "Haetaan kursseja…"}
        </p>
        {filtered && <button type="button" onClick={() => { setQuery(""); setPeriod(""); }} className="min-h-11 text-sm font-medium text-blue-700 hover:underline">Näytä kaikki kurssit</button>}
      </div>
      {data && <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-500"><Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> Lähde: {data.source.name}. {data.source.note}</p>}

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {!error && data && data.results.length === 0 && <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <SearchX size={18} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
        <p>Hakua vastaavia kursseja ei löytynyt opinto-oppaasta. Kokeile toista hakusanaa{data.period ? " tai poista periodirajaus" : ""}.</p>
      </div>}
      {!error && !data && <CourseSkeletons />}
      {!error && data && data.results.length > 0 && <ul className={`mt-4 grid gap-3 transition-opacity lg:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
        {data.results.map(course => <CourseCard key={course.code} course={course} source={data.source} onShowCourse={setQuery} />)}
      </ul>}
    </div>
  </section>;
}

function CourseCard({ course, source, onShowCourse }: { course: Course; source: CatalogSource; onShowCourse: (code: string) => void }) {
  return <li className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
    <article aria-labelledby={`course-${course.code}`} className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-xs font-medium text-blue-700">{course.code}</span>
        <span className="text-sm font-medium text-slate-700">{formatCredits(course.credits)}</span>
      </div>
      {/* English-taught courses keep their English name; lang lets screen readers pronounce it correctly. */}
      <h2 id={`course-${course.code}`} lang={course.language === "en" ? "en" : undefined} className="mt-2 font-semibold leading-6 text-slate-900">{course.name}</h2>
      <p className="mt-0.5 text-xs text-slate-500">{course.unit} · {LEVEL_LABELS[course.level]}</p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Kurssin tiedot">
        <li className="flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-400" aria-hidden="true" /> {formatPeriods(course.periods)}</li>
        <li className="flex items-center gap-1.5"><Languages size={14} className="text-slate-400" aria-hidden="true" /> Opetuskieli: {LANGUAGE_LABELS[course.language]}</li>
      </ul>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-700">{course.description}</p>
      {course.prerequisites.length > 0 && <p className="mt-2 flex flex-wrap items-center gap-x-1 text-xs text-slate-600">
        Suositellut esitiedot:
        {course.prerequisites.map(code => <button key={code} type="button" onClick={() => onShowCourse(code)} aria-label={`Näytä kurssi ${code}`} className="min-h-11 px-1 font-mono font-medium text-blue-700 hover:underline sm:min-h-0">{code}</button>)}
      </p>}
      <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">Lähde: {source.name}, {course.code}</p>
    </article>
  </li>;
}

/** Placeholder cards with the shape of a course card while the first results load. */
function CourseSkeletons() {
  return <ul aria-hidden="true" className="mt-4 grid gap-3 lg:grid-cols-2">
    {[0, 1, 2, 3].map(i => <li key={i} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex justify-between"><div className="h-5 w-16 animate-pulse rounded-md bg-slate-100" /><div className="h-5 w-10 animate-pulse rounded bg-slate-100" /></div>
      <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 space-y-2"><div className="h-3 animate-pulse rounded bg-slate-100" /><div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" /></div>
    </li>)}
  </ul>;
}

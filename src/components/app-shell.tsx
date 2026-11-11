"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronRight, FileText, GraduationCap, Menu, MessageCircle, Search, Settings2, ShieldCheck, X } from "lucide-react";
import { CourseCatalog, type CourseResults } from "@/components/course-catalog";
import { DocumentLibrary } from "@/components/document-library";
import { SearchChat } from "@/components/search-chat";

type View = "Keskustelu" | "Dokumentit" | "Kurssit" | "Asetukset";

const menu = [
  { label: "Keskustelu" as const, icon: MessageCircle, heading: "chat-heading" },
  { label: "Dokumentit" as const, icon: FileText, heading: "documents-heading" },
  { label: "Kurssit" as const, icon: BookOpen, heading: "courses-heading" },
  { label: "Asetukset" as const, icon: Settings2, heading: "settings-heading" },
];

const SITE_TITLE = "JalaCampus AI";

/** The page frame: header, main menu and the four views. Views stay mounted so their state survives switching. */
export function AppShell({ initialCourses }: { initialCourses: CourseResults }) {
  const [view, setView] = useState<View>("Keskustelu");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const switched = useRef(false);
  // Only Keskustelu has a full-screen mode, and only its own button turns it on.
  const fullscreen = chatFullscreen && view === "Keskustelu";

  // After the user switches views, move focus to the new view's heading and update the tab title,
  // so screen-reader users hear where they are. The first render keeps the browser's default focus.
  useEffect(() => {
    if (!switched.current) return;
    document.title = view === "Keskustelu" ? `${SITE_TITLE} | Korkeakoulun tietoavustaja` : `${view} | ${SITE_TITLE}`;
    const heading = menu.find(item => item.label === view)?.heading;
    document.getElementById(heading ?? "")?.focus();
  }, [view]);

  function open(next: View) {
    switched.current = true;
    setView(next);
    setMobileMenu(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Off screen until focused, then slides in above the header. */}
      <a href="#sisalto" className="fixed left-4 top-3 z-50 -translate-y-24 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition-transform focus:translate-y-0">Siirry sisältöön</a>
      {!fullscreen && <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><GraduationCap size={23} aria-hidden="true" /></span>
            <div><p className="font-semibold tracking-tight">JalaCampus <span className="text-blue-600">AI</span></p><p className="text-xs text-slate-500">Korkeakoulun tietoavustaja</p></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 sm:block">Esittelyversio</span>
            <button type="button" onClick={() => setMobileMenu(!mobileMenu)} aria-expanded={mobileMenu} aria-controls="main-menu" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 md:hidden" aria-label={mobileMenu ? "Sulje valikko" : "Avaa valikko"}>{mobileMenu ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}</button>
          </div>
        </div>
      </header>}
      <div className={fullscreen ? "" : "mx-auto grid max-w-6xl gap-6 px-5 py-7 md:grid-cols-[220px_1fr]"}>
        {!fullscreen && <nav id="main-menu" aria-label="Päävalikko" className={`${mobileMenu ? "block" : "hidden"} h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:block`}>
          <p className="px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Työtila</p>
          <ul className="space-y-1">{menu.map(({ label, icon: Icon }) => <li key={label}>
            <button type="button" onClick={() => open(label)} aria-current={view === label ? "page" : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${view === label ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}><Icon size={17} aria-hidden="true" />{label}{view === label && <ChevronRight size={15} className="ml-auto" aria-hidden="true" />}</button>
          </li>)}</ul>
          <div className="mt-8 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600"><ShieldCheck size={18} className="mb-2 text-blue-600" aria-hidden="true" /><strong className="block text-slate-800">Tietosuojan huomioiva demo</strong>Ei oikeita opiskelijatietoja. Vastaukset perustuvat vain kuvitteellisiin esimerkkidokumentteihin.</div>
        </nav>}
        <main id="sisalto" tabIndex={-1} className="min-w-0 outline-none">
          <div hidden={view !== "Keskustelu"}><SearchChat fullscreen={fullscreen} onFullscreenChange={setChatFullscreen} /></div>
          <div hidden={view !== "Dokumentit"}><DocumentLibrary /></div>
          <div hidden={view !== "Kurssit"}><CourseCatalog initial={initialCourses} /></div>
          <div hidden={view !== "Asetukset"}>
            <section aria-labelledby="settings-heading" className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
              <span className="mb-4 inline-flex rounded-xl bg-blue-50 p-3 text-blue-600"><Settings2 aria-hidden="true" /></span>
              <h1 id="settings-heading" tabIndex={-1} className="text-2xl font-semibold">Asetukset</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Tämä osio kuuluu projektin seuraaviin kehitysvaiheisiin. Toteutus tehdään omassa feature-haarassa ja tarkistetaan pull requestissa.</p>
              <p className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600"><Search size={16} aria-hidden="true" /> Tulossa ROADMAP.md:n mukaisesti</p>
            </section>
          </div>
          {!fullscreen && <footer className="mt-5 text-center text-xs text-slate-500">JalaCampus AI · Demo · Jussi Alanen</footer>}
        </main>
      </div>
    </div>
  );
}

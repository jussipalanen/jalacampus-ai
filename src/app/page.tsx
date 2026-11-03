"use client";

import { useState } from "react";
import { DocumentLibrary } from "@/components/document-library";
import { BookOpen, CheckCircle2, ChevronRight, FileText, GraduationCap, Menu, MessageCircle, Search, Send, Settings2, ShieldCheck, Sparkles, X } from "lucide-react";

type NavItem = "Keskustelu" | "Dokumentit" | "Kurssit" | "Asetukset";

const menu = [
  { label: "Keskustelu" as const, icon: MessageCircle },
  { label: "Dokumentit" as const, icon: FileText },
  { label: "Kurssit" as const, icon: BookOpen },
  { label: "Asetukset" as const, icon: Settings2 },
];
const suggestions = ["Mistä löydän opinnäytetyön ohjeet?", "Miten kurssille ilmoittaudutaan?", "Miten opiskelijan tietoja käsitellään?"];

export default function Home() {
  const [tab, setTab] = useState<NavItem>("Keskustelu");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState("");
  const ask = (value: string) => { if (value.trim()) { setQuestion(value.trim()); setDraft(""); } };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><GraduationCap size={23} aria-hidden="true" /></span>
            <div><div className="font-semibold tracking-tight">JalaCampus <span className="text-blue-600">AI</span></div><div className="text-xs text-slate-500">Korkeakoulun tietoavustaja</div></div>
          </div>
          <div className="flex items-center gap-3"><span className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 sm:block">Esittelyversio</span><button type="button" onClick={() => setMobileMenu(!mobileMenu)} className="rounded-lg border border-slate-200 p-2 md:hidden" aria-label={mobileMenu ? "Sulje valikko" : "Avaa valikko"}>{mobileMenu ? <X size={20}/> : <Menu size={20}/>}</button></div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-7 md:grid-cols-[220px_1fr]">
        <aside className={`${mobileMenu ? "block" : "hidden"} h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:block`} aria-label="Päävalikko">
          <p className="px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Työtila</p>
          <nav className="space-y-1">{menu.map(({label,icon:Icon}) => <button key={label} type="button" onClick={() => {setTab(label);setMobileMenu(false);}} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${tab===label ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`} aria-current={tab===label ? "page" : undefined}><Icon size={17} aria-hidden="true" />{label}{tab===label && <ChevronRight size={15} className="ml-auto" />}</button>)}</nav>
          <div className="mt-8 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600"><ShieldCheck size={18} className="mb-2 text-blue-600" aria-hidden="true" /><strong className="block text-slate-800">Tietosuojan huomioiva demo</strong>Ei oikeita opiskelijatietoja. AI ja RAG ovat suunniteltuja jatko-ominaisuuksia.</div>
        </aside>
        <main className="min-w-0">
          <div hidden={tab !== "Dokumentit"}><DocumentLibrary /></div>
          {tab === "Dokumentit" ? null : tab === "Keskustelu" ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-6 sm:px-9"><div className="flex items-center gap-2 text-sm font-medium text-blue-700"><Sparkles size={17}/> Tekoälyavustaja</div><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Miten voin auttaa?</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Etsi korkeakoulun ohjeita ja kurssitietoja yhdestä paikasta. Tämä on käyttöliittymädemo – tekoälyhaku toteutetaan seuraavassa vaiheessa.</p></div>
            <div className="min-h-80 px-6 py-7 sm:px-9">
              {!question ? <><p className="mb-4 text-sm font-medium text-slate-700">Kokeile esimerkkikysymystä</p><div className="grid gap-3 sm:grid-cols-2">{suggestions.map(s => <button key={s} type="button" onClick={() => ask(s)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-left text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/40">{s}<ChevronRight size={16} className="shrink-0 text-blue-600" /></button>)}</div></> : <div className="space-y-5"><div className="ml-auto max-w-lg rounded-2xl rounded-tr-sm bg-blue-600 p-4 text-sm leading-6 text-white">{question}</div><div className="max-w-xl rounded-2xl rounded-tl-sm border border-slate-200 bg-slate-50 p-4"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-blue-600"/> JalaCampus AI</div><p className="text-sm leading-6 text-slate-600">Tämä on käyttöliittymän esikatselu. Varsinainen AI-vastaus, RAG-haku ja lähdeviitteet otetaan käyttöön myöhemmässä kehitysvaiheessa.</p><div className="mt-3 flex items-center gap-2 text-xs text-amber-700"><CheckCircle2 size={14}/> Ei keksittyjä lähteitä tai vastauksia</div></div></div>}
            </div>
            <form onSubmit={e => {e.preventDefault();ask(draft);}} className="border-t border-slate-100 px-6 py-5 sm:px-9"><label htmlFor="question" className="sr-only">Kirjoita kysymys</label><div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"><input id="question" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Kirjoita kysymyksesi..." className="min-w-0 flex-1 px-3 text-sm outline-none placeholder:text-slate-400"/><button disabled={!draft.trim()} type="submit" aria-label="Lähetä kysymys" className="rounded-lg bg-blue-600 p-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Send size={17}/></button></div><p className="mt-2 text-xs text-slate-400">Esittelyversio ei lähetä kysymyksiä ulkoiseen palveluun.</p></form>
          </section> : <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10"><span className="mb-4 inline-flex rounded-xl bg-blue-50 p-3 text-blue-600">{tab === "Kurssit" ? <BookOpen/> : <Settings2/>}</span><h1 className="text-2xl font-semibold">{tab}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Tämä osio kuuluu projektin seuraaviin kehitysvaiheisiin. Toteutus tehdään omassa feature-haarassa ja tarkistetaan pull requestissa.</p><div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600"><Search size={16}/> Tulossa ROADMAP.md:n mukaisesti</div></section>}
          <footer className="mt-5 text-center text-xs text-slate-400">JalaCampus AI · Demo · Jussi Alanen</footer>
        </main>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { DocumentLibrary } from "@/components/document-library";
import { SearchChat } from "@/components/search-chat";
import { BookOpen, ChevronRight, FileText, GraduationCap, Menu, MessageCircle, Search, Settings2, ShieldCheck, X } from "lucide-react";

type NavItem = "Keskustelu" | "Dokumentit" | "Kurssit" | "Asetukset";

const menu = [
  { label: "Keskustelu" as const, icon: MessageCircle },
  { label: "Dokumentit" as const, icon: FileText },
  { label: "Kurssit" as const, icon: BookOpen },
  { label: "Asetukset" as const, icon: Settings2 },
];

export default function Home() {
  const [tab, setTab] = useState<NavItem>("Keskustelu");
  const [mobileMenu, setMobileMenu] = useState(false);
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
          <div hidden={tab !== "Keskustelu"}><SearchChat /></div>
          {tab === "Dokumentit" || tab === "Keskustelu" ? null : <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10"><span className="mb-4 inline-flex rounded-xl bg-blue-50 p-3 text-blue-600">{tab === "Kurssit" ? <BookOpen/> : <Settings2/>}</span><h1 className="text-2xl font-semibold">{tab}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Tämä osio kuuluu projektin seuraaviin kehitysvaiheisiin. Toteutus tehdään omassa feature-haarassa ja tarkistetaan pull requestissa.</p><div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600"><Search size={16}/> Tulossa ROADMAP.md:n mukaisesti</div></section>}
          <footer className="mt-5 text-center text-xs text-slate-400">JalaCampus AI · Demo · Jussi Alanen</footer>
        </main>
      </div>
    </div>
  );
}

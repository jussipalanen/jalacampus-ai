"use client";

import { useState, type FormEvent } from "react";
import { FileText, LoaderCircle, Upload } from "lucide-react";

type DocumentPreview = { name: string; size: number; text: string; truncated: boolean };

export function DocumentLibrary() {
  const [documents, setDocuments] = useState<DocumentPreview[]>([]);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = documents[selected];

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) { setError("Valitse PDF- tai TXT-tiedosto."); return; }
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/documents/preview", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Tiedoston käsittely epäonnistui.");
      setDocuments(current => [result as DocumentPreview, ...current]);
      setSelected(0);
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tiedoston käsittely epäonnistui.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9" aria-labelledby="documents-heading">
    <div className="flex items-start gap-3">
      <span className="rounded-xl bg-blue-50 p-3 text-blue-600"><FileText aria-hidden="true" /></span>
      <div><p className="text-sm font-medium text-blue-700">Ylläpidon esikatselu</p><h1 id="documents-heading" tabIndex={-1} className="mt-1 text-2xl font-semibold tracking-tight">Dokumentit</h1><p className="mt-2 text-sm leading-6 text-slate-600">Tarkista testidokumentin teksti ennen myöhempää tallennus- ja hakutoimintoa.</p></div>
    </div>
    <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-slate-700">Käytä vain keksittyä tai julkista testiaineistoa. Älä lisää oikeita opiskelijatietoja. Tiedosto käsitellään esikatselua varten, mutta sitä ei tallenneta palvelimelle. Luettelo säilyy vain tämän sivun avoinna ollessa.</div>
    <form onSubmit={upload} className="mt-6 space-y-4">
      <div><label htmlFor="document-file" className="block text-sm font-medium text-slate-800">Testitiedosto</label><input id="document-file" name="file" type="file" accept=".txt,.pdf,text/plain,application/pdf" className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700" /><p className="mt-2 text-xs text-slate-500">PDF tai UTF-8 TXT, enintään 2 Mt. PDF-esikatselu lukee enintään 10 sivua.</p></div>
      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{busy ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Upload size={17} aria-hidden="true" />}{busy ? "Käsitellään..." : "Näytä esikatselu"}</button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
    <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-[220px_1fr]">
      <div><h2 className="text-sm font-semibold text-slate-800">Tämän sivun dokumentit</h2>{documents.length ? <ul className="mt-3 space-y-2">{documents.map((document, index) => <li key={`${document.name}-${index}`}><button type="button" onClick={() => setSelected(index)} aria-current={selected === index ? "true" : undefined} className={`w-full break-all rounded-lg p-3 text-left text-sm ${selected === index ? "bg-blue-50 text-blue-800" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>{document.name}<span className="block text-xs text-slate-500">{Math.ceil(document.size / 1024)} kt</span></button></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">Ei esikatseltuja dokumentteja.</p>}</div>
      <div className="min-w-0"><h2 className="text-sm font-semibold text-slate-800">Poimittu teksti</h2>{active ? <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="mb-3 break-all text-sm font-medium text-slate-800">{active.name}</p>{active.truncated && <p className="mb-3 text-xs text-amber-800">Esikatselu on lyhennetty 20 000 merkkiin.</p>}<pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700">{active.text}</pre></div> : <p className="mt-3 text-sm text-slate-500">Lisää testitiedosto nähdäksesi sen tekstin.</p>}</div>
    </div>
  </section>;
}

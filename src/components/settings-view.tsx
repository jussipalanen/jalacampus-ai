"use client";

import { useId, useState } from "react";
import { Info, RotateCcw, Settings2 } from "lucide-react";
import { resetSettings, updateSettings, useSettings } from "@/components/use-settings";
import type { TextSize } from "@/lib/settings";

const textSizes: { value: TextSize; label: string }[] = [
  { value: "normal", label: "Normaali" },
  { value: "large", label: "Suuri" },
];

/** The Asetukset view: UI preferences stored in this browser, and what the service does with data. */
export function SettingsView() {
  const settings = useSettings();
  const [notice, setNotice] = useState("");
  const sizeHelp = useId();

  function reset() {
    resetSettings();
    setNotice("Oletusasetukset palautettu.");
  }

  // Any later change makes the reset notice stale.
  function change(patch: Parameters<typeof updateSettings>[0]) {
    updateSettings(patch);
    setNotice("");
  }

  return <section aria-labelledby="settings-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
    <div className="flex items-start gap-3">
      <span className="inline-flex shrink-0 rounded-xl bg-blue-50 p-3 text-blue-600"><Settings2 aria-hidden="true" /></span>
      <div>
        <h1 id="settings-heading" tabIndex={-1} className="text-2xl font-semibold">Asetukset</h1>
        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">Muutokset tulevat voimaan heti. Ne tallentuvat vain tähän selaimeen, eikä niitä lähetetä palvelimelle.</p>
      </div>
    </div>

    <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">Keskustelu</h2>
    <div className="mt-2 divide-y divide-slate-100 border-y border-slate-100">
      <Toggle label="Kirjoitusanimaatio" checked={settings.typingAnimation} onChange={typingAnimation => change({ typingAnimation })}>
        Vastaus ilmestyy kirjain kerrallaan. Jos laitteessa on valittu vähennetty liike, vastaus näytetään aina heti.
      </Toggle>
      <Toggle label="Näytä lähteet heti" checked={settings.sourcesOpen} onChange={sourcesOpen => change({ sourcesOpen })}>
        Vastauksen lähteet ja muut löydetyt kohdat näkyvät valmiiksi avattuina.
      </Toggle>
      <Toggle label="Puhesyöte" checked={settings.voiceInput} onChange={voiceInput => change({ voiceInput })}>
        Näyttää mikrofonipainikkeen kysymyksen sanelua varten selaimissa, jotka tukevat puheentunnistusta (Chrome, Edge, Safari).
      </Toggle>
    </div>

    <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">Näkymä</h2>
    <fieldset aria-describedby={sizeHelp} className="mt-2 border-y border-slate-100 py-4">
      <legend className="sr-only">Tekstin koko</legend>
      <p aria-hidden="true" className="text-sm font-medium text-slate-900">Tekstin koko</p>
      <p id={sizeHelp} className="mt-1 text-sm leading-6 text-slate-600">Suurentaa koko sovelluksen tekstiä ja painikkeita.</p>
      <div className="mt-3 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        {textSizes.map(({ value, label }) => <label key={value} className="relative">
          <input type="radio" name="text-size" value={value} checked={settings.textSize === value} onChange={() => change({ textSize: value })} className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0" />
          <span className="flex min-h-11 items-center rounded-lg px-5 text-sm font-medium text-slate-600 transition peer-checked:bg-white peer-checked:text-blue-700 peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600">{label}</span>
        </label>)}
      </div>
    </fieldset>

    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"><RotateCcw size={16} aria-hidden="true" /> Palauta oletukset</button>
      <p role="status" className="text-sm text-slate-600">{notice}</p>
    </div>

    <h2 className="mt-10 flex items-center gap-2 text-lg font-semibold"><Info size={18} className="text-blue-600" aria-hidden="true" /> Tietoa palvelusta</h2>
    <dl className="mt-3 divide-y divide-slate-100 border-y border-slate-100 text-sm leading-6">
      <About term="Aineisto">Kaikki dokumentit ja kurssit ovat kuvitteellisen JalaCampus-korkeakoulun esimerkkiaineistoa. Palvelussa ei ole oikeita opiskelijatietoja.</About>
      <About term="Haku ja vastaukset">Kysymys muutetaan vektoriksi Google Gemini -upotusmallilla, ja lähimmät dokumenttikohdat haetaan PostgreSQL-tietokannasta. Vastauksen muodostaa erillinen jussi-aibot-palvelu Google Gemini -kielimallilla vain löydetyistä kohdista, ja jokainen lähdeviite tarkistetaan ennen näyttämistä. Kysymys ja löydetyt kohdat lähetetään siis Googlelle, joten älä kirjoita henkilötietoja.</About>
      <About term="Kurssihaku">Kurssit-näkymä hakee avainsanoilla suoraan kurssiluettelosta. Siinä ei käytetä tekoälyä.</About>
      <About term="Dokumentit">Dokumentit-näkymään ladattu tiedosto näytetään vain esikatseluna. Sitä ei tallenneta eikä lähetetä tekoälylle.</About>
      <About term="Puhesyöte">Sovellus ei vastaanota eikä tallenna ääntä, mutta selaimen puheentunnistus käsittelee sen: Chrome ja Edge lähettävät äänen Googlelle ja Microsoftille, Safari Applen palveluun.</About>
      <About term="Tallennetut tiedot">Keskustelu säilyy vain avoimella sivulla, ja sivun lataaminen uudelleen tyhjentää sen. Selaimeen tallennetaan vain nämä asetukset.</About>
    </dl>
  </section>;
}

/** A labelled on/off switch: a native checkbox with role="switch", drawn as a track and a thumb. */
function Toggle({ label, checked, onChange, children }: { label: string; checked: boolean; onChange: (checked: boolean) => void; children: React.ReactNode }) {
  const id = useId();
  return <div className="flex items-start justify-between gap-6 py-4">
    <div className="min-w-0">
      <label htmlFor={id} className="cursor-pointer text-sm font-medium text-slate-900">{label}</label>
      <p id={`${id}-help`} className="mt-1 text-sm leading-6 text-slate-600">{children}</p>
    </div>
    <span className="relative inline-flex h-11 w-14 shrink-0 items-center justify-center">
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={event => onChange(event.target.checked)} aria-describedby={`${id}-help`} className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0" />
      {/* slate-500 keeps the off track at 3:1 contrast against white (WCAG 1.4.11). */}
      <span aria-hidden="true" className="h-6 w-11 rounded-full bg-slate-500 transition-colors peer-checked:bg-blue-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600" />
      <span aria-hidden="true" className="pointer-events-none absolute left-2 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
    </span>
  </div>;
}

function About({ term, children }: { term: string; children: React.ReactNode }) {
  return <div className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
    <dt className="font-medium text-slate-900">{term}</dt>
    <dd className="text-slate-600">{children}</dd>
  </div>;
}

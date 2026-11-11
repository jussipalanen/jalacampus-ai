"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, CircleHelp } from "lucide-react";

/**
 * A "?" button in the chat's input bar that opens the example questions, so they stay available after
 * the first question. A disclosure (not an ARIA menu): Tab moves through the questions, Esc or a click
 * outside closes it, and focus returns to the button. The parent must be `position: relative`.
 */
export function ExampleQuestionsMenu({ questions, onPick, disabled = false }: {
  questions: readonly string[];
  onPick: (question: string) => void;
  /** True while a question is being answered; the questions can be read but not sent. */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Handled on document before the full-screen Esc listener on window, which then ignores the key,
    // so Esc closes only the menu.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  function pick(question: string) {
    setOpen(false);
    onPick(question);
  }

  return <div
    ref={root}
    // Not positioned itself: the panel is placed against the parent input bar, so it spans the bar's
    // width on phones instead of running off the screen from the button's position.
    className="shrink-0"
    // Keyboard users who tab past the last question leave the menu, so close it behind them.
    onBlur={event => { if (open && !root.current?.contains(event.relatedTarget as Node | null)) setOpen(false); }}
  >
    <button ref={trigger} type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={panelId} aria-label="Esimerkkikysymykset" title="Esimerkkikysymykset" className={`flex h-11 w-11 items-center justify-center rounded-lg transition ${open ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
      <CircleHelp size={19} aria-hidden="true" />
    </button>
    <div id={panelId} hidden={!open} className="absolute bottom-full left-0 right-0 z-30 mb-2 rounded-xl sm:right-auto sm:w-[22rem] border border-slate-200 bg-white p-2 shadow-lg">
      <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Esimerkkikysymykset</p>
      <ul>{questions.map(question => <li key={question}>
        <button type="button" onClick={() => pick(question)} disabled={disabled} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-blue-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
          {question}<ChevronRight size={16} className="shrink-0 text-blue-600" aria-hidden="true" />
        </button>
      </li>)}</ul>
      {disabled && <p className="px-3 pb-2 pt-1 text-xs text-slate-500">Odota, että edellinen vastaus valmistuu.</p>}
    </div>
  </div>;
}

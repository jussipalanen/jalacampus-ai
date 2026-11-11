"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { recognitionConstructor, speechErrorMessage, transcriptOf, withTranscript, type Recognition } from "@/lib/speech";

/**
 * Finnish speech to text into a text field. `supported` stays false on the server and in browsers without
 * speech recognition (e.g. Firefox), so the microphone button only appears where it works.
 */
export function useVoiceInput(text: string, setText: (value: string) => void, maxLength: number) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(recognitionConstructor(window) !== null);
    return () => recognition.current?.abort();
  }, []);

  /** Ends listening; the text recognised so far stays in the field. */
  const stop = useCallback(() => recognition.current?.stop(), []);

  function start() {
    const Constructor = recognitionConstructor(window);
    if (!Constructor) return;
    const instance = new Constructor();
    instance.lang = "fi-FI";
    instance.interimResults = true; // show words while the user is still speaking
    instance.continuous = false; // stop after a pause, like a spoken question
    instance.maxAlternatives = 1;
    const typed = text; // dictation is added after what was already typed
    instance.onresult = event => setText(withTranscript(typed, transcriptOf(event.results), maxLength));
    instance.onerror = event => setMessage(speechErrorMessage(event.error));
    instance.onend = () => {
      setListening(false);
      recognition.current = null;
    };
    recognition.current = instance;
    setMessage(null);
    setListening(true);
    try {
      instance.start();
    } catch {
      recognition.current = null;
      setListening(false);
      setMessage(speechErrorMessage("start-failed"));
    }
  }

  return { supported, listening, message, toggle: () => (listening ? stop() : start()), stop };
}

export function VoiceButton({ listening, onToggle }: { listening: boolean; onToggle: () => void }) {
  return <button type="button" onClick={onToggle} aria-pressed={listening} aria-label="Sanele kysymys" title={listening ? "Lopeta sanelu" : "Sanele kysymys"} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition ${listening ? "bg-red-50 text-red-700 hover:bg-red-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
    {listening ? <Square size={15} className="fill-current" aria-hidden="true" /> : <Mic size={19} aria-hidden="true" />}
  </button>;
}

/** Announces listening and errors to screen readers, and shows them under the input. */
export function VoiceStatus({ listening, message }: { listening: boolean; message: string | null }) {
  const text = listening
    ? "Kuunnellaan – puhu kysymyksesi. Selaimesi muuntaa puheen tekstiksi omalla palvelullaan (Chromessa Google)."
    : message ?? "";
  return <p role="status" className={text ? `mt-2 flex items-start gap-2 text-xs ${message && !listening ? "text-red-700" : "text-slate-600"}` : "sr-only"}>
    {listening && <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-600" />}
    {text}
  </p>;
}

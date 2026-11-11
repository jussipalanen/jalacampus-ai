/**
 * Helpers for the browser's Web Speech API (speech to text). The API isn't in TypeScript's DOM types in
 * every browser flavour, so only the members the app uses are declared here. Recognition runs in the
 * browser's own service: Chrome and Edge send the audio to their vendors, Safari uses Apple's service.
 */

export type RecognitionAlternative = { transcript: string };
export type RecognitionResult = ArrayLike<RecognitionAlternative> & { isFinal: boolean };
export type RecognitionResultEvent = { results: ArrayLike<RecognitionResult> };

export type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export type RecognitionConstructor = new () => Recognition;

/** The browser's SpeechRecognition constructor (standard or webkit-prefixed), or null if unsupported. */
export function recognitionConstructor(scope: object): RecognitionConstructor | null {
  const candidate = scope as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

/** All recognised text so far (final and interim), as one line. */
export function transcriptOf(results: ArrayLike<RecognitionResult>): string {
  return Array.from(results, result => result[0]?.transcript ?? "").join(" ").replace(/\s+/g, " ").trim();
}

/** Appends dictated text to what was already typed, with one space between them. */
export function withTranscript(typed: string, transcript: string, maxLength = Infinity): string {
  const before = typed.trimEnd();
  const text = before && transcript ? `${before} ${transcript}` : before || transcript;
  return Array.from(text).slice(0, maxLength).join("");
}

/** A Finnish message for a recognition error code, or null when nothing needs saying (the user stopped). */
export function speechErrorMessage(code: string): string | null {
  switch (code) {
    case "aborted":
      return null;
    case "not-allowed":
    case "service-not-allowed":
      return "Mikrofonin käyttö on estetty. Salli mikrofoni selaimen asetuksista ja yritä uudelleen.";
    case "no-speech":
      return "Puhetta ei kuulunut. Yritä uudelleen.";
    case "audio-capture":
      return "Mikrofonia ei löytynyt.";
    case "network":
      return "Puheentunnistus ei saanut yhteyttä palveluun. Kirjoita kysymys tai yritä myöhemmin.";
    case "language-not-supported":
      return "Selaimesi puheentunnistus ei tue suomea.";
    default:
      return "Puheentunnistus epäonnistui. Kirjoita kysymys tai yritä uudelleen.";
  }
}

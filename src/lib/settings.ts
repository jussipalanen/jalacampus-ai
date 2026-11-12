/** User preferences for the UI. They live only in the browser (localStorage) and never reach the server. */
export type TextSize = "normal" | "large";

export type Settings = {
  /** Reveal answers letter by letter. The reduced-motion system setting always turns this off. */
  typingAnimation: boolean;
  /** Open an answer's sources at once instead of behind the "Näytä lähteet" button. */
  sourcesOpen: boolean;
  /** Show the microphone button in browsers that support speech recognition. */
  voiceInput: boolean;
  /** Scales the whole UI; "large" is 112.5 % of the browser's base font size. */
  textSize: TextSize;
};

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  typingAnimation: true,
  sourcesOpen: false,
  voiceInput: true,
  textSize: "normal",
});

export const SETTINGS_KEY = "jalacampus:settings";

/**
 * Reads stored settings. Unknown keys are dropped and each invalid or missing value falls back to its
 * default, so an old, edited or corrupted entry can never break the page.
 */
export function parseSettings(raw: string | null | undefined): Settings {
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  const value = data !== null && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const flag = (key: "typingAnimation" | "sourcesOpen" | "voiceInput") =>
    typeof value[key] === "boolean" ? value[key] : DEFAULT_SETTINGS[key];
  return {
    typingAnimation: flag("typingAnimation"),
    sourcesOpen: flag("sourcesOpen"),
    voiceInput: flag("voiceInput"),
    textSize: value.textSize === "large" ? "large" : "normal",
  };
}

/** Stores only the known keys, in a fixed order. */
export function serializeSettings(settings: Settings): string {
  const { typingAnimation, sourcesOpen, voiceInput, textSize } = parseSettings(JSON.stringify(settings));
  return JSON.stringify({ typingAnimation, sourcesOpen, voiceInput, textSize });
}

export function isDefaultSettings(settings: Settings): boolean {
  return serializeSettings(settings) === serializeSettings(DEFAULT_SETTINGS);
}

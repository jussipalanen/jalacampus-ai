/**
 * Synthetic course catalog: validation, Finnish keyword search and display helpers.
 * Pure functions only, so the API handlers, the UI and the tests share one implementation.
 */

export const COURSE_LEVELS = ["basic", "intermediate", "advanced"] as const;
export const COURSE_LANGUAGES = ["fi", "sv", "en"] as const;

export type CourseLevel = (typeof COURSE_LEVELS)[number];
export type CourseLanguage = (typeof COURSE_LANGUAGES)[number];

export type Course = {
  /** Stable ID, e.g. "OHJ101": three capital letters and three digits. */
  code: string;
  name: string;
  credits: number;
  /** Teaching periods 1–4, ascending. */
  periods: number[];
  language: CourseLanguage;
  level: CourseLevel;
  unit: string;
  keywords: string[];
  description: string;
  /** Codes of courses that should be completed first. */
  prerequisites: string[];
};

export type CatalogSource = { id: string; name: string; note: string };

export type CourseCatalog = { source: CatalogSource; courses: Course[] };

export const MAX_COURSE_QUERY_LENGTH = 200;

export const LEVEL_LABELS: Record<CourseLevel, string> = {
  basic: "Perusopinnot",
  intermediate: "Aineopinnot",
  advanced: "Syventävät opinnot",
};

export const LANGUAGE_LABELS: Record<CourseLanguage, string> = { fi: "suomi", sv: "ruotsi", en: "englanti" };

const CODE_PATTERN = /^[A-Z]{3}\d{3}$/;

/** Checks the raw catalog and returns a typed copy. Throws an Error naming the first problem. */
export function parseCatalog(raw: unknown): CourseCatalog {
  const root = record(raw, "catalog");
  const source = record(root.source, "source");
  const catalog: CourseCatalog = {
    source: { id: text(source.id, "source.id"), name: text(source.name, "source.name"), note: text(source.note, "source.note") },
    courses: [],
  };
  if (!Array.isArray(root.courses) || root.courses.length === 0) throw new Error("courses must be a non-empty array");

  for (const [index, item] of root.courses.entries()) {
    const at = (field: string) => `courses[${index}].${field}`;
    const course = record(item, `courses[${index}]`);
    const code = text(course.code, at("code"));
    if (!CODE_PATTERN.test(code)) throw new Error(`${at("code")} must look like ABC123`);
    if (catalog.courses.some(other => other.code === code)) throw new Error(`duplicate course code ${code}`);

    const credits = course.credits;
    if (typeof credits !== "number" || !Number.isInteger(credits) || credits < 1 || credits > 30) {
      throw new Error(`${at("credits")} must be an integer from 1 to 30`);
    }
    const periods = course.periods;
    if (!Array.isArray(periods) || periods.length === 0
      || periods.some((p, i) => !Number.isInteger(p) || p < 1 || p > 4 || (i > 0 && p <= periods[i - 1]))) {
      throw new Error(`${at("periods")} must be ascending, unique periods from 1 to 4`);
    }
    const language = oneOf(course.language, COURSE_LANGUAGES, at("language"));
    const level = oneOf(course.level, COURSE_LEVELS, at("level"));
    const prerequisites = course.prerequisites === undefined ? [] : texts(course.prerequisites, at("prerequisites"));

    catalog.courses.push({
      code,
      name: text(course.name, at("name")),
      credits,
      periods: periods as number[],
      language,
      level,
      unit: text(course.unit, at("unit")),
      keywords: texts(course.keywords, at("keywords")),
      description: text(course.description, at("description")),
      prerequisites,
    });
  }

  const codes = new Set(catalog.courses.map(course => course.code));
  for (const course of catalog.courses) {
    for (const prerequisite of course.prerequisites) {
      if (prerequisite === course.code || !codes.has(prerequisite)) {
        throw new Error(`${course.code} has an unknown prerequisite ${prerequisite}`);
      }
    }
  }
  return catalog;
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${path} must be an object`);
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${path} must be a non-empty string`);
  return value.trim();
}

function texts(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array of strings`);
  return value.map((item, i) => text(item, `${path}[${i}]`));
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  if (!allowed.includes(value as T)) throw new Error(`${path} must be one of ${allowed.join(", ")}`);
  return value as T;
}

/**
 * Common Finnish question and filler words. Dropping them lets a natural question such as
 * "Mitä kursseja on tietoturvasta?" search only for its topic.
 */
const STOPWORDS = new Set([
  "ja", "tai", "on", "ovat", "onko", "ei", "en", "se", "ne", "jos", "kun", "että", "myös", "vai",
  "mikä", "mitkä", "mitä", "missä", "mistä", "mihin", "milloin", "miten", "kuinka", "kuka", "ketkä", "paljonko",
  "minä", "mä", "sinä", "hän", "me", "te", "he", "voi", "voiko", "voin", "haluan", "haluaisin", "löytyy", "löytyykö",
  "olisi", "oisko", "jotain", "joku", "jokin", "kaikki", "hae", "etsi", "näytä",
  "kurssi", "kurssit", "kurssia", "kurssin", "kurssille", "kurssilla", "kurssista", "kursseja", "kursseista", "kursseille",
  "opintojakso", "opintojaksot", "opintojaksoja", "aihe", "aiheesta", "liittyen", "liittyvä", "liittyviä",
]);

/** Lower-case words with Unicode letters and digits kept intact (ä, ö and å are not folded). */
export const words = (value: string) => value.normalize("NFC").toLocaleLowerCase("fi").split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Query words without stopwords, deduplicated. */
export const queryTerms = (query: string) => [...new Set(words(query).filter(word => !STOPWORDS.has(word)))];

/**
 * Whether a query word matches a catalog word, allowing for Finnish inflection without a stemmer:
 * - words of 1–2 letters must be equal, and 3-letter words must start the catalog word;
 * - longer words match when they share a beginning of at least 4 letters that covers three
 *   quarters of the shorter word ("ohjelmoinnin" ~ "ohjelmointi", "koneoppimisen" ~ "koneoppiminen",
 *   but not "tietokannat" ~ "tietokone" or "opinnäytetyö" ~ "opinnot");
 * - a query word of 5+ letters also matches inside a compound ("oppiminen" in "koneoppiminen").
 */
export function wordMatches(term: string, word: string): boolean {
  if (term === word) return true;
  if (term.length < 3) return false;
  if (term.length === 3) return word.startsWith(term);
  if (term.length >= 5 && word.includes(term)) return true;
  const shorter = Math.min(term.length, word.length);
  let common = 0;
  while (common < shorter && term[common] === word[common]) common++;
  return common >= 4 && common * 4 >= shorter * 3;
}

/** How strongly a match in each field counts. */
const FIELD_WEIGHTS = { code: 10, name: 5, keywords: 4, meta: 2, description: 1 } as const;
type Field = keyof typeof FIELD_WEIGHTS;

export type CourseMatch = { course: Course; score: number; matchedTerms: number };

const fieldWords = (course: Course): Record<Field, string[]> => ({
  code: words(course.code),
  name: words(course.name),
  keywords: course.keywords.flatMap(words),
  meta: words([course.unit, LEVEL_LABELS[course.level], LANGUAGE_LABELS[course.language]].join(" ")),
  description: words(course.description),
});

/**
 * Keyword search over the catalog. Each query term scores the weight of the best field it matches,
 * and courses are ranked by how many terms they match, then by score, then by code. A query with no
 * searchable terms (empty, or only stopwords) lists the whole catalog in code order. `period`
 * keeps only courses taught in that period.
 */
export function searchCourses(catalog: CourseCatalog, query: string, { period }: { period?: number } = {}): CourseMatch[] {
  const courses = period === undefined ? catalog.courses : catalog.courses.filter(course => course.periods.includes(period));
  const terms = queryTerms(query);
  if (terms.length === 0) {
    return [...courses].sort(byCode).map(course => ({ course, score: 0, matchedTerms: 0 }));
  }
  const matches: CourseMatch[] = [];
  for (const course of courses) {
    const fields = Object.entries(fieldWords(course)) as [Field, string[]][];
    let score = 0;
    let matchedTerms = 0;
    for (const term of terms) {
      // Codes match exactly, so "tie210" doesn't also find TIE220.
      const matchesField = ([field, list]: [Field, string[]]) => list.some(word => field === "code" ? term === word : wordMatches(term, word));
      const best = Math.max(0, ...fields.filter(matchesField).map(([field]) => FIELD_WEIGHTS[field]));
      if (best > 0) {
        score += best;
        matchedTerms++;
      }
    }
    if (matchedTerms > 0) matches.push({ course, score, matchedTerms });
  }
  return matches.sort((a, b) => b.matchedTerms - a.matchedTerms || b.score - a.score || byCode(a.course, b.course));
}

const byCode = (a: Course, b: Course) => a.code.localeCompare(b.code);

/** Finds a course by code, ignoring case and surrounding spaces. */
export const findCourse = (catalog: CourseCatalog, code: string) =>
  catalog.courses.find(course => course.code === code.trim().toUpperCase());

/** "Periodi 3", "Periodit 1–2" or "Periodit 1, 3". */
export function formatPeriods(periods: number[]): string {
  if (periods.length === 1) return `Periodi ${periods[0]}`;
  const consecutive = periods.every((p, i) => i === 0 || p === periods[i - 1] + 1);
  return `Periodit ${consecutive ? `${periods[0]}–${periods.at(-1)}` : periods.join(", ")}`;
}

export const formatCredits = (credits: number) => `${credits} op`;

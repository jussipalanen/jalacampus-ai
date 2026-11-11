import test from "node:test";
import assert from "node:assert/strict";
import { courseCatalog } from "../src/lib/course-catalog.ts";
import {
  findCourse, formatCredits, formatPeriods, parseCatalog, queryTerms, searchCourses, wordMatches,
} from "../src/lib/courses.ts";
import { handleCourseLookup, handleCourseSearch } from "../src/lib/courses-api.ts";

const course = (overrides = {}) => ({
  code: "OHJ101",
  name: "Ohjelmoinnin perusteet",
  credits: 5,
  periods: [1],
  language: "fi",
  level: "basic",
  unit: "Tietojenkäsittely",
  keywords: ["ohjelmointi"],
  description: "Johdatus ohjelmointiin.",
  ...overrides,
});
const catalog = (courses) => ({ source: { id: "testi", name: "Testiopas", note: "Kuvitteellinen." }, courses });
const codes = (query, options) => searchCourses(courseCatalog, query, options).map(match => match.course.code);
const get = (path) => new Request(`http://localhost${path}`);

test("the bundled catalog is valid and synthetic", () => {
  assert.ok(courseCatalog.courses.length >= 15);
  assert.match(courseCatalog.source.note, /Kuvitteellinen/);
  assert.equal(new Set(courseCatalog.courses.map(c => c.code)).size, courseCatalog.courses.length);
});

test("parseCatalog normalizes optional prerequisites", () => {
  const parsed = parseCatalog(catalog([course({ code: " OHJ101 " }), course({ code: "OHJ201", prerequisites: ["OHJ101"] })]));
  assert.equal(parsed.courses[0].code, "OHJ101");
  assert.deepEqual(parsed.courses[0].prerequisites, []);
  assert.deepEqual(parsed.courses[1].prerequisites, ["OHJ101"]);
});

test("parseCatalog rejects malformed courses with the field name", () => {
  const cases = [
    [null, /catalog must be an object/],
    [{ ...catalog([course()]), source: {} }, /source\.id/],
    [catalog([]), /non-empty array/],
    [catalog([course({ code: "ohj-1" })]), /courses\[0\]\.code must look like ABC123/],
    [catalog([course(), course()]), /duplicate course code OHJ101/],
    [catalog([course({ name: "  " })]), /courses\[0\]\.name/],
    [catalog([course({ credits: 2.5 })]), /credits/],
    [catalog([course({ periods: [] })]), /periods/],
    [catalog([course({ periods: [2, 1] })]), /periods/],
    [catalog([course({ periods: [5] })]), /periods/],
    [catalog([course({ language: "de" })]), /language must be one of fi, sv, en/],
    [catalog([course({ level: "expert" })]), /level/],
    [catalog([course({ keywords: "ohjelmointi" })]), /keywords must be an array/],
    [catalog([course({ prerequisites: ["XYZ999"] })]), /unknown prerequisite XYZ999/],
    [catalog([course({ prerequisites: ["OHJ101"] })]), /unknown prerequisite OHJ101/],
  ];
  for (const [raw, message] of cases) assert.throws(() => parseCatalog(raw), message);
});

test("query terms drop Finnish question words and keep ä and ö", () => {
  assert.deepEqual(queryTerms("Mitä kursseja on tietoturvasta?"), ["tietoturvasta"]);
  assert.deepEqual(queryTerms("Tekoäly, TEKOÄLY ja opinnäytetyö"), ["tekoäly", "opinnäytetyö"]);
  // A decomposed "ä" (a + combining diaeresis) matches the composed form.
  assert.deepEqual(queryTerms("tekoäly"), ["tekoäly"]);
});

test("word matching allows Finnish inflection but not unrelated words", () => {
  for (const [term, word] of [
    ["ohjelmoinnin", "ohjelmointi"], ["tilastotieteen", "tilastotiede"], ["koneoppimisen", "koneoppiminen"],
    ["tietoturvasta", "tietoturva"], ["oppiminen", "koneoppiminen"], ["sql", "sql"], ["web", "web"],
  ]) assert.ok(wordMatches(term, word), `${term} ~ ${word}`);
  for (const [term, word] of [
    ["tietokannat", "tietokone"], ["opinnäytetyö", "opinnot"], ["ai", "aineopinnot"], ["kirjasto", "kirjoittaminen"],
  ]) assert.ok(!wordMatches(term, word), `${term} !~ ${word}`);
});

test("search ranks the most relevant courses first", () => {
  assert.deepEqual(codes("Onko ohjelmoinnin kursseja?"), ["OHJ101", "OHJ201"]);
  assert.equal(codes("tilastotieteen")[0], "TIL110");
  assert.deepEqual(codes("koneoppimisen"), ["TIE310"]);
  assert.deepEqual(codes("Mitä kursseja on tietoturvasta?"), ["TIE230"]);
  assert.deepEqual(codes("tietokannat"), ["TIE210"]);
  assert.equal(codes("englanninkieliset kurssit")[0], "KIE110");
  // Courses matching more of the query come first.
  assert.equal(codes("python data")[0], "TIL210");
});

test("course codes match exactly and case-insensitively", () => {
  assert.deepEqual(codes("tie210"), ["TIE210"]);
  assert.equal(findCourse(courseCatalog, " tie210 ").name, "Tietokannat");
  assert.equal(findCourse(courseCatalog, "TIE999"), undefined);
});

test("an unknown topic finds nothing instead of guessing", () => {
  assert.deepEqual(codes("kvanttifysiikka"), []);
});

test("an empty or stopword-only query lists the catalog in code order", () => {
  const all = courseCatalog.courses.map(c => c.code).sort();
  assert.deepEqual(codes(""), all);
  assert.deepEqual(codes("Mitä kursseja on?"), all);
});

test("the period filter keeps only courses taught in that period", () => {
  const third = codes("", { period: 3 });
  assert.ok(third.length > 0);
  for (const code of third) assert.ok(findCourse(courseCatalog, code).periods.includes(3));
  assert.deepEqual(codes("ohjelmointi", { period: 2 }), ["OHJ201"]);
});

test("formats periods and credits in Finnish", () => {
  assert.equal(formatPeriods([3]), "Periodi 3");
  assert.equal(formatPeriods([1, 2]), "Periodit 1–2");
  assert.equal(formatPeriods([1, 3]), "Periodit 1, 3");
  assert.equal(formatCredits(5), "5 op");
});

test("GET /api/courses returns results with their source", async () => {
  const response = handleCourseSearch(get("/api/courses?q=%20tietokannat%20"), courseCatalog);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.source, courseCatalog.source);
  assert.equal(body.query, "tietokannat");
  assert.equal(body.period, null);
  assert.equal(body.total, courseCatalog.courses.length);
  assert.deepEqual(body.results.map(c => c.code), ["TIE210"]);
  assert.equal(body.results[0].credits, 5);
});

test("GET /api/courses lists everything without a query and filters by period", async () => {
  const all = await handleCourseSearch(get("/api/courses"), courseCatalog).json();
  assert.equal(all.results.length, courseCatalog.courses.length);
  const fourth = await handleCourseSearch(get("/api/courses?period=4"), courseCatalog).json();
  assert.equal(fourth.period, 4);
  assert.ok(fourth.results.every(c => c.periods.includes(4)));
  const blank = await handleCourseSearch(get("/api/courses?period="), courseCatalog).json();
  assert.equal(blank.results.length, courseCatalog.courses.length);
});

test("GET /api/courses rejects a long query or an invalid period in Finnish", async () => {
  const long = handleCourseSearch(get(`/api/courses?q=${"ä".repeat(201)}`), courseCatalog);
  assert.equal(long.status, 400);
  assert.match((await long.json()).error, /enimmäispituus on 200 merkkiä/);
  for (const period of ["0", "5", "1.5", "kolme"]) {
    const response = handleCourseSearch(get(`/api/courses?period=${period}`), courseCatalog);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Periodin tulee olla/);
  }
});

test("GET /api/courses/{code} returns one course or a Finnish 404", async () => {
  const found = handleCourseLookup("ohj201", courseCatalog);
  assert.equal(found.status, 200);
  const body = await found.json();
  assert.equal(body.course.code, "OHJ201");
  assert.deepEqual(body.course.prerequisites, ["OHJ101"]);
  assert.equal(body.source.id, courseCatalog.source.id);

  const missing = handleCourseLookup("ABC999", courseCatalog);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "Kurssia ei löytynyt.", code: "not_found" });
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { recognitionConstructor, speechErrorMessage, transcriptOf, withTranscript } from "../src/lib/speech.ts";

const result = (transcript, isFinal = true) => Object.assign([{ transcript }], { isFinal });

test("finds the standard or webkit-prefixed recognition constructor, or none", () => {
  class Standard {}
  class Webkit {}
  assert.equal(recognitionConstructor({ SpeechRecognition: Standard, webkitSpeechRecognition: Webkit }), Standard);
  assert.equal(recognitionConstructor({ webkitSpeechRecognition: Webkit }), Webkit);
  assert.equal(recognitionConstructor({}), null); // e.g. Firefox: no microphone button
});

test("joins final and interim results into one trimmed line", () => {
  assert.equal(transcriptOf([result(" Milloin kirjasto"), result("on auki ", false)]), "Milloin kirjasto on auki");
  assert.equal(transcriptOf([]), "");
});

test("appends dictation after typed text and respects the length limit", () => {
  assert.equal(withTranscript("", "Milloin kirjasto on auki"), "Milloin kirjasto on auki");
  assert.equal(withTranscript("Kampus:  ", "milloin auki"), "Kampus: milloin auki");
  assert.equal(withTranscript("Valmis teksti", ""), "Valmis teksti");
  assert.equal(withTranscript("", "äöåäöå", 4), "äöåä"); // counts characters, not UTF-16 units
});

test("maps recognition errors to Finnish messages; a user stop says nothing", () => {
  assert.equal(speechErrorMessage("aborted"), null);
  assert.match(speechErrorMessage("not-allowed"), /Mikrofonin käyttö on estetty/);
  assert.match(speechErrorMessage("service-not-allowed"), /Mikrofonin käyttö on estetty/);
  assert.match(speechErrorMessage("no-speech"), /Puhetta ei kuulunut/);
  assert.match(speechErrorMessage("audio-capture"), /Mikrofonia ei löytynyt/);
  assert.match(speechErrorMessage("network"), /ei saanut yhteyttä/);
  assert.match(speechErrorMessage("language-not-supported"), /ei tue suomea/);
  assert.match(speechErrorMessage("something-new"), /Puheentunnistus epäonnistui/);
});

test("the chat dictates in Finnish, discloses the browser service and stops when a question is sent", () => {
  const voice = readFileSync(new URL("../src/components/voice-input.tsx", import.meta.url), "utf8");
  assert.match(voice, /instance\.lang = "fi-FI"/);
  assert.match(voice, /aria-pressed=\{listening\} aria-label="Sanele kysymys"/);
  assert.match(voice, /role="status"/);
  assert.match(voice, /Chromessa Google/);
  const chat = readFileSync(new URL("../src/components/search-chat.tsx", import.meta.url), "utf8");
  // Shown only where recognition works and the user hasn't turned speech input off in Asetukset.
  assert.match(chat, /const showVoice = voice\.supported && voiceInput/);
  assert.match(chat, /\{showVoice && <VoiceButton/);
  assert.match(chat, /if \(!question \|\| loading\) return;\s*voice\.stop\(\);/);
  assert.match(chat, /function clear\(\) \{\s*voice\.stop\(\);/);
});

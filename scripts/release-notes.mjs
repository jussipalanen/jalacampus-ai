import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function releaseNotes(tag, version, changelog) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error("Tag must use vMAJOR.MINOR.PATCH.");
  if (tag !== `v${version}`) throw new Error(`Tag ${tag} does not match package version ${version}.`);
  const section = `## [${version}]`;
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex(line => line === section || line.startsWith(`${section} - `));
  if (start < 0) throw new Error(`CHANGELOG.md has no section for ${version}.`);
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## ["));
  const notes = lines.slice(start + 1, end < 0 ? undefined : end).join("\n").trim();
  if (!notes) throw new Error(`CHANGELOG.md section for ${version} is empty.`);
  return `${notes}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const tag = process.argv[2];
    const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
    process.stdout.write(releaseNotes(tag, version, changelog));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Release notes failed."}\n`);
    process.exitCode = 1;
  }
}

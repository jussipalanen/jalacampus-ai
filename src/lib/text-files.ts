import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { MAX_UPLOAD_BYTES } from "./document-preview.ts";

export type TextFile = { path: string; sourceName: string; text: string };

/**
 * Expands files and directories (non-recursive) into `.txt` paths, sorted and de-duplicated.
 * Explicitly named files must be `.txt`; other files inside directories are skipped.
 */
export async function collectTextFiles(paths: string[]): Promise<string[]> {
  const files = new Set<string>();
  for (const path of paths) {
    if ((await stat(path)).isDirectory()) {
      for (const entry of await readdir(path, { withFileTypes: true })) {
        if (entry.isFile() && extname(entry.name).toLowerCase() === ".txt") files.add(join(path, entry.name));
      }
    } else if (extname(path).toLowerCase() === ".txt") {
      files.add(path);
    } else {
      throw new Error(`Only UTF-8 .txt files can be ingested: ${path}`);
    }
  }
  return [...files].sort();
}

/** Reads a UTF-8 text file with the same size limit as the upload preview. Never truncates. */
export async function readTextFile(path: string): Promise<TextFile> {
  const bytes = await readFile(path);
  if (bytes.length > MAX_UPLOAD_BYTES) throw new Error(`File is larger than 2 MB: ${path}`);
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`File is not valid UTF-8: ${path}`);
  }
  return { path, sourceName: basename(path), text };
}

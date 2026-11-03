export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const MAX_PREVIEW_CHARS = 20_000;

export class DocumentError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function validateDocument(file: File): "pdf" | "text" {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  const kind = name.endsWith(".pdf") && (type === "application/pdf" || !type)
    ? "pdf"
    : name.endsWith(".txt") && (type === "text/plain" || !type)
      ? "text"
      : null;
  if (!kind) throw new DocumentError("Valitse PDF- tai TXT-tiedosto.");
  if (file.size === 0) throw new DocumentError("Tiedosto on tyhjä.");
  if (file.size > MAX_UPLOAD_BYTES) throw new DocumentError("Tiedosto on liian suuri. Enimmäiskoko on 2 Mt.", 413);
  return kind;
}

export async function extractDocument(file: File): Promise<{ text: string; truncated: boolean }> {
  const kind = validateDocument(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text: string;
  if (kind === "text") {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new DocumentError("Tekstitiedoston merkistön tulee olla UTF-8.");
    }
    if (text.includes("\0")) throw new DocumentError("Tekstitiedosto sisältää virheellistä sisältöä.");
  } else {
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
      throw new DocumentError("PDF-tiedosto on virheellinen.");
    }
    try {
      const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const result = await pdf(Buffer.from(bytes), { max: 10 });
      text = result.text;
    } catch {
      throw new DocumentError("PDF-tiedoston lukeminen epäonnistui.");
    }
  }
  text = text.trim();
  if (!text) throw new DocumentError("Tiedostosta ei löytynyt esikatseltavaa tekstiä.");
  return { text: text.slice(0, MAX_PREVIEW_CHARS), truncated: text.length > MAX_PREVIEW_CHARS };
}

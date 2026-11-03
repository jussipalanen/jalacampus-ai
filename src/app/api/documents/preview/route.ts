import { NextResponse } from "next/server";
import { DocumentError, extractDocument, MAX_UPLOAD_BYTES } from "@/lib/document-preview";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length"));
  if (length > MAX_UPLOAD_BYTES + 16_384) {
    return NextResponse.json({ error: "Tiedosto on liian suuri. Enimmäiskoko on 2 Mt." }, { status: 413 });
  }
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new DocumentError("Valitse PDF- tai TXT-tiedosto.");
    const preview = await extractDocument(file);
    return NextResponse.json({ name: file.name, size: file.size, ...preview });
  } catch (error) {
    if (error instanceof DocumentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tiedoston käsittely epäonnistui." }, { status: 400 });
  }
}

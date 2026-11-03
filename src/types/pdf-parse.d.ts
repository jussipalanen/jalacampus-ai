declare module "pdf-parse/lib/pdf-parse.js" {
  type PdfResult = { text: string };
  const parse: (data: Buffer, options?: { max?: number }) => Promise<PdfResult>;
  export default parse;
}

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
type PdfParseResult = { text: string; numpages: number };
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<PdfParseResult>;

// Extract plain text from a PDF buffer using pdf.js under the hood.
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

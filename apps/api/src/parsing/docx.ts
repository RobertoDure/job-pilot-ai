import AdmZip from 'adm-zip';

// Minimal DOCX text extraction (word/document.xml is XML inside a zip).
export function extractDocxText(buffer: Buffer): string {
  const zip = new AdmZip(buffer);
  const entry = zip.getEntry('word/document.xml');
  if (!entry) return '';
  const xml = entry.getData().toString('utf8');
  const paragraphs = xml.split(/<\/w:p>/);
  const out: string[] = [];
  for (const p of paragraphs) {
    const matches = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
    if (matches.length) out.push(matches.map((m) => m[1]).join(''));
  }
  return out.join('\n');
}

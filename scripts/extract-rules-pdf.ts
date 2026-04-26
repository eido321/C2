/**
 * Extracts plain text from public/rules.pdf into docs/ for easier search and AI use.
 *
 * Usage: npm run extract-rules
 *
 * Outputs:
 *   - docs/rules-from-pdf.md   — YAML front matter + per-page headings + full dump
 *   - docs/rules-from-pdf.json — same content structured by page
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pdfPath = join(root, 'public', 'rules.pdf');
const outDir = join(root, 'docs');
const outMd = join(outDir, 'rules-from-pdf.md');
const outJson = join(outDir, 'rules-from-pdf.json');

async function main() {
  if (!existsSync(pdfPath)) {
    console.error(`Missing PDF: ${pdfPath}`);
    console.error('Add your file at public/rules.pdf, then run: npm run extract-rules');
    process.exit(1);
  }

  const data = await readFile(pdfPath);
  const parser = new PDFParse({ data });

  try {
    const textResult = await parser.getText();

    const meta = {
      source: 'public/rules.pdf',
      extractedAt: new Date().toISOString(),
      pageCount: textResult.total,
      note: 'Machine-extracted; columns, tables, and headers may be out of order.',
    };

    let md = `---
source: ${meta.source}
extractedAt: ${meta.extractedAt}
pageCount: ${meta.pageCount}
note: ${meta.note}
---

# Rules PDF (extracted text)

`;

    for (const p of textResult.pages) {
      md += `## Page ${p.num}\n\n`;
      const body = (p.text ?? '').trim();
      md += body.length > 0 ? `${body}\n\n` : '_No text detected on this page._\n\n';
    }

    md += `---

## Full document (single block)

Useful for quick search; page boundaries are lost.

`;
    md += `${(textResult.text ?? '').trim()}\n`;

    mkdirSync(outDir, { recursive: true });
    writeFileSync(outMd, md, 'utf8');

    writeFileSync(
      outJson,
      JSON.stringify(
        {
          ...meta,
          pages: textResult.pages.map((p) => ({ page: p.num, text: p.text ?? '' })),
          fullText: textResult.text ?? '',
        },
        null,
        2,
      ),
      'utf8',
    );

    console.log(`Wrote ${outMd}`);
    console.log(`Wrote ${outJson}`);
  } finally {
    await parser.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

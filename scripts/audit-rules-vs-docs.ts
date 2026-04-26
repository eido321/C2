/**
 * Compares src/data rules payloads against docs/rules-from-pdf.json (full PHB text).
 *
 * Usage: npm run audit-rules
 *
 * This does substring checks on normalized text — extraction gaps (line breaks, typos)
 * can cause false "missing" hits. Short strings (e.g. "Aid") may false-positive in prose.
 *
 * Outputs: docs/rules-audit-report.md
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const jsonPath = join(root, 'docs', 'rules-from-pdf.json');
const outMd = join(root, 'docs', 'rules-audit-report.md');

function normalize(s: string): string {
  let t = s
    .normalize('NFKC')
    .replace(/\u0000/g, ' ')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  // BeyondPrinting-style extraction often drops “fi” → NUL (e.g. Petrified → “Petri” + NUL + “ed”).
  t = t.replace(/\bpetri ed\b/g, 'petrified');
  return t;
}

function loadCorpusNorm(): { rawLen: number; norm: string; pageCount: number } {
  if (!existsSync(jsonPath)) {
    throw new Error(`Missing ${jsonPath} — run: npm run extract-rules`);
  }
  const data = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
    pages: { text: string }[];
    pageCount?: number;
  };
  const raw = data.pages.map((p) => p.text).join('\n');
  return {
    rawLen: raw.length,
    norm: normalize(raw),
    pageCount: data.pageCount ?? data.pages.length,
  };
}

function readDataFile(name: string): string {
  return readFileSync(join(root, 'src', 'data', name), 'utf8');
}

/** All `name: '...'` in spells.ts export list */
function extractSpellNames(body: string): string[] {
  const names: string[] = [];
  const re = /\{\s*name:\s*'((?:\\'|[^'])*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    names.push(m[1].replace(/\\'/g, "'"));
  }
  return names;
}

function extractArmorNames(body: string): string[] {
  const names: string[] = [];
  const re = /name:\s*'((?:\\'|[^'])*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    names.push(m[1].replace(/\\'/g, "'"));
  }
  return names;
}

/** Origin feats: lines with isOrigin: true */
function extractOriginFeatNames(body: string): string[] {
  const names: string[] = [];
  const re = /isOrigin:\s*true,\s*name:\s*'((?:\\'|[^'])*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    names.push(m[1].replace(/\\'/g, "'"));
  }
  return names;
}

/** Quoted string literals inside `export const Name = [ ... ] as const` (stops at first matching close). */
function extractConstStringArray(constName: string, body: string): string[] {
  const marker = `export const ${constName}`;
  const start = body.indexOf(marker);
  if (start < 0) return [];
  const sub = body.slice(start);
  const open = sub.indexOf('[');
  const close = sub.indexOf('] as const');
  if (open < 0 || close < 0 || close < open) return [];
  const slice = sub.slice(open, close + 1);
  const names: string[] = [];
  const re = /'((?:\\'|[^'])*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(slice)) !== null) {
    names.push(m[1].replace(/\\'/g, "'"));
  }
  return names;
}

function inCorpus(corpusNorm: string, label: string): boolean {
  const n = normalize(label);
  if (n.length === 0) return false;
  return corpusNorm.includes(n);
}

function profBonusCheck(): { ok: boolean; detail: string } {
  const expected: Record<number, number> = {};
  for (let lvl = 1; lvl <= 4; lvl++) expected[lvl] = 2;
  for (let lvl = 5; lvl <= 8; lvl++) expected[lvl] = 3;
  for (let lvl = 9; lvl <= 12; lvl++) expected[lvl] = 4;
  for (let lvl = 13; lvl <= 16; lvl++) expected[lvl] = 5;
  for (let lvl = 17; lvl <= 20; lvl++) expected[lvl] = 6;
  const body = readDataFile('levelData.ts');
  const m = body.match(/export const PROF_BONUS[^}]+}/s);
  if (!m) return { ok: false, detail: 'PROF_BONUS block not found' };
  let ok = true;
  const issues: string[] = [];
  for (let lvl = 1; lvl <= 20; lvl++) {
    const re = new RegExp(`\\b${lvl}\\s*:\\s*(\\d+)`);
    const mm = m[0].match(re);
    if (!mm) {
      issues.push(`missing level ${lvl}`);
      ok = false;
      continue;
    }
    if (Number(mm[1]) !== expected[lvl]) {
      issues.push(`level ${lvl}: app ${mm[1]}, expected ${expected[lvl]} (2024 PHB character table)`);
      ok = false;
    }
  }
  return { ok, detail: ok ? 'PROF_BONUS 1–20 matches 2024 PHB (+2…+6 tiers).' : issues.join('; ') };
}

function section(title: string, lines: string[]): string {
  return [`## ${title}`, '', ...lines, ''].join('\n');
}

function main() {
  const { norm: corpus, rawLen, pageCount } = loadCorpusNorm();
  const spells = extractSpellNames(readDataFile('spells.ts'));
  const armor = extractArmorNames(readDataFile('armor.ts'));
  const originFeats = extractOriginFeatNames(readDataFile('feats.ts'));
  const constantsBody = readFileSync(join(root, 'src', 'config', 'constants.ts'), 'utf8');
  const classes = extractConstStringArray('DND_CLASSES', constantsBody);
  const conditions = extractConstStringArray('CONDITIONS', constantsBody);

  const spellsMissing = spells.filter((s) => !inCorpus(corpus, s));
  const armorMissing = armor.filter((a) => !inCorpus(corpus, a));
  const featsMissing = originFeats.filter((f) => !inCorpus(corpus, f));
  const classesMissing = classes.filter((c) => !inCorpus(corpus, c));
  const conditionsMissing = conditions.filter((c) => !inCorpus(corpus, c));

  const prof = profBonusCheck();

  const shortSpellWarn = spells.filter((s) => s.replace(/\s/g, '').length < 5);

  const lines: string[] = [];
  lines.push('# Rules audit: app data vs docs/rules-from-pdf.json');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Corpus');
  lines.push('');
  lines.push(`- Source: \`docs/rules-from-pdf.json\` (${pageCount} pages)`);
  lines.push(`- Concatenated text length: ${rawLen.toLocaleString()} characters (normalized for matching)`);
  lines.push('');
  lines.push('## How to read this');
  lines.push('');
  lines.push('- **Missing in PDF text** means the exact normalized name did not appear in the extracted book text.');
  lines.push('- Extraction is lossy (columns, hyphenation, special characters). The script normalizes common NUL-byte breaks (e.g. glossary **Petrified**). Some “missing” entries are still false negatives.');
  lines.push('- The app may legally omit PHB-only names if your `rules.pdf` differs from the data source.');
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push(section('Proficiency bonus (levelData.ts)', [`- **${prof.ok ? 'OK' : 'MISMATCH'}**: ${prof.detail}`]));

  const spellCaveat =
    spellsMissing.length > 0
      ? [
          '',
          '_These names were not found in the concatenated extract (tabs, hyphenation, renamed spells in 2024, or print extension stripping can cause false negatives). Cross-check the PDF manually._',
        ]
      : [];

  lines.push(
    section('Spells (spells.ts)', [
      `- Total spells in app: **${spells.length}**`,
      `- Not found as substring in PDF text: **${spellsMissing.length}**`,
      ...(spellsMissing.length
        ? ['', '<details><summary>List</summary>', '', ...spellsMissing.map((s) => `- ${s}`), '', '</details>', ...spellCaveat]
        : ['', '_All spell names appear somewhere in the corpus._']),
      '',
      `_Very short names (${shortSpellWarn.length}) may match unrelated prose; spot-check: ${shortSpellWarn.slice(0, 8).join(', ')}${shortSpellWarn.length > 8 ? '…' : ''}_`,
    ]),
  );

  lines.push(
    section('Armor (armor.ts)', [
      `- Armor / shield entries: **${armor.length}**`,
      `- Not found in PDF text: **${armorMissing.length}**`,
      ...(armorMissing.length
        ? ['', ...armorMissing.map((s) => `- ${s}`)]
        : ['', '_All armor names appear in the corpus._']),
    ]),
  );

  lines.push(
    section('Origin feats (feats.ts)', [
      `- Origin feat names: **${originFeats.length}**`,
      `- Not found in PDF text: **${featsMissing.length}**`,
      ...(featsMissing.length ? ['', ...featsMissing.map((s) => `- ${s}`)] : ['', '_All listed origin feat names appear in the corpus._']),
    ]),
  );

  const classExtra =
    classesMissing.includes('Artificer') && classesMissing.length === 1
      ? ['', '_**Artificer** is not a core 2024 PHB class in chapter 3; it is expected to be absent from a PHB-only extract._']
      : classesMissing.length
        ? ['', '_If a class is missing, confirm whether your PDF includes supplements (e.g. Eberron) or alternate class lists._']
        : [];

  lines.push(
    section('Classes (config/constants.ts DND_CLASSES)', [
      `- Classes: **${classes.length}**`,
      `- Not found in PDF text: **${classesMissing.length}**`,
      ...(classesMissing.length ? ['', ...classesMissing.map((s) => `- ${s}`), ...classExtra] : ['', '_All class names appear in the corpus._']),
    ]),
  );

  lines.push(
    section('Conditions (config/constants.ts CONDITIONS)', [
      `- Conditions: **${conditions.length}**`,
      `- Not found in PDF text: **${conditionsMissing.length}**`,
      ...(conditionsMissing.length ? ['', ...conditionsMissing.map((s) => `- ${s}`)] : ['', '_All condition names appear in the corpus._']),
    ]),
  );

  lines.push(section('Not covered by this script', [
    '- `spellClasses.ts` (which class lists which spell) — needs structured SRD tables, not simple name grep.',
    '- `levelData.ts` class feature paragraphs — compare manually or NLP.',
    '- `races.ts`, `backgrounds.ts`, `wildShape.ts`, companions — partial PHB / other sources.',
    '- Weapons list if added later under a different file.',
  ]));

  writeFileSync(outMd, lines.join('\n'), 'utf8');
  console.log(`Wrote ${outMd}`);
  console.log(`Spells: ${spellsMissing.length}/${spells.length} not found in corpus`);
  console.log(`Armor: ${armorMissing.length}/${armor.length} not found`);
  console.log(`Origin feats: ${featsMissing.length}/${originFeats.length} not found`);
  console.log(`Classes: ${classesMissing.length}/${classes.length} not found`);
  console.log(`Conditions: ${conditionsMissing.length}/${conditions.length} not found`);
  console.log(`PROF_BONUS: ${prof.ok ? 'OK' : prof.detail}`);
}

main();

/**
 * Compare src/data/spells.ts against docs/rules-from-pdf.json PHB spell blocks.
 * Run: node scripts/spell-audit-phb.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const spellsTs = fs.readFileSync(path.join(root, 'src', 'data', 'spells.ts'), 'utf8');
const pdfJson = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'rules-from-pdf.json'), 'utf8'));

/** App spell names (handles \' in TS) */
const appSpells = [];
const nameRe = /name:\s*'((?:\\'|[^'])*)'\s*,\s*level:\s*(\d+)/g;
let m;
while ((m = nameRe.exec(spellsTs)) !== null) {
  appSpells.push({ name: m[1].replace(/\\'/g, "'"), level: Number(m[2]) });
}

const schools =
  '(?:Evocation|Abjuration|Conjuration|Divination|Enchantment|Illusion|Necromancy|Transmutation)';

/** Join PDF pages that contain spell stat blocks (alphabetical spell chapter) */
const pages = pdfJson.pages || [];
let spellBlob = '';
for (const p of pages) {
  const n = p.page;
  if (n >= 454 && n <= 680) spellBlob += '\n' + (p.text || '');
}

function canonName(s) {
  return s.replace(/[\u2018\u2019]/g, "'").trim();
}

/** Extract spell name -> block start (through next spell header or footer) */
const headerRe = new RegExp(
  `(?:^|\\n)([A-Z][A-Za-z0-9'’\\- /]+)\\n(${schools} Cantrip|Level \\d+ ${schools})`,
  'g',
);

const pdfSpells = new Map();
let match;
while ((match = headerRe.exec(spellBlob)) !== null) {
  const rawName = canonName(match[1].trim());
  const bad = /^(Casting Time|Range|Components|Duration|Using a Higher)/i.test(rawName);
  if (bad || rawName.length > 60) continue;
  if (!pdfSpells.has(rawName)) pdfSpells.set(rawName, match.index);
}

const appNames = new Set(appSpells.map((s) => s.name));
const pdfNames = new Set(pdfSpells.keys());
const appCanon = new Map([...appNames].map((n) => [canonName(n), n]));

const inAppNotPdf = [...appNames].filter((n) => !pdfNames.has(canonName(n)));
const inPdfNotApp = [...pdfNames].filter((n) => !appCanon.has(n));

/** Normalize for loose description check */
function norm(s) {
  return s
    .replace(/\u0000/g, '')
    .replace(/’/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
    .toLowerCase();
}

/** Get body after Duration line for a spell block (approximate) */
function pdfBodyFor(spellName) {
  const idx = pdfSpells.get(canonName(spellName));
  if (idx === undefined) return '';
  const slice = spellBlob.slice(idx, idx + 3500);
  const dur = /Duration:[^\n]+\n/i.exec(slice);
  if (!dur) return norm(slice.slice(0, 400));
  const after = slice.slice(dur.index + dur[0].length);
  const next = after.search(
    new RegExp(`\\n[A-Z][A-Za-z0-9'’\\- /]+\\n(?:${schools} Cantrip|Level \\d+ ${schools})`),
  );
  let body = next === -1 ? after : after.slice(0, next);
  body = body.replace(/9\/11\/24.*/s, '').replace(/ARTIST:[^\n]+/gi, '');
  return norm(body);
}

function appDescFor(spellName) {
  const esc = spellName.replace(/'/g, "\\'");
  const re = new RegExp(
    `name:\\s*'${spellName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "\\\\'")}'[\\s\\S]*?description:\\s*'((?:\\\\'|[^'])*)'`,
  );
  const alt = spellsTs.match(
    new RegExp(`name:\\s*'${spellName.replace(/'/g, "\\\\'")}'[\\s\\S]*?description:\\s*'((?:\\\\\\\\'|[^'])*)'`),
  );
  const mm = spellsTs.match(re) || alt;
  if (!mm) return '';
  return norm(mm[1].replace(/\\'/g, "'"));
}

let descMismatches = [];
for (const n of appNames) {
  if (!pdfNames.has(canonName(n))) continue;
  const pb = pdfBodyFor(n);
  const ab = appDescFor(n);
  if (!pb || !ab) continue;
  if (!pb.includes(ab.slice(0, Math.min(50, ab.length))) && !ab.includes(pb.slice(0, Math.min(50, pb.length)))) {
    descMismatches.push(n);
  }
}

descMismatches = descMismatches.slice(0, 40);

console.log('=== PHB 2024 PDF extract vs src/data/spells.ts ===\n');
console.log(`App spell count: ${appNames.size}`);
console.log(`PDF parsed spell headers (pages ~454–620): ${pdfNames.size}\n`);

console.log('--- In app but not found as PHB spell header (name mismatch or not in parsed range) ---');
console.log(inAppNotPdf.length ? inAppNotPdf.sort().join('\n') : '(none)');
console.log('\n--- In parsed PHB headers but not in app ---');
console.log(inPdfNotApp.length ? inPdfNotApp.sort().join('\n') : '(none)');

console.log('\n--- Sample description text drift (first ~40 mismatches by heuristic) ---');
for (const n of descMismatches.slice(0, 12)) {
  console.log('\n* ' + n);
  console.log('  PDF≈: ' + pdfBodyFor(n).slice(0, 180) + '…');
  console.log('  App≈: ' + appDescFor(n).slice(0, 180) + '…');
}

console.log('\n--- Heuristic mismatch count (rough): ' + descMismatches.length + ' shown of many ---');

/**
 * Extract SpellTemplate[] + class map from docs/rules-from-pdf.json (PHB 2024 spell chapter).
 * Writes src/data/spellListPhb2024.json and src/data/spellClassMapPhb2024.json
 *
 * Run: node scripts/generate-spells-from-phb.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const schools =
  '(?:Evocation|Abjuration|Conjuration|Divination|Enchantment|Illusion|Necromancy|Transmutation)';

function canon(s) {
  return s
    .replace(/\u0000/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .trim();
}

function footnoteStrip(s) {
  return s.replace(/\n9\/11\/24[\s\S]*$/m, '').replace(/ARTIST:[^\n]*/gi, '').trim();
}

/** Map PHB casting line to sheet-style label */
function mapCastingTime(raw) {
  const t = raw.replace(/^Casting Time:\s*/i, '').trim();
  if (/or\s+Ritual/i.test(t)) return t.replace(/\bAction\b/i, '1 Action').replace(/\bminute\b/i, 'Minute');
  if (/^Action$/i.test(t)) return '1 Action';
  if (/^Bonus Action/i.test(t)) return '1 Bonus Action';
  if (/^Reaction/i.test(t)) return '1 Reaction';
  if (/^1 action$/i.test(t)) return '1 Action';
  if (/^10 minutes?$/i.test(t)) return '10 Minutes';
  if (/^1 minute$/i.test(t)) return '1 Minute';
  if (/^1 hour$/i.test(t)) return '1 Hour';
  if (/^24 hours$/i.test(t)) return '24 Hours';
  if (/^8 hours$/i.test(t)) return '8 Hours';
  return t.replace(/\bAction\b/g, (m) => (m === 'Action' ? '1 Action' : m));
}

function mapRange(raw) {
  const r = raw.replace(/^Range:\s*/i, '').trim();
  return r
    .replace(/\bfeet\b/gi, 'ft')
    .replace(/\bfoot\b/gi, 'ft')
    .replace(/\bmile\b/gi, 'mile')
    .replace(/\bmiles\b/gi, 'miles');
}

function parseComponents(line) {
  const m = line.match(/^(?:Components?):\s*(.+)$/i);
  if (!m) return { v: false, s: false, m: false };
  const raw = m[1].trim();
  const head = raw.split('(')[0];
  return {
    v: /\bV\b/.test(head),
    s: /\bS\b/.test(head),
    m: /\bM\b/.test(head),
  };
}

function parseLevelSchool(line) {
  const c = canon(line);
  const cant = new RegExp(`^${schools} Cantrip`, 'i').exec(c);
  if (cant) return { level: 0, school: cant[1] };
  const lev = new RegExp(`^Level (\\d+) ${schools}`, 'i').exec(c);
  if (lev) return { level: parseInt(lev[1], 10), school: lev[2] };
  return null;
}

function parseClasses(paren) {
  const inner = paren.replace(/^\(|\)$/g, '');
  return inner
    .split(',')
    .map((x) => canon(x.trim()))
    .filter(Boolean);
}

function buildBlob(json) {
  /** Prefer `fullText` so spell prose split across page breaks stays reachable */
  if (json.fullText && json.fullText.length > 10000) {
    const ft = json.fullText;
    const start = ft.search(/\nAcid Splash\nEvocation Cantrip/);
    const end = ft.search(/\nAppendix A:|\nRules Glossary\n/);
    if (start !== -1 && end !== -1 && end > start) return ft.slice(start, end);
  }
  const pages = json.pages || [];
  let blob = '';
  for (const p of pages) {
    if (p.page >= 454 && p.page <= 680) blob += '\n' + (p.text || '');
  }
  return blob;
}

function splitSpells(blob) {
  const headerRe = new RegExp(
    `\\n([A-Z][A-Za-z0-9'’ /\\-]{1,78})\\n(${schools} Cantrip|Level \\d+ ${schools})\\s*(\\([^)]+\\))`,
    'g',
  );
  const matches = [];
  let m;
  while ((m = headerRe.exec(blob)) !== null) {
    const name = canon(m[1]);
    if (/^(Casting Time|Range|Components|Duration|Using a Higher)/i.test(name)) continue;
    if (name.length > 70) continue;
    const meta = parseLevelSchool(m[2]);
    if (!meta) continue;
    matches.push({
      name,
      level: meta.level,
      metaLine: m[2] + ' ' + m[3],
      classes: parseClasses(m[3]),
      start: m.index,
      end: 0,
    });
  }
  for (let i = 0; i < matches.length; i++) {
    matches[i].end = i + 1 < matches.length ? matches[i + 1].start : blob.length;
  }
  return matches;
}

function parseBlock(blob, spell) {
  const slice = blob.slice(spell.start, spell.end);
  const lines = slice.split('\n').slice(2);
  let castingTime = '1 Action';
  let range = 'Self';
  let compLine = 'V';
  let duration = 'Instantaneous';
  let descLines = [];
  let phase = 'head';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^Casting Time:/i.test(line)) {
      castingTime = mapCastingTime(line);
      continue;
    }
    if (/^Range:/i.test(line)) {
      range = mapRange(line);
      continue;
    }
    if (/^Components?:/i.test(line)) {
      compLine = line;
      continue;
    }
    if (/^Duration:/i.test(line)) {
      duration = line.replace(/^Duration:\s*/i, '').trim();
      phase = 'desc';
      continue;
    }
    if (phase === 'desc') {
      if (/^Using a Higher-Level Spell Slot/i.test(line) || /^Cantrip Upgrade/i.test(line)) {
        descLines.push(line);
        continue;
      }
      if (/^9\/11\/24/.test(line)) continue;
      if (/^-- \d+ of \d+ --$/.test(line.trim())) continue;
      if (/^https:\/\//i.test(line)) continue;
      if (/^ARTIST:/i.test(line)) continue;
      if (/^[A-Z][A-Z\s]{2,40}$/.test(line.trim()) && !line.includes('.')) continue;
      descLines.push(line);
    }
  }

  let description = footnoteStrip(descLines.join('\n'))
    .replace(/\u0000/g, '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const isRitual = /Ritual/i.test(castingTime) || /or\s+Ritual/i.test(lines.join('\n'));
  const isConcentration = /^Concentration/i.test(duration);

  return {
    name: spell.name,
    level: spell.level,
    castingTime,
    range,
    components: parseComponents(compLine),
    isRitual,
    isConcentration,
    description,
  };
}

/** Union Artificer (and keep extras) from legacy spellClasses.ts */
function mergeArtificer(legacyPath, classMap) {
  const txt = fs.readFileSync(legacyPath, 'utf8');
  const re = /'((?:\\'|[^'])+)':\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(txt)) !== null) {
    const name = m[1].replace(/\\'/g, "'");
    if (!/\bArtificer\b/.test(m[2])) continue;
    if (!classMap[name]) classMap[name] = [];
    if (!classMap[name].includes('Artificer')) classMap[name].push('Artificer');
  }
}

function main() {
  const json = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'rules-from-pdf.json'), 'utf8'));
  const blob = buildBlob(json);
  const spellsMeta = splitSpells(blob);
  const seen = new Map();
  const spells = [];
  const classMap = {};

  for (const sm of spellsMeta) {
    const tmpl = parseBlock(blob, sm);
    if (!tmpl.description || tmpl.description.length < 12) continue;
    if (seen.has(tmpl.name)) continue;
    seen.set(tmpl.name, true);
    spells.push(tmpl);
    classMap[tmpl.name] = [...new Set(sm.classes)].sort();
  }

  mergeArtificer(path.join(root, 'src', 'data', 'spellClasses.ts'), classMap);

  spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  fs.writeFileSync(
    path.join(root, 'src', 'data', 'spellListPhb2024.json'),
    JSON.stringify(spells, null, 2),
    'utf8',
  );
  fs.writeFileSync(
    path.join(root, 'src', 'data', 'spellClassMapPhb2024.json'),
    JSON.stringify(classMap, null, 2),
    'utf8',
  );

  console.log('Wrote', spells.length, 'spells and', Object.keys(classMap).length, 'class map entries');
}

main();

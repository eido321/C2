/**
 * Extract per-level class features from docs/rules-from-pdf.json fullText.
 * Writes:
 *   - src/data/classFeaturesLevelPhb2024.json (matches levelData CLASS_FEATURES; keys "1".."20")
 *
 * The Feature Library builds one entry per row from this file (see `src/data/classFeatures2024.ts`).
 *
 * Run: node scripts/generate-class-features-from-phb.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const PHB_CLASSES = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard',
];

const CHAPTER4 = 'Chapter 4: Character Origins';

function canon(s) {
  return s.replace(/\u0000/g, '').replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim();
}

function cleanBody(raw) {
  return raw
    .replace(/\u0000/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      if (/^9\/11\/24/.test(t)) return false;
      if (/^https:\/\//i.test(t)) return false;
      if (/^Player.s Handbook$/i.test(t)) return false;
      if (/^-- \d+ of \d+ --$/.test(t)) return false;
      if (/^ARTIST:/i.test(t)) return false;
      if (/^\u0000+$/.test(t)) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Drop "Multiclass OtherClass" appendix glued before the next class header */
function trimMulticlassGlue(slice, className) {
  const needle = '\nMulticlass ';
  let idx = slice.indexOf(needle);
  while (idx !== -1) {
    const after = slice.slice(idx + needle.length, idx + needle.length + 30);
    if (after.startsWith(className)) {
      idx = slice.indexOf(needle, idx + 1);
      continue;
    }
    return slice.slice(0, idx);
  }
  return slice;
}

/** PHB layout: detailed subclass chapters repeat "Level N:" headers — cut before first all-caps "… SUBCLASS" line */
function trimSubclassAppendix(slice) {
  const re = /\n[A-Z0-9][A-Z0-9\s'\-,]* SUBCLASS\r?\n/;
  const m = slice.match(re);
  if (m && m.index !== undefined) return slice.slice(0, m.index);
  return slice;
}

/**
 * PHB adds a “{Class} Subclasses” overview after the capstone — keep it out of the last feature’s body.
 * Ignore early occurrences (e.g. TOC) by only trimming when the marker appears after high-level features.
 */
function trimSubclassIntro(slice, className) {
  const marker = `\n${className} Subclasses\n`;
  const idx = slice.indexOf(marker);
  if (idx === -1) return slice;
  const level20 = slice.indexOf('\nLevel 20:');
  if (level20 !== -1 && idx > level20) return slice.slice(0, idx);
  const level19 = slice.indexOf('\nLevel 19:');
  if (level19 !== -1 && idx > level19) return slice.slice(0, idx);
  return slice;
}

function extractClassSlice(fullText, className, nextAnchor) {
  const startKey = `${className} Class Features`;
  const start = fullText.indexOf(startKey);
  if (start === -1) throw new Error(`Missing section: ${startKey}`);
  const endKey = nextAnchor ?? CHAPTER4;
  const end = fullText.indexOf(endKey, start + 1);
  if (end === -1) throw new Error(`Missing end anchor after ${className}`);
  let slice = fullText.slice(start, end);
  slice = trimMulticlassGlue(slice, className);
  slice = trimSubclassAppendix(slice);
  slice = trimSubclassIntro(slice, className);
  return slice;
}

/**
 * Parse the "Class Features" column from the PHB features table (handles wrapped rows).
 * Returns level → list of feature name fragments from the table (comma-separated).
 */
function parseFeaturesTable(slice, className) {
  const marker = `${className} Features\n`;
  const start = slice.indexOf(marker);
  if (start === -1) return null;
  const from = start + marker.length;
  const level1 = slice.indexOf('\nLevel 1:', from);
  if (level1 === -1) return null;
  const block = slice.slice(from, level1).replace(/\u0000/g, '');
  const rows = [];
  const newRow = /^(\d+) \t\+(\d+) \t(.*)$/;
  let cur = null;

  for (const rawLine of block.split(/\n/)) {
    const line = rawLine.replace(/\u0000/g, '').trimEnd();
    if (!line) continue;

    const m = line.match(newRow);
    if (m) {
      if (cur) rows.push(cur);
      cur = { level: parseInt(m[1], 10), feats: m[3] };
      continue;
    }
    if (!cur) continue;
    // Bardic die / slot grid (not part of the Class Features cell)
    if (/^D\d+ \t\d/.test(line)) continue;
    // Spell-slot / numeric grid tail (not part of class feature names)
    if (/^\d+ \t\d/.test(line) && !/[A-Za-z]{4,}/.test(line)) continue;
    if (/^Level/i.test(line) && !line.includes('\t+')) continue;
    if (/^Bonus Class Features/i.test(line)) continue;
    if (/^Spells?\s*\d/i.test(line)) continue;

    cur.feats += (cur.feats.endsWith(' ') ? '' : ' ') + line.trim();
  }
  if (cur) rows.push(cur);

  /** Strip numeric columns (Rages, Rage Damage, Weapon Mastery, etc.) left in the Class Features cell */
  function stripTrailingStatColumns(featsCell) {
    const chunk = /(?: \t\d+| \t\+\d+)+$/;
    return featsCell.trimEnd().replace(chunk, '').trim();
  }

  const byLevel = {};
  for (const { level, feats } of rows) {
    const cell = stripTrailingStatColumns(feats);
    const parts = cell
      .split(',')
      .map((s) => canon(s.trim()))
      .filter((p) => p && p !== '—' && p !== '–');
    if (parts.length) byLevel[level] = parts;
  }
  return byLevel;
}

function normName(s) {
  return canon(s)
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameMatchesTablePart(parsedName, tablePart) {
  const p = normName(parsedName);
  const t = normName(tablePart);
  if (!p || !t) return false;
  if (p === t) return true;
  if (t.includes(p) || p.includes(t)) return true;
  const pw = p.split(/\s+/)[0];
  const tw = t.split(/\s+/)[0];
  if (pw.length >= 4 && tw.length >= 4 && (t.startsWith(p) || p.startsWith(t))) return true;
  return false;
}

const SUBCLASS_GENERIC_ROW = /^subclass feature$/i;

/** Parsed feature rows must align with the printed features table (strips subclass previews before the appendix). */
function filterParsedByTable(byLevel, table) {
  if (!table) return byLevel;

  const out = {};
  for (const [key, list] of Object.entries(byLevel)) {
    const level = parseInt(key, 10);
    const parts = table[level];
    if (!parts || parts.length === 0) {
      out[key] = list;
      continue;
    }

    const hasSubclassRow = parts.some((p) => SUBCLASS_GENERIC_ROW.test(canon(p).trim()));
    const explicitParts = parts.filter((p) => !SUBCLASS_GENERIC_ROW.test(canon(p).trim()));

    const kept = list.filter((f) => {
      const fn = normName(f.name);
      if (!fn) return false;

      for (const ex of explicitParts) {
        if (nameMatchesTablePart(f.name, ex)) return true;
      }

      // "Subclass feature" table rows: do not keep leaked subclass-only headers (e.g. Archfey "Misty Escape" at Warlock 6).
      if (hasSubclassRow && explicitParts.length === 0) return false;

      if (hasSubclassRow && /\bsubclass\b/i.test(f.name)) return true;

      return false;
    });

    if (kept.length > 0) out[key] = kept;
    else if (hasSubclassRow && explicitParts.length === 0) out[key] = [];
    else out[key] = list;
  }
  return out;
}

/** Strips the class spell list when the PDF parser glued it into the last feature block. */
function trimTrailingClassSpellList(desc, className) {
  if (!desc || !className) return desc;
  let cut = -1;
  for (const sep of ['\n', '\r\n']) {
    const needle = `${sep}${className} Spell List${sep}`;
    const i = desc.indexOf(needle);
    if (i !== -1 && (cut === -1 || i < cut)) cut = i;
  }
  if (cut === -1) return desc;
  return desc.slice(0, cut).trim();
}

function parseLevelFeatures(slice, className) {
  const re = /\nLevel (\d+):\s*([^\r\n]+)\r?\n/g;
  const matches = [...slice.matchAll(re)];
  const byLevel = {};

  for (let i = 0; i < matches.length; i++) {
    const level = parseInt(matches[i][1], 10);
    const name = canon(matches[i][2]);
    const bodyStart = matches[i].index + matches[i][0].length;
    const bodyEnd = i + 1 < matches.length ? matches[i + 1].index : slice.length;
    let desc = cleanBody(slice.slice(bodyStart, bodyEnd));
    desc = trimTrailingClassSpellList(desc, className);
    if (!desc) desc = '—';

    const key = String(level);
    if (!byLevel[key]) byLevel[key] = [];
    byLevel[key].push({ name, desc });
  }

  return byLevel;
}

const ARTIFICER_LEVEL = {
  1: [
    {
      name: 'Magical Tinkering',
      desc: "You can use Thieves' Tools or Artisan's Tools to infuse a Tiny nonmagical object with one of the following magical properties: (a) emit bright light in a 5-ft. radius, (b) emit a recorded message when touched, (c) emit a continuous odor, or (d) display a static image or symbol. You can have up to INT modifier such items active at once.",
    },
    {
      name: 'Spellcasting',
      desc: "You use INT as your spellcasting ability. You prepare your spells from the Artificer spell list each Long Rest; prepared spells = INT modifier + half your Artificer level (rounded up, minimum 1). You can use Thieves' Tools or an Artisan's Tool as a spellcasting focus. You can cast Artificer rituals from your list without having them prepared.",
    },
  ],
  2: [
    {
      name: 'Infuse Item',
      desc: 'After a Long Rest you can imbue nonmagical items with magic. You begin with 4 Infusions Known and can have 2 active simultaneously (one per item). You can replace a known infusion on each Long Rest. Infusions end when you die or infuse a new item beyond your active limit.',
    },
  ],
  3: [
    {
      name: 'Artificer Specialist',
      desc: 'Choose your specialization: Alchemist (create potions and elixirs), Armorer (magical powered suits), Artillerist (magical cannons), or Battle Smith (mechanical Steel Defender companion). Each grants bonus spells, tool proficiency, and class features.',
    },
    {
      name: 'The Right Tool for the Job',
      desc: "With 1 hour of work and any Artisan's Tools, you can magically create a set of Artisan's Tools in an unoccupied space within 5 feet of you. The tools vanish when you use this feature again.",
    },
  ],
  4: [
    {
      name: 'Ability Score Improvement',
      desc: 'Increase one ability score by 2, or two ability scores by 1 each. No score can exceed 20. Alternatively, take a feat for which you qualify.',
    },
  ],
  5: [
    {
      name: 'Arcane Jolt',
      desc: 'When your magic-weapon or Steel Defender hits a creature, you can channel magical energy: deal an extra 2d6 Force damage to the target, OR restore 2d6 HP to another creature within 30 ft. that you can see. Once per turn. Uses = INT modifier/Long Rest.',
    },
  ],
  6: [
    {
      name: 'Tool Expertise',
      desc: "Your Proficiency Bonus is doubled for any ability check that uses Artisan's Tools or Thieves' Tools you are proficient with.",
    },
    {
      name: 'Flash of Genius',
      desc: 'Reaction (when you or a creature within 30 ft. makes an ability check or saving throw): add your INT modifier to the roll. Uses = INT modifier/Long Rest.',
    },
  ],
  7: [
    {
      name: 'Specialist Feature',
      desc: 'Your Artificer Specialist subclass grants an additional feature at this level.',
    },
  ],
  8: [
    {
      name: 'Ability Score Improvement',
      desc: 'Increase one ability score by 2, or two ability scores by 1 each (max 20). Or take a feat.',
    },
  ],
  9: [
    {
      name: 'Arcane Jolt Improvement',
      desc: 'Arcane Jolt now deals 4d6 Force damage or restores 4d6 HP.',
    },
  ],
  10: [
    {
      name: 'Magic Item Adept',
      desc: 'You can attune to up to 4 magic items simultaneously. If you craft a Common or Uncommon magic item, it takes you a quarter of the normal time and costs half the normal gold.',
    },
  ],
  11: [
    {
      name: 'Spell-Storing Item',
      desc: 'After a Long Rest, you can store one Artificer spell of 1st or 2nd level in a nonmagical item (weapon or spellcasting focus). The spell must require 1 Action to cast and have no material cost. Any creature holding the item can use an Action to cast the spell (INT as ability), expending the stored use. You can store a total of 2 × INT modifier uses before Long Resting.',
    },
  ],
  12: [
    {
      name: 'Ability Score Improvement',
      desc: 'Increase one ability score by 2, or two ability scores by 1 each (max 20). Or take a feat.',
    },
  ],
  14: [
    {
      name: 'Magic Item Savant',
      desc: 'Attune to up to 5 magic items. You ignore class, race, spell, and level requirements on attuning to or using a magic item.',
    },
  ],
  15: [
    {
      name: 'Specialist Feature',
      desc: 'Your Artificer Specialist subclass grants an additional feature at this level.',
    },
  ],
  16: [
    {
      name: 'Ability Score Improvement',
      desc: 'Increase one ability score by 2, or two ability scores by 1 each (max 20). Or take a feat.',
    },
  ],
  18: [
    {
      name: 'Magic Item Master',
      desc: 'Attune to up to 6 magic items simultaneously.',
    },
  ],
  19: [
    {
      name: 'Ability Score Improvement',
      desc: 'Increase one ability score by 2, or two ability scores by 1 each (max 20). Or take a feat.',
    },
  ],
  20: [
    {
      name: 'Soul of Artifice',
      desc: "You gain +1 to all saving throws for each magic item you are attuned to. Additionally, when you are reduced to 0 HP but not killed outright, you can use your Reaction to end one of your Artificer infusions, dropping to 1 HP instead (1/day).",
    },
  ],
};

function main() {
  const json = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'rules-from-pdf.json'), 'utf8'));
  const fullText = json.fullText;
  if (!fullText || fullText.length < 100000) {
    throw new Error('rules-from-pdf.json missing fullText');
  }

  const levelOut = { Artificer: ARTIFICER_LEVEL };

  for (let i = 0; i < PHB_CLASSES.length; i++) {
    const c = PHB_CLASSES[i];
    const next = i + 1 < PHB_CLASSES.length ? `${PHB_CLASSES[i + 1]} Class Features` : CHAPTER4;
    const slice = extractClassSlice(fullText, c, next);
    const table = parseFeaturesTable(slice, c);
    levelOut[c] = filterParsedByTable(parseLevelFeatures(slice, c), table);
  }

  fs.writeFileSync(
    path.join(root, 'src', 'data', 'classFeaturesLevelPhb2024.json'),
    JSON.stringify(levelOut, null, 2),
    'utf8',
  );

  console.log('Wrote class features for', Object.keys(levelOut).length, 'classes');
  for (const c of PHB_CLASSES) {
    const lv = Object.keys(levelOut[c]).length;
    const blocks = Object.values(levelOut[c]).reduce((a, x) => a + x.length, 0);
    console.log(`  ${c}: ${lv} levels, ${blocks} feature rows`);
  }
}

main();

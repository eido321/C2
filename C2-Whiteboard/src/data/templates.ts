import type {
  Block,
  BlockBase,
  BlockContentMap,
  BlockStyle,
  BlockType,
  SpellEntry,
  SpellLevelGroup,
  WhiteboardTemplate,
} from '@/types';
import {abilityModifier, uid} from '@/lib/utils';

function mk<T extends BlockType>(
  type: T,
  rect: {x: number; y: number; width: number; height: number},
  content: BlockContentMap[T],
  style?: BlockStyle,
): BlockBase<T> {
  return {id: uid(), type, rotation: 0, ...rect, style, content};
}

// ── Shared layout grid ────────────────────────────────────────────────────
// A wide main column (four stat cells across) plus a right sidebar for
// portrait, proficiencies, attacks, gear and notes. Sections stack via a
// vertical cursor so spacing stays consistent and blocks never overlap.
const MAIN_X = 60;
const STAT_W = 135;
const STAT_H = 108;
const STAT_GAP = 15;
const MAIN_W = STAT_W * 4 + STAT_GAP * 3; // 585
const COL_GAP = 15;
const HALF_W = (MAIN_W - COL_GAP) / 2; // 285
const RIGHT_X = MAIN_X + MAIN_W + 30; // 675
const RIGHT_W = 320;
const TOP_Y = 40;

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
const ABILITY_ORDER: [AbilityKey, string][] = [
  ['str', 'STR'],
  ['dex', 'DEX'],
  ['con', 'CON'],
  ['int', 'INT'],
  ['wis', 'WIS'],
  ['cha', 'CHA'],
];
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const PROFICIENCY = 2;

interface BuiltAbilities {
  abilities: {key: string; label: string; score: number}[];
  mod: Record<AbilityKey, number>;
}

/**
 * Assign the standard array by class priority, then apply the 2024 background
 * ability boosts (+2 to the top priority, +1 to the second). This keeps the
 * displayed scores and every derived value (AC, HP, DC…) internally consistent.
 */
function buildAbilities(priority: AbilityKey[]): BuiltAbilities {
  const score = {} as Record<AbilityKey, number>;
  ABILITY_ORDER.forEach(([key]) => (score[key] = 10));
  priority.forEach((key, i) => (score[key] = STANDARD_ARRAY[i] ?? 10));
  if (priority[0]) score[priority[0]] += 2;
  if (priority[1]) score[priority[1]] += 1;

  const mod = {} as Record<AbilityKey, number>;
  (Object.keys(score) as AbilityKey[]).forEach((key) => (mod[key] = abilityModifier(score[key])));

  return {
    abilities: ABILITY_ORDER.map(([key, label]) => ({key, label, score: score[key]})),
    mod,
  };
}

const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

// ── Armour class model ──────────────────────────────────────────────────────
type Defense =
  | {kind: 'armor'; label: string; base: number; addDex: boolean; maxDex?: number; shield?: boolean}
  | {kind: 'unarmored'; label: string; second: AbilityKey; shield?: boolean};

function computeAc(def: Defense, mod: Record<AbilityKey, number>): {ac: number; hint: string} {
  if (def.kind === 'unarmored') {
    return {ac: 10 + mod.dex + mod[def.second] + (def.shield ? 2 : 0), hint: def.label};
  }
  let dex = def.addDex ? mod.dex : 0;
  if (def.maxDex !== undefined) dex = Math.min(dex, def.maxDex);
  return {ac: def.base + dex + (def.shield ? 2 : 0), hint: def.label};
}

const HIT_DIE_MAX = {d6: 6, d8: 8, d10: 10, d12: 12} as const;
type HitDie = keyof typeof HIT_DIE_MAX;

// ── Section helpers ─────────────────────────────────────────────────────────
interface StatDef {
  label: string;
  value: string;
  hint?: string;
}

function sectionHeader(y: number, text: string, accent: string): Block {
  return mk('heading', {x: MAIN_X, y, width: MAIN_W, height: 30}, {text, subtitle: ''}, {
    fontSize: 17,
    align: 'left',
    color: accent,
  });
}

function statRow(y: number, stats: StatDef[]): Block[] {
  return stats.map((s, i) =>
    mk(
      'statBlock',
      {x: MAIN_X + i * (STAT_W + STAT_GAP), y, width: STAT_W, height: STAT_H},
      {label: s.label, value: s.value, hint: s.hint ?? ''},
      {showBorder: true, align: 'center'},
    ),
  );
}

// ── Resolved sheet data → concrete blocks ───────────────────────────────────
interface SpellData {
  dc: string;
  attack: string;
  ability: string;
  countLabel: string;
  count: string;
  slots: string[];
  /** Number of 1st-level (or Pact) slots, derived from the slot line. */
  slotsL1: number;
  cantrips: string[];
  spellsTitle: string;
  spells: string[];
}

const SPELL_DETAILS: Record<
  string,
  Partial<Pick<SpellEntry, 'school' | 'castingTime' | 'range' | 'material' | 'duration' | 'concentration' | 'ritual' | 'attackSave' | 'damageEffect' | 'source' | 'description' | 'notes'>>
> = {
  'Vicious Mockery': {
    school: 'Enchantment',
    range: '60 ft',
    duration: 'Instant',
    attackSave: 'WIS save',
    damageEffect: 'Psychic damage + disadvantage',
    source: 'PHB',
  },
  Prestidigitation: {school: 'Transmutation', range: '10 ft', duration: 'Up to 1 hour', damageEffect: 'Minor magical effect', source: 'PHB'},
  'Healing Word': {school: 'Abjuration', castingTime: 'Bonus action', range: '60 ft', duration: 'Instant', damageEffect: 'Heal 2d4 + mod', source: 'PHB'},
  'Faerie Fire': {school: 'Evocation', range: '60 ft', duration: 'Concentration, 1 minute', concentration: true, attackSave: 'DEX save', damageEffect: 'Advantage vs outlined creatures', source: 'PHB'},
  'Dissonant Whispers': {school: 'Enchantment', range: '60 ft', duration: 'Instant', attackSave: 'WIS save', damageEffect: 'Psychic damage + reaction move', source: 'PHB'},
  'Charm Person': {school: 'Enchantment', range: '30 ft', duration: '1 hour', attackSave: 'WIS save', damageEffect: 'Charmed humanoid', source: 'PHB'},
  Heroism: {school: 'Enchantment', range: 'Touch', duration: 'Concentration, 1 minute', concentration: true, damageEffect: 'Temp HP each turn; immune frightened', source: 'PHB'},
  'Tasha’s Hideous Laughter': {school: 'Enchantment', range: '30 ft', duration: 'Concentration, 1 minute', concentration: true, attackSave: 'WIS save', damageEffect: 'Prone/incapacitated laughing', source: 'PHB'},
  'Sacred Flame': {school: 'Evocation', range: '60 ft', duration: 'Instant', attackSave: 'DEX save', damageEffect: 'Radiant damage', source: 'PHB'},
  Guidance: {school: 'Divination', range: 'Touch', duration: 'Concentration, 1 minute', concentration: true, damageEffect: '+1d4 ability check', source: 'PHB'},
  Thaumaturgy: {school: 'Transmutation', range: '30 ft', duration: '1 minute', damageEffect: 'Minor divine wonder', source: 'PHB'},
  'Cure Wounds': {school: 'Abjuration', range: 'Touch', duration: 'Instant', damageEffect: 'Heal 2d8 + mod', source: 'PHB'},
  Bless: {school: 'Enchantment', range: '30 ft', duration: 'Concentration, 1 minute', concentration: true, damageEffect: '+1d4 attacks/saves to 3 creatures', source: 'PHB'},
  'Guiding Bolt': {school: 'Evocation', range: '120 ft', duration: '1 round', attackSave: 'Ranged spell attack', damageEffect: 'Radiant damage; next attack advantage', source: 'PHB'},
  'Shield of Faith': {school: 'Abjuration', castingTime: 'Bonus action', range: '60 ft', duration: 'Concentration, 10 minutes', concentration: true, damageEffect: '+2 AC', source: 'PHB'},
  'Detect Magic': {school: 'Divination', range: 'Self', duration: 'Concentration, 10 minutes', concentration: true, ritual: true, damageEffect: 'Sense magic within 30 ft', source: 'PHB'},
  Druidcraft: {school: 'Transmutation', range: '30 ft', duration: 'Instant', damageEffect: 'Minor nature effect', source: 'PHB'},
  'Produce Flame': {school: 'Conjuration', range: 'Self', duration: '10 minutes', attackSave: 'Ranged spell attack', damageEffect: 'Fire damage / light', source: 'PHB'},
  Entangle: {school: 'Conjuration', range: '90 ft', duration: 'Concentration, 1 minute', concentration: true, attackSave: 'STR save', damageEffect: 'Restrained in 20-ft square', source: 'PHB'},
  Thunderwave: {school: 'Evocation', range: 'Self', duration: 'Instant', attackSave: 'CON save', damageEffect: 'Thunder damage + push', source: 'PHB'},
  'Speak with Animals': {school: 'Divination', range: 'Self', duration: '10 minutes', ritual: true, damageEffect: 'Communicate with beasts', source: 'PHB'},
  Command: {school: 'Enchantment', range: '60 ft', duration: '1 round', attackSave: 'WIS save', damageEffect: 'One-word command', source: 'PHB'},
  'Searing Smite': {school: 'Evocation', castingTime: 'Bonus action', range: 'Self', duration: 'Concentration, 1 minute', concentration: true, damageEffect: 'Weapon hit adds fire; ongoing burn', source: 'PHB'},
  'Compelled Duel': {school: 'Enchantment', castingTime: 'Bonus action', range: '30 ft', duration: 'Concentration, 1 minute', concentration: true, attackSave: 'WIS save', damageEffect: 'Target drawn to duel you', source: 'PHB'},
  "Hunter's Mark": {school: 'Divination', castingTime: 'Bonus action', range: '90 ft', duration: 'Concentration, 1 hour', concentration: true, damageEffect: '+1d6 weapon damage; track target', source: 'PHB'},
  "Hunter's Mark (always)": {school: 'Divination', castingTime: 'Bonus action', range: '90 ft', duration: 'Concentration, 1 hour', concentration: true, damageEffect: '+1d6 weapon damage; always prepared', source: 'PHB'},
  'Ensnaring Strike': {school: 'Conjuration', castingTime: 'Bonus action', range: 'Self', duration: 'Concentration, 1 minute', concentration: true, attackSave: 'STR save', damageEffect: 'Restrained by vines', source: 'PHB'},
  'Hail of Thorns': {school: 'Conjuration', castingTime: 'Bonus action', range: 'Self', duration: 'Concentration, 1 minute', concentration: true, attackSave: 'DEX save', damageEffect: 'Thorn burst after ranged hit', source: 'PHB'},
  'Fog Cloud': {school: 'Conjuration', range: '120 ft', duration: 'Concentration, 1 hour', concentration: true, damageEffect: 'Heavily obscured fog sphere', source: 'PHB'},
  'Fire Bolt': {school: 'Evocation', range: '120 ft', duration: 'Instant', attackSave: 'Ranged spell attack', damageEffect: 'Fire damage', source: 'PHB'},
  'Mage Hand': {school: 'Conjuration', range: '30 ft', duration: '1 minute', damageEffect: 'Spectral hand manipulates objects', source: 'PHB'},
  'Minor Illusion': {school: 'Illusion', range: '30 ft', duration: '1 minute', damageEffect: 'Sound or image illusion', source: 'PHB'},
  Shield: {school: 'Abjuration', castingTime: 'Reaction', range: 'Self', duration: '1 round', damageEffect: '+5 AC; blocks Magic Missile', source: 'PHB'},
  'Magic Missile': {school: 'Evocation', range: '120 ft', duration: 'Instant', damageEffect: 'Force darts; automatic hits', source: 'PHB'},
  'Chromatic Orb': {school: 'Evocation', range: '90 ft', duration: 'Instant', attackSave: 'Ranged spell attack', damageEffect: 'Elemental damage', source: 'PHB'},
  'Burning Hands': {school: 'Evocation', range: 'Self', duration: 'Instant', attackSave: 'DEX save', damageEffect: 'Fire cone', source: 'PHB'},
  'Eldritch Blast': {school: 'Evocation', range: '120 ft', duration: 'Instant', attackSave: 'Ranged spell attack', damageEffect: 'Force beam', source: 'PHB'},
  Hex: {school: 'Enchantment', castingTime: 'Bonus action', range: '90 ft', duration: 'Concentration, 1 hour', concentration: true, damageEffect: '+1d6 necrotic; ability check penalty', source: 'PHB'},
  'Armor of Agathys': {school: 'Abjuration', range: 'Self', duration: '1 hour', damageEffect: 'Temp HP; cold retaliation', source: 'PHB'},
  'Arms of Hadar': {school: 'Conjuration', range: 'Self', duration: 'Instant', attackSave: 'STR save', damageEffect: 'Necrotic burst; no reactions', source: 'PHB'},
  'Witch Bolt': {school: 'Evocation', range: '30 ft', duration: 'Concentration, 1 minute', concentration: true, attackSave: 'Ranged spell attack', damageEffect: 'Lightning link; repeat damage', source: 'PHB'},
  Sleep: {school: 'Enchantment', range: '60 ft', duration: '1 minute', damageEffect: 'Unconscious creatures by HP pool', source: 'PHB'},
  'Feather Fall': {school: 'Transmutation', castingTime: 'Reaction', range: '60 ft', duration: '1 minute', damageEffect: 'Slow falling creatures', source: 'PHB'},
  'Mage Armor': {school: 'Abjuration', range: 'Touch', duration: '8 hours', damageEffect: 'Base AC 13 + DEX', source: 'PHB'},
};

interface SheetData {
  accent: string;
  title: string;
  subtitle: string;
  abilities: {key: string; label: string; score: number}[];
  vitals1: [StatDef, StatDef, StatDef, StatDef];
  vitals2: [StatDef, StatDef, StatDef, StatDef];
  resourceHeader?: string;
  resources?: StatDef[];
  featuresTitle: string;
  features: string[];
  secondList: {title: string; items: string[]};
  spell?: SpellData;
  sidebar: {
    details: string[];
    proficiencies: string[];
    attacks: string[];
    equipment: string[];
    notes: string;
  };
}

function renderSheet(data: SheetData): Block[] {
  const blocks: Block[] = [];
  const cur = {y: TOP_Y};
  const list = (x: number, y: number, w: number, h: number, title: string, items: string[]) =>
    mk('list', {x, y, width: w, height: h}, {title, ordered: false, items}, {fontSize: 14, showBorder: true});

  // Identity
  blocks.push(
    mk('heading', {x: MAIN_X, y: cur.y, width: MAIN_W, height: 82}, {text: data.title, subtitle: data.subtitle}, {
      fontSize: 40,
      align: 'left',
      color: data.accent,
    }),
  );
  cur.y += 82 + 12;

  // Combat vitals
  blocks.push(...statRow(cur.y, data.vitals1));
  cur.y += STAT_H + 12;
  blocks.push(...statRow(cur.y, data.vitals2));
  cur.y += STAT_H + 14;

  // Ability scores
  blocks.push(
    mk('abilityScores', {x: MAIN_X, y: cur.y, width: MAIN_W, height: 132}, {abilities: data.abilities}, {
      showBorder: true,
    }),
  );
  cur.y += 132 + 12;

  blocks.push(mk('divider', {x: MAIN_X, y: cur.y, width: MAIN_W, height: 24}, {ornament: true}));
  cur.y += 24 + 8;

  // Class resources
  if (data.resources && data.resources.length) {
    blocks.push(sectionHeader(cur.y, data.resourceHeader ?? 'Class Resources', data.accent));
    cur.y += 30 + 6;
    for (let i = 0; i < data.resources.length; i += 4) {
      blocks.push(...statRow(cur.y, data.resources.slice(i, i + 4)));
      cur.y += STAT_H + 12;
    }
    cur.y += 2;
  }

  // Features
  blocks.push(sectionHeader(cur.y, 'Features & Traits', data.accent));
  cur.y += 30 + 6;
  const featH = 214;
  blocks.push(list(MAIN_X, cur.y, HALF_W, featH, data.featuresTitle, data.features));
  blocks.push(list(MAIN_X + HALF_W + COL_GAP, cur.y, HALF_W, featH, data.secondList.title, data.secondList.items));
  cur.y += featH + 14;

  // Spellcasting
  if (data.spell) {
    blocks.push(mk('divider', {x: MAIN_X, y: cur.y, width: MAIN_W, height: 24}, {ornament: true}));
    cur.y += 24 + 8;
    blocks.push(sectionHeader(cur.y, 'Spellcasting', data.accent));
    cur.y += 30 + 6;
    blocks.push(
      ...statRow(cur.y, [
        {label: 'Spell Save DC', value: data.spell.dc, hint: data.spell.ability},
        {label: 'Spell Attack', value: data.spell.attack, hint: 'to hit'},
        {label: 'Ability', value: data.spell.ability, hint: 'spellcasting'},
        {label: data.spell.countLabel, value: data.spell.count, hint: 'available'},
      ]),
    );
    cur.y += STAT_H + 12;

    const spH = 290;
    const spellGroups: SpellLevelGroup[] = [];
    const toEntries = (names: string[]) =>
      names.map((name) => ({
        id: uid('sp'),
        prepared: true,
        name,
        castingTime: SPELL_DETAILS[name]?.castingTime ?? '1 action',
        range: SPELL_DETAILS[name]?.range,
        components: {v: true, s: true, m: Boolean(SPELL_DETAILS[name]?.material)},
        duration: SPELL_DETAILS[name]?.duration,
        concentration: SPELL_DETAILS[name]?.concentration ?? false,
        ritual: SPELL_DETAILS[name]?.ritual ?? false,
        school: SPELL_DETAILS[name]?.school,
        material: SPELL_DETAILS[name]?.material,
        attackSave: SPELL_DETAILS[name]?.attackSave,
        damageEffect: SPELL_DETAILS[name]?.damageEffect,
        source: SPELL_DETAILS[name]?.source,
        description: SPELL_DETAILS[name]?.description,
        notes: SPELL_DETAILS[name]?.notes,
      }));
    if (data.spell.cantrips.length) {
      spellGroups.push({id: uid('sg'), level: 0, slotsTotal: 0, slotsExpended: 0, spells: toEntries(data.spell.cantrips)});
    }
    spellGroups.push({
      id: uid('sg'),
      level: 1,
      slotsTotal: data.spell.slotsL1,
      slotsExpended: 0,
      spells: toEntries(data.spell.spells),
    });
    blocks.push(
      mk(
        'spellList',
        {x: MAIN_X, y: cur.y, width: MAIN_W, height: spH},
        {
          title: data.spell.spellsTitle,
          showHeader: false,
          ability: data.spell.ability,
          saveDc: data.spell.dc,
          attackBonus: data.spell.attack,
          columns: ['school', 'castingTime', 'range', 'components', 'duration', 'attackSave', 'damageEffect', 'source'],
          groups: spellGroups,
        },
        {fontSize: 14, showBorder: true},
      ),
    );
    cur.y += spH + 14;
  }

  // Sidebar
  const rc = {y: TOP_Y};
  blocks.push(
    mk('image', {x: RIGHT_X, y: rc.y, width: RIGHT_W, height: 190}, {src: '', alt: 'Character portrait', fit: 'cover'}, {
      showBorder: true,
    }),
  );
  rc.y += 190 + 14;
  blocks.push(list(RIGHT_X, rc.y, RIGHT_W, 152, 'Character Details', data.sidebar.details));
  rc.y += 152 + 14;
  blocks.push(list(RIGHT_X, rc.y, RIGHT_W, 186, 'Proficiencies', data.sidebar.proficiencies));
  rc.y += 186 + 14;
  blocks.push(list(RIGHT_X, rc.y, RIGHT_W, 166, 'Attacks & Cantrips', data.sidebar.attacks));
  rc.y += 166 + 14;
  blocks.push(list(RIGHT_X, rc.y, RIGHT_W, 180, 'Equipment & Coin', data.sidebar.equipment));
  rc.y += 180 + 14;
  blocks.push(
    mk('text', {x: RIGHT_X, y: rc.y, width: RIGHT_W, height: 150}, {text: data.sidebar.notes}, {
      fontSize: 14,
      showBorder: true,
    }),
  );

  return blocks;
}

// ── Class configuration ─────────────────────────────────────────────────────
interface SpellSpec {
  ability: AbilityKey;
  abilityLabel: string;
  countLabel: string;
  count: string;
  slots: string[];
  cantrips: string[];
  spellsTitle: string;
  spells: string[];
}

interface ClassSpec {
  id: string;
  className: string;
  tagline: string;
  accent: string;
  description: string;
  hitDie: HitDie;
  saves: string;
  priority: AbilityKey[];
  defense: Defense;
  speed?: string;
  resourceHeader: string;
  resources: StatDef[];
  features: string[];
  secondList: {title: string; items: string[]};
  spell?: SpellSpec;
  proficiencies: string[];
  attacks: string[];
  equipment: string[];
  notes: string;
}

const DETAILS = [
  'Species: —',
  'Background: —',
  'Alignment: —',
  'Size: Medium',
  'Age / Height: —',
  'Deity / Ideals: —',
];

function resolveClass(spec: ClassSpec): SheetData {
  const {abilities, mod} = buildAbilities(spec.priority);
  const {ac, hint: acHint} = computeAc(spec.defense, mod);
  const hp = HIT_DIE_MAX[spec.hitDie] + mod.con;
  const passive = 10 + mod.wis;

  let spell: SpellData | undefined;
  if (spec.spell) {
    const castMod = mod[spec.spell.ability];
    const slotsL1 = (spec.spell.slots.join(' ').match(/○/g) ?? []).length || 1;
    spell = {
      dc: `${8 + PROFICIENCY + castMod}`,
      attack: sign(PROFICIENCY + castMod),
      ability: spec.spell.abilityLabel,
      countLabel: spec.spell.countLabel,
      count: spec.spell.count,
      slots: spec.spell.slots,
      slotsL1,
      cantrips: spec.spell.cantrips,
      spellsTitle: spec.spell.spellsTitle,
      spells: spec.spell.spells,
    };
  }

  return {
    accent: spec.accent,
    title: spec.className,
    subtitle: `Level 1 · ${spec.tagline} · ${spec.hitDie} Hit Die · Saves: ${spec.saves}`,
    abilities,
    vitals1: [
      {label: 'Armor Class', value: `${ac}`, hint: acHint},
      {label: 'Hit Points', value: `${hp}`, hint: `${spec.hitDie} + CON`},
      {label: 'Initiative', value: sign(mod.dex), hint: 'DEX'},
      {label: 'Speed', value: spec.speed ?? '30', hint: 'feet'},
    ],
    vitals2: [
      {label: 'Proficiency', value: sign(PROFICIENCY), hint: 'bonus'},
      {label: 'Hit Dice', value: `1${spec.hitDie}`, hint: 'per level'},
      {label: 'Passive Perc.', value: `${passive}`, hint: '10 + WIS'},
      {label: 'Heroic Insp.', value: '—', hint: 'reroll a d20'},
    ],
    resourceHeader: spec.resourceHeader,
    resources: spec.resources,
    featuresTitle: 'Class Features',
    features: spec.features,
    secondList: spec.secondList,
    spell,
    sidebar: {
      details: DETAILS,
      proficiencies: spec.proficiencies,
      attacks: spec.attacks,
      equipment: spec.equipment,
      notes: spec.notes,
    },
  };
}

// Full casters share the level-1 slot line; half casters mirror it; the
// Warlock's Pact Magic recharges on a short rest, so it gets its own note.
const FULL_SLOTS = ['1st  ○ ○   ·   2 slots, regain on Long Rest'];
const HALF_SLOTS = ['1st  ○ ○   ·   2 slots, regain on Long Rest'];
const PACT_SLOTS = ['1st  ○   ·   1 Pact slot, regain on Short Rest'];

const CLASS_SPECS: ClassSpec[] = [
  {
    id: 'barbarian',
    className: 'Barbarian',
    tagline: 'Primal Fury',
    accent: '#b91c1c',
    description: 'A d12 bruiser built around Rage — Unarmored Defense, Reckless Attack and Weapon Mastery.',
    hitDie: 'd12',
    saves: 'STR, CON',
    priority: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
    defense: {kind: 'unarmored', label: '10 + DEX + CON', second: 'con'},
    resourceHeader: 'Rage & Primal Might',
    resources: [
      {label: 'Rage', value: '2', hint: '◇◇ · Bonus Action'},
      {label: 'Rage Damage', value: '+2', hint: 'on STR weapon hits'},
      {label: 'Weapon Mastery', value: '2', hint: 'weapon properties'},
      {label: 'Reckless Atk', value: 'Adv', hint: 'L2 · melee STR'},
    ],
    features: [
      'Rage (L1)',
      'Unarmored Defense (L1)',
      'Weapon Mastery (L1)',
      'Danger Sense (L2)',
      'Reckless Attack (L2)',
      'Primal Knowledge (L3)',
    ],
    secondList: {
      title: 'Rage Benefits',
      items: [
        'Resistance to bludgeoning / piercing / slashing',
        'Advantage on Strength checks & saves',
        '+2 damage on Strength attacks',
        'Lasts 10 rounds; extend by attacking',
        'Cannot cast or concentrate on spells',
      ],
    },
    proficiencies: [
      'Saving Throws: STR, CON',
      'Skills: choose 2 (Athletics, Survival…)',
      'Armor: light, medium, shields',
      'Weapons: simple, martial',
      'Tools: none',
      'Languages: Common +1',
    ],
    attacks: [
      'Greataxe — +5 to hit, 1d12+3 slashing',
      'Handaxe (thrown) — +5, 1d6+3',
      'Rage adds +2 to Strength damage',
      'Reckless Attack: Advantage (L2)',
    ],
    equipment: ['Greataxe', '4 Handaxes', "Explorer's Pack", 'Javelin ×4', '15 gp'],
    notes: 'A fury given form. Your rage is a wellspring of primal power — let it loose and let nothing stand in your path.',
  },
  {
    id: 'bard',
    className: 'Bard',
    tagline: 'Master of Song & Story',
    accent: '#a21caf',
    description: 'A charismatic full caster: Bardic Inspiration, Expertise, Jack of All Trades and a flexible spell list.',
    hitDie: 'd8',
    saves: 'DEX, CHA',
    priority: ['cha', 'dex', 'con', 'wis', 'int', 'str'],
    defense: {kind: 'armor', label: 'Leather + DEX', base: 11, addDex: true},
    resourceHeader: 'Song & Inspiration',
    resources: [
      {label: 'Bardic Insp.', value: 'd6', hint: 'CHA uses / long rest'},
      {label: 'Expertise', value: '2', hint: 'L2 · double prof'},
      {label: 'Jack of Trades', value: '½', hint: 'L2 · other checks'},
      {label: 'Font of Insp.', value: 'L5', hint: 'insp. on short rest'},
    ],
    features: [
      'Spellcasting (L1)',
      'Bardic Inspiration d6 (L1)',
      'Expertise (L2)',
      'Jack of All Trades (L2)',
      'Bard Subclass (L3)',
      'Font of Inspiration (L5)',
    ],
    secondList: {
      title: 'Bardic Inspiration',
      items: [
        'Bonus Action, target within 60 ft',
        'They add 1d6 to one roll',
        'Uses = Charisma modifier / long rest',
        'Kept until spent or next long rest',
        'Die grows: d8 (L5), d10 (L10), d12 (L15)',
      ],
    },
    spell: {
      ability: 'cha',
      abilityLabel: 'CHA',
      countLabel: 'Spells Prep.',
      count: '4',
      slots: FULL_SLOTS,
      cantrips: ['Vicious Mockery', 'Prestidigitation'],
      spellsTitle: 'Prepared Spells',
      spells: ['Healing Word', 'Faerie Fire', 'Dissonant Whispers', 'Charm Person', 'Heroism', 'Tasha’s Hideous Laughter'],
    },
    proficiencies: [
      'Saving Throws: DEX, CHA',
      'Skills: choose any 3',
      'Armor: light',
      'Weapons: simple',
      'Tools: 3 musical instruments',
      'Languages: Common +2',
    ],
    attacks: [
      'Rapier — +4 to hit, 1d8+2 piercing',
      'Dagger (thrown) — +4, 1d4+2',
      'Vicious Mockery — WIS save, 1d6 psychic',
      'Spend Bardic Inspiration to boost a hit',
    ],
    equipment: ['Rapier', 'Leather Armor', 'Lute (instrument)', 'Dagger', "Entertainer's Pack", '19 gp'],
    notes: 'Words are your weapon and wonder your trade. Every tavern is a stage, every foe an audience yet to be won over.',
  },
  {
    id: 'cleric',
    className: 'Cleric',
    tagline: 'Voice of the Divine',
    accent: '#ca8a04',
    description: 'A full caster channeling divine power: Channel Divinity, Divine Order and healing prayers.',
    hitDie: 'd8',
    saves: 'WIS, CHA',
    priority: ['wis', 'con', 'str', 'cha', 'dex', 'int'],
    defense: {kind: 'armor', label: 'Chain Mail + shield', base: 16, addDex: false, shield: true},
    resourceHeader: 'Divine Power',
    resources: [
      {label: 'Channel Div.', value: '2', hint: 'L2 · ◇◇ per rest'},
      {label: 'Divine Spark', value: '1d8', hint: 'L2 · heal or harm'},
      {label: 'Turn Undead', value: 'WIS', hint: 'L2 · save vs Spell DC'},
      {label: 'Prepared', value: '4', hint: 'spells · +3 cantrips'},
    ],
    features: [
      'Spellcasting (L1)',
      'Divine Order: Protector / Thaumaturge (L1)',
      'Channel Divinity (L2)',
      'Sear Undead (L5)',
      'Blessed Strikes (L7)',
      'Divine Intervention (L10)',
    ],
    secondList: {
      title: 'Channel Divinity',
      items: [
        '2 uses · regain 1 on short rest',
        'Divine Spark: 1d8 + WIS, heal or harm',
        'Turn Undead: WIS save within 30 ft',
        'Failed foes are Frightened & Incapacitated',
        'More options unlock with your subclass (L3)',
      ],
    },
    spell: {
      ability: 'wis',
      abilityLabel: 'WIS',
      countLabel: 'Spells Prep.',
      count: '4',
      slots: FULL_SLOTS,
      cantrips: ['Sacred Flame', 'Guidance', 'Thaumaturgy'],
      spellsTitle: 'Prepared Spells',
      spells: ['Cure Wounds', 'Bless', 'Guiding Bolt', 'Shield of Faith', 'Healing Word', 'Detect Magic'],
    },
    proficiencies: [
      'Saving Throws: WIS, CHA',
      'Skills: choose 2 (Religion, Insight…)',
      'Armor: light, medium, shields',
      'Weapons: simple',
      'Tools: none',
      'Languages: Common +1',
    ],
    attacks: [
      'Mace — +3 to hit, 1d6+1 bludgeoning',
      'Sacred Flame — DEX save, 1d8 radiant',
      'Guiding Bolt — +5 spell, 4d6 radiant',
      'Warhammer — +3, 1d8+1',
    ],
    equipment: ['Mace', 'Chain Mail', 'Shield & Holy Symbol', "Priest's Pack", 'Warhammer', '7 gp'],
    notes: 'You carry a fragment of the divine into a broken world — to mend, to shield, and when needed, to smite.',
  },
  {
    id: 'druid',
    className: 'Druid',
    tagline: 'Keeper of the Wild',
    accent: '#15803d',
    description: 'A full caster bonded to nature: Wild Shape, Druidic, Primal Order and primal spells.',
    hitDie: 'd8',
    saves: 'INT, WIS',
    priority: ['wis', 'con', 'dex', 'int', 'cha', 'str'],
    defense: {kind: 'armor', label: 'Leather + DEX + shield', base: 11, addDex: true, shield: true},
    resourceHeader: 'Wild Shape & Primal Order',
    resources: [
      {label: 'Wild Shape', value: '2', hint: 'L2 · ◇◇ per rest'},
      {label: 'Wild Companion', value: 'L2', hint: 'familiar via WS'},
      {label: 'Prepared', value: '4', hint: 'spells known'},
      {label: 'Cantrips', value: '2', hint: 'known'},
    ],
    features: [
      'Spellcasting (L1)',
      'Druidic (L1)',
      'Primal Order: Magician / Warden (L1)',
      'Wild Shape (L2)',
      'Wild Companion (L2)',
      'Druid Subclass (L3)',
    ],
    secondList: {
      title: 'Wild Shape',
      items: [
        '2 uses · regain on short or long rest',
        'Bonus Action to transform into a beast',
        'Beast options limited by CR & movement',
        'Wild Companion: spend a use for a familiar',
        'Duration: hours equal to ½ Druid level',
      ],
    },
    spell: {
      ability: 'wis',
      abilityLabel: 'WIS',
      countLabel: 'Spells Prep.',
      count: '4',
      slots: FULL_SLOTS,
      cantrips: ['Druidcraft', 'Produce Flame'],
      spellsTitle: 'Prepared Spells',
      spells: ['Cure Wounds', 'Entangle', 'Faerie Fire', 'Thunderwave', 'Healing Word', 'Speak with Animals'],
    },
    proficiencies: [
      'Saving Throws: INT, WIS',
      'Skills: choose 2 (Nature, Perception…)',
      'Armor: light, medium, shields (nonmetal)',
      'Weapons: simple',
      'Tools: Herbalism Kit',
      'Languages: Common, Druidic +1',
    ],
    attacks: [
      'Quarterstaff — +1 to hit, 1d6 bludgeoning',
      'Produce Flame — +5 spell, 1d8 fire',
      'Shillelagh: staff uses WIS (+5, 1d8+3)',
      'Thorn Whip — +5 spell, 1d6 + pull 10 ft',
    ],
    equipment: ['Quarterstaff', 'Leather Armor', 'Wooden Shield', 'Druidic Focus & Sickle', 'Herbalism Kit', '9 gp'],
    notes: 'The old growth remembers your name. You speak for root and river, and shift your shape to match the hunt.',
  },
  {
    id: 'fighter',
    className: 'Fighter',
    tagline: 'Master of Arms',
    accent: '#475569',
    description: 'A versatile d10 martial: Fighting Style, Second Wind, Action Surge and three Weapon Masteries.',
    hitDie: 'd10',
    saves: 'STR, CON',
    priority: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
    defense: {kind: 'armor', label: 'Chain Mail + shield', base: 16, addDex: false, shield: true},
    resourceHeader: 'Martial Prowess',
    resources: [
      {label: 'Second Wind', value: '2', hint: '◇◇ · 1d10 + level HP'},
      {label: 'Action Surge', value: '1', hint: 'L2 · extra action'},
      {label: 'Weapon Mastery', value: '3', hint: 'weapon properties'},
      {label: 'Fighting Style', value: '1', hint: 'chosen at L1'},
    ],
    features: [
      'Fighting Style (L1)',
      'Second Wind (L1)',
      'Weapon Mastery (L1)',
      'Tactical Mind (L1)',
      'Action Surge (L2)',
      'Fighter Subclass (L3)',
    ],
    secondList: {
      title: 'Weapon Masteries',
      items: ['Longsword — Sap', 'Greatsword — Graze', 'Longbow — Slow', 'Handaxe — Vex', 'Swap choices on a long rest'],
    },
    proficiencies: [
      'Saving Throws: STR, CON',
      'Skills: choose 2 (Athletics, Perception…)',
      'Armor: all armor, shields',
      'Weapons: simple, martial',
      'Tools: none',
      'Languages: Common +1',
    ],
    attacks: [
      'Longsword — +5 to hit, 1d8+3 (1d10 two-handed)',
      'Longbow — +5, 1d8+3 piercing',
      'Second Wind: 1d10 + level HP (Bonus Action)',
      'Shield equipped: +2 AC',
    ],
    equipment: ['Chain Mail', 'Longsword & Shield', 'Longbow & 20 Arrows', "Dungeoneer's Pack", '4 gp'],
    notes: 'Steel is a language you speak fluently. Where others see chaos in battle, you see openings.',
  },
  {
    id: 'monk',
    className: 'Monk',
    tagline: 'Disciple of the Fist',
    accent: '#c2410c',
    description: 'A nimble d8 martial artist: Focus Points, the Martial Arts die and Unarmored Movement.',
    hitDie: 'd8',
    saves: 'STR, DEX',
    priority: ['dex', 'wis', 'con', 'str', 'cha', 'int'],
    defense: {kind: 'unarmored', label: '10 + DEX + WIS', second: 'wis'},
    resourceHeader: 'Martial Arts & Focus',
    resources: [
      {label: 'Martial Arts', value: '1d6', hint: 'DEX · Bonus unarmed'},
      {label: 'Focus Points', value: '2', hint: 'L2 · = Monk level'},
      {label: 'Unarmored Move', value: '+10', hint: 'L2 · feet'},
      {label: 'Deflect Atk', value: '1d10', hint: 'L3 · reduce damage'},
    ],
    features: [
      'Martial Arts (L1)',
      'Unarmored Defense (L1)',
      "Monk's Focus (L2)",
      'Unarmored Movement (L2)',
      'Uncanny Metabolism (L2)',
      'Deflect Attacks (L3)',
    ],
    secondList: {
      title: 'Focus Points (Ki)',
      items: [
        'Flurry of Blows: 1 FP → 2 unarmed strikes',
        'Patient Defense: 1 FP → Disengage + Dodge',
        'Step of the Wind: 1 FP → Dash + Disengage',
        'Focus save DC = 8 + WIS + proficiency',
        'Uncanny Metabolism: refund on initiative (L2)',
      ],
    },
    proficiencies: [
      'Saving Throws: STR, DEX',
      'Skills: choose 2 (Acrobatics, Stealth…)',
      'Armor: none',
      'Weapons: simple, martial (Light)',
      'Tools: one artisan or musical',
      'Languages: Common +1',
    ],
    attacks: [
      'Unarmed Strike — +5, 1d6+3 bludgeoning',
      'Spear — +5, 1d6+3 (1d8 two-handed)',
      'Bonus Action unarmed strike after Attack',
      'Dart (thrown) — +5, 1d4+3',
    ],
    equipment: ['Spear', '10 Darts', "Explorer's Pack", "Artisan's Tools", '11 gp'],
    notes: 'Body and mind move as one. Through discipline you turn breath into force and stillness into speed.',
  },
  {
    id: 'paladin',
    className: 'Paladin',
    tagline: 'Sworn by Oath',
    accent: '#a16207',
    description: 'A half-caster crusader: Lay on Hands, Divine Smite, Channel Divinity and an unbreakable oath.',
    hitDie: 'd10',
    saves: 'WIS, CHA',
    priority: ['str', 'cha', 'con', 'wis', 'dex', 'int'],
    defense: {kind: 'armor', label: 'Chain Mail + shield', base: 16, addDex: false, shield: true},
    resourceHeader: 'Oath & Divine Might',
    resources: [
      {label: 'Lay on Hands', value: '5', hint: 'HP pool · 5 × level'},
      {label: 'Weapon Mastery', value: '2', hint: 'weapon properties'},
      {label: 'Divine Smite', value: '2d8', hint: 'L2 spell · +1d8 / slot'},
      {label: 'Channel Div.', value: '2', hint: 'L3 · per rest'},
    ],
    features: [
      'Lay on Hands (L1)',
      'Spellcasting (L1)',
      'Weapon Mastery (L1)',
      'Fighting Style (L2)',
      "Paladin's Smite (L2)",
      'Channel Divinity (L3)',
      'Aura of Protection (L6)',
    ],
    secondList: {
      title: 'Divine Smite & Auras',
      items: [
        'Lay on Hands: 5 × level HP pool (Bonus Action)',
        'Cure a disease or poison for 5 HP',
        'Divine Smite: 2d8 radiant on a hit (spell)',
        '+1d8 per slot level above 1st, +1d8 vs Undead/Fiends',
        'Aura of Protection: +CHA to saves (L6)',
      ],
    },
    spell: {
      ability: 'cha',
      abilityLabel: 'CHA',
      countLabel: 'Spells Prep.',
      count: '2',
      slots: HALF_SLOTS,
      cantrips: [],
      spellsTitle: 'Prepared Spells',
      spells: ['Heroism', 'Searing Smite', 'Bless', 'Command', 'Shield of Faith', 'Compelled Duel'],
    },
    proficiencies: [
      'Saving Throws: WIS, CHA',
      'Skills: choose 2 (Persuasion, Athletics…)',
      'Armor: all armor, shields',
      'Weapons: simple, martial',
      'Tools: none',
      'Languages: Common +1',
    ],
    attacks: [
      'Longsword — +5 to hit, 1d8+3 (1d10 two-handed)',
      'Javelin (thrown) — +5, 1d6+3',
      'Divine Smite: spend a slot for +2d8 radiant',
      'Shield equipped: +2 AC',
    ],
    equipment: ['Chain Mail', 'Longsword & Shield', 'Holy Symbol', "Priest's Pack", '6 Javelins', '9 gp'],
    notes: 'Your oath is a blade against the dark. Where evil festers, you answer with radiant, righteous fury.',
  },
  {
    id: 'ranger',
    className: 'Ranger',
    tagline: 'Hunter of the Wilds',
    accent: '#4d7c0f',
    description: "A half-caster tracker: Favored Enemy, Hunter's Mark, Weapon Mastery and wilderness lore.",
    hitDie: 'd10',
    saves: 'STR, DEX',
    priority: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
    defense: {kind: 'armor', label: 'Studded Leather + DEX', base: 12, addDex: true},
    resourceHeader: "Hunter's Craft",
    resources: [
      {label: 'Favored Enemy', value: '×2', hint: "free Hunter's Mark / rest"},
      {label: 'Weapon Mastery', value: '2', hint: 'weapon properties'},
      {label: 'Deft Explorer', value: 'L2', hint: 'Expertise + language'},
      {label: 'Fighting Style', value: 'L2', hint: 'pick one'},
    ],
    features: [
      'Spellcasting (L1)',
      'Favored Enemy (L1)',
      'Weapon Mastery (L1)',
      'Deft Explorer (L2)',
      'Fighting Style (L2)',
      'Ranger Subclass (L3)',
    ],
    secondList: {
      title: "Hunter's Mark",
      items: [
        'Always prepared · cast free ×2 per long rest',
        'Bonus Action, 90 ft, Concentration',
        '+1d6 damage to the marked target',
        'Advantage to track or find it',
        'Move the mark to a new target on a kill',
      ],
    },
    spell: {
      ability: 'wis',
      abilityLabel: 'WIS',
      countLabel: 'Spells Prep.',
      count: '2',
      slots: HALF_SLOTS,
      cantrips: [],
      spellsTitle: 'Prepared Spells',
      spells: ["Hunter's Mark (always)", 'Cure Wounds', 'Ensnaring Strike', 'Hail of Thorns', 'Speak with Animals', 'Fog Cloud'],
    },
    proficiencies: [
      'Saving Throws: STR, DEX',
      'Skills: choose 3 (Survival, Perception…)',
      'Armor: light, medium, shields',
      'Weapons: simple, martial',
      'Tools: none',
      'Languages: Common +1',
    ],
    attacks: [
      'Longbow — +5 to hit, 1d8+3 piercing',
      'Shortsword — +5, 1d6+3 (dual wield)',
      "Hunter's Mark adds +1d6 per hit",
      'Scimitar — +5, 1d6+3',
    ],
    equipment: ['Studded Leather', 'Longbow & 20 Arrows', 'Scimitar ×2', "Explorer's Pack", '14 gp'],
    notes: 'The wilderness is your ally and your armory. No trail is too cold, no quarry beyond your reach.',
  },
  {
    id: 'rogue',
    className: 'Rogue',
    tagline: 'Shadow & Guile',
    accent: '#334155',
    description: "A precision skirmisher: Sneak Attack, Expertise, Cunning Action and Thieves' Cant.",
    hitDie: 'd8',
    saves: 'DEX, INT',
    priority: ['dex', 'con', 'int', 'wis', 'cha', 'str'],
    defense: {kind: 'armor', label: 'Leather + DEX', base: 11, addDex: true},
    resourceHeader: 'Cunning & Precision',
    resources: [
      {label: 'Sneak Attack', value: '1d6', hint: 'once per turn'},
      {label: 'Expertise', value: '2', hint: 'double proficiency'},
      {label: 'Weapon Mastery', value: '2', hint: 'weapon properties'},
      {label: 'Cunning Action', value: 'L2', hint: 'Dash/Disengage/Hide'},
    ],
    features: [
      'Expertise (L1)',
      'Sneak Attack (L1)',
      "Thieves' Cant (L1)",
      'Weapon Mastery (L1)',
      'Cunning Action (L2)',
      'Steady Aim (L3)',
    ],
    secondList: {
      title: 'Sneak Attack',
      items: [
        '1d6 extra damage · once per turn',
        'Need Advantage OR an ally within 5 ft of target',
        'Weapon must have Finesse or be ranged',
        '+1d6 at levels 3, 5, 7, 9…',
        'Cunning Action: Dash/Disengage/Hide as Bonus',
      ],
    },
    proficiencies: [
      'Saving Throws: DEX, INT',
      'Skills: choose 4 · Expertise in 2',
      'Armor: light',
      'Weapons: simple, martial (Finesse/Light)',
      "Tools: Thieves' Tools",
      "Languages: Common, Thieves' Cant",
    ],
    attacks: [
      'Rapier — +5 to hit, 1d8+3 piercing',
      'Shortbow — +5, 1d6+3',
      'Sneak Attack: +1d6 (once per turn)',
      'Dagger — +5, 1d4+3 (Nick, thrown)',
    ],
    equipment: ['Leather Armor', 'Rapier', 'Shortbow & 20 Arrows', "Thieves' Tools", '2 Daggers', '8 gp'],
    notes: 'You are the knife in the dark and the smile that hides it. Timing is everything, and yours is perfect.',
  },
  {
    id: 'sorcerer',
    className: 'Sorcerer',
    tagline: 'Born of Magic',
    accent: '#be123c',
    description: 'A full caster with innate power: Sorcery Points, Metamagic and Innate Sorcery.',
    hitDie: 'd6',
    saves: 'CON, CHA',
    priority: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
    defense: {kind: 'armor', label: 'Mage Armor + DEX', base: 13, addDex: true},
    resourceHeader: 'Innate Magic',
    resources: [
      {label: 'Innate Sorcery', value: '2', hint: 'per day · +1 spell DC'},
      {label: 'Sorcery Points', value: '2', hint: 'L2 · long rest'},
      {label: 'Metamagic', value: '2', hint: 'L2 · options'},
      {label: 'Font of Magic', value: 'L2', hint: 'convert SP ↔ slots'},
    ],
    features: [
      'Spellcasting (L1)',
      'Innate Sorcery (L1)',
      'Font of Magic (L2)',
      'Metamagic (L2)',
      'Sorcerer Subclass (L3)',
      'Sorcerous Restoration (L5)',
    ],
    secondList: {
      title: 'Metamagic (from L2)',
      items: [
        'Quickened: 2 SP → cast as a Bonus Action',
        'Twinned: spell level in SP → second target',
        'Subtle: 1 SP → no verbal or somatic',
        'Careful: 1 SP → allies auto-save',
        'Empowered: 1 SP → reroll damage dice',
      ],
    },
    spell: {
      ability: 'cha',
      abilityLabel: 'CHA',
      countLabel: 'Spells Prep.',
      count: '2',
      slots: FULL_SLOTS,
      cantrips: ['Fire Bolt', 'Prestidigitation', 'Mage Hand', 'Minor Illusion'],
      spellsTitle: 'Prepared Spells',
      spells: ['Shield', 'Magic Missile', 'Chromatic Orb', 'Burning Hands'],
    },
    proficiencies: [
      'Saving Throws: CON, CHA',
      'Skills: choose 2 (Arcana, Persuasion…)',
      'Armor: none',
      'Weapons: simple',
      'Tools: none',
      'Languages: Common +2',
    ],
    attacks: [
      'Fire Bolt — +5 spell, 1d10 fire',
      'Chromatic Orb — +5 spell, 3d8 (choose type)',
      'Dagger — +3 to hit, 1d4+1',
      'Quicken spells with Sorcery Points (L2)',
    ],
    equipment: ['2 Daggers', 'Arcane Focus (Crystal)', "Explorer's Pack", 'Component Pouch', '28 gp'],
    notes: 'Magic did not find you — it was born in you. Power hums beneath your skin, eager to be spent.',
  },
  {
    id: 'warlock',
    className: 'Warlock',
    tagline: 'Bound by Pact',
    accent: '#6d28d9',
    description: 'A Pact Magic caster: Eldritch Invocations, a Pact Boon and short-rest spell slots.',
    hitDie: 'd8',
    saves: 'WIS, CHA',
    priority: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
    defense: {kind: 'armor', label: 'Leather + DEX', base: 11, addDex: true},
    resourceHeader: 'Pact Magic & Invocations',
    resources: [
      {label: 'Pact Slots', value: '1', hint: 'level 1 · short rest'},
      {label: 'Slot Level', value: '1st', hint: 'all slots same level'},
      {label: 'Invocations', value: '1', hint: 'known · + Pact Boon'},
      {label: 'Magical Cunning', value: 'L2', hint: 'regain slots 1 / rest'},
    ],
    features: [
      'Eldritch Invocations (L1)',
      'Pact Magic (L1)',
      'Magical Cunning (L2)',
      'Warlock Subclass (L3)',
      'Mystic Arcanum 6th (L11)',
    ],
    secondList: {
      title: 'Invocations & Pact Boon',
      items: [
        'Pact Boon is an invocation: Blade / Chain / Tome',
        'Agonizing Blast: add CHA to blast damage (L2)',
        "Devil's Sight: see in magical darkness",
        'Repelling Blast: push targets 10 ft',
        'Swap one invocation on each level up',
      ],
    },
    spell: {
      ability: 'cha',
      abilityLabel: 'CHA',
      countLabel: 'Spells Prep.',
      count: '2',
      slots: PACT_SLOTS,
      cantrips: ['Eldritch Blast', 'Prestidigitation'],
      spellsTitle: 'Prepared Spells',
      spells: ['Hex', 'Armor of Agathys', 'Arms of Hadar', 'Witch Bolt'],
    },
    proficiencies: [
      'Saving Throws: WIS, CHA',
      'Skills: choose 2 (Arcana, Deception…)',
      'Armor: light',
      'Weapons: simple',
      'Tools: none',
      'Languages: Common +2',
    ],
    attacks: [
      'Eldritch Blast — +5 spell, 1d10 force',
      'Hex adds +1d6 necrotic per hit',
      'Dagger — +3 to hit, 1d4+1',
      'Agonizing Blast: add CHA to blast (L2)',
    ],
    equipment: ['Leather Armor', 'Sickle', 'Arcane Focus (Rod)', "Scholar's Pack", '2 Daggers', '15 gp'],
    notes: 'A bargain was struck, and power was given. Your patron watches always — and the debt is never quite paid.',
  },
  {
    id: 'wizard',
    className: 'Wizard',
    tagline: 'Scholar of the Arcane',
    accent: '#1d4ed8',
    description: 'A full caster of study: a spellbook, Arcane Recovery, Ritual Adept and Memorize Spell.',
    hitDie: 'd6',
    saves: 'INT, WIS',
    priority: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
    defense: {kind: 'armor', label: 'Mage Armor + DEX', base: 13, addDex: true},
    resourceHeader: 'Arcane Mastery',
    resources: [
      {label: 'Spellbook', value: '6', hint: '1st-level spells'},
      {label: 'Arcane Recovery', value: '1', hint: 'slots on short rest'},
      {label: 'Ritual Adept', value: '◈', hint: 'cast rituals from book'},
      {label: 'Scholar', value: 'L2', hint: 'Expertise in a skill'},
    ],
    features: [
      'Spellcasting (L1)',
      'Ritual Adept (L1)',
      'Arcane Recovery (L1)',
      'Scholar (L2)',
      'Wizard Subclass (L3)',
      'Memorize Spell on a long rest',
    ],
    secondList: {
      title: 'Spellbook & Recovery',
      items: [
        'Start with 6 first-level spells',
        'Add 2 spells to the book per Wizard level',
        'Copy found spells (time + gold)',
        'Arcane Recovery: some slots back on short rest',
        'Ritual Adept: cast ritual spells unprepared',
      ],
    },
    spell: {
      ability: 'int',
      abilityLabel: 'INT',
      countLabel: 'Spells Prep.',
      count: '4',
      slots: FULL_SLOTS,
      cantrips: ['Fire Bolt', 'Mage Hand', 'Prestidigitation'],
      spellsTitle: 'Spellbook (6)',
      spells: ['Shield', 'Magic Missile', 'Detect Magic', 'Sleep', 'Feather Fall', 'Mage Armor'],
    },
    proficiencies: [
      'Saving Throws: INT, WIS',
      'Skills: choose 2 (Arcana, History…)',
      'Armor: none',
      'Weapons: simple',
      'Tools: none',
      'Languages: Common +2',
    ],
    attacks: [
      'Fire Bolt — +5 spell, 1d10 fire',
      'Magic Missile — 3 darts, 1d4+1 each',
      'Ray of Frost — +5 spell, 1d8 cold + slow',
      'Dagger — +3 to hit, 1d4+1',
    ],
    equipment: ['Quarterstaff', 'Spellbook', 'Arcane Focus (Staff)', "Scholar's Pack", 'Component Pouch', '5 gp'],
    notes: 'Knowledge is the truest power. Every spell in your book is a hard-won secret, wrested from the weave itself.',
  },
];

// ── Universal sheet ─────────────────────────────────────────────────────────
function generalData(): SheetData {
  const {abilities, mod} = buildAbilities(['con', 'dex', 'str', 'wis', 'int', 'cha']);
  return {
    accent: '#7c2d12',
    title: 'Character Name',
    subtitle: 'Level 1 · Species · Class · Background',
    abilities,
    vitals1: [
      {label: 'Armor Class', value: '13', hint: 'armor + DEX'},
      {label: 'Hit Points', value: '—', hint: 'current / max'},
      {label: 'Initiative', value: sign(mod.dex), hint: 'DEX'},
      {label: 'Speed', value: '30', hint: 'feet'},
    ],
    vitals2: [
      {label: 'Proficiency', value: '+2', hint: 'bonus'},
      {label: 'Hit Dice', value: '1', hint: 'per level'},
      {label: 'Passive Perc.', value: `${10 + mod.wis}`, hint: '10 + WIS'},
      {label: 'Heroic Insp.', value: '—', hint: 'reroll a d20'},
    ],
    featuresTitle: 'Class & Species Features',
    features: [
      'Class feature (L1)',
      'Species trait',
      'Species trait',
      'Background feature',
      'Origin feat',
      'Add your own…',
    ],
    secondList: {
      title: 'Actions in Combat',
      items: [
        'Attack (weapon or unarmed)',
        'Cast a spell',
        'Dash · Disengage · Dodge',
        'Help · Hide · Search · Study',
        'Ready · Shove · Grapple · Influence',
        'Bonus Action / Reaction',
      ],
    },
    sidebar: {
      details: DETAILS,
      proficiencies: [
        'Saving Throws: —',
        'Skills: —',
        'Armor: —',
        'Weapons: —',
        'Tools: —',
        'Languages: Common',
      ],
      attacks: [
        'Weapon — +0 to hit, 1d— damage',
        'Weapon — +0 to hit, 1d— damage',
        'Cantrip — ',
        'Reach / range notes',
      ],
      equipment: ['Weapon', 'Armor & shield', "Adventurer's Pack", 'Potion of Healing', 'Coin: 0 gp'],
      notes: 'Write your character’s story here — origin, motivations, allies, and the goals that drive them into adventure.',
    },
  };
}

export const GENERAL_TEMPLATE: WhiteboardTemplate = {
  id: 'general',
  name: 'Universal Character Sheet',
  description: 'A clean, complete layout for any character: ability scores, core stats, features, inventory and notes.',
  accent: '#7c2d12',
  build: () => renderSheet(generalData()),
};

export const CLASS_TEMPLATES: WhiteboardTemplate[] = CLASS_SPECS.map((spec) => ({
  id: spec.id,
  name: spec.className,
  description: spec.description,
  accent: spec.accent,
  build: () => renderSheet(resolveClass(spec)),
}));

export const TEMPLATES: WhiteboardTemplate[] = [GENERAL_TEMPLATE, ...CLASS_TEMPLATES];

export interface TemplateGroup {
  label: string;
  templates: WhiteboardTemplate[];
}

export const TEMPLATE_GROUPS: TemplateGroup[] = [
  {label: 'General', templates: [GENERAL_TEMPLATE]},
  {label: 'D&D 2024 Classes', templates: CLASS_TEMPLATES},
];

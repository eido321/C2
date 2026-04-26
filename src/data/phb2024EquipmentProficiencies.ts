/**
 * 2024 PHB equipment proficiency options for the character sheet.
 *
 * **Weapons & armor** use PHB-style *categories* (simple/martial; light/medium/heavy/shields).
 * **Tools** stay as individual entries (chapter 6 + `musicalInstruments.ts` / `gamingSets.ts`; see `docs/rules-audit-report.md`).
 */
import { ARMOR_LIST } from './armor';
import { MUSICAL_INSTRUMENT_PHB_2024 } from './musicalInstruments';
import { GAMING_SET_PHB_2024 } from './gamingSets';
import { ARTISAN_BACKGROUND_TOOL_CHOICES } from './crafterFastCrafting';

/** Broad weapon proficiency lines (PHB chapter 6). */
export const PHB_2024_WEAPON_PROFICIENCY_CATEGORIES = ['Simple weapons', 'Martial weapons'] as const;

/** Armor training categories (PHB glossary / chapter 6). */
export const PHB_2024_ARMOR_PROFICIENCY_CATEGORIES = [
  'Light armor',
  'Medium armor',
  'Heavy armor',
  'Shields',
] as const;

const SIMPLE_WEAPON_NAMES = [
  'Club',
  'Dagger',
  'Greatclub',
  'Handaxe',
  'Javelin',
  'Light Hammer',
  'Mace',
  'Quarterstaff',
  'Sickle',
  'Spear',
  'Dart',
  'Light Crossbow',
  'Shortbow',
  'Sling',
] as const;

const MARTIAL_WEAPON_NAMES = [
  'Battleaxe',
  'Flail',
  'Glaive',
  'Greataxe',
  'Greatsword',
  'Halberd',
  'Lance',
  'Longsword',
  'Maul',
  'Morningstar',
  'Pike',
  'Rapier',
  'Scimitar',
  'Shortsword',
  'Trident',
  'War Pick',
  'Warhammer',
  'Whip',
  'Blowgun',
  'Hand Crossbow',
  'Heavy Crossbow',
  'Longbow',
  'Musket',
  'Pistol',
] as const;

const WEAPON_NAME_TO_CATEGORY = new Map<string, string>();
for (const n of SIMPLE_WEAPON_NAMES) WEAPON_NAME_TO_CATEGORY.set(n, 'Simple weapons');
for (const n of MARTIAL_WEAPON_NAMES) WEAPON_NAME_TO_CATEGORY.set(n, 'Martial weapons');

/** All individual PHB 2024 weapon names (for specific proficiency picks). */
export const PHB_2024_WEAPON_PROFICIENCY_ALL: readonly string[] = [
  ...SIMPLE_WEAPON_NAMES,
  ...MARTIAL_WEAPON_NAMES,
].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

export function isPhb2024WeaponName(name: string): boolean {
  return WEAPON_NAME_TO_CATEGORY.has(name);
}

const gamingSetLabels = GAMING_SET_PHB_2024.map((g) => `Gaming set (${g})`);
const instrumentLabels = MUSICAL_INSTRUMENT_PHB_2024.map((m) => `Musical instrument (${m})`);

/** All tool proficiencies as single pick strings (PHB 2024 chapter 6 + audit-backed variants). */
export const PHB_2024_TOOL_PROFICIENCY_ALL: readonly string[] = Array.from(
  new Set<string>([
    ...(ARTISAN_BACKGROUND_TOOL_CHOICES as readonly string[]),
    'Disguise Kit',
    'Forgery Kit',
    'Herbalism Kit',
    "Navigator's Tools",
    "Poisoner's Kit",
    "Thieves' Tools",
    ...gamingSetLabels,
    ...instrumentLabels,
    'Vehicles (land)',
    'Vehicles (water)',
  ]),
).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

/** Map legacy per-weapon rows to simple/martial categories. */
export function normalizeWeaponProficiencies(raw: string[]): string[] {
  const out = new Set<string>();
  const cats = new Set<string>(PHB_2024_WEAPON_PROFICIENCY_CATEGORIES);
  for (const s of raw) {
    if (cats.has(s)) {
      out.add(s);
      continue;
    }
    const mapped = WEAPON_NAME_TO_CATEGORY.get(s);
    if (mapped) out.add(mapped);
  }
  return [...out];
}

/** Map legacy per-piece armor names to light/medium/heavy/shields. */
export function normalizeArmorProficiencies(raw: string[]): string[] {
  const out = new Set<string>();
  const cats = new Set<string>(PHB_2024_ARMOR_PROFICIENCY_CATEGORIES);
  for (const s of raw) {
    if (cats.has(s)) {
      out.add(s);
      continue;
    }
    const piece = ARMOR_LIST.find((a) => a.name === s);
    if (piece) {
      out.add(piece.category === 'Shield' ? 'Shields' : `${piece.category} armor`);
    }
  }
  return [...out];
}

/** Normalize legacy comma-separated strings, string arrays, or missing fields to a string array. */
export function asProficiencyArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === 'string' && x.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

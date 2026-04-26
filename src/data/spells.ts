import type { Spell } from '@/types';
import spellListPhb2024 from './spellListPhb2024.json';

export type SpellTemplate = Omit<Spell, 'id' | 'prepared'>;

/**
 * Spell name, level, casting time, range, components, ritual/concentration flags, and descriptions
 * are generated from `docs/rules-from-pdf.json` (PHB 2024 extract). Regenerate with:
 * `node scripts/generate-spells-from-phb.mjs`
 */
export const SPELL_LIST = spellListPhb2024 as SpellTemplate[];

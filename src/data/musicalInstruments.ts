/**
 * Musical Instrument tool variants (2024 PHB chapter 6 — Tools).
 *
 * Source: `docs/rules-from-pdf.json` → block containing *Musical Instrument (Varies)*,
 * "Variants: Bagpipes … drum … dulcimer … flute … horn … lute … lyre … pan flute … shawm … viol".
 * Listed for audit in `docs/rules-audit-report.md` under "Musical instruments".
 */
export const MUSICAL_INSTRUMENT_PHB_2024 = [
  'Bagpipes',
  'Drum',
  'Dulcimer',
  'Flute',
  'Horn',
  'Lute',
  'Lyre',
  'Pan flute',
  'Shawm',
  'Viol',
] as const;

export type MusicalInstrumentPhb2024 = (typeof MUSICAL_INSTRUMENT_PHB_2024)[number];

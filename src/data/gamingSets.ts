/**
 * Gaming Set tool variants (2024 PHB chapter 6 — Tools).
 *
 * Source: `docs/rules-from-pdf.json` → *Gaming Set (Varies)*, “Variants: Dice … dragonchess … playing cards … three-dragon ante”.
 * Documented in `docs/rules-audit-report.md` under “Gaming sets”.
 */
export const GAMING_SET_PHB_2024 = [
  'Dice',
  'Dragonchess',
  'Playing cards',
  'Three-dragon ante',
] as const;

export type GamingSetPhb2024 = (typeof GAMING_SET_PHB_2024)[number];

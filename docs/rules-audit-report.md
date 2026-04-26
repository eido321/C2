# Rules audit: app data vs docs/rules-from-pdf.json

Generated: 2026-04-10T19:07:10.885Z

## Corpus

- Source: `docs/rules-from-pdf.json` (752 pages)
- Concatenated text length: 1,119,085 characters (normalized for matching)

## How to read this

- **Missing in PDF text** means the exact normalized name did not appear in the extracted book text.
- Extraction is lossy (columns, hyphenation, special characters). The script normalizes common NUL-byte breaks (e.g. glossary **Petrified**). Some “missing” entries are still false negatives.
- The app may legally omit PHB-only names if your `rules.pdf` differs from the data source.

---

## Proficiency bonus (levelData.ts)

- **OK**: PROF_BONUS 1–20 matches 2024 PHB (+2…+6 tiers).

## Spells (spells.ts)

- Total spells in app: **274**
- Not found as substring in PDF text: **3**

<details><summary>List</summary>

- Inflict Wounds
- Branding Smite
- Feeblemind

</details>

_These names were not found in the concatenated extract (tabs, hyphenation, renamed spells in 2024, or print extension stripping can cause false negatives). Cross-check the PDF manually._

_Very short names (15) may match unrelated prose; spot-check: Bane, Hex, Jump, Aid, Blur, Web, Fear, Fly…_

## Armor (armor.ts)

- Armor / shield entries: **13**
- Not found in PDF text: **0**

_All armor names appear in the corpus._

## Origin feats (feats.ts)

- Origin feat names: **12**
- Not found in PDF text: **0**

_All listed origin feat names appear in the corpus._

## Classes (config/constants.ts DND_CLASSES)

- Classes: **13**
- Not found in PDF text: **1**

- Artificer

_**Artificer** is not a core 2024 PHB class in chapter 3; it is expected to be absent from a PHB-only extract._

## Conditions (config/constants.ts CONDITIONS)

- Conditions: **12**
- Not found in PDF text: **0**

_All condition names appear in the corpus._

## Musical instruments (PHB chapter 6 — `musicalInstruments.ts`)

Variant names are taken from `docs/rules-from-pdf.json` (tool entry *Musical Instrument (Varies)*, “Variants: …” line). The app uses this fixed list for the Entertainer background’s “choose one kind of Musical Instrument” step in character creation:

- Bagpipes, Drum, Dulcimer, Flute, Horn, Lute, Lyre, Pan flute, Shawm, Viol

_The PDF extract uses mixed capitalization (e.g. “pan flute”); display strings in the app normalize to readable titles._

## Gaming sets (PHB chapter 6 — `gamingSets.ts`)

Variant names are taken from `docs/rules-from-pdf.json` (tool entry *Gaming Set (Varies)*, “Variants: …” line). Used for backgrounds that grant “Choose one kind of Gaming Set” (Guard, Noble, Soldier):

- Dice, Dragonchess, Playing cards, Three-dragon ante

## Not covered by this script

- `spellClasses.ts` (which class lists which spell) — needs structured SRD tables, not simple name grep.
- `levelData.ts` class feature paragraphs — compare manually or NLP.
- `races.ts`, `backgrounds.ts`, `wildShape.ts`, companions — partial PHB / other sources.
- Weapons list if added later under a different file.

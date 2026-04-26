import { CLASS_FEATURES_2024 } from './classFeatures2024';
import phb2024FeatsFromRules from './phb2024FeatsFromRules.json';
import phb2024SubclassFeaturesFromRules from './phb2024SubclassFeaturesFromRules.json';
/** Legacy PHB Nature Domain (not in 2024 PHB rules_copypaste); merged so sync script won’t drop it. */
import phb2024NatureDomainSubclassFeatures from './phb2024NatureDomainSubclassFeatures.json';
import { RACE_LIST } from './races';

export type FeatCategory = 'Feat' | 'Class Feature' | 'Subclass Feature' | 'Racial Trait';

export interface FeatTemplate {
  name: string;
  description: string;
  source: string;
  category: FeatCategory;
  /** True for 2024 PHB Origin feats (no prerequisites, granted by backgrounds/Human) */
  isOrigin?: boolean;
  /** Set for PHB class-feature library rows (one row per class level block) */
  acquiredAtLevel?: number;
  /** For Subclass Feature rows: PHB class name */
  className?: string;
  /** For Subclass Feature rows: subclass name */
  subclass?: string;
}

type RawPhbFeat = {
  name: string;
  source: string;
  isOrigin: boolean;
  description: string;
};

const PHB_2024_FEATS: FeatTemplate[] = (phb2024FeatsFromRules as RawPhbFeat[]).map(
  (f) => ({
    category: 'Feat',
    source: f.source,
    name: f.name,
    description: f.description,
    isOrigin: f.isOrigin,
  }),
);

type RawSubclassFeature = {
  className: string;
  subclass: string;
  name: string;
  acquiredAtLevel: number;
  description: string;
};

function mapSubclassRows(rows: RawSubclassFeature[]): FeatTemplate[] {
  return rows.map((r) => ({
    category: 'Subclass Feature' as const,
    source: `${r.className} — ${r.subclass}`,
    name: r.name,
    description: r.description,
    acquiredAtLevel: r.acquiredAtLevel,
    className: r.className,
    subclass: r.subclass,
  }));
}

const PHB_SUBCLASS_FEATURES: FeatTemplate[] = [
  ...mapSubclassRows(phb2024SubclassFeaturesFromRules as RawSubclassFeature[]),
  ...mapSubclassRows(phb2024NatureDomainSubclassFeatures as RawSubclassFeature[]),
];

/** If the same feat name appears twice (e.g. 2024 Origin vs legacy General), keep the 2024 Origin entry. */
function dedupeFeatsPreserveOrder(items: FeatTemplate[]): FeatTemplate[] {
  const out: FeatTemplate[] = [];
  const featNameToIndex = new Map<string, number>();
  const score = (f: FeatTemplate) => (f.isOrigin ? 2 : 0) + (f.source === 'Origin' ? 1 : 0);
  const prefer = (a: FeatTemplate, b: FeatTemplate) => (score(b) > score(a) ? b : a);

  for (const item of items) {
    if (item.category !== 'Feat') {
      out.push(item);
      continue;
    }
    const k = item.name.toLowerCase();
    const idx = featNameToIndex.get(k);
    if (idx === undefined) {
      featNameToIndex.set(k, out.length);
      out.push(item);
    } else {
      out[idx] = prefer(out[idx], item);
    }
  }
  return out;
}

function racialTraitsFromRaces(): FeatTemplate[] {
  const out: FeatTemplate[] = [];
  for (const race of RACE_LIST) {
    for (const t of race.traits) {
      out.push({
        category: 'Racial Trait',
        source: race.name,
        name: t.name,
        description: t.description,
      });
    }
    const lineages = race.bonusChoice?.lineageOptions;
    if (!lineages) continue;
    for (const opt of lineages) {
      for (const t of opt.traits) {
        out.push({
          category: 'Racial Trait',
          source: `${race.name} (${opt.name})`,
          name: t.name,
          description: t.description,
        });
      }
    }
  }
  return out;
}

// ─── FEATS ────────────────────────────────────────────────────────────────────
const FEAT_LIST_RAW: FeatTemplate[] = [
  ...PHB_2024_FEATS,
  ...PHB_SUBCLASS_FEATURES,
  ...(CLASS_FEATURES_2024 as unknown as FeatTemplate[]),
  ...racialTraitsFromRaces(),
];

export const FEAT_LIST: FeatTemplate[] = dedupeFeatsPreserveOrder(FEAT_LIST_RAW);

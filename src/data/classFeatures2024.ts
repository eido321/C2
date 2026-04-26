import classFeaturesLevelPhb2024 from './classFeaturesLevelPhb2024.json';

type LevelFeatureRow = { name: string; desc: string };
type ByLevel = Record<string, LevelFeatureRow[]>;

/**
 * One library row per parsed PHB class feature (from `classFeaturesLevelPhb2024.json`).
 * That file is generated from `docs/rules-from-pdf.json` via
 * `node scripts/generate-class-features-from-phb.mjs` (same pipeline as `levelData` CLASS_FEATURES).
 */
function flattenClassFeaturesForFeatLibrary(): readonly {
  category: 'Class Feature';
  source: string;
  name: string;
  description: string;
  acquiredAtLevel: number;
}[] {
  const data = classFeaturesLevelPhb2024 as Record<string, ByLevel>;
  const out: {
    category: 'Class Feature';
    source: string;
    name: string;
    description: string;
    acquiredAtLevel: number;
  }[] = [];

  for (const [className, byLevel] of Object.entries(data)) {
    const levels = Object.keys(byLevel)
      .map((k) => parseInt(k, 10))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);
    for (const level of levels) {
      const rows = byLevel[String(level)];
      if (!rows?.length) continue;
      for (const row of rows) {
        out.push({
          category: 'Class Feature',
          source: className,
          name: row.name,
          description: row.desc,
          acquiredAtLevel: level,
        });
      }
    }
  }
  return out;
}

export const CLASS_FEATURES_2024 = flattenClassFeaturesForFeatLibrary();

import type { Feature } from '@/types';
import { mergeClassAndSubclassLevelFeatures } from '@/data/subclassFeatures';

function newFeatureId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Class + subclass features from level 1 through `level`, in acquisition order
 * (matches level-up merge rules: placeholders suppressed when subclass is set).
 */
export function buildClassFeaturesThroughLevel(
  className: string,
  level: number,
  subclass?: string,
): Feature[] {
  const sub = subclass?.trim() || undefined;
  const clamped = Math.min(20, Math.max(1, Math.floor(level) || 1));
  const out: Feature[] = [];
  for (let lv = 1; lv <= clamped; lv++) {
    const merged = mergeClassAndSubclassLevelFeatures(className, lv, sub);
    for (const f of merged) {
      out.push({
        id: newFeatureId(),
        name: f.name,
        description: f.desc,
        source: f.featureSource === 'subclass' && sub ? sub : className,
        acquiredAtLevel: lv,
      });
    }
  }
  return out;
}

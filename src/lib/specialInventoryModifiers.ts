import type { Ability, SpecialInventoryItem, SpecialInventoryModifiers } from '@/types';

const ZERO_SAVES: Record<Ability, number> = {
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
};

function num(n: unknown): number {
  return typeof n === 'number' && !Number.isNaN(n) ? n : 0;
}

export interface AggregatedSpecialInventoryBonuses {
  ac: number;
  initiative: number;
  spellSaveDc: number;
  spellAttack: number;
  passivePerception: number;
  speed: number;
  skills: Record<string, number>;
  saves: Record<Ability, number>;
}

export function aggregateSpecialInventoryModifiers(
  items: SpecialInventoryItem[] | undefined | null,
): AggregatedSpecialInventoryBonuses {
  const saves: Record<Ability, number> = { ...ZERO_SAVES };
  const skills: Record<string, number> = {};
  const out: AggregatedSpecialInventoryBonuses = {
    ac: 0,
    initiative: 0,
    spellSaveDc: 0,
    spellAttack: 0,
    passivePerception: 0,
    speed: 0,
    skills,
    saves,
  };
  for (const it of items ?? []) {
    const m = it.modifiers;
    if (!m) continue;
    out.ac += num(m.ac);
    out.initiative += num(m.initiative);
    out.spellSaveDc += num(m.spellSaveDc);
    out.spellAttack += num(m.spellAttack);
    out.passivePerception += num(m.passivePerception);
    out.speed += num(m.speed);
    for (const [name, v] of Object.entries(m.skills ?? {})) {
      const key = name.trim();
      if (!key) continue;
      const delta = num(v);
      if (delta === 0) continue;
      skills[key] = (skills[key] ?? 0) + delta;
    }
    for (const ab of Object.keys(ZERO_SAVES) as Ability[]) {
      saves[ab] += num(m.saves?.[ab]);
    }
  }
  return out;
}

/** Drop empty / zero fields so saves stay small. */
export function cleanSpecialInventoryModifiers(
  m: SpecialInventoryModifiers | undefined,
): SpecialInventoryModifiers | undefined {
  if (!m) return undefined;
  const out: SpecialInventoryModifiers = {};
  const take = (key: keyof SpecialInventoryModifiers, v: unknown) => {
    const n = num(v);
    if (n !== 0) (out as Record<string, number>)[key as string] = n;
  };
  take('ac', m.ac);
  take('initiative', m.initiative);
  take('spellSaveDc', m.spellSaveDc);
  take('spellAttack', m.spellAttack);
  take('passivePerception', m.passivePerception);
  take('speed', m.speed);

  const skillsIn = m.skills ?? {};
  const skillsOut: Record<string, number> = {};
  for (const [name, v] of Object.entries(skillsIn)) {
    const key = name.trim();
    if (!key) continue;
    const n = num(v);
    if (n !== 0) skillsOut[key] = n;
  }
  if (Object.keys(skillsOut).length > 0) out.skills = skillsOut;

  const savesOut: Partial<Record<Ability, number>> = {};
  for (const ab of Object.keys(ZERO_SAVES) as Ability[]) {
    const n = num(m.saves?.[ab]);
    if (n !== 0) savesOut[ab] = n;
  }
  if (Object.keys(savesOut).length > 0) out.saves = savesOut;

  if (Object.keys(out).length === 0) return undefined;
  return out;
}

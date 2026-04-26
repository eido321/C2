/**
 * Split full PHB feature descriptions into an intro plus one branch per option.
 * Used by the feature library when the player picks one branch (see `featureLibraryChoices.ts`).
 */

export function splitIntroAndTwoBranchesInOrder(
  desc: string,
  firstLabel: string,
  secondLabel: string,
): { intro: string; first: string; second: string } | null {
  const i1 = desc.indexOf(`\n${firstLabel}.`);
  const i2 = desc.indexOf(`\n${secondLabel}.`);
  if (i1 === -1 || i2 === -1 || i2 <= i1) return null;
  return {
    intro: desc.slice(0, i1).trim(),
    first: desc.slice(i1 + 1, i2).trim(),
    second: desc.slice(i2 + 1).trim(),
  };
}

/** Labels must match paragraph starters in the text (e.g. Bear, Eagle, Wolf). */
export function splitNBranchesByLabels(
  desc: string,
  labels: string[],
): { intro: string; byLabel: Record<string, string> } | null {
  if (labels.length === 0) return null;
  const positions = labels.map((L) => ({ L, i: desc.indexOf(`\n${L}.`) }));
  if (positions.some((p) => p.i === -1)) return null;
  const sorted = [...positions].sort((a, b) => a.i - b.i);
  const intro = desc.slice(0, sorted[0]!.i).trim();
  const byLabel: Record<string, string> = {};
  for (let k = 0; k < sorted.length; k++) {
    const start = sorted[k]!.i + 1;
    const end = k + 1 < sorted.length ? sorted[k + 1]!.i : desc.length;
    byLabel[sorted[k]!.L] = desc.slice(start, end).trim();
  }
  return { intro, byLabel };
}

export function splitDivineOrderDescription(desc: string): {
  intro: string;
  protector: string;
  thaumaturge: string;
} | null {
  const idxP = desc.indexOf('\nProtector.');
  const idxT = desc.indexOf('\nThaumaturge.');
  if (idxP === -1 || idxT === -1 || idxT <= idxP) return null;
  return {
    intro: desc.slice(0, idxP).trim(),
    protector: desc.slice(idxP + 1, idxT).trim(),
    thaumaturge: desc.slice(idxT + 1).trim(),
  };
}

export function splitPrimalOrderDescription(desc: string): {
  intro: string;
  magician: string;
  warden: string;
} | null {
  const idxM = desc.indexOf('\nMagician.');
  const idxW = desc.indexOf('\n\nWarden.');
  if (idxM === -1 || idxW === -1 || idxW <= idxM) return null;
  return {
    intro: desc.slice(0, idxM).trim(),
    magician: desc.slice(idxM + 1, idxW).trim(),
    warden: desc.slice(idxW + 2).trim(),
  };
}

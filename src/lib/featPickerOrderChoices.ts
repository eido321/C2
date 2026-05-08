/**
 * Payload when adding a feature from the library where the player chose a rules branch.
 * @see `src/lib/featureLibraryChoices.ts` for which features require a choice.
 */

export type FeatureLibraryChoicePayload =
  | { kind: 'cleric_divine_order'; value: 'protector' | 'thaumaturge' }
  | { kind: 'druid_primal_order'; value: 'magician' | 'warden' }
  | { kind: 'cleric_blessed_strikes'; value: 'divine_strike' | 'potent_spellcasting' }
  | { kind: 'druid_elemental_fury'; value: 'potent_spellcasting' | 'primal_strike' }
  | { kind: 'barbarian_rage_of_the_wilds'; value: 'bear' | 'eagle' | 'wolf' }
  | { kind: 'barbarian_aspect_of_the_wilds'; value: 'owl' | 'panther' | 'salmon' }
  | { kind: 'barbarian_power_of_the_wilds'; value: 'falcon' | 'lion' | 'ram' }
  | { kind: 'feat_elemental_adept'; value: 'acid' | 'cold' | 'fire' | 'lightning' | 'thunder' }
  | { kind: 'feat_crafter_fast_crafting'; value: string[] };

/** @deprecated use FeatureLibraryChoicePayload */
export type FeatClassOrderChoice =
  | { type: 'divine_order'; value: 'protector' | 'thaumaturge' }
  | { type: 'primal_order'; value: 'magician' | 'warden' };

export function legacyPayloadToNew(
  old: FeatClassOrderChoice | undefined,
): FeatureLibraryChoicePayload | undefined {
  if (!old) return undefined;
  if (old.type === 'divine_order')
    return { kind: 'cleric_divine_order', value: old.value };
  return { kind: 'druid_primal_order', value: old.value };
}

export function newPayloadToLegacy(
  p: FeatureLibraryChoicePayload | undefined,
): FeatClassOrderChoice | undefined {
  if (!p) return undefined;
  if (p.kind === 'cleric_divine_order') return { type: 'divine_order', value: p.value };
  if (p.kind === 'druid_primal_order') return { type: 'primal_order', value: p.value };
  return undefined;
}

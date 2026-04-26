import { PDFDocument } from 'pdf-lib';
import { Character, Ability } from '@/types';
import { maxSpellSlotTrackerSlots } from '@/config/constants';
import { getModifier, formatBonus, getProficiencyBonus, getSkillEffectiveBonus } from './utils';
import { effectiveWalkingSpeedFt } from '@/data/armor';

export async function exportCharacterPDF(character: Character): Promise<void> {
  const profBonus = character.proficiencyBonus ?? getProficiencyBonus(character.level);

  // Load the template PDF from the public folder
  const res = await fetch('/sheet.pdf');
  if (!res.ok) throw new Error('Could not load sheet.pdf template');
  const templateBytes = await res.arrayBuffer();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  // ── Helpers ────────────────────────────────────────────────────────────────
  const set = (name: string, value: string | number) => {
    try { form.getTextField(name).setText(String(value)); } catch { /* skip missing / incompatible */ }
  };
  const tick = (name: string, on: boolean) => {
    try { on ? form.getCheckBox(name).check() : form.getCheckBox(name).uncheck(); } catch {}
  };

  // ── Basic identity ─────────────────────────────────────────────────────────
  set('Name',             character.name || 'Unnamed Hero');
  set('Class',            character.class);
  set('Species',          character.race);
  set('Subclass',         character.subclass || '');
  set('Level',            character.level);
  set('Experience Points', character.xp ?? 0);
  set('Background',       character.background);
  set('Prof Bonus',       formatBonus(profBonus));

  // ── Combat stats ──────────────────────────────────────────────────────────
  set('AC',        character.ac);
  set('Current HP', character.hp.current);
  set('Temp HP',   character.hp.temp || 0);
  set('Max HP',    character.hp.max);
  set('MAX HD',    character.hitDice.total);
  const spentHD = Math.max(0, character.level - (character.hitDice.remaining ?? character.level));
  set('Spent HD',  spentHD);
  set(
    'SPEED',
    `${effectiveWalkingSpeedFt(
      character.speed || '30ft',
      character.equippedArmor,
      character.abilities.str,
    )}ft`,
  );
  set('EXHAUSTION', character.exhaustion || 0);
  set('INIT',      formatBonus(character.initiative || getModifier(character.abilities.dex)));

  // ── Ability scores ─────────────────────────────────────────────────────────
  const AB_FIELDS: Record<Ability, { mod: string; score: string; save: string }> = {
    str: { mod: 'SRT MOD',   score: 'STR SORE',   save: 'STR SAVE' },
    dex: { mod: 'DEX MOD',   score: 'DEX SCORE',  save: 'DEX SAVE' },
    con: { mod: 'CON MOD',   score: 'CON SCORE',  save: 'CON SAVE' },
    int: { mod: 'INT MOD',   score: 'INTR SCORE', save: 'INT SAVE' },
    wis: { mod: 'WIS MOD',   score: 'WIS SCORE',  save: 'WIS SAVE' },
    cha: { mod: 'CHA MOD',   score: 'CHA SCORE',  save: 'CHA SAVE' },
  };

  for (const [ab, fields] of Object.entries(AB_FIELDS) as [Ability, { mod: string; score: string; save: string }][]) {
    const score    = character.abilities[ab];
    const mod      = getModifier(score);
    const isProf   = character.proficiencies.includes(ab);
    const saveBonus = mod + (isProf ? profBonus : 0);
    set(fields.mod,   formatBonus(mod));
    set(fields.score, score);
    set(fields.save,  formatBonus(saveBonus));
  }

  // ── Skill bonuses ──────────────────────────────────────────────────────────
  const SKILL_FIELDS: Record<string, string> = {
    'Athletics':      'ATHLETICS',
    'Acrobatics':     'ACROBATICS',
    'Sleight of Hand':'SLEIGHT OF HAND',
    'Stealth':        'STEALTH',
    'Arcana':         'ARCANA',
    'History':        'HISTORY',
    'Investigation':  'INVESTIGATION',
    'Nature':         'NATURE',
    'Religion':       'RELIGION',
    'Animal Handling':'ANIMAL HANDLING',
    'Insight':        'INSIGHT',
    'Medicine':       'MEDICINE',
    'Perception':     'PERCEPTION',
    'Survival':       'SURVIVAL',
    'Deception':      'DECEPTION',
    'Intimidation':   'INTIMIDATION',
    'Performance':    'PERFORMANCE',
    'Persuasion':     'PERSUASION',
  };

  for (const skill of character.skills) {
    const fn = SKILL_FIELDS[skill.name];
    if (!fn) continue;
    const score = character.abilities[skill.ability];
    const bonus = getSkillEffectiveBonus(skill, score, profBonus);
    set(fn, formatBonus(bonus));
  }

  // ── Proficiency / expertise checkboxes (Check Box0–71) ────────────────────
  // 24 items × 3 boxes each = 72 total.
  // For each item: box[start] = proficiency ring, box[start+1] = expertise ring
  const PROF_BOXES: Array<{ ability?: Ability; skill?: string; start: number }> = [
    { ability: 'str', start: 0  }, { skill: 'Athletics',       start: 3  },
    { ability: 'dex', start: 6  }, { skill: 'Acrobatics',      start: 9  },
                                    { skill: 'Sleight of Hand', start: 12 },
                                    { skill: 'Stealth',         start: 15 },
    { ability: 'con', start: 18 },
    { ability: 'int', start: 21 }, { skill: 'Arcana',          start: 24 },
                                    { skill: 'History',         start: 27 },
                                    { skill: 'Investigation',   start: 30 },
                                    { skill: 'Nature',          start: 33 },
                                    { skill: 'Religion',        start: 36 },
    { ability: 'wis', start: 39 }, { skill: 'Animal Handling', start: 42 },
                                    { skill: 'Insight',         start: 45 },
                                    { skill: 'Medicine',        start: 48 },
                                    { skill: 'Perception',      start: 51 },
                                    { skill: 'Survival',        start: 54 },
    { ability: 'cha', start: 57 }, { skill: 'Deception',       start: 60 },
                                    { skill: 'Intimidation',    start: 63 },
                                    { skill: 'Performance',     start: 66 },
                                    { skill: 'Persuasion',      start: 69 },
  ];

  for (const item of PROF_BOXES) {
    let prof = false, exp = false;
    if (item.ability) {
      prof = character.proficiencies.includes(item.ability);
    } else if (item.skill) {
      const s = character.skills.find(sk => sk.name === item.skill);
      if (s) { prof = s.proficient; exp = s.expert ?? false; }
    }
    tick(`Check Box${item.start}`,     prof);
    tick(`Check Box${item.start + 1}`, exp);
  }

  // ── Class features & traits ────────────────────────────────────────────────
  const cfList = [...(character.classFeatures ?? [])].sort(
    (a, b) => (a.acquiredAtLevel ?? 999) - (b.acquiredAtLevel ?? 999),
  );
  const half   = Math.ceil(cfList.length / 2);
  const cf1    = cfList.slice(0, half).map(f => `${f.name}: ${f.description}`).join('\n\n');
  const cf2    = cfList.slice(half).map(f => `${f.name}: ${f.description}`).join('\n\n');
  set('CLASS FEATURES 1', cf1 || character.features || '');
  set('CLASS FEATURES 2', cf2);
  set('TRAITS', (character.racialTraits ?? []).map(f => `${f.name}: ${f.description}`).join('\n\n'));

  // ── Weapons (up to 6) ─────────────────────────────────────────────────────
  (character.weapons ?? []).slice(0, 6).forEach((w, i) => {
    const n = i + 1;
    const ab = w.attackAbility ?? 'str';
    const abilMod = getModifier(character.abilities[ab]);
    const atk = abilMod + (w.proficient ? profBonus : 0) + (w.bonus ?? 0);
    const dmg = `${w.damageDice}${abilMod >= 0 ? '+' : ''}${abilMod}`;
    set(`pcWepName${n}`,  w.name);
    set(`pcWepAtt${n}`,   formatBonus(atk));
    set(`pcWepDmg${n}`,   dmg);
    set(`pcWepNotes${n}`, `${w.damageType}${w.properties ? ' — ' + w.properties : ''}`);
  });

  // ── Equipment & armor ─────────────────────────────────────────────────────
  set('ARMOR WORN', character.equippedArmor
    ? `${character.equippedArmor}${character.equippedShield ? ' + Shield' : ''}`
    : 'Unarmored');
  set('EQUIPMENT1', character.inventory || '');

  // ── Spellcasting overview ─────────────────────────────────────────────────
  const spMod = getModifier(character.abilities[character.spellcasting.ability]) + profBonus;
  const spDC  = 8 + spMod;
  set('SPELLCASTING ABILITY', character.spellcasting.ability.toUpperCase());
  set('SPELLCASTING MOD',     formatBonus(spMod));
  set('SPELL SAVE DC',        spDC);
  set('SPELL ATTK BONUS',     formatBonus(spMod));

  // Spell slot totals (capped to PHB tracker layout)
  for (let lvl = 1; lvl <= 9; lvl++) {
    const slot = character.spellcasting.slots[lvl] ?? { total: 0, expended: 0 };
    const cap = maxSpellSlotTrackerSlots(lvl);
    const total = Math.min(Math.max(slot.total, 0), cap);
    if (total > 0) set(`SPELL SLOT TOTAL ${lvl}`, total);
  }

  // Spell slot tracking checkboxes (Check Box72–93) — indices match official sheet rows
  const SLOT_START: Record<number, number> = {
    1: 72, 2: 76, 3: 79, 4: 82, 5: 85, 6: 88, 7: 90, 8: 92, 9: 93,
  };
  for (let lvl = 1; lvl <= 9; lvl++) {
    const start = SLOT_START[lvl];
    const count = maxSpellSlotTrackerSlots(lvl);
    const exp = character.spellcasting.slots[lvl]?.expended ?? 0;
    for (let i = 0; i < count; i++) {
      tick(`Check Box${start + i}`, (exp & (1 << i)) !== 0);
    }
  }
  // Template still has extra checkboxes for old 3rd/5th/7th slots on those rows
  for (const name of ['Check Box87', 'Check Box89', 'Check Box91']) {
    tick(name, false);
  }

  // ── Spells across spellbook pages ─────────────────────────────────────────
  // The PDF appears to have 5 spellbook pages (identified by the field prefix):
  //   Page 3 → cantrips           (spellbookText3.0.0.N)
  //   Page 4 → level 1            (spellbookText4.0.0.N)
  //   Page 6 → levels 2–3         (spellbookText6.0.N)
  //   Page 7 → levels 4–5         (spellbookText7.0.N)
  //   Page 8 → levels 6–9         (spellbookText8.0.N)
  // Each page has up to 29 rows (index 0–28).
  // Prepared checkboxes follow the spellbookCheck Box20X.0.N naming pattern.
  const SPELL_PAGES: Array<{
    levels: number[];
    namePrefix: string;
    prepPrefix: string;
    concPrefix: string;
  }> = [
    { levels: [0],          namePrefix: 'spellbookText3.0.0.', prepPrefix: 'spellbookCheck Box205.0.', concPrefix: 'spellbookCheck Box207.0.' },
    { levels: [1],          namePrefix: 'spellbookText4.0.0.', prepPrefix: 'spellbookCheck Box206.0.', concPrefix: 'spellbookCheck Box208.0.' },
    { levels: [2, 3],       namePrefix: 'spellbookText6.0.',   prepPrefix: 'Check Box205.',            concPrefix: 'Check Box207.'            },
    { levels: [4, 5],       namePrefix: 'spellbookText7.0.',   prepPrefix: 'Check Box206.',            concPrefix: 'Check Box208.'            },
    { levels: [6, 7, 8, 9], namePrefix: 'spellbookText8.0.',   prepPrefix: 'Check Box209.',            concPrefix: 'Check Box210.'            },
  ];

  const byLevel: Record<number, typeof character.spellcasting.spells> = {};
  for (const sp of character.spellcasting.spells) {
    (byLevel[sp.level] ??= []).push(sp);
  }

  for (const page of SPELL_PAGES) {
    const pageSpells = page.levels.flatMap(lvl => byLevel[lvl] ?? []);
    pageSpells.slice(0, 29).forEach((sp, i) => {
      set(`${page.namePrefix}${i}`,  sp.name);
      tick(`${page.prepPrefix}${i}`, sp.prepared);
      tick(`${page.concPrefix}${i}`, sp.isConcentration);
    });
  }

  // ── Trigger download ──────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${(character.name || 'Character').replace(/[^a-z0-9_\-]/gi, '_')}_Sheet.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

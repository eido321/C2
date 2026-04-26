import React, { useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ChevronLeft, ChevronRight, Check, Sparkles, FileText,
  Sword, Users, BookOpen, Sliders, Eye, Minus, Plus, Wand2, Package, Upload,
} from 'lucide-react';
import { getSpellSlots } from '@/data/levelData';
import { cn, getModifier, getProficiencyBonus } from '@/lib/utils';
import { getDefaultSpellcastingAbility } from '@/lib/classSpellcasting';
import { Character, INITIAL_CHARACTER, Ability, Skill } from '@/types';
import { DND_CLASSES, ALIGNMENTS } from '@/config/constants';
import { RACE_LIST, RaceTemplate, LineageOption, buildRaceFeatures } from '@/data/races';
import {
  BACKGROUND_LIST,
  BackgroundTemplate,
  backgroundRequiresGamingSetChoice,
} from '@/data/backgrounds';
import { MUSICAL_INSTRUMENT_PHB_2024 } from '@/data/musicalInstruments';
import { GAMING_SET_PHB_2024 } from '@/data/gamingSets';
import { toughFeatTotalHpBonus } from '@/lib/toughFeatHp';
import {
  ARTISAN_BACKGROUND_TOOL_CHOICES,
  CRAFTER_FAST_CRAFTING_ARTISAN_TOOLS,
} from '@/data/crafterFastCrafting';
import { ABILITY_LABELS as BG_ABILITY_LABELS } from '@/data/backgrounds';
import { FEAT_LIST, FeatTemplate } from '@/data/feats';
import { CLASS_FEATURES, getFeaturesForLevel } from '@/data/levelData';
import { SPELL_LIST } from '@/data/spells';
import { SPELL_CLASS_MAP } from '@/data/spellClasses';
import { ARMOR_LIST, computeAC } from '@/data/armor';
import {
  BACKGROUND_GOLD_INSTEAD_GP,
  CLASS_GOLD_INSTEAD_GP,
  CLASS_PACK_DEFAULT_ARMOR,
  CLASS_PACK_EXTRA_GP,
  armorAndShieldCostGp,
  bodyArmorOptions,
  canAffordStartingGear,
  computeStartingWalletGp,
  effectiveStartingBodyArmor,
  isArmorFreeFromClassPack,
  parseEquipmentCostGp,
  trailingGoldFromBackgroundEquipment,
} from '@/data/startingWealth';
import { parseCharacterFromJsonText } from '@/lib/importCharacterJSON';
import {
  splitDivineOrderDescription,
  splitPrimalOrderDescription,
} from '@/lib/featPickerBranchSplits';

// ── Per-class metadata ────────────────────────────────────────────────────────
const ALL_SKILLS = [
  'Acrobatics','Animal Handling','Arcana','Athletics','Deception',
  'History','Initiative','Insight','Intimidation','Investigation','Medicine',
  'Nature','Perception','Performance','Persuasion','Religion',
  'Sleight of Hand','Stealth','Survival',
];

interface ClassMeta {
  hitDie: string;
  saves: Ability[];
  availableSkills: string[];
  numSkills: number;
  spellAbility: Ability | null;
  description: string;
  /** Left accent stripe on class tiles (paired with dark tile bg). */
  cardAccent: string;
  /** How many cantrips the class knows at level 1 (0 = none) */
  cantripCount: number;
  /**
   * For "known" casters: number of spells known at level 1.
   * For "prepared" casters (Cleric, Druid, Paladin, Artificer): null
   *   — they prepare (ability mod + level) spells from their full list each day.
   * For Wizard: null but they also fill a 6-spell spellbook.
   */
  knownCount: number | null;
  /** 'none' | 'known' | 'prepared' | 'spellbook' */
  spellcastingType: 'none' | 'known' | 'prepared' | 'spellbook';
  /** Spells-per-day start at level (1 for most, 2 for Ranger/Paladin) */
  spellsStartLevel: number;
}

const CLASS_META: Record<string, ClassMeta> = {
  Artificer:  { hitDie:'d8',  saves:['int','con'], availableSkills:['Arcana','History','Investigation','Medicine','Nature','Perception','Sleight of Hand'], numSkills:2, spellAbility:'int', description:'Master inventor who creates magical gadgets and infusions', cardAccent:'border-l-amber-500',   cantripCount:2, knownCount:null,  spellcastingType:'prepared',  spellsStartLevel:1 },
  Barbarian:  { hitDie:'d12', saves:['str','con'], availableSkills:['Animal Handling','Athletics','Intimidation','Nature','Perception','Survival'],           numSkills:2, spellAbility:null, description:'Primal warrior who channels rage into devastating power',       cardAccent:'border-l-rose-500',     cantripCount:0, knownCount:0,     spellcastingType:'none',      spellsStartLevel:99 },
  Bard:       { hitDie:'d8',  saves:['dex','cha'], availableSkills:ALL_SKILLS,                                                                                numSkills:3, spellAbility:'cha', description:'Inspiring performer whose magic flows from artistic soul',   cardAccent:'border-l-fuchsia-500',   cantripCount:2, knownCount:4,     spellcastingType:'known',     spellsStartLevel:1 },
  Cleric:     { hitDie:'d8',  saves:['wis','cha'], availableSkills:['History','Insight','Medicine','Persuasion','Religion'],                                  numSkills:2, spellAbility:'wis', description:'Divine agent who wields the power of the gods',            cardAccent:'border-l-yellow-500', cantripCount:3, knownCount:null, spellcastingType:'prepared',  spellsStartLevel:1 },
  Druid:      { hitDie:'d8',  saves:['int','wis'], availableSkills:['Arcana','Animal Handling','Insight','Medicine','Nature','Perception','Religion','Survival'], numSkills:2, spellAbility:'wis', description:'Guardian of nature who wields primal magic',          cardAccent:'border-l-emerald-500', cantripCount:2, knownCount:null,  spellcastingType:'prepared',  spellsStartLevel:1 },
  Fighter:    { hitDie:'d10', saves:['str','con'], availableSkills:['Acrobatics','Animal Handling','Athletics','History','Insight','Intimidation','Perception','Survival'], numSkills:2, spellAbility:null, description:'Versatile warrior skilled in every aspect of combat', cardAccent:'border-l-slate-400', cantripCount:0, knownCount:0, spellcastingType:'none', spellsStartLevel:99 },
  Monk:       { hitDie:'d8',  saves:['str','dex'], availableSkills:['Acrobatics','Athletics','History','Insight','Religion','Stealth'],                       numSkills:2, spellAbility:null, description:'Master of martial arts who harnesses mystical ki energy',    cardAccent:'border-l-cyan-500',   cantripCount:0, knownCount:0,     spellcastingType:'none',      spellsStartLevel:99 },
  Paladin:    { hitDie:'d10', saves:['wis','cha'], availableSkills:['Athletics','Insight','Intimidation','Medicine','Persuasion','Religion'],                 numSkills:2, spellAbility:'cha', description:'Holy warrior bound by a sacred oath to a divine cause',   cardAccent:'border-l-violet-500', cantripCount:0, knownCount:null, spellcastingType:'prepared',  spellsStartLevel:2 },
  Ranger:     { hitDie:'d10', saves:['str','dex'], availableSkills:['Animal Handling','Athletics','Insight','Investigation','Nature','Perception','Stealth','Survival'], numSkills:3, spellAbility:'wis', description:'Skilled hunter and tracker who excels in the wilderness', cardAccent:'border-l-lime-500', cantripCount:0, knownCount:2, spellcastingType:'known', spellsStartLevel:2 },
  Rogue:      { hitDie:'d8',  saves:['dex','int'], availableSkills:['Acrobatics','Athletics','Deception','Insight','Intimidation','Investigation','Perception','Performance','Persuasion','Sleight of Hand','Stealth'], numSkills:4, spellAbility:null, description:'Cunning trickster who strikes swiftly from the shadows', cardAccent:'border-l-zinc-500', cantripCount:0, knownCount:0, spellcastingType:'none', spellsStartLevel:99 },
  Sorcerer:   { hitDie:'d6',  saves:['con','cha'], availableSkills:['Arcana','Deception','Insight','Intimidation','Persuasion','Religion'],                   numSkills:2, spellAbility:'cha', description:'Spellcaster born with innate power running through their blood', cardAccent:'border-l-orange-500', cantripCount:4, knownCount:2, spellcastingType:'known', spellsStartLevel:1 },
  Warlock:    { hitDie:'d8',  saves:['wis','cha'], availableSkills:['Arcana','Deception','History','Intimidation','Investigation','Nature','Religion'],        numSkills:2, spellAbility:'cha', description:'Magic wielder who made a pact with a powerful otherworldly entity', cardAccent:'border-l-purple-500', cantripCount:2, knownCount:2, spellcastingType:'known', spellsStartLevel:1 },
  Wizard:     { hitDie:'d6',  saves:['int','wis'], availableSkills:['Arcana','History','Insight','Investigation','Medicine','Religion'],                       numSkills:2, spellAbility:'int', description:'Scholar who channels magic through exhaustive arcane study', cardAccent:'border-l-sky-500', cantripCount:3, knownCount:null, spellcastingType:'spellbook', spellsStartLevel:1 },
};

const HIT_DIE_MAX: Record<string, number> = { d6:6, d8:8, d10:10, d12:12 };

// ── Ability score helpers ─────────────────────────────────────────────────────
const ABILITIES: Ability[] = ['str','dex','con','int','wis','cha'];
const AB_SHORT: Record<Ability, string> = { str:'STR', dex:'DEX', con:'CON', int:'INT', wis:'WIS', cha:'CHA' };
const AB_FULL: Record<Ability, string>  = { str:'Strength', dex:'Dexterity', con:'Constitution', int:'Intelligence', wis:'Wisdom', cha:'Charisma' };

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const PB_COST: Record<number, number> = { 8:0, 9:1, 10:2, 11:3, 12:4, 13:5, 14:7, 15:9 };
const PB_BUDGET = 27;

// ── Wizard state type ─────────────────────────────────────────────────────────
interface WizardState {
  name: string;
  alignment: string;

  className: string;
  classSkills: string[];

  race: RaceTemplate | null;
  chosenFeat: FeatTemplate | null;
  chosenSkill: string;       // for bonusChoice.type === 'skill_1'
  chosenSpeciesSkills: string[];  // for race.bonusSkillCount
  chosenLineage: LineageOption | null;
  chosenSize: string;        // for races with sizeChoices
  featSearch: string;
  /** Sub-choices for the SPECIES origin feat (separate from background feat choices) */
  speciesMiCantrips: string[];
  speciesMiSpell: string;
  speciesSkilledPicks: string[];

  background: BackgroundTemplate | null;
  /** Editable rules text for the background Origin feat (initialized from the template) */
  backgroundFeatDescriptionText: string;
  /** Sub-choices for feats that require picking spells/skills */
  miCantrips: string[];    // Magic Initiate — 2 cantrips chosen
  miSpell: string;         // Magic Initiate — 1 level-1 spell chosen
  skilledPicks: string[];  // Skilled — 3 skill/tool picks
  /** Artisan background: one Artisan's tool (PHB "Choose one kind of Artisan's Tools") */
  artisanBackgroundTool: string;
  /** Crafter feat: three tools from PHB Fast Crafting table only */
  crafterFeatTools: string[];
  /** Entertainer background: one Musical Instrument (PHB tool proficiency line), shown with Musician feat */
  instrumentPick: string;
  /** Guard / Noble / Soldier: one Gaming Set from PHB chapter 6 variants */
  gamingSetPick: string;
  asiMode: 'two_one' | 'all_one';
  plusTwo: Ability | null;
  plusOne: Ability | null;

  abilityMethod: 'standard' | 'pointbuy' | 'manual';
  standardAssign: Partial<Record<Ability, number>>;
  abilities: Record<Ability, number>;

  /** Spells step: chosen cantrips */
  chosenCantrips: string[];
  /** Spells step: chosen known / prepared / spellbook spells */
  chosenKnownSpells: string[];
  backgroundEquipmentChoice: 'package' | 'gold';
  classEquipmentChoice: 'package' | 'gold';
  startingArmorName: string;
  /** Explicitly unarmored (overrides class kit armor) */
  startingUnarmored: boolean;
  startingShield: boolean;
  /** Cleric level 1 — required before leaving Class step */
  clericDivineOrder: 'protector' | 'thaumaturge' | null;
  /** Druid level 1 — required before leaving Class step */
  druidPrimalOrder: 'magician' | 'warden' | null;
}

const INIT: WizardState = {
  name: '', alignment: 'Neutral Good',
  className: '', classSkills: [],
  race: null, chosenFeat: null, chosenSkill: '', chosenSpeciesSkills: [],
  chosenLineage: null, chosenSize: '', featSearch: '',
  speciesMiCantrips: [], speciesMiSpell: '', speciesSkilledPicks: [],
  background: null, backgroundFeatDescriptionText: '', miCantrips: [], miSpell: '', skilledPicks: [], artisanBackgroundTool: '', crafterFeatTools: [], instrumentPick: '', gamingSetPick: '',
  asiMode: 'two_one', plusTwo: null, plusOne: null,
  abilityMethod: 'standard',
  standardAssign: {},
  abilities: { str:8, dex:8, con:8, int:8, wis:8, cha:8 },
  chosenCantrips: [],
  chosenKnownSpells: [],
  backgroundEquipmentChoice: 'package',
  classEquipmentChoice: 'package',
  startingArmorName: '',
  startingUnarmored: false,
  startingShield: false,
  clericDivineOrder: null,
  druidPrimalOrder: null,
};

// ── STEP names & icons ────────────────────────────────────────────────────────
const STEP_META_BASE = [
  { label: 'Identity',    icon: Users    },
  { label: 'Background',  icon: BookOpen },
  { label: 'Class',       icon: Sword    },
  { label: 'Species',     icon: Sparkles },
  { label: 'Abilities',   icon: Sliders  },
];

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  onConfirm: (character: Character) => void;
  onBlank: () => void;
  onClose: () => void;
}

export const CharacterCreationWizard: React.FC<Props> = ({ onConfirm, onBlank, onClose }) => {
  const [step, setStep] = useState(0); // 0 = welcome
  const [s, setS] = useState<WizardState>(INIT);
  const [jsonImportError, setJsonImportError] = useState<string | null>(null);
  const jsonFileRef = useRef<HTMLInputElement>(null);
  const upd = (patch: Partial<WizardState>) => setS(prev => ({ ...prev, ...patch }));

  // Whether the chosen class has a spells step
  const classMeta = CLASS_META[s.className] ?? null;
  const isCaster = !!classMeta && classMeta.spellcastingType !== 'none';
  /** Level 1 cantrips to pick in the wizard (Divine / Primal Order bonuses applied). */
  const wizardCantripTarget = useMemo(() => {
    if (!classMeta || classMeta.spellcastingType === 'none') return 0;
    let n = classMeta.cantripCount;
    if (s.className === 'Cleric' && s.clericDivineOrder === 'thaumaturge') n += 1;
    if (s.className === 'Druid' && s.druidPrimalOrder === 'magician') n += 1;
    return n;
  }, [classMeta, s.className, s.clericDivineOrder, s.druidPrimalOrder]);
  const STEP_META = [
    ...STEP_META_BASE,
    ...(isCaster ? [{ label: 'Spells', icon: Wand2 }] : []),
    { label: 'Equipment', icon: Package },
    { label: 'Review', icon: Eye },
  ];
  const TOTAL_STEPS = STEP_META.length;

  // ── Final abilities (needed before step validation & equipment) ─────────────
  const finalAbilities = useMemo((): Record<Ability, number> => {
    const base: Record<Ability, number> = { ...s.abilities };
    if (s.abilityMethod === 'standard') {
      ABILITIES.forEach(a => { if (s.standardAssign[a] !== undefined) base[a] = s.standardAssign[a]!; });
    }
    if (s.background) {
      if (s.asiMode === 'all_one') {
        s.background.abilityScores.forEach(a => { base[a] = Math.min(20, (base[a] || 0) + 1); });
      } else {
        if (s.plusTwo) base[s.plusTwo] = Math.min(20, (base[s.plusTwo] || 0) + 2);
        if (s.plusOne) base[s.plusOne] = Math.min(20, (base[s.plusOne] || 0) + 1);
      }
    }
    return base;
  }, [s]);

  const equipmentStepOk = useMemo(() => {
    if (!s.background || !s.className) return false;
    const wallet = computeStartingWalletGp({
      backgroundEquipmentChoice: s.backgroundEquipmentChoice,
      classEquipmentChoice: s.classEquipmentChoice,
      backgroundEquipmentLine: s.background.equipmentA,
      className: s.className,
    });
    const body = effectiveStartingBodyArmor({
      startingArmorName: s.startingArmorName,
      startingUnarmored: s.startingUnarmored,
      classEquipmentChoice: s.classEquipmentChoice,
      className: s.className,
    });
    return canAffordStartingGear(
      wallet,
      s.className,
      s.classEquipmentChoice,
      body,
      s.startingShield,
      ARMOR_LIST,
      finalAbilities.str,
    );
  }, [
    s.background,
    s.className,
    s.backgroundEquipmentChoice,
    s.classEquipmentChoice,
    s.startingArmorName,
    s.startingUnarmored,
    s.startingShield,
    finalAbilities.str,
  ]);

  // ── Step validation ─────────────────────────────────────────────────────────
  const canNext = useCallback((): boolean => {
    switch (step) {
      case 1: return s.name.trim().length > 0;
      // Step 2 = Background (moved before Class)
      case 2: {
        if (!s.background) return false;
        // Validate feat sub-choices
        const feat = s.background.feat;
        if (feat.startsWith('Magic Initiate')) {
          if (s.miCantrips.length < 2 || !s.miSpell) return false;
        }
        if (feat === 'Skilled') {
          if (s.skilledPicks.length < 3) return false;
        }
        if (feat === 'Crafter') {
          if (!s.artisanBackgroundTool.trim()) return false;
          if (s.crafterFeatTools.length < 3) return false;
        }
        if (feat === 'Musician') {
          if (!s.instrumentPick.trim()) return false;
        }
        if (s.background && backgroundRequiresGamingSetChoice(s.background)) {
          if (!s.gamingSetPick.trim()) return false;
        }
        if (s.asiMode === 'two_one') return !!s.plusTwo && !!s.plusOne && s.plusTwo !== s.plusOne;
        return true;
      }
      // Step 3 = Class
      case 3: {
        const meta = CLASS_META[s.className];
        if (!meta || s.classSkills.length !== meta.numSkills) return false;
        if (s.className === 'Cleric' && !s.clericDivineOrder) return false;
        if (s.className === 'Druid' && !s.druidPrimalOrder) return false;
        return true;
      }
      // Step 4 = Species
      case 4: {
        if (!s.race) return false;
        const bonus = s.race.bonusChoice;
        // Bonus choice validation
        if (bonus?.type === 'feat'    && !s.chosenFeat)      return false;
        if (bonus?.type === 'skill_1' && !s.chosenSkill)     return false;
        if (bonus?.type === 'lineage' && !s.chosenLineage)   return false;
        // Species feat sub-choices
        if (s.chosenFeat) {
          const fn = s.chosenFeat.name;
          if (fn.startsWith('Magic Initiate') && (s.speciesMiCantrips.length < 2 || !s.speciesMiSpell)) return false;
          if (fn === 'Skilled' && s.speciesSkilledPicks.length < 3) return false;
        }
        // Bonus skill picks (e.g. Human's Skillful)
        if ((s.race.bonusSkillCount ?? 0) > 0 && s.chosenSpeciesSkills.length < (s.race.bonusSkillCount ?? 0)) return false;
        // Size choice validation
        if ((s.race.sizeChoices?.length ?? 0) > 0 && !s.chosenSize) return false;
        return true;
      }
      case 5: {
        if (s.abilityMethod === 'standard') return ABILITIES.every(a => s.standardAssign[a] !== undefined);
        return true;
      }
      case 6: {
        if (isCaster) {
          const meta = classMeta!;
          if (s.chosenCantrips.length < wizardCantripTarget) return false;
          if (meta.spellcastingType === 'known' && meta.spellsStartLevel === 1) {
            if (s.chosenKnownSpells.length < (meta.knownCount ?? 0)) return false;
          }
          if (meta.spellcastingType === 'spellbook') {
            if (s.chosenKnownSpells.length < 6) return false;
          }
          return true;
        }
        return equipmentStepOk;
      }
      case 7: {
        if (isCaster) return equipmentStepOk;
        return true;
      }
      default: return true;
    }
  }, [step, s, isCaster, classMeta, equipmentStepOk, wizardCantripTarget]);

  // ── Build final character ───────────────────────────────────────────────────
  const buildCharacter = (): Character => {
    const id = Math.random().toString(36).substr(2, 9);
    const meta = CLASS_META[s.className] || CLASS_META['Fighter'];
    const profBonus = getProficiencyBonus(1);
    const ab = finalAbilities;
    const conMod = getModifier(ab.con);
    const dexMod = getModifier(ab.dex);
    const hitDieMax = HIT_DIE_MAX[meta.hitDie] || 8;
    const toughHp =
      s.background?.feat === 'Tough' ? toughFeatTotalHpBonus(1) : 0;
    const maxHP = hitDieMax + conMod + toughHp;

    const bodyArmor = effectiveStartingBodyArmor({
      startingArmorName: s.startingArmorName,
      startingUnarmored: s.startingUnarmored,
      classEquipmentChoice: s.classEquipmentChoice,
      className: s.className,
    });
    const walletGp = s.background
      ? computeStartingWalletGp({
          backgroundEquipmentChoice: s.backgroundEquipmentChoice,
          classEquipmentChoice: s.classEquipmentChoice,
          backgroundEquipmentLine: s.background.equipmentA,
          className: s.className,
        })
      : 0;
    const { total: armorSpend } = armorAndShieldCostGp({
      className: s.className,
      classEquipmentChoice: s.classEquipmentChoice,
      bodyArmorName: bodyArmor,
      buyShield: s.startingShield,
      armors: ARMOR_LIST,
    });
    const gpRemaining = Math.max(0, walletGp - armorSpend);
    const ac = computeAC(bodyArmor, s.startingShield, dexMod);

    const bgEqSummary =
      s.backgroundEquipmentChoice === 'package'
        ? `Package (${s.background?.equipmentA ?? ''})`
        : `${BACKGROUND_GOLD_INSTEAD_GP} GP (forgo background equipment)`;
    const classEqSummary =
      s.classEquipmentChoice === 'package'
        ? `Starting equipment (+${CLASS_PACK_EXTRA_GP[s.className] ?? 0} GP in pouch)`
        : `Starting gold (${CLASS_GOLD_INSTEAD_GP[s.className] ?? 100} GP — PHB class option)`;
    const armorSummary = [
      bodyArmor ? bodyArmor : 'Unarmored',
      s.startingShield ? 'Shield' : null,
    ].filter(Boolean).join(', ');
    const inventoryLines = [
      '— Starting gear (2024 PHB) —',
      `Background: ${bgEqSummary}`,
      `Class: ${classEqSummary}`,
      `Worn: ${armorSummary}`,
      `Coin: ${gpRemaining} GP (after armor/shield)`,
    ].join('\n');

    // Build racial traits (species) + background Origin feat as its own entry
    const racialFromRace = s.race
      ? buildRaceFeatures(s.race, s.chosenFeat, s.chosenSkill || undefined, s.chosenLineage)
      : [];
    const backgroundFeatEntry = s.background
      ? (() => {
          let desc = s.backgroundFeatDescriptionText.trim();
          if (s.background!.feat === 'Crafter') {
            const bits: string[] = [];
            if (s.artisanBackgroundTool.trim()) {
              bits.push(`Artisan background — tool: ${s.artisanBackgroundTool.trim()}`);
            }
            if (s.crafterFeatTools.length > 0) {
              bits.push(`Crafter feat (Fast Crafting, 3 tools): ${s.crafterFeatTools.join(', ')}`);
            }
            if (bits.length) desc = `${desc}\n\n${bits.join('\n')}`.trim();
          }
          if (s.background!.feat === 'Musician' && s.instrumentPick.trim()) {
            desc = `${desc}\n\nMusical instrument (Entertainer background): ${s.instrumentPick.trim()}`.trim();
          }
          return [
            {
              id: `${id}_bgfeat`,
              name: `Feat: ${s.background!.feat}`,
              description: desc,
              source: s.background!.name,
            },
          ];
        })()
      : [];
    const gamingSetEntry =
      s.background && s.gamingSetPick.trim()
        ? [
            {
              id: `${id}_gamingset`,
              name: `Gaming set (${s.background.name})`,
              description: s.gamingSetPick.trim(),
              source: s.background.name,
            },
          ]
        : [];
    const racialTraits = [...racialFromRace, ...backgroundFeatEntry, ...gamingSetEntry];

    // Collect all proficient skills
    const bgSkills = s.background?.skills ?? [];
    const staticSpeciesSkills = s.race?.staticSkillProfs ?? [];
    const proficientSkills = new Set([
      ...s.classSkills, ...bgSkills, ...staticSpeciesSkills, ...s.chosenSpeciesSkills,
      ...s.skilledPicks, ...s.speciesSkilledPicks,
    ]);
    if (s.chosenSkill) proficientSkills.add(s.chosenSkill);

    const skills: Skill[] = INITIAL_CHARACTER.skills.map(sk => ({
      ...sk,
      proficient: proficientSkills.has(sk.name),
    }));

    // Actual level 1 class features from levelData
    const level1Features = getFeaturesForLevel(s.className, 1);
    const classFeatures = level1Features.length > 0
      ? level1Features.map((f, i) => {
          let name = f.name;
          let description = f.desc;
          if (s.className === 'Cleric' && f.name === 'Divine Order' && s.clericDivineOrder) {
            const parts = splitDivineOrderDescription(f.desc);
            const v = s.clericDivineOrder;
            const body = v === 'protector' ? parts?.protector : parts?.thaumaturge;
            name = `Divine Order (${v === 'protector' ? 'Protector' : 'Thaumaturge'})`;
            description = parts ? `${parts.intro}\n\n${body ?? ''}`.trim() : f.desc;
          }
          if (s.className === 'Druid' && f.name === 'Primal Order' && s.druidPrimalOrder) {
            const parts = splitPrimalOrderDescription(f.desc);
            const v = s.druidPrimalOrder;
            const body = v === 'magician' ? parts?.magician : parts?.warden;
            name = `Primal Order (${v === 'magician' ? 'Magician' : 'Warden'})`;
            description = parts ? `${parts.intro}\n\n${body ?? ''}`.trim() : f.desc;
          }
          return {
            id: `${id}_cf${i}`,
            name,
            description,
            source: s.className,
            acquiredAtLevel: 1,
          };
        })
      : [{
          id: `${id}_cf0`,
          name: `${s.className} Features`,
          description: `Hit Die: ${meta.hitDie} | Saving Throws: ${meta.saves.map(a => AB_SHORT[a]).join(', ')} | Spellcasting: ${meta.spellAbility ? AB_SHORT[meta.spellAbility] : '—'}`,
          source: s.className,
          acquiredAtLevel: 1,
        }];

    // Determine size (use player's choice or extract first word from race.size)
    const resolvedSize = s.chosenSize
      || (s.race?.size.split(' ')[0] ?? 'Medium');

    const wizardBackgroundAsiDeltas = (): Partial<Record<Ability, number>> => {
      if (!s.background) return {};
      if (s.asiMode === 'all_one') {
        return Object.fromEntries(s.background.abilityScores.map((a) => [a, 1])) as Partial<
          Record<Ability, number>
        >;
      }
      const deltas: Partial<Record<Ability, number>> = {};
      if (s.plusTwo) deltas[s.plusTwo] = 2;
      if (s.plusOne) deltas[s.plusOne] = (deltas[s.plusOne] ?? 0) + 1;
      return deltas;
    };

    const { spellcasting: builtSpellcasting, wizardBgMiSpellIds } = (() => {
      const bgMiIds: string[] = [];
      const classCantrips = s.chosenCantrips.map((name) => {
        const tmpl = SPELL_LIST.find((sp) => sp.name === name);
        const id = Math.random().toString(36).substr(2, 9);
        return {
          id,
          name,
          level: 0,
          prepared: true,
          castingTime: tmpl?.castingTime ?? '1 Action',
          range: tmpl?.range ?? '—',
          description: tmpl?.description ?? '',
          components: tmpl?.components ?? { v: true, s: true, m: false },
          isRitual: false,
          isConcentration: tmpl?.isConcentration ?? false,
        };
      });
      const classKnown = s.chosenKnownSpells.map((name) => {
        const tmpl = SPELL_LIST.find((sp) => sp.name === name);
        const id = Math.random().toString(36).substr(2, 9);
        return {
          id,
          name,
          level: tmpl?.level ?? 1,
          prepared: true,
          castingTime: tmpl?.castingTime ?? '1 Action',
          range: tmpl?.range ?? '—',
          description: tmpl?.description ?? '',
          components: tmpl?.components ?? { v: true, s: true, m: false },
          isRitual: tmpl?.isRitual ?? false,
          isConcentration: tmpl?.isConcentration ?? false,
        };
      });
      const bgMiCantrips = s.miCantrips.map((name) => {
        const tmpl = SPELL_LIST.find((sp) => sp.name === name);
        const id = Math.random().toString(36).substr(2, 9);
        bgMiIds.push(id);
        return {
          id,
          name,
          level: 0,
          prepared: true,
          spellBudgetExempt: true,
          castingTime: tmpl?.castingTime ?? '1 Action',
          range: tmpl?.range ?? '—',
          description: tmpl?.description ?? '',
          components: tmpl?.components ?? { v: true, s: true, m: false },
          isRitual: false,
          isConcentration: tmpl?.isConcentration ?? false,
        };
      });
      const speciesMiRows = s.speciesMiCantrips.map((name) => {
        const tmpl = SPELL_LIST.find((sp) => sp.name === name);
        return {
          id: Math.random().toString(36).substr(2, 9),
          name,
          level: 0,
          prepared: true,
          spellBudgetExempt: true,
          castingTime: tmpl?.castingTime ?? '1 Action',
          range: tmpl?.range ?? '—',
          description: tmpl?.description ?? '',
          components: tmpl?.components ?? { v: true, s: true, m: false },
          isRitual: false,
          isConcentration: tmpl?.isConcentration ?? false,
        };
      });
      const speciesMiL1 = s.speciesMiSpell
        ? (() => {
            const tmpl = SPELL_LIST.find((sp) => sp.name === s.speciesMiSpell);
            return [
              {
                id: Math.random().toString(36).substr(2, 9),
                name: s.speciesMiSpell,
                level: 1,
                prepared: true,
                isFree: true,
                spellBudgetExempt: true,
                castingTime: tmpl?.castingTime ?? '1 Action',
                range: tmpl?.range ?? '—',
                description: tmpl?.description ?? '',
                components: tmpl?.components ?? { v: true, s: true, m: false },
                isRitual: false,
                isConcentration: tmpl?.isConcentration ?? false,
              },
            ];
          })()
        : [];
      const bgMiL1 = s.miSpell
        ? (() => {
            const tmpl = SPELL_LIST.find((sp) => sp.name === s.miSpell);
            const id = Math.random().toString(36).substr(2, 9);
            bgMiIds.push(id);
            return [
              {
                id,
                name: s.miSpell,
                level: 1,
                prepared: true,
                isFree: true,
                spellBudgetExempt: true,
                castingTime: tmpl?.castingTime ?? '1 Action',
                range: tmpl?.range ?? '—',
                description: tmpl?.description ?? '',
                components: tmpl?.components ?? { v: true, s: true, m: false },
                isRitual: false,
                isConcentration: tmpl?.isConcentration ?? false,
              },
            ];
          })()
        : [];
      return {
        spellcasting: {
          ability: getDefaultSpellcastingAbility(s.className),
          slots: Object.fromEntries(
            Object.entries(getSpellSlots(s.className, 1)).map(([lvl, count]) => [
              lvl,
              { total: count as number, expended: 0 },
            ]),
          ),
          spells: [
            ...classCantrips,
            ...classKnown,
            ...bgMiCantrips,
            ...speciesMiRows,
            ...speciesMiL1,
            ...bgMiL1,
          ],
        },
        wizardBgMiSpellIds: bgMiIds.length ? bgMiIds : undefined,
      };
    })();

    return {
      ...INITIAL_CHARACTER,
      id,
      name: s.name,
      alignment: s.alignment,
      class: s.className,
      subclass: '',
      level: 1,
      race: s.race?.name ?? '',
      background: s.background?.name ?? '',
      xp: 0,
      proficiencyBonus: profBonus,
      abilities: ab,
      proficiencies: meta.saves as string[],
      skills,
      hp: { max: Math.max(1, maxHP), current: Math.max(1, maxHP), temp: 0 },
      ac,
      equippedArmor: bodyArmor || undefined,
      equippedShield: s.startingShield,
      currency: { cp: 0, sp: 0, ep: 0, pp: 0, gp: gpRemaining },
      inventory: inventoryLines,
      initiative: dexMod,
      speed: `${s.race?.speed ?? 30}ft`,
      languages: s.race?.languages?.length ? s.race.languages.join(', ') : '',
      size: resolvedSize,
      hitDice: { total: `1${meta.hitDie}`, remaining: 1 },
      classFeatures,
      racialTraits,
      ...(s.background
        ? {
            backgroundPickApplied: {
              name: s.background.name,
              asiDeltas: wizardBackgroundAsiDeltas(),
              skills: [s.background.skills[0], s.background.skills[1]],
              feat: s.background.feat,
              ...(wizardBgMiSpellIds?.length ? { miSpellIds: wizardBgMiSpellIds } : {}),
            },
          }
        : {}),
      spellcasting: builtSpellcasting,
      ...(s.className === 'Druid'
        ? {
            wildShape: {
              usesExpended: 0,
              bookmarkedBeastIds: [],
              primalOrder: s.druidPrimalOrder ?? null,
            },
          }
        : {}),
      ...(s.className === 'Cleric'
        ? { clericDevotion: { deityId: null, divineOrder: s.clericDivineOrder ?? null } }
        : {}),
    };
  };

  const handleCreate = () => onConfirm(buildCharacter());

  // ── Shared UI ───────────────────────────────────────────────────────────────
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-lg font-black text-slate-800 mb-1">{children}</h2>
  );
  const Hint = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[11px] text-slate-400 mb-5">{children}</p>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 0 – Welcome
  // ══════════════════════════════════════════════════════════════════════════
  const handleJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setJsonImportError(null);
    if (!file) return;
    try {
      const text = await file.text();
      const char = parseCharacterFromJsonText(text);
      onConfirm({
        ...char,
        id: Math.random().toString(36).substr(2, 9),
      });
      onClose();
    } catch (err) {
      setJsonImportError(err instanceof Error ? err.message : 'Could not load this file.');
    }
  };

  const StepWelcome = (
    <div className="flex flex-col items-center justify-center min-h-[420px] gap-6 py-8">
      <div className="text-center">
        <div className="text-4xl mb-3">📜</div>
        <h1 className="text-2xl font-black text-slate-800">New Character</h1>
        <p className="text-sm text-slate-500 mt-2">How would you like to begin?</p>
      </div>
      <div className="flex flex-col gap-4 w-full max-w-lg">
        <div className="grid grid-cols-2 gap-5">
          <button
            type="button"
            onClick={onBlank}
            className="flex flex-col items-center gap-3 p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl hover:border-slate-400 hover:bg-white transition-all group"
          >
            <FileText size={32} className="text-slate-400 group-hover:text-slate-600" />
            <div className="text-center">
              <div className="font-black text-slate-700 text-sm">Blank Sheet</div>
              <div className="text-[11px] text-slate-400 mt-1">Start with an empty character sheet and fill it in yourself</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex flex-col items-center gap-3 p-6 bg-accent/5 border-2 border-accent/30 rounded-2xl hover:border-accent hover:bg-accent/10 transition-all group"
          >
            <Sparkles size={32} className="text-accent" />
            <div className="text-center">
              <div className="font-black text-accent text-sm">Character Builder</div>
              <div className="text-[11px] text-slate-400 mt-1">Step-by-step creation following 2024 PHB rules</div>
            </div>
          </button>
        </div>
        <input
          ref={jsonFileRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          aria-label="Import character JSON"
          onChange={(e) => void handleJsonFile(e)}
        />
        <button
          type="button"
          onClick={() => {
            setJsonImportError(null);
            jsonFileRef.current?.click();
          }}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl hover:border-slate-400 hover:bg-white transition-all w-full text-center group"
        >
          <Upload size={32} className="text-slate-500 group-hover:text-emerald-700 shrink-0 transition-colors" />
          <div>
            <div className="font-black text-slate-800 text-sm">Load from JSON</div>
            <div className="text-[11px] text-slate-500 mt-1 max-w-[280px] mx-auto">
              Restore a character saved with Download → JSON
            </div>
          </div>
        </button>
        {jsonImportError && (
          <p className="text-sm text-red-600 text-center px-2" role="alert">
            {jsonImportError}
          </p>
        )}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 1 – Identity
  // ══════════════════════════════════════════════════════════════════════════
  const StepIdentity = (
    <div>
      <SectionTitle>Who are you?</SectionTitle>
      <Hint>Give your character a name and choose an alignment.</Hint>
      <div className="space-y-4 max-w-sm">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Character Name *</label>
          <input
            autoFocus
            value={s.name}
            onChange={e => upd({ name: e.target.value })}
            placeholder="Enter a name…"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Alignment</label>
          <select
            value={s.alignment}
            onChange={e => upd({ alignment: e.target.value })}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-accent bg-white"
          >
            {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 2 – Class
  // ══════════════════════════════════════════════════════════════════════════
  const meta = s.className ? CLASS_META[s.className] : null;

  const StepClass = (
    <div>
      <SectionTitle>Choose your class</SectionTitle>
      <Hint>Your class defines your role, abilities, and playstyle.</Hint>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
        {DND_CLASSES.map(cls => {
          const m = CLASS_META[cls];
          const isSelected = s.className === cls;
          return (
            <button
              key={cls}
              onClick={() => upd({
                className: cls, classSkills: [], chosenCantrips: [], chosenKnownSpells: [],
                classEquipmentChoice: 'package',
                startingArmorName: '', startingUnarmored: false, startingShield: false,
                clericDivineOrder: null,
                druidPrimalOrder: null,
              })}
              className={cn(
                'text-left p-3 rounded-xl border transition-all border-l-4',
                isSelected
                  ? 'border-accent/90 bg-zinc-800 border-l-accent shadow-md shadow-black/20 ring-1 ring-accent/25'
                  : cn(
                      'border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600',
                      m.cardAccent,
                    ),
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-zinc-100">{cls}</span>
                {isSelected && <Check size={14} className="text-accent shrink-0" />}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{m.hitDie} · {m.saves.map(a => AB_SHORT[a]).join('/')}</div>
            </button>
          );
        })}
      </div>

      {/* Class detail + skill picks */}
      {meta && (
        <div className="border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-3">
          <div>
            <div className="font-black text-sm text-slate-800">{s.className}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{meta.description}</div>
          </div>

          {s.className === 'Cleric' && (
            <div className="rounded-xl border border-zinc-700 border-l-4 border-l-violet-500 bg-zinc-900 p-3 space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-200">
                Divine Order (level 1)
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Choose Protector or Thaumaturge — spell budget and devotion options follow this branch.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'protector' as const, label: 'Protector' },
                    { id: 'thaumaturge' as const, label: 'Thaumaturge' },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      const baseCantrips = CLASS_META.Cleric.cantripCount;
                      upd({
                        clericDivineOrder: o.id,
                        ...(o.id === 'protector' && s.chosenCantrips.length > baseCantrips
                          ? { chosenCantrips: s.chosenCantrips.slice(0, baseCantrips) }
                          : {}),
                      });
                    }}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-left text-[11px] font-bold transition-colors',
                      s.clericDivineOrder === o.id
                        ? 'border-violet-500 bg-zinc-800 text-zinc-100 ring-1 ring-violet-400/35'
                        : 'border-zinc-600 bg-zinc-800/70 text-zinc-300 hover:border-zinc-500',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {s.className === 'Druid' && (
            <div className="rounded-xl border border-zinc-700 border-l-4 border-l-amber-500 bg-zinc-900 p-3 space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-200">
                Primal Order (level 1)
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Choose Magician or Warden — cantrips, armor training, and Wild Shape follow this branch.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'magician' as const, label: 'Magician' },
                    { id: 'warden' as const, label: 'Warden' },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      const baseCantrips = CLASS_META.Druid.cantripCount;
                      upd({
                        druidPrimalOrder: o.id,
                        ...(o.id === 'warden' && s.chosenCantrips.length > baseCantrips
                          ? { chosenCantrips: s.chosenCantrips.slice(0, baseCantrips) }
                          : {}),
                      });
                    }}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-left text-[11px] font-bold transition-colors',
                      s.druidPrimalOrder === o.id
                        ? 'border-amber-500 bg-zinc-800 text-zinc-100 ring-1 ring-amber-400/35'
                        : 'border-zinc-600 bg-zinc-800/70 text-zinc-300 hover:border-zinc-500',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Starting wealth (2024 PHB)</div>
            <div className="flex flex-wrap gap-2">
              {(['package', 'gold'] as const).map(choice => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => upd({
                    classEquipmentChoice: choice,
                    startingArmorName: '', startingUnarmored: false, startingShield: false,
                  })}
                  className={cn(
                    'flex-1 min-w-[160px] text-left px-3 py-2 rounded-xl border-2 text-[11px] font-bold transition-all',
                    s.classEquipmentChoice === choice
                      ? 'border-accent bg-accent/5 text-slate-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                  )}
                >
                  <div className="font-black">{choice === 'package' ? 'Starting equipment' : 'Gold instead'}</div>
                  <div className="text-[10px] font-normal text-slate-500 mt-0.5 leading-snug">
                    {choice === 'package'
                      ? <>Class pack; pouch includes <span className="font-bold text-slate-600">{CLASS_PACK_EXTRA_GP[s.className] ?? 0} GP</span> per the PHB loadout. Default armor from the kit applies unless you change it on the Equipment step.</>
                      : <>Take gold: <span className="font-bold text-slate-600">{CLASS_GOLD_INSTEAD_GP[s.className] ?? 100} GP</span> (PHB option B, or Fighter option C).</>}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { l: 'Hit Die', v: meta.hitDie },
              { l: 'Saving Throws', v: meta.saves.map(a => AB_SHORT[a]).join(' + ') },
              { l: 'Spellcasting', v: meta.spellAbility ? AB_SHORT[meta.spellAbility] : 'None' },
            ].map(({ l, v }) => (
              <div key={l} className="bg-white rounded-lg p-2 border border-slate-100">
                <div className="text-[9px] font-black uppercase text-slate-400">{l}</div>
                <div className="text-xs font-black text-accent mt-0.5">{v}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
              Choose {meta.numSkills} skill{meta.numSkills > 1 ? 's' : ''} ({s.classSkills.length}/{meta.numSkills})
            </div>
            {s.background && (() => {
              const alreadyList = [
                ...s.background.skills,
                ...s.skilledPicks,
                ...(s.artisanBackgroundTool ? [s.artisanBackgroundTool] : []),
                ...s.crafterFeatTools,
              ].filter((v, i, a) => a.indexOf(v) === i);
              return alreadyList.length > 0 ? (
                <div className="flex items-center gap-1.5 text-[10px] mb-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-amber-500">★</span>
                  <span className="text-amber-700 font-semibold">Already proficient:</span>
                  <span className="font-black text-amber-700">{alreadyList.join(', ')}</span>
                </div>
              ) : null;
            })()}
            <div className="flex flex-wrap gap-1.5">
              {meta.availableSkills.map(sk => {
                const picked = s.classSkills.includes(sk);
                const alreadyHave = !picked && (
                  (s.background?.skills.includes(sk) ?? false) ||
                  s.skilledPicks.includes(sk) ||
                  (s.artisanBackgroundTool === sk || s.crafterFeatTools.includes(sk))
                );
                const full = !picked && !alreadyHave && s.classSkills.length >= meta.numSkills;
                return (
                  <button
                    key={sk}
                    onClick={() => {
                      if (alreadyHave) return;
                      if (picked) upd({ classSkills: s.classSkills.filter(x => x !== sk) });
                      else if (!full) upd({ classSkills: [...s.classSkills, sk] });
                    }}
                    disabled={alreadyHave || full}
                    title={alreadyHave ? 'Already proficient from background' : undefined}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all',
                      picked     ? 'bg-accent text-white border-accent' :
                      alreadyHave ? 'bg-amber-50 text-amber-600 border-amber-200 cursor-default' :
                      full       ? 'bg-white text-slate-300 border-slate-100 cursor-not-allowed' :
                                   'bg-white text-slate-600 border-slate-200 hover:border-accent/50',
                    )}
                  >
                    {sk}{alreadyHave ? ' ★' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 3 – Species
  // ══════════════════════════════════════════════════════════════════════════
  const originFeats = useMemo(() =>
    FEAT_LIST.filter(f => f.isOrigin && f.name.toLowerCase().includes(s.featSearch.toLowerCase())),
    [s.featSearch]);

  // Skills already acquired before the species step (from background + class)
  const speciesAlreadyHave = new Set<string>([
    ...(s.background?.skills ?? []),
    ...s.classSkills,
    ...s.skilledPicks,
    ...(s.artisanBackgroundTool ? [s.artisanBackgroundTool] : []),
    ...s.crafterFeatTools,
    ...(s.race?.staticSkillProfs ?? []),
  ]);

  const StepSpecies = (
    <div>
      <SectionTitle>Choose your species</SectionTitle>
      <Hint>Your species determines your innate traits, size, speed, and languages.</Hint>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {RACE_LIST.map(race => {
          const isSelected = s.race?.name === race.name;
          return (
            <button
              key={race.name}
              onClick={() => upd({ race, chosenFeat: null, chosenSkill: '', chosenSpeciesSkills: [], chosenLineage: null, chosenSize: '' })}
              className={cn(
                'text-left p-3 rounded-xl border-2 transition-all',
                isSelected ? 'border-accent bg-accent/5' : 'border-slate-200 hover:border-slate-300 bg-white',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-slate-800">{race.name}</span>
                {isSelected && <Check size={14} className="text-accent" />}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{race.size} · Speed {race.speed}ft</div>
            </button>
          );
        })}
      </div>

      {/* Selected race details */}
      {s.race && (
        <div className="border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-3">
          <div className="text-[11px] text-slate-600">{s.race.description}</div>

          {/* Stats row */}
          <div className="flex gap-3">
            <div className="bg-white border border-slate-100 rounded-lg px-3 py-1.5 text-center">
              <div className="text-[9px] font-black uppercase text-slate-400">Speed</div>
              <div className="text-sm font-black text-accent">{s.race.speed}ft</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-lg px-3 py-1.5 text-center">
              <div className="text-[9px] font-black uppercase text-slate-400">Size</div>
              <div className="text-sm font-black text-slate-700">{s.chosenSize || s.race.size.split(' ')[0]}</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-lg px-3 py-1.5">
              <div className="text-[9px] font-black uppercase text-slate-400">Languages</div>
              <div className="text-[10px] font-bold text-slate-700">{s.race.languages.join(', ')}</div>
            </div>
          </div>

          {/* Size choice */}
          {(s.race.sizeChoices?.length ?? 0) > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Choose your Size</div>
              <div className="flex gap-2">
                {s.race.sizeChoices!.map(sz => (
                  <button
                    key={sz}
                    onClick={() => upd({ chosenSize: sz })}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-xs font-black border-2 transition-all',
                      s.chosenSize === sz ? 'bg-accent text-white border-accent' : 'bg-white text-slate-600 border-slate-200 hover:border-accent/50',
                    )}
                  >{sz}</button>
                ))}
              </div>
            </div>
          )}

          {/* Static skill proficiencies */}
          {(s.race.staticSkillProfs?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
              <Check size={12} className="text-emerald-600 shrink-0" />
              <span className="text-[10px] text-emerald-700 font-bold">
                Automatically gain proficiency in: {s.race.staticSkillProfs!.join(', ')}
              </span>
            </div>
          )}

          {/* Species bonus skill choice (e.g. Human's Skillful) */}
          {(s.race.bonusSkillCount ?? 0) > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Skillful — Choose {s.race.bonusSkillCount} skill proficiency
                {(s.race.bonusSkillCount ?? 0) > 1 ? 'ies' : ''}
                {' '}({s.chosenSpeciesSkills.length}/{s.race.bonusSkillCount} chosen)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(s.race.bonusSkillPool ?? ALL_SKILLS).map(sk => {
                  const picked = s.chosenSpeciesSkills.includes(sk);
                  const already = !picked && speciesAlreadyHave.has(sk);
                  const full = !picked && s.chosenSpeciesSkills.length >= (s.race!.bonusSkillCount ?? 0);
                  return (
                    <button
                      key={sk}
                      onClick={() => {
                        if (already) return;
                        if (picked) upd({ chosenSpeciesSkills: s.chosenSpeciesSkills.filter(x => x !== sk) });
                        else if (!full) upd({ chosenSpeciesSkills: [...s.chosenSpeciesSkills, sk] });
                      }}
                      disabled={(full || already) && !picked}
                      title={already ? 'Already proficient' : undefined}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all',
                        picked   ? 'bg-accent text-white border-accent' :
                        already  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default' :
                                   'bg-white text-slate-600 border-slate-200 hover:border-accent/50 disabled:opacity-40 disabled:cursor-not-allowed',
                      )}
                    >{sk}{already ? ' ★' : ''}</button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            {s.race.traits.map(t => (
              <span key={t.name} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600">{t.name}</span>
            ))}
          </div>

          {/* Bonus choice */}
          {s.race.bonusChoice?.type === 'lineage' && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{s.race.bonusChoice.label}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {s.race.bonusChoice.lineageOptions?.map(opt => (
                  <button
                    key={opt.name}
                    onClick={() => upd({ chosenLineage: opt })}
                    className={cn(
                      'text-left px-3 py-2 rounded-lg border text-xs font-bold transition-all',
                      s.chosenLineage?.name === opt.name ? 'bg-accent text-white border-accent' : 'bg-white text-slate-700 border-slate-200 hover:border-accent/50',
                    )}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {s.race.bonusChoice?.type === 'skill_1' && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{s.race.bonusChoice.label}</div>
              <div className="flex flex-wrap gap-1.5">
                {(s.race.bonusChoice.skillOptions ?? ALL_SKILLS).map(sk => {
                  const already = s.chosenSkill !== sk && speciesAlreadyHave.has(sk);
                  return (
                    <button
                      key={sk}
                      onClick={() => { if (!already) upd({ chosenSkill: sk }); }}
                      disabled={already}
                      title={already ? 'Already proficient' : undefined}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all',
                        s.chosenSkill === sk ? 'bg-accent text-white border-accent' :
                        already ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default' :
                        'bg-white text-slate-600 border-slate-200 hover:border-accent/50',
                      )}
                    >{sk}{already ? ' ★' : ''}</button>
                  );
                })}
              </div>
            </div>
          )}

          {s.race.bonusChoice?.type === 'feat' && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Choose an Origin Feat</div>
              <input
                value={s.featSearch}
                onChange={e => upd({ featSearch: e.target.value })}
                placeholder="Search feats…"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-accent mb-2"
              />
              <div className="max-h-36 overflow-y-auto space-y-1">
                {originFeats.map(feat => (
                  <button
                    key={feat.name}
                    onClick={() => upd({ chosenFeat: feat, speciesMiCantrips: [], speciesMiSpell: '', speciesSkilledPicks: [] })}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg border text-xs transition-all',
                      s.chosenFeat?.name === feat.name ? 'bg-accent text-white border-accent' : 'bg-white text-slate-700 border-slate-100 hover:border-accent/40',
                    )}
                  >
                    <span className="font-bold">{feat.name}</span>
                    <span className={cn("block text-[10px] mt-0.5", s.chosenFeat?.name === feat.name ? "opacity-80" : "opacity-60 line-clamp-2")}>{feat.description}</span>
                  </button>
                ))}
              </div>

              {/* Sub-choices for feats that require picking spells/skills */}
              {s.chosenFeat?.name.startsWith('Magic Initiate') && (() => {
                const cls = s.chosenFeat!.name.match(/\((\w+)\)/)?.[1] ?? '';
                const cantripPool = SPELL_LIST.filter(sp =>
                  sp.level === 0 && (SPELL_CLASS_MAP[sp.name] ?? []).includes(cls)
                ).map(sp => sp.name).sort();
                const spellPool = SPELL_LIST.filter(sp =>
                  sp.level === 1 && (SPELL_CLASS_MAP[sp.name] ?? []).includes(cls)
                ).map(sp => sp.name).sort();
                return (
                  <div className="mt-3 space-y-3 border border-violet-200 bg-violet-50 rounded-xl p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-violet-600">
                      Choose 2 {cls} Cantrips ({s.speciesMiCantrips.length}/2)
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {cantripPool.map(name => {
                        const picked = s.speciesMiCantrips.includes(name);
                        const full = !picked && s.speciesMiCantrips.length >= 2;
                        return (
                          <button key={name}
                            onClick={() => upd({ speciesMiCantrips: picked
                              ? s.speciesMiCantrips.filter(x => x !== name)
                              : full ? s.speciesMiCantrips : [...s.speciesMiCantrips, name]
                            })}
                            disabled={full}
                            className={cn(
                              'px-2 py-1 rounded text-[10px] font-bold border transition-all',
                              picked ? 'bg-violet-600 text-white border-violet-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-violet-400 disabled:opacity-40 disabled:cursor-not-allowed',
                            )}
                          >{name}</button>
                        );
                      })}
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-violet-600">
                      Choose 1 {cls} Level-1 Spell {s.speciesMiSpell ? '✓' : ''}
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {spellPool.map(name => (
                        <button key={name}
                          onClick={() => upd({ speciesMiSpell: s.speciesMiSpell === name ? '' : name })}
                          className={cn(
                            'px-2 py-1 rounded text-[10px] font-bold border transition-all',
                            s.speciesMiSpell === name ? 'bg-violet-600 text-white border-violet-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-violet-400',
                          )}
                        >{name}</button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {s.chosenFeat?.name === 'Skilled' && (
                <div className="mt-3 space-y-2 border border-blue-200 bg-blue-50 rounded-xl p-3">
                  <div className="text-[9px] font-black uppercase tracking-widest text-blue-600">
                    Choose 3 Skill Proficiencies ({s.speciesSkilledPicks.length}/3)
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {ALL_SKILLS.map(sk => {
                      const picked = s.speciesSkilledPicks.includes(sk);
                      const already = !picked && speciesAlreadyHave.has(sk);
                      const full = !picked && s.speciesSkilledPicks.length >= 3;
                      return (
                        <button key={sk}
                          onClick={() => {
                            if (already) return;
                            upd({ speciesSkilledPicks: picked
                              ? s.speciesSkilledPicks.filter(x => x !== sk)
                              : full ? s.speciesSkilledPicks : [...s.speciesSkilledPicks, sk]
                            });
                          }}
                          disabled={already || (full && !picked)}
                          title={already ? 'Already proficient' : undefined}
                          className={cn(
                            'px-2 py-1 rounded text-[10px] font-bold border transition-all',
                            picked  ? 'bg-blue-600 text-white border-blue-600' :
                            already ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default' :
                                      'bg-white text-slate-600 border-slate-200 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed',
                          )}
                        >{sk}{already ? ' ★' : ''}</button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 4 – Background
  // ══════════════════════════════════════════════════════════════════════════
  const StepBackground = (
    <div>
      <SectionTitle>Choose your background</SectionTitle>
      <Hint>Your background grants skill proficiencies, a tool proficiency, an Origin feat, and ability score increases.</Hint>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {BACKGROUND_LIST.map(bg => {
          const isSelected = s.background?.name === bg.name;
          return (
            <button
              key={bg.name}
              onClick={() => upd({
                background: bg, plusTwo: null, plusOne: null, miCantrips: [], miSpell: '', skilledPicks: [], artisanBackgroundTool: '', crafterFeatTools: [], instrumentPick: '', gamingSetPick: '',
                backgroundEquipmentChoice: 'package',
                startingArmorName: '', startingUnarmored: false, startingShield: false,
                backgroundFeatDescriptionText: bg.featDescription,
              })}
              className={cn(
                'text-left p-3 rounded-xl border-2 transition-all',
                isSelected ? 'border-accent bg-accent/5' : 'border-slate-200 hover:border-slate-300 bg-white',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-slate-800">{bg.name}</span>
                {isSelected && <Check size={14} className="text-accent" />}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{bg.skills[0]} · {bg.skills[1]}</div>
            </button>
          );
        })}
      </div>

      {/* Selected background details + ASI */}
      {s.background && (
        <div className="border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-3">
          <div className="text-[11px] text-slate-500 leading-relaxed">{s.background.description}</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-lg p-2 border border-slate-100">
              <div className="text-[9px] font-black uppercase text-slate-400">Skills</div>
              <div className="text-[10px] font-bold text-slate-700 mt-0.5">{s.background.skills.join(', ')}</div>
            </div>
            <div className="bg-white rounded-lg p-2 border border-slate-100">
              <div className="text-[9px] font-black uppercase text-slate-400">Tool</div>
              <div className="text-[10px] font-bold text-slate-700 mt-0.5 leading-tight">{s.background.toolProficiency}</div>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Starting equipment (2024 PHB)</div>
            <div className="flex flex-wrap gap-2">
              {(['package', 'gold'] as const).map(choice => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => upd({
                    backgroundEquipmentChoice: choice,
                    startingArmorName: '', startingUnarmored: false, startingShield: false,
                  })}
                  className={cn(
                    'flex-1 min-w-[140px] text-left px-3 py-2 rounded-xl border-2 text-[11px] font-bold transition-all',
                    s.backgroundEquipmentChoice === choice
                      ? 'border-accent bg-accent/5 text-slate-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                  )}
                >
                  <div className="font-black">{choice === 'package' ? 'A — Equipment package' : `B — ${BACKGROUND_GOLD_INSTEAD_GP} GP`}</div>
                  <div className="text-[10px] font-normal text-slate-500 mt-0.5 leading-snug">
                    {choice === 'package'
                      ? <>Includes items listed in the rules plus <span className="font-bold text-slate-600">{trailingGoldFromBackgroundEquipment(s.background.equipmentA)} GP</span> at the end.</>
                      : 'Take gold instead of the package (same value option for every background).'}
                  </div>
                </button>
              ))}
            </div>
          </div>
          {/* Origin Feat with full description */}
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
            <div className="text-[9px] font-black uppercase text-accent mb-1">Origin Feat — {s.background.feat}</div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Feat text (editable)</label>
            <textarea
              value={s.backgroundFeatDescriptionText}
              onChange={(e) => upd({ backgroundFeatDescriptionText: e.target.value })}
              rows={6}
              className="w-full text-[11px] text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-y min-h-[7rem]"
              placeholder="Feat rules text…"
            />
          </div>

          {/* Feat sub-choices ─────────────────────────────────────────── */}
          {s.background.feat.startsWith('Magic Initiate') && (() => {
            const cls = s.background!.feat.match(/\((\w+)\)/)?.[1] ?? '';
            const cantripPool = SPELL_LIST.filter(sp =>
              sp.level === 0 && (SPELL_CLASS_MAP[sp.name] ?? []).includes(cls)
            ).map(sp => sp.name).sort();
            const spellPool = SPELL_LIST.filter(sp =>
              sp.level === 1 && (SPELL_CLASS_MAP[sp.name] ?? []).includes(cls)
            ).map(sp => sp.name).sort();
            return (
              <div className="space-y-3 border border-violet-200 bg-violet-50 rounded-xl p-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-violet-600">
                  Choose 2 {cls} Cantrips ({s.miCantrips.length}/2)
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {cantripPool.map(name => {
                    const picked = s.miCantrips.includes(name);
                    const full = !picked && s.miCantrips.length >= 2;
                    return (
                      <button key={name}
                        onClick={() => upd({ miCantrips: picked
                          ? s.miCantrips.filter(x => x !== name)
                          : full ? s.miCantrips : [...s.miCantrips, name]
                        })}
                        disabled={full}
                        className={cn(
                          'px-2 py-1 rounded text-[10px] font-bold border transition-all',
                          picked ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-violet-400 disabled:opacity-40 disabled:cursor-not-allowed',
                        )}
                      >{name}</button>
                    );
                  })}
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest text-violet-600 mt-2">
                  Choose 1 {cls} Level-1 Spell {s.miSpell ? '✓' : ''}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {spellPool.map(name => (
                    <button key={name}
                      onClick={() => upd({ miSpell: s.miSpell === name ? '' : name })}
                      className={cn(
                        'px-2 py-1 rounded text-[10px] font-bold border transition-all',
                        s.miSpell === name ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-violet-400',
                      )}
                    >{name}</button>
                  ))}
                </div>
              </div>
            );
          })()}

          {s.background.feat === 'Skilled' && (() => {
            const bgAlready = new Set<string>([
              ...(s.background?.skills ?? []),
              ...s.classSkills,
              ...(s.race?.staticSkillProfs ?? []),
            ]);
            return (
              <div className="space-y-2 border border-blue-200 bg-blue-50 rounded-xl p-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-blue-600">
                  Choose 3 Skill Proficiencies ({s.skilledPicks.length}/3)
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {ALL_SKILLS.map(sk => {
                    const picked = s.skilledPicks.includes(sk);
                    const already = !picked && bgAlready.has(sk);
                    const full = !picked && s.skilledPicks.length >= 3;
                    return (
                      <button key={sk}
                        onClick={() => {
                          if (already) return;
                          upd({ skilledPicks: picked
                            ? s.skilledPicks.filter(x => x !== sk)
                            : full ? s.skilledPicks : [...s.skilledPicks, sk]
                          });
                        }}
                        disabled={already || (full && !picked)}
                        title={already ? 'Already proficient' : undefined}
                        className={cn(
                          'px-2 py-1 rounded text-[10px] font-bold border transition-all',
                          picked  ? 'bg-blue-600 text-white border-blue-600' :
                          already ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default' :
                                    'bg-white text-slate-600 border-slate-200 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed',
                        )}
                      >{sk}{already ? ' ★' : ''}</button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {s.background.feat === 'Crafter' && (
            <div className="space-y-4">
              <div className="space-y-2 border border-amber-200 bg-amber-50 rounded-xl p-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                  Artisan background — one Artisan&apos;s tool ({s.artisanBackgroundTool ? '1' : '0'}/1)
                </div>
                <p className="text-[10px] text-amber-900/80 leading-snug">
                  PHB: &quot;Choose one kind of Artisan&apos;s Tools.&quot; Your equipment package uses this set.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ARTISAN_BACKGROUND_TOOL_CHOICES.map((tool) => {
                    const picked = s.artisanBackgroundTool === tool;
                    return (
                      <button
                        key={tool}
                        type="button"
                        onClick={() =>
                          upd({ artisanBackgroundTool: picked ? '' : tool })
                        }
                        className={cn(
                          'px-2 py-1 rounded text-[10px] font-bold border transition-all',
                          picked
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400',
                        )}
                      >
                        {tool}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2 border border-amber-300 bg-amber-50/80 rounded-xl p-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-amber-800">
                  Crafter feat — Fast Crafting tools ({s.crafterFeatTools.length}/3)
                </div>
                <p className="text-[10px] text-amber-950/80 leading-snug">
                  Choose <span className="font-black">three different</span> sets from the PHB Fast Crafting table only (for the feat&apos;s tool proficiencies and Fast Crafting).
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CRAFTER_FAST_CRAFTING_ARTISAN_TOOLS.map((tool) => {
                    const picked = s.crafterFeatTools.includes(tool);
                    const full = !picked && s.crafterFeatTools.length >= 3;
                    return (
                      <button
                        key={tool}
                        type="button"
                        onClick={() =>
                          upd({
                            crafterFeatTools: picked
                              ? s.crafterFeatTools.filter((x) => x !== tool)
                              : full
                                ? s.crafterFeatTools
                                : [...s.crafterFeatTools, tool],
                          })
                        }
                        disabled={full}
                        className={cn(
                          'px-2 py-1 rounded text-[10px] font-bold border transition-all',
                          picked
                            ? 'bg-amber-800 text-white border-amber-800'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed',
                        )}
                      >
                        {tool}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {s.background.feat === 'Musician' && (
            <div className="space-y-2 border border-violet-200 bg-violet-50 rounded-xl p-3">
              <div className="text-[9px] font-black uppercase tracking-widest text-violet-700">
                Tool proficiency — choose one Musical Instrument ({s.instrumentPick ? '1' : '0'}/1)
              </div>
              <p className="text-[10px] text-violet-900/80 leading-snug">
                These names match the 2024 PHB chapter 6 Musical Instrument variants. Your starting pack includes this instrument.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MUSICAL_INSTRUMENT_PHB_2024.map((inst) => {
                  const picked = s.instrumentPick === inst;
                  return (
                    <button
                      key={inst}
                      type="button"
                      onClick={() =>
                        upd({ instrumentPick: picked ? '' : inst })
                      }
                      className={cn(
                        'px-2 py-1 rounded text-[10px] font-bold border transition-all',
                        picked
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-violet-400',
                      )}
                    >
                      {inst}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {s.background && backgroundRequiresGamingSetChoice(s.background) && (
            <div className="space-y-2 border border-teal-200 bg-teal-50 rounded-xl p-3">
              <div className="text-[9px] font-black uppercase tracking-widest text-teal-800">
                Tool proficiency — choose one Gaming Set ({s.gamingSetPick ? '1' : '0'}/1)
              </div>
              <p className="text-[10px] text-teal-900/80 leading-snug">
                PHB chapter 6 variants (Guard, Noble, Soldier). Your starting pack includes this set.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {GAMING_SET_PHB_2024.map((setName) => {
                  const picked = s.gamingSetPick === setName;
                  return (
                    <button
                      key={setName}
                      type="button"
                      onClick={() => upd({ gamingSetPick: picked ? '' : setName })}
                      className={cn(
                        'px-2 py-1 rounded text-[10px] font-bold border transition-all',
                        picked
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400',
                      )}
                    >
                      {setName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ASI choice */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Ability Score Increase</div>
            <div className="flex gap-2 mb-2">
              {(['two_one', 'all_one'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => upd({ asiMode: m, plusTwo: null, plusOne: null })}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[11px] font-black border transition-all',
                    s.asiMode === m ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
                  )}
                >
                  {m === 'two_one' ? '+2 / +1' : '+1 / +1 / +1'}
                </button>
              ))}
            </div>
            {s.asiMode === 'two_one' ? (
              <div className="grid grid-cols-2 gap-2">
                {(['plusTwo', 'plusOne'] as const).map((field, idx) => (
                  <div key={field}>
                    <div className="text-[9px] font-black uppercase text-slate-400 mb-1">{idx === 0 ? '+2 to' : '+1 to'}</div>
                    <div className="flex gap-1 flex-wrap">
                      {s.background!.abilityScores.map(ab => {
                        const other = field === 'plusTwo' ? s.plusOne : s.plusTwo;
                        const active = (field === 'plusTwo' ? s.plusTwo : s.plusOne) === ab;
                        return (
                          <button
                            key={ab}
                            onClick={() => upd({ [field]: ab })}
                            disabled={other === ab}
                            className={cn(
                              'px-2.5 py-1 rounded text-[11px] font-black border transition-all',
                              active ? 'bg-accent text-white border-accent' : 'bg-white text-slate-600 border-slate-200 hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed',
                            )}
                          >
                            {AB_SHORT[ab]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-100">
                +1 to {s.background.abilityScores.map(a => AB_SHORT[a]).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 5 – Ability Scores
  // ══════════════════════════════════════════════════════════════════════════
  const pbSpent = useMemo(() => {
    if (s.abilityMethod !== 'pointbuy') return 0;
    return ABILITIES.reduce((sum, a) => sum + (PB_COST[s.abilities[a]] ?? 0), 0);
  }, [s.abilities, s.abilityMethod]);

  const StepAbilities = (
    <div>
      <SectionTitle>Set ability scores</SectionTitle>
      <Hint>These represent your character's core physical and mental attributes.</Hint>

      {/* Method tabs */}
      <div className="flex gap-2 mb-5">
        {(['standard', 'pointbuy', 'manual'] as const).map(m => (
          <button
            key={m}
            onClick={() => upd({ abilityMethod: m, standardAssign: {}, abilities: { str:8, dex:8, con:8, int:8, wis:8, cha:8 } })}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black border transition-all',
              s.abilityMethod === m ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
            )}
          >
            {m === 'standard' ? 'Standard Array' : m === 'pointbuy' ? 'Point Buy' : 'Manual Entry'}
          </button>
        ))}
      </div>

      {/* Standard Array */}
      {s.abilityMethod === 'standard' && (
        <div className="space-y-2">
          <div className="text-[10px] text-slate-500 mb-3">Assign each value to one ability: <span className="font-black text-slate-700">{STANDARD_ARRAY.join(', ')}</span></div>
          {ABILITIES.map(ab => {
            const assigned = s.standardAssign[ab];
            const used = new Set(ABILITIES.filter(x => x !== ab).map(x => s.standardAssign[x]).filter(Boolean));
            const available = STANDARD_ARRAY.filter(v => !used.has(v) || v === assigned);
            const mod = assigned !== undefined ? getModifier(assigned) : null;
            return (
              <div key={ab} className="flex items-center gap-3">
                <div className="w-24 text-xs font-black text-slate-700">{AB_FULL[ab]}</div>
                <select
                  value={assigned ?? ''}
                  onChange={e => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    upd({ standardAssign: { ...s.standardAssign, [ab]: val } });
                  }}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium bg-white outline-none focus:border-accent"
                >
                  <option value="">— pick —</option>
                  {available.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <div className={cn('w-10 text-center text-sm font-black', mod !== null && mod >= 0 ? 'text-accent' : 'text-red-500')}>
                  {mod !== null ? (mod >= 0 ? `+${mod}` : `${mod}`) : '—'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Point Buy */}
      {s.abilityMethod === 'pointbuy' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-[10px] text-slate-500">Points remaining:</div>
            <div className={cn('font-black text-sm', pbSpent > PB_BUDGET ? 'text-red-500' : pbSpent === PB_BUDGET ? 'text-emerald-600' : 'text-accent')}>
              {PB_BUDGET - pbSpent} / {PB_BUDGET}
            </div>
          </div>
          {ABILITIES.map(ab => {
            const val = s.abilities[ab];
            const canInc = val < 15 && (pbSpent + (PB_COST[val + 1] ?? 99) - PB_COST[val]) <= PB_BUDGET;
            const canDec = val > 8;
            const mod = getModifier(val);
            return (
              <div key={ab} className="flex items-center gap-3">
                <div className="w-24 text-xs font-black text-slate-700">{AB_FULL[ab]}</div>
                <button
                  onClick={() => canDec && upd({ abilities: { ...s.abilities, [ab]: val - 1 } })}
                  disabled={!canDec}
                  className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center disabled:opacity-30 hover:border-accent transition-all"
                ><Minus size={12} /></button>
                <div className="w-8 text-center font-black text-sm text-slate-800">{val}</div>
                <button
                  onClick={() => canInc && upd({ abilities: { ...s.abilities, [ab]: val + 1 } })}
                  disabled={!canInc}
                  className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center disabled:opacity-30 hover:border-accent transition-all"
                ><Plus size={12} /></button>
                <div className="text-[10px] text-slate-400 ml-1">cost: {PB_COST[val]}</div>
                <div className={cn('w-10 text-right text-sm font-black', mod >= 0 ? 'text-accent' : 'text-red-500')}>
                  {mod >= 0 ? `+${mod}` : `${mod}`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual */}
      {s.abilityMethod === 'manual' && (
        <div className="space-y-2">
          <div className="text-[10px] text-slate-500 mb-3">Enter your scores directly (e.g. from dice rolls).</div>
          {ABILITIES.map(ab => {
            const val = s.abilities[ab];
            const mod = getModifier(val);
            return (
              <div key={ab} className="flex items-center gap-3">
                <div className="w-24 text-xs font-black text-slate-700">{AB_FULL[ab]}</div>
                <input
                  type="number" min={1} max={20}
                  value={val}
                  onChange={e => upd({ abilities: { ...s.abilities, [ab]: Math.max(1, Math.min(20, Number(e.target.value) || 8)) } })}
                  className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-center outline-none focus:border-accent"
                />
                <div className={cn('text-sm font-black', mod >= 0 ? 'text-accent' : 'text-red-500')}>
                  {mod >= 0 ? `+${mod}` : `${mod}`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Background ASI preview */}
      {s.background && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700">
          <span className="font-black">Background bonus will be applied: </span>
          {s.asiMode === 'all_one'
            ? s.background.abilityScores.map(a => `${AB_SHORT[a]} +1`).join(', ')
            : [s.plusTwo && `${AB_SHORT[s.plusTwo]} +2`, s.plusOne && `${AB_SHORT[s.plusOne]} +1`].filter(Boolean).join(', ') || '(not set yet)'
          }
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 6 – Spells (casters only)
  // ══════════════════════════════════════════════════════════════════════════
  const spellStepMeta = classMeta;
  const spellAbility = getDefaultSpellcastingAbility(s.className);
  const spellMod = getModifier(finalAbilities[spellAbility]);
  const preparedCap = spellMod + 1; // level 1: mod + 1

  // Spell lists filtered by class
  const classCantrips = SPELL_LIST
    .filter(sp => sp.level === 0 && (SPELL_CLASS_MAP[sp.name] ?? []).includes(s.className))
    .sort((a, b) => a.name.localeCompare(b.name));

  const classSpells1 = SPELL_LIST
    .filter(sp => sp.level === 1 && (SPELL_CLASS_MAP[sp.name] ?? []).includes(s.className))
    .sort((a, b) => a.name.localeCompare(b.name));

  // For prepared casters: how many they can prepare at level 1
  const preparedTarget = Math.max(1, preparedCap);

  const spellModeLabel = (() => {
    if (!spellStepMeta) return '';
    switch (spellStepMeta.spellcastingType) {
      case 'known':    return `Choose ${spellStepMeta.knownCount} spell${(spellStepMeta.knownCount ?? 0) !== 1 ? 's' : ''} known`;
      case 'prepared': return `Choose up to ${preparedTarget} spell${preparedTarget !== 1 ? 's' : ''} to prepare (${AB_SHORT[spellAbility]} mod ${spellMod >= 0 ? '+' : ''}${spellMod} + level 1)`;
      case 'spellbook': return `Choose 6 spells for your Spellbook — you can prepare ${preparedTarget} of them`;
      default: return '';
    }
  })();

  const spellTarget = (() => {
    if (!spellStepMeta) return 0;
    switch (spellStepMeta.spellcastingType) {
      case 'known':     return spellStepMeta.knownCount ?? 0;
      case 'prepared':  return preparedTarget;
      case 'spellbook': return 6;
      default: return 0;
    }
  })();

  const [spellSearch, setSpellSearch] = useState('');

  const filteredCantrips = classCantrips.filter(sp =>
    sp.name.toLowerCase().includes(spellSearch.toLowerCase())
  );
  const filteredSpells1 = classSpells1.filter(sp =>
    sp.name.toLowerCase().includes(spellSearch.toLowerCase())
  );

  const toggleCantrip = (name: string) => {
    const picked = s.chosenCantrips.includes(name);
    if (picked) { upd({ chosenCantrips: s.chosenCantrips.filter(x => x !== name) }); return; }
    if (s.chosenCantrips.length >= wizardCantripTarget) return;
    upd({ chosenCantrips: [...s.chosenCantrips, name] });
  };

  const toggleSpell = (name: string) => {
    const picked = s.chosenKnownSpells.includes(name);
    if (picked) { upd({ chosenKnownSpells: s.chosenKnownSpells.filter(x => x !== name) }); return; }
    if (s.chosenKnownSpells.length >= spellTarget) return;
    upd({ chosenKnownSpells: [...s.chosenKnownSpells, name] });
  };

  const StepSpells = (
    <div>
      <SectionTitle>Choose your starting spells</SectionTitle>
      <Hint>
        {s.className} uses {AB_SHORT[spellAbility]} for spellcasting.
        {spellStepMeta?.spellcastingType === 'prepared'
          ? ' As a prepared caster, you choose which spells to have ready each Long Rest.'
          : spellStepMeta?.spellcastingType === 'spellbook'
          ? ' As a Wizard your Spellbook holds your spells; you prepare a subset each day.'
          : ' Your known spells are always available to cast.'}
      </Hint>

      <input
        value={spellSearch}
        onChange={e => setSpellSearch(e.target.value)}
        placeholder="Search spells…"
        className="w-full px-3 py-2 mb-4 text-xs border border-slate-200 rounded-lg outline-none focus:border-accent"
      />

      {/* Cantrips */}
      {wizardCantripTarget > 0 && (
        <div className="mb-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Cantrips — choose {wizardCantripTarget}
            <span className={cn('ml-2 font-black', s.chosenCantrips.length === wizardCantripTarget ? 'text-emerald-600' : 'text-accent')}>
              ({s.chosenCantrips.length}/{wizardCantripTarget})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
            {filteredCantrips.map(sp => {
              const picked = s.chosenCantrips.includes(sp.name);
              const full = !picked && s.chosenCantrips.length >= wizardCantripTarget;
              return (
                <button key={sp.name}
                  onClick={() => toggleCantrip(sp.name)}
                  disabled={full}
                  title={sp.description}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all',
                    picked ? 'bg-violet-600 text-white border-violet-600'
                           : 'bg-white text-slate-600 border-slate-200 hover:border-violet-400 disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                >{sp.name}</button>
              );
            })}
            {filteredCantrips.length === 0 && <div className="text-xs text-slate-400 italic">No cantrips found.</div>}
          </div>
        </div>
      )}

      {/* Spells (known / prepared / spellbook) */}
      {spellTarget > 0 && (spellStepMeta?.spellsStartLevel ?? 1) === 1 && (
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
            {spellStepMeta?.spellcastingType === 'spellbook' ? 'Spellbook' : spellStepMeta?.spellcastingType === 'prepared' ? 'Prepared Spells' : 'Known Spells'}
            <span className={cn('ml-2 font-black', s.chosenKnownSpells.length === spellTarget ? 'text-emerald-600' : 'text-accent')}>
              ({s.chosenKnownSpells.length}/{spellTarget})
            </span>
          </div>
          <div className="text-[10px] text-slate-400 italic mb-2">{spellModeLabel}</div>
          <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
            {filteredSpells1.map(sp => {
              const picked = s.chosenKnownSpells.includes(sp.name);
              const full = !picked && s.chosenKnownSpells.length >= spellTarget;
              return (
                <button key={sp.name}
                  onClick={() => toggleSpell(sp.name)}
                  disabled={full}
                  title={sp.description}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all',
                    picked ? 'bg-accent text-white border-accent'
                           : 'bg-white text-slate-600 border-slate-200 hover:border-accent/50 disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                >{sp.name}</button>
              );
            })}
            {filteredSpells1.length === 0 && <div className="text-xs text-slate-400 italic">No spells found.</div>}
          </div>
        </div>
      )}

      {/* Ranger / Paladin — no spells at level 1 */}
      {(spellStepMeta?.spellsStartLevel ?? 1) > 1 && (
        <div className="text-center py-8 text-slate-400 text-xs italic">
          {s.className}s don't gain spell slots until level {spellStepMeta?.spellsStartLevel}.<br />
          You'll choose spells when you level up.
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 7 – Equipment (always before Review)
  // ══════════════════════════════════════════════════════════════════════════
  const bodyArmorTemplates = useMemo(() => bodyArmorOptions(ARMOR_LIST), []);
  const walletForEquipment = useMemo(() => {
    if (!s.background || !s.className) return 0;
    return computeStartingWalletGp({
      backgroundEquipmentChoice: s.backgroundEquipmentChoice,
      classEquipmentChoice: s.classEquipmentChoice,
      backgroundEquipmentLine: s.background.equipmentA,
      className: s.className,
    });
  }, [s.background, s.className, s.backgroundEquipmentChoice, s.classEquipmentChoice]);

  const bodyResolvedEquipmentStep = effectiveStartingBodyArmor({
    startingArmorName: s.startingArmorName,
    startingUnarmored: s.startingUnarmored,
    classEquipmentChoice: s.classEquipmentChoice,
    className: s.className,
  });
  const spendPreview = armorAndShieldCostGp({
    className: s.className,
    classEquipmentChoice: s.classEquipmentChoice,
    bodyArmorName: bodyResolvedEquipmentStep,
    buyShield: s.startingShield,
    armors: ARMOR_LIST,
  });
  const strForArmor = finalAbilities.str;

  const pickBodyArmor = (armorName: string | null) => {
    if (armorName === null) {
      upd({ startingUnarmored: true, startingArmorName: '' });
      return;
    }
    const def = CLASS_PACK_DEFAULT_ARMOR[s.className] ?? '';
    const implicitKit = s.classEquipmentChoice === 'package' && def === armorName;
    upd({ startingUnarmored: false, startingArmorName: implicitKit ? '' : armorName });
  };

  const armorRowSelected = (pieceName: string) =>
    !s.startingUnarmored && bodyResolvedEquipmentStep === pieceName;

  const canAffordBody = (pieceName: string) =>
    canAffordStartingGear(
      walletForEquipment,
      s.className,
      s.classEquipmentChoice,
      pieceName,
      s.startingShield,
      ARMOR_LIST,
      strForArmor,
    );

  const canAffordShieldOn = () =>
    canAffordStartingGear(
      walletForEquipment,
      s.className,
      s.classEquipmentChoice,
      bodyResolvedEquipmentStep,
      true,
      ARMOR_LIST,
      strForArmor,
    );

  const StepEquipment = (
    <div>
      <SectionTitle>Armor &amp; shield</SectionTitle>
      <Hint>
        Choose body armor you can afford with your starting GP. Class kit armor costs nothing if you kept starting equipment and it matches your class&apos;s default loadout. Shields cost 10 GP. Heavy armor lists a Strength requirement.
      </Hint>

      <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1 text-[11px] text-emerald-900">
        <div className="font-black text-slate-800">Starting coin this character</div>
        <div>
          Total: <span className="font-black text-accent tabular-nums">{walletForEquipment}</span> GP
          <span className="text-emerald-700/80 ml-2">
            (background {s.backgroundEquipmentChoice === 'package'
              ? `${trailingGoldFromBackgroundEquipment(s.background?.equipmentA ?? '')} GP from package`
              : `${BACKGROUND_GOLD_INSTEAD_GP} GP`}
            {' · '}
            class {s.classEquipmentChoice === 'package'
              ? `+${CLASS_PACK_EXTRA_GP[s.className] ?? 0} GP`
              : `${CLASS_GOLD_INSTEAD_GP[s.className] ?? 100} GP (gold instead)`})
          </span>
        </div>
        <div>
          Spent on armor/shield: <span className="font-black tabular-nums">{spendPreview.total}</span> GP
          {' · '}
          Remaining: <span className="font-black text-accent tabular-nums">{Math.max(0, walletForEquipment - spendPreview.total)}</span> GP
        </div>
      </div>

      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Body armor</div>
      <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto mb-4">
        <button
          type="button"
          onClick={() => pickBodyArmor(null)}
          className={cn(
            'text-left px-3 py-2 rounded-xl border-2 text-[11px] font-bold transition-all',
            s.startingUnarmored
              ? 'border-accent bg-accent/5'
              : 'border-slate-200 bg-white hover:border-slate-300',
          )}
        >
          <div className="flex justify-between gap-2">
            <span>Unarmored</span>
            <span className="text-slate-500 font-bold tabular-nums">0 GP</span>
          </div>
          <div className="text-[10px] font-normal text-slate-500">10 + Dex AC (before shield)</div>
        </button>
        {bodyArmorTemplates.map(piece => {
          const free = isArmorFreeFromClassPack(s.className, s.classEquipmentChoice, piece.name);
          const listGp = parseEquipmentCostGp(piece.cost);
          const payGp = free ? 0 : listGp;
          const affordable = canAffordBody(piece.name);
          const strOk = !piece.strRequirement || strForArmor >= piece.strRequirement;
          const disabled = !affordable || !strOk;
          return (
            <button
              key={piece.name}
              type="button"
              disabled={disabled}
              onClick={() => pickBodyArmor(piece.name)}
              title={
                !strOk
                  ? `Needs Strength ${piece.strRequirement} (you have ${strForArmor})`
                  : !affordable
                    ? 'Not enough GP for this armor (and shield if selected)'
                    : piece.description
              }
              className={cn(
                'text-left px-3 py-2 rounded-xl border-2 text-[11px] font-bold transition-all',
                armorRowSelected(piece.name)
                  ? 'border-accent bg-accent/5'
                  : disabled
                    ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                    : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <div className="flex justify-between gap-2">
                <span>{piece.name}</span>
                <span className="tabular-nums text-slate-600">
                  {free ? <span className="text-emerald-600">FREE</span> : `${payGp} GP`}
                </span>
              </div>
              <div className="text-[10px] font-normal text-slate-500">
                {piece.category}
                {piece.strRequirement ? ` · Str ${piece.strRequirement}+` : ''}
                {piece.stealthDisadvantage ? ' · Stealth Disadv.' : ''}
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shield (+2 AC)</div>
      <button
        type="button"
        disabled={!s.startingShield && !canAffordShieldOn()}
        onClick={() => upd({ startingShield: !s.startingShield })}
        className={cn(
          'w-full text-left px-3 py-2 rounded-xl border-2 text-[11px] font-bold transition-all',
          s.startingShield ? 'border-accent bg-accent/5' : 'border-slate-200 bg-white hover:border-slate-300',
          !s.startingShield && !canAffordShieldOn() && 'opacity-40 cursor-not-allowed',
        )}
      >
        <div className="flex justify-between gap-2">
          <span>Shield</span>
          <span className="tabular-nums text-slate-600">10 GP</span>
        </div>
        {!s.startingShield && !canAffordShieldOn() && (
          <div className="text-[10px] font-normal text-amber-700 mt-1">Not enough GP with current armor.</div>
        )}
      </button>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 8 – Review
  // ══════════════════════════════════════════════════════════════════════════
  const ab = finalAbilities;
  const conMod = getModifier(ab.con);
  const dexMod = getModifier(ab.dex);
  const clsMeta = s.className ? CLASS_META[s.className] : null;
  const hitDieMax = clsMeta ? (HIT_DIE_MAX[clsMeta.hitDie] || 8) : 8;

  const reviewBodyArmor = effectiveStartingBodyArmor({
    startingArmorName: s.startingArmorName,
    startingUnarmored: s.startingUnarmored,
    classEquipmentChoice: s.classEquipmentChoice,
    className: s.className,
  });
  const reviewAc = computeAC(reviewBodyArmor, s.startingShield, dexMod);
  const reviewWallet = s.background && s.className
    ? computeStartingWalletGp({
        backgroundEquipmentChoice: s.backgroundEquipmentChoice,
        classEquipmentChoice: s.classEquipmentChoice,
        backgroundEquipmentLine: s.background.equipmentA,
        className: s.className,
      })
    : 0;
  const reviewArmorSpend = armorAndShieldCostGp({
    className: s.className,
    classEquipmentChoice: s.classEquipmentChoice,
    bodyArmorName: reviewBodyArmor,
    buyShield: s.startingShield,
    armors: ARMOR_LIST,
  }).total;
  const reviewGp = Math.max(0, reviewWallet - reviewArmorSpend);

  const StepReview = (
    <div>
      <SectionTitle>Review your character</SectionTitle>
      <Hint>Everything looks good? Create your character to start playing.</Hint>

      <div className="grid grid-cols-2 gap-4">
        {/* Left */}
        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Identity</div>
            <div className="text-xl font-black text-slate-800">{s.name || '—'}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.alignment}</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-1">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Origin</div>
            {[
              { l: 'Class',      v: s.className || '—' },
              { l: 'Species',    v: s.race?.name || '—' },
              { l: 'Background', v: s.background?.name || '—' },
              {
                l: 'Background gear',
                v: s.backgroundEquipmentChoice === 'package' ? 'Equipment package' : `${BACKGROUND_GOLD_INSTEAD_GP} GP`,
              },
              {
                l: 'Class wealth',
                v: s.classEquipmentChoice === 'package' ? 'Starting equipment' : `Gold (${CLASS_GOLD_INSTEAD_GP[s.className] ?? 100} GP)`,
              },
              {
                l: 'Armor',
                v: [reviewBodyArmor ? reviewBodyArmor : 'Unarmored', s.startingShield ? 'Shield' : null].filter(Boolean).join(', '),
              },
            ].map(({ l, v }) => (
              <div key={l} className="flex justify-between text-xs">
                <span className="text-slate-500">{l}</span>
                <span className="font-bold text-slate-800">{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-1">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Combat</div>
            {[
              { l: 'Max HP',    v: String(Math.max(1, hitDieMax + conMod)) },
              { l: 'AC',        v: String(reviewAc) },
              { l: 'Speed',     v: `${s.race?.speed ?? 30}ft` },
              { l: 'Size',      v: s.chosenSize || (s.race?.size.split(' ')[0] ?? 'Medium') },
              { l: 'Hit Die',   v: `1${clsMeta?.hitDie ?? 'd8'}` },
              { l: 'Gold (GP)', v: String(reviewGp) },
            ].map(({ l, v }) => (
              <div key={l} className="flex justify-between text-xs">
                <span className="text-slate-500">{l}</span>
                <span className="font-bold text-accent">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Ability Scores</div>
            <div className="grid grid-cols-3 gap-1.5">
              {ABILITIES.map(a => {
                const score = ab[a];
                const mod = getModifier(score);
                return (
                  <div key={a} className="bg-white rounded-lg p-2 text-center border border-slate-100">
                    <div className="text-[9px] font-black uppercase text-slate-400">{AB_SHORT[a]}</div>
                    <div className="text-sm font-black text-accent mt-0.5">{mod >= 0 ? `+${mod}` : `${mod}`}</div>
                    <div className="text-[10px] text-slate-500">{score}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Proficiencies</div>
            <div className="flex flex-wrap gap-1">
              {[
                ...s.classSkills,
                ...(s.background?.skills ?? []),
                ...(s.race?.staticSkillProfs ?? []),
                ...s.chosenSpeciesSkills,
                ...(s.chosenSkill ? [s.chosenSkill] : []),
                ...s.skilledPicks,
                ...s.speciesSkilledPicks,
              ].filter((v, i, a) => a.indexOf(v) === i)
                .map(sk => (
                  <span key={sk} className="px-2 py-0.5 bg-accent/10 text-accent rounded text-[10px] font-bold">{sk}</span>
                ))
              }
              {s.artisanBackgroundTool ? (
                <span
                  key={`artisan-bg-${s.artisanBackgroundTool}`}
                  className="px-2 py-0.5 bg-amber-50 text-amber-900 rounded text-[10px] font-bold border border-amber-200"
                  title="Artisan background tool"
                >
                  {s.artisanBackgroundTool}
                </span>
              ) : null}
              {s.crafterFeatTools.map((t) => (
                <span
                  key={`crafter-${t}`}
                  className="px-2 py-0.5 bg-amber-100 text-amber-950 rounded text-[10px] font-bold border border-amber-300"
                  title="Crafter feat (Fast Crafting)"
                >
                  {t}
                </span>
              ))}
              {s.instrumentPick ? (
                <span className="px-2 py-0.5 bg-violet-50 text-violet-900 rounded text-[10px] font-bold border border-violet-200">
                  {s.instrumentPick}
                </span>
              ) : null}
              {s.gamingSetPick ? (
                <span className="px-2 py-0.5 bg-teal-50 text-teal-900 rounded text-[10px] font-bold border border-teal-200">
                  {s.gamingSetPick}
                </span>
              ) : null}
              {(clsMeta?.saves ?? []).map(a => (
                <span key={a} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-bold border border-green-100">{AB_SHORT[a]} Save</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  // Step order: Identity → Background → Class → Species → Abilities → [Spells] → Equipment → Review
  const steps = isCaster
    ? [null, StepIdentity, StepBackground, StepClass, StepSpecies, StepAbilities, StepSpells, StepEquipment, StepReview]
    : [null, StepIdentity, StepBackground, StepClass, StepSpecies, StepAbilities, StepEquipment, StepReview];
  const isLastStep = step === TOTAL_STEPS;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-accent" />
            <span className="font-black text-slate-800 text-sm">
              {step === 0 ? 'New Character' : `Step ${step} of ${TOTAL_STEPS} — ${STEP_META[step - 1].label}`}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Progress bar (only during wizard steps) */}
        {step > 0 && (
          <div className="flex gap-1 px-6 pt-3 pb-0 shrink-0">
            {STEP_META.map((sm, i) => {
              const Icon = sm.icon;
              const done = i + 1 < step;
              const active = i + 1 === step;
              return (
                <div key={sm.label} className={cn('flex-1 flex flex-col items-center gap-1')}>
                  <div className={cn(
                    'w-full h-1 rounded-full transition-all',
                    done ? 'bg-accent' : active ? 'bg-accent/50' : 'bg-slate-100',
                  )} />
                  <div className={cn('text-[9px] font-black uppercase hidden sm:flex items-center gap-0.5',
                    active ? 'text-accent' : done ? 'text-slate-500' : 'text-slate-300')}>
                    <Icon size={9} />{sm.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 0 ? StepWelcome : steps[step]}
        </div>

        {/* Footer */}
        {step > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
            <button
              onClick={() => setStep(s2 => s2 - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm font-black text-slate-600 hover:border-slate-400 transition-all"
            >
              <ChevronLeft size={16} /> Back
            </button>
            <div className="text-[10px] text-slate-400 font-medium">{step} / {TOTAL_STEPS}</div>
            <button
              onClick={isLastStep ? handleCreate : () => setStep(s2 => s2 + 1)}
              disabled={!canNext()}
              className={cn(
                'flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-black transition-all',
                canNext()
                  ? isLastStep ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-accent hover:bg-accent/90 text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed',
              )}
            >
              {isLastStep ? (<><Check size={15} /> Create Character</>) : (<>Next <ChevronRight size={16} /></>)}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

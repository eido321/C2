import {slotCapacity} from '@/lib/slotRows';
import {z} from 'zod';
import type {Whiteboard} from '@/types';
import {normalizeBoard} from './board';

const text = z.string();
const optionalText = text.optional();
const number = z.number().finite();
const flag = z.boolean().optional();
const point = z.object({x: number, y: number});
const listItem = z.union([text, z.looseObject({text, checked: flag, indent: number.optional()})]);
const spell = z.looseObject({
  id: text,
  name: text,
  prepared: z.boolean(),
  columns: z.array(text).optional(),
  expanded: flag,
  school: optionalText,
  castingTime: optionalText,
  range: optionalText,
  duration: optionalText,
  source: optionalText,
  material: optionalText,
  attackSave: optionalText,
  damageEffect: optionalText,
  description: optionalText,
  notes: optionalText,
  concentration: flag,
  ritual: flag,
  components: z.object({v: z.boolean(), s: z.boolean(), m: z.boolean()}).optional(),
});
const contents = {
  heading: z.looseObject({text, subtitle: optionalText}),
  text: z.looseObject({text}),
  statBlock: z.looseObject({label: text, value: text, hint: optionalText}),
  divider: z.looseObject({ornament: z.boolean()}),
  image: z.looseObject({src: text, fit: z.enum(['cover', 'contain']), alt: optionalText}),
  list: z.looseObject({title: optionalText, items: z.array(listItem), ordered: z.boolean(), checklist: flag}),
  spellSlots: z.object({rows:z.array(z.object({total:z.number().int().min(0),used:z.array(z.boolean())})).length(9).refine(rows=>rows.every((r,i)=>r.total<=slotCapacity[i] && r.used.length===slotCapacity[i]))}),
  abilityScore: z.looseObject({ability:text,modifier:text,saveDc:text,attackBonus:text}),
  abilityScores: z.looseObject({abilities: z.array(z.object({key: text, label: text, score: number}))}),
  spellList: z.looseObject({
    title: optionalText,
    showHeader: z.boolean(),
    ability: optionalText,
    saveDc: optionalText,
    attackBonus: optionalText,
    columns: z.array(text),
    groups: z.array(
      z.looseObject({
        id: text,
        level: number,
        slotsTotal: number,
        slotsExpended: number,
        spells: z.array(spell),
      }),
    ),
  }),
};
const block = z
  .looseObject({
    id: text.min(1),
    type: z.enum(Object.keys(contents) as [keyof typeof contents]),
    content: z.unknown(),
    x: number,
    y: number,
    width: number.positive(),
    height: number.positive(),
    name: optionalText,
    style: z
      .object({
        fontSize: number.optional(),
        color: optionalText,
        background: optionalText,
        borderColor: optionalText,
        align: z.enum(['left', 'center', 'right']).optional(),
        showBorder: flag,
      })
      .optional(),
  })
  .refine((b) => contents[b.type].safeParse(b.content).success, 'Invalid block content');
const sheet = z.looseObject({
  blocks: z
    .array(block)
    .refine((blocks) => new Set(blocks.map((b) => b.id)).size === blocks.length, 'Duplicate block IDs'),
  groups: z.array(z.looseObject({id: text, name: optionalText, childIds: z.array(text)})).optional(),
  viewport: z.object({pan: point, zoom: number.positive()}).optional(),
  id: optionalText,
  updatedAt: number.optional(),
  name: optionalText,
});
export function readBoard(value: unknown): Whiteboard {
  const result = sheet.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error('Invalid sheet at ' + issue.path.join('.') + '. ' + issue.message);
  }
  return normalizeBoard({
    ...result.data,
    id: result.data.id ?? crypto.randomUUID(),
    updatedAt: Date.now(),
    name: result.data.name ?? 'Imported Whiteboard',
  } as Whiteboard);
}




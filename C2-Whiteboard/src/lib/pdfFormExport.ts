import {castingFields} from '@/lib/castingFields';
import {PDFDocument, rgb, type PDFPage, type PDFFont} from 'pdf-lib';
import type {Block, SpellColumn, SpellEntry, Whiteboard} from '@/types';
import {componentsLabel, spellLevelLabel} from '@/components/blocks/shared';
import {listItemChecked, listItemText} from '@/lib/listContent';

import {sanitizeFieldName} from './pdfFieldName';
import fontkit from '@pdf-lib/fontkit';
import fontUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url';

export const PDF_PAGE_PADDING = 48;

const PARCHMENT = rgb(0.957, 0.925, 0.847);
const BORDER = rgb(0.69, 0.55, 0.34);
const ACCENT = rgb(0.49, 0.18, 0.07);
const INK = rgb(0.165, 0.129, 0.094);
const FIELD_BG = rgb(1, 1, 1);

export interface PdfLayoutBlock {
  block: Block;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfLayout {
  blocks: PdfLayoutBlock[];
  pageWidth: number;
  pageHeight: number;
}

interface PdfFormContext {
  form: ReturnType<PDFDocument['getForm']>;
  page: PDFPage;
  font: PDFFont;
  pageHeight: number;
}

function boundsFor(blocks: Block[]) {
  const minX = Math.min(...blocks.map((b) => b.x));
  const minY = Math.min(...blocks.map((b) => b.y));
  return {minX, minY};
}

function horizontalOverlap(a: PdfLayoutBlock, b: PdfLayoutBlock): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width;
}

function spellMetaLine(spell: SpellEntry, defaultColumns: SpellColumn[]): string {
  const columns = spell.columns ?? defaultColumns;
  const parts: string[] = [];
  if (columns.includes('school') && spell.school) parts.push(`School: ${spell.school}`);
  if (columns.includes('castingTime') && spell.castingTime) parts.push(`Cast: ${spell.castingTime}`);
  if (columns.includes('range') && spell.range) parts.push(`Range: ${spell.range}`);
  const comp = componentsLabel(spell.components);
  if (columns.includes('components') && comp) parts.push(`Comp: ${comp}`);
  if (columns.includes('duration') && spell.duration) parts.push(`Dur: ${spell.duration}`);
  if (columns.includes('attackSave') && spell.attackSave) parts.push(`Roll: ${spell.attackSave}`);
  if (columns.includes('damageEffect') && spell.damageEffect) parts.push(`Effect: ${spell.damageEffect}`);
  if (columns.includes('source') && spell.source) parts.push(`Src: ${spell.source}`);
  if (columns.includes('concentration') && spell.concentration) parts.push('Concentration');
  if (columns.includes('ritual') && spell.ritual) parts.push('Ritual');
  return parts.join(' · ');
}

function spellListContentHeight(block: Block): number {
  if (block.type !== 'spellList') return block.height;
  const {content} = block;
  let h = 28;
  if (content.showHeader) h += 42;
  for (const group of content.groups) {
    h += 22;
    for (const spell of group.spells) {
      h += 20;
      if (spellMetaLine(spell, content.columns)) h += 14;
      h += 46;
    }
    h += 8;
  }
  return Math.max(block.height, h + 12);
}

function listContentHeight(block: Block): number {
  if (block.type !== 'list') return block.height;
  let h = block.content.title ? 26 : 8;
  h += block.content.items.length * 20;
  return Math.max(block.height, h + 8);
}

function pdfBlockHeight(block: Block): number {
  if (block.type === 'spellList') return spellListContentHeight(block);
  if (block.type === 'list') return listContentHeight(block);
  return block.height;
}

export function computePdfLayout(blocks: Block[]): PdfLayout {
  const visible = blocks.filter((b) => !b.hidden);
  if (!visible.length) {
    return {blocks: [], pageWidth: PDF_PAGE_PADDING * 2, pageHeight: PDF_PAGE_PADDING * 2};
  }

  const {minX, minY} = boundsFor(visible);
  const layouts: PdfLayoutBlock[] = visible.map((block) => ({
    block,
    x: block.x - minX + PDF_PAGE_PADDING,
    y: block.y - minY + PDF_PAGE_PADDING,
    width: block.width,
    height: pdfBlockHeight(block),
  }));

  layouts.sort((a, b) => a.y - b.y || a.x - b.x);
  for (let i = 0; i < layouts.length; i += 1) {
    for (let j = i + 1; j < layouts.length; j += 1) {
      const upper = layouts[i];
      const lower = layouts[j];
      if (horizontalOverlap(upper, lower) && lower.y < upper.y + upper.height + 4) {
        lower.y = upper.y + upper.height + 4;
      }
    }
  }

  const pageWidth = Math.max(...layouts.map((l) => l.x + l.width)) + PDF_PAGE_PADDING;
  const pageHeight = Math.max(...layouts.map((l) => l.y + l.height)) + PDF_PAGE_PADDING;
  return {blocks: layouts, pageWidth, pageHeight};
}



function pdfY(pageHeight: number, top: number, height: number): number {
  return pageHeight - top - height;
}

function drawLabel(ctx: PdfFormContext, text: string, x: number, top: number, size = 9): void {
  ctx.page.drawText(text, {
    x,
    y: pdfY(ctx.pageHeight, top, size),
    size,
    font: ctx.font,
    color: ACCENT,
  });
}

function addTextField(
  ctx: PdfFormContext,
  name: string,
  x: number,
  top: number,
  width: number,
  height: number,
  value: string,
  multiline = false,
  fontSize = 11,
): void {
  const field = ctx.form.createTextField(sanitizeFieldName(name));
  field.setText(value);

  if (multiline) field.enableMultiline();
  field.addToPage(ctx.page, {
    font: ctx.font,
    x,
    y: pdfY(ctx.pageHeight, top, height),
    width,
    height,
    borderWidth: 0.5,
    borderColor: BORDER,
    backgroundColor: FIELD_BG,
  });
  field.setFontSize(fontSize);
}

function addCheckField(
  ctx: PdfFormContext,
  name: string,
  x: number,
  top: number,
  size: number,
  checked: boolean,
): void {
  const field = ctx.form.createCheckBox(sanitizeFieldName(name));
  if (checked) field.check();
  field.addToPage(ctx.page, {
    x,
    y: pdfY(ctx.pageHeight, top, size),
    width: size,
    height: size,
    borderWidth: 0.5,
    borderColor: BORDER,
  });
}

function drawBlockChrome(ctx: PdfFormContext, layout: PdfLayoutBlock): void {
  const {x, y, width, height, block} = layout;
  const chromeless = block.type === 'divider' || block.type === 'heading';
  const showChrome = !chromeless && (block.style?.showBorder ?? true);
  if (!showChrome) return;

  ctx.page.drawRectangle({
    x,
    y: pdfY(ctx.pageHeight, y, height),
    width,
    height,
    color: PARCHMENT,
    borderColor: BORDER,
    borderWidth: 0.75,
  });
}

function addTextBlockFields(ctx: PdfFormContext, layout: PdfLayoutBlock): void {
  const {block, x, y, width, height} = layout;
  if (block.type !== 'text') return;
  addTextField(ctx, `${block.id}.text`, x + 6, y + 6, width - 12, height - 12, block.content.text, true, block.style?.fontSize ?? 12);
}

function addHeadingFields(ctx: PdfFormContext, layout: PdfLayoutBlock): void {
  const {block, x, y, width, height} = layout;
  if (block.type !== 'heading') return;
  addTextField(ctx, `${block.id}.text`, x, y + 8, width, height * 0.55, block.content.text, false, block.style?.fontSize ?? 28);
  addTextField(ctx, `${block.id}.subtitle`, x, y + height * 0.58, width, height * 0.3, block.content.subtitle ?? '', false, 14);
}

function addStatBlockFields(ctx: PdfFormContext, layout: PdfLayoutBlock): void {
  const {block, x, y, width, height} = layout;
  if (block.type !== 'statBlock') return;
  addTextField(ctx, `${block.id}.label`, x + 8, y + 8, width - 16, 16, block.content.label, false, 10);
  addTextField(ctx, `${block.id}.value`, x + 8, y + height * 0.35, width - 16, height * 0.35, block.content.value, false, 24);
  addTextField(ctx, `${block.id}.hint`, x + 8, y + height * 0.75, width - 16, 14, block.content.hint ?? '', false, 9);
}

function addAbilityFields(ctx: PdfFormContext, layout: PdfLayoutBlock): void {
  const {block, x, y, width, height} = layout;
  if (block.type !== 'abilityScores') return;
  const cellW = (width - 40) / 6;
  block.content.abilities.forEach((ability, index) => {
    const cx = x + 8 + index * (cellW + 4);
    drawLabel(ctx, ability.label, cx + 4, y + 10, 8);
    addTextField(ctx, `${block.id}.${ability.key}`, cx, y + 22, cellW, 24, String(ability.score), false, 16);
    const mod = Math.floor((ability.score - 10) / 2);
    drawLabel(ctx, `${mod >= 0 ? '+' : ''}${mod}`, cx + 4, y + height - 18, 10);
  });
}

function addListFields(ctx: PdfFormContext, layout: PdfLayoutBlock): void {
  const {block, x, y, width} = layout;
  if (block.type !== 'list') return;
  let cursor = y + 6;
  if (block.content.title) {
    addTextField(ctx, `${block.id}.title`, x + 6, cursor, width - 12, 18, block.content.title, false, 11);
    cursor += 24;
  }
  block.content.items.forEach((item, index) => {
    const text = listItemText(item);
    if (block.content.checklist) {
      addCheckField(ctx, `${block.id}.item.${index}.checked`, x + 8, cursor, 12, listItemChecked(item));
      addTextField(ctx, `${block.id}.item.${index}.text`, x + 24, cursor, width - 32, 16, text, false, 11);
    } else {
      const prefix = block.content.ordered ? `${index + 1}. ` : '• ';
      addTextField(ctx, `${block.id}.item.${index}.text`, x + 8, cursor, width - 16, 16, `${prefix}${text}`, false, 11);
    }
    cursor += 20;
  });
}

function addSpellListFields(ctx: PdfFormContext, layout: PdfLayoutBlock): void {
  const {block, x, y, width} = layout;
  if (block.type !== 'spellList') return;
  const {content} = block;
  let cursor = y + 6;

  addTextField(ctx, `${block.id}.title`, x + 8, cursor, width - 16, 18, content.title ?? '', false, 12);
  cursor += 24;

  if (content.showHeader) {
    const colW = (width - 24) / 3;
    drawLabel(ctx, 'Ability', x + 8, cursor + 8);
    addTextField(ctx, `${block.id}.ability`, x + 8, cursor + 12, colW, 20, content.ability ?? '', false, 11);
    drawLabel(ctx, 'Save DC', x + 12 + colW, cursor + 8);
    addTextField(ctx, `${block.id}.saveDc`, x + 12 + colW, cursor + 12, colW, 20, content.saveDc ?? '', false, 11);
    drawLabel(ctx, 'Spell Atk', x + 16 + colW * 2, cursor + 8);
    addTextField(ctx, `${block.id}.attackBonus`, x + 16 + colW * 2, cursor + 12, colW, 20, content.attackBonus ?? '', false, 11);
    cursor += 40;
  }

  for (const group of content.groups) {
    drawLabel(ctx, spellLevelLabel(group.level), x + 8, cursor + 10, 10);
    if (group.level > 0) {
      drawLabel(ctx, 'Slots', x + width - 92, cursor + 10, 8);
      addTextField(ctx, `${block.id}.group.${group.id}.expended`, x + width - 72, cursor + 4, 22, 14, String(group.slotsExpended), false, 9);
      drawLabel(ctx, '/', x + width - 48, cursor + 10, 9);
      addTextField(ctx, `${block.id}.group.${group.id}.total`, x + width - 40, cursor + 4, 22, 14, String(group.slotsTotal), false, 9);
    }
    cursor += 22;

    for (const spell of group.spells) {
      if (group.level > 0) {
        addCheckField(ctx, `${block.id}.spell.${spell.id}.prepared`, x + 10, cursor + 2, 12, spell.prepared);
      }
      addTextField(ctx, `${block.id}.spell.${spell.id}.name`, x + 26, cursor, width - 34, 16, spell.name, false, 10);
      cursor += 18;

      const meta = spellMetaLine(spell, content.columns);
      if (meta) {
        addTextField(ctx, `${block.id}.spell.${spell.id}.meta`, x + 26, cursor, width - 34, 12, meta, false, 7);
        ctx.form.getTextField(sanitizeFieldName(`${block.id}.spell.${spell.id}.meta`)).enableReadOnly();
        cursor += 14;
      }

      drawLabel(ctx, 'Description', x + 10, cursor + 8, 7);
      addTextField(
        ctx,
        `${block.id}.spell.${spell.id}.description`,
        x + 8,
        cursor + 10,
        width - 16,
        40,
        spell.description ?? spell.notes ?? '',
        true,
        8,
      );
      cursor += 46;
    }
    cursor += 8;
  }
}

function addBlockFields(ctx: PdfFormContext, layout: PdfLayoutBlock): void {
  switch (layout.block.type) {
    case 'text':
      addTextBlockFields(ctx, layout);
      break;
    case 'heading':
      addHeadingFields(ctx, layout);
      break;
    case 'statBlock':
      addStatBlockFields(ctx, layout);
      break;
    case 'spellSlots': {
      const {block,x,y,width,height}=layout;
      if(block.type!=='spellSlots') break;
      const col=width/3, h=height/5;
      drawLabel(ctx,'SPELL SLOTS',x+width*.43,y+2,Math.min(14,h*.6));
      block.content.rows.forEach((r,i)=>{
        const left=x+Math.floor(i/3)*col, top=y+h*(1.6+i%3);
        if(i%3===0){drawLabel(ctx,'Total',left+col*.32,y+h,8);drawLabel(ctx,'Expended',left+col*.52,y+h,8);}
        drawLabel(ctx,'Level '+(i+1),left+2,top+h*.22,Math.min(10,col*.065));
        addTextField(ctx,block.id+'.total'+i,left+col*.32,top,col*.16,h*.7,String(r.total||''),false,Math.min(14,h*.48));
        r.used.forEach((used,k)=>addCheckField(ctx,block.id+'.used'+i+'_'+k,left+col*(.52+k*.11),top+h*.2,Math.min(col*.09,h*.45),used));
      });
      break;
    }
    case 'abilityScore': {
      const {block,x,y,width,height} = layout;
      if (block.type !== 'abilityScore') break;
      const row = height / 4;
      castingFields.forEach(([key,label],i)=>{
        const top=y+i*row;
        const w=i===0 ? width*.9 : width*.26;
        addTextField(ctx,block.id+'.'+key,x+4,top+3,w,row*.6,block.content[key],false,Math.min(row*.42,24));
        drawLabel(ctx,label.toUpperCase(),i===0 ? x+5 : x+w+10,top+row*(i===0?.73:.35),Math.min(width*.036,11));
      });
      break;
    }
    case 'abilityScores':
      addAbilityFields(ctx, layout);
      break;
    case 'list':
      addListFields(ctx, layout);
      break;
    case 'spellList':
      addSpellListFields(ctx, layout);
      break;
    default:
      break;
  }
}

export async function buildInteractivePdf(
  board: Whiteboard,
  options?: {encodedBoard?: string; boardJson?: string},
): Promise<Uint8Array> {
  const layout = computePdfLayout(board.blocks);
  if (!layout.blocks.length) throw new Error('The whiteboard has no printable content.');

  const pdf = await PDFDocument.create();
  pdf.setTitle(board.name);
  if (options?.encodedBoard) pdf.setSubject(options.encodedBoard);
  pdf.setCreator('C2 Whiteboard');
  pdf.setProducer('C2 Whiteboard');
  pdf.setCreationDate(new Date(board.updatedAt));
  pdf.setModificationDate(new Date());

  if (options?.boardJson) {
    await pdf.attach(new TextEncoder().encode(options.boardJson), 'c2-whiteboard.json', {
      mimeType: 'application/json',
      description: 'Editable C2 Whiteboard data for re-import into C2 Whiteboard',
      creationDate: new Date(board.updatedAt),
      modificationDate: new Date(),
    });
  }

  const page = pdf.addPage([layout.pageWidth, layout.pageHeight]);
  pdf.registerFontkit(fontkit);
  const response = await fetch(fontUrl);
  if (!response.ok) throw new Error('Could not load the PDF font. Please retry.');
  const font = await pdf.embedFont(await response.arrayBuffer());
  const form = pdf.getForm();

  page.drawRectangle({x: 0, y: 0, width: layout.pageWidth, height: layout.pageHeight, color: PARCHMENT});
  page.drawText(board.name, {x: PDF_PAGE_PADDING, y: layout.pageHeight - 24, size: 14, font, color: INK});

  const ctx: PdfFormContext = {form, page, font, pageHeight: layout.pageHeight};

  for (const blockLayout of layout.blocks) {
    drawBlockChrome(ctx, blockLayout);
    const {block, x, y, width, height} = blockLayout;
    if (block.type === 'divider') {
      const mid = layout.pageHeight - y - height / 2;
      page.drawLine({start:{x,y:mid},end:{x:x+width,y:mid},color:BORDER,thickness:1});
      if (block.content.ornament) page.drawCircle({x:x+width/2,y:mid,size:3,color:BORDER});
    } else if (block.type === 'image' && block.content.src) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = block.content.src;
      try { await img.decode(); } catch { throw new Error('Could not load the portrait for export. Upload the image file and try again.'); }
      const canvas = document.createElement('canvas');
      const scale = Math.min(2, 1600 / Math.max(width,height));
      canvas.width = Math.max(1, Math.round(width*scale));
      canvas.height = Math.max(1, Math.round(height*scale));
      const fit = block.content.fit === 'cover' ? Math.max : Math.min;
      const ratio = fit(canvas.width/img.naturalWidth, canvas.height/img.naturalHeight);
      const w = img.naturalWidth*ratio, h = img.naturalHeight*ratio;
      canvas.getContext('2d')!.drawImage(img,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
      const image = await pdf.embedPng(canvas.toDataURL('image/png'));
      page.drawImage(image,{x,y:pdfY(layout.pageHeight,y,height),width,height});
    } else {
      addBlockFields(ctx, blockLayout);
    }
  }

  form.updateFieldAppearances(font);
  return pdf.save();
}









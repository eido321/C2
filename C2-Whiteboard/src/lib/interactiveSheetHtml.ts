import {castingFields} from '@/lib/castingFields';
import type {Block, ListItem, SpellColumn, SpellEntry, Whiteboard} from '@/types';
import {componentsLabel, spellLevelLabel} from '@/components/blocks/shared';
import {listItemChecked, listItemText} from '@/lib/listContent';

const PAGE_PADDING = 48;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function boundsFor(blocks: Block[]) {
  const minX = Math.min(...blocks.map((b) => b.x));
  const minY = Math.min(...blocks.map((b) => b.y));
  const maxX = Math.max(...blocks.map((b) => b.x + b.width));
  const maxY = Math.max(...blocks.map((b) => b.y + b.height));
  return {minX, minY, width: maxX - minX, height: maxY - minY};
}

function spellMeta(spell: SpellEntry, columns: SpellColumn[]): string {
  const parts: string[] = [];
  if (columns.includes('school') && spell.school) parts.push(`<span class="meta"><b>School</b> ${escapeHtml(spell.school)}</span>`);
  if (columns.includes('castingTime') && spell.castingTime) parts.push(`<span class="meta"><b>Cast</b> ${escapeHtml(spell.castingTime)}</span>`);
  if (columns.includes('range') && spell.range) parts.push(`<span class="meta"><b>Range</b> ${escapeHtml(spell.range)}</span>`);
  const comp = componentsLabel(spell.components);
  if (columns.includes('components') && comp) parts.push(`<span class="meta"><b>Comp</b> ${escapeHtml(comp)}</span>`);
  if (columns.includes('duration') && spell.duration) parts.push(`<span class="meta"><b>Dur</b> ${escapeHtml(spell.duration)}</span>`);
  if (columns.includes('attackSave') && spell.attackSave) parts.push(`<span class="meta"><b>Roll</b> ${escapeHtml(spell.attackSave)}</span>`);
  if (columns.includes('damageEffect') && spell.damageEffect) parts.push(`<span class="meta"><b>Effect</b> ${escapeHtml(spell.damageEffect)}</span>`);
  if (columns.includes('source') && spell.source) parts.push(`<span class="meta"><b>Src</b> ${escapeHtml(spell.source)}</span>`);
  return parts.join('');
}

function renderSpellList(block: Block, blockIndex: number): string {
  if (block.type !== 'spellList') return '';
  const {content, style} = block;
  const fontSize = style?.fontSize ?? 14;
  const groups = content.groups ?? [];

  const header = content.showHeader
    ? `<div class="spell-header">
        <label class="summary-cell"><span>Ability</span><input data-path="blocks.${blockIndex}.content.ability" value="${escapeHtml(content.ability ?? '')}" /></label>
        <label class="summary-cell"><span>Save DC</span><input data-path="blocks.${blockIndex}.content.saveDc" value="${escapeHtml(content.saveDc ?? '')}" /></label>
        <label class="summary-cell"><span>Spell Atk</span><input data-path="blocks.${blockIndex}.content.attackBonus" value="${escapeHtml(content.attackBonus ?? '')}" /></label>
      </div>`
    : '';

  const groupHtml = groups
    .map((group, groupIndex) => {
      const spells = group.spells
        .map((spell, spellIndex) => {
          const columns = spell.columns ?? content.columns ?? [];
          const gi = groupIndex;
          const si = spellIndex;
          const base = `blocks.${blockIndex}.content.groups.${gi}.spells.${si}`;
          const expanded = spell.expanded ?? false;
          const description = spell.description ?? spell.notes ?? '';
          const meta = spellMeta(spell, columns);
          const preparedBtn =
            group.level > 0
              ? `<button type="button" class="prep-btn ${spell.prepared ? 'on' : ''}" data-action="toggle-prepared" data-gi="${gi}" data-si="${si}" data-bi="${blockIndex}" title="Prepared">✓</button>`
              : '';
          const expandBtn = `<button type="button" class="expand-btn" data-action="toggle-expanded" data-gi="${gi}" data-si="${si}" data-bi="${blockIndex}" title="Expand">${expanded ? '▼' : '▶'}</button>`;
          const badges = [
            columns.includes('concentration') && spell.concentration ? '<span class="badge">Conc</span>' : '',
            columns.includes('ritual') && spell.ritual ? '<span class="badge">Ritual</span>' : '',
          ].join('');
          const details = expanded
            ? `<div class="spell-details">
                <span class="detail-label">Description</span>
                <textarea data-path="${base}.description" rows="3" placeholder="Spell description...">${escapeHtml(description)}</textarea>
              </div>`
            : '';
          return `<article class="spell-row ${group.level > 0 && !spell.prepared ? 'muted' : ''}">
            <div class="spell-row-head">
              ${expandBtn}
              ${preparedBtn}
              <textarea class="spell-name" data-path="${base}.name" rows="1" placeholder="Spell name">${escapeHtml(spell.name)}</textarea>
              ${badges}
            </div>
            ${meta ? `<div class="spell-meta">${meta}</div>` : ''}
            ${details}
          </article>`;
        })
        .join('');

      const slots =
        group.level > 0
          ? `<span class="slot-controls">
              ${Array.from({length: group.slotsTotal}, (_, i) => `<button type="button" class="slot-pip ${i < group.slotsExpended ? 'on' : ''}" data-action="toggle-slot" data-gi="${groupIndex}" data-slot="${i}" data-bi="${blockIndex}"></button>`).join('')}
              <input type="number" min="0" class="slot-num" data-path="blocks.${blockIndex}.content.groups.${groupIndex}.slotsExpended" value="${group.slotsExpended}" title="Expended" />
              <span>/</span>
              <input type="number" min="0" class="slot-num" data-path="blocks.${blockIndex}.content.groups.${groupIndex}.slotsTotal" value="${group.slotsTotal}" title="Total" />
            </span>`
          : '';

      return `<section class="spell-group">
        <div class="spell-group-head">
          <span class="spell-level">${escapeHtml(spellLevelLabel(group.level))}</span>
          ${slots}
        </div>
        <div class="spell-group-body">${spells}</div>
      </section>`;
    })
    .join('');

  return `<div class="spell-list" style="font-size:${fontSize}px">
    <input class="spell-title" data-path="blocks.${blockIndex}.content.title" value="${escapeHtml(content.title ?? '')}" placeholder="Spell list title" />
    ${header}
    <div class="spell-scroll">${groupHtml}</div>
  </div>`;
}

function renderList(block: Block, blockIndex: number): string {
  if (block.type !== 'list') return '';
  const {content, style} = block;
  const fontSize = style?.fontSize ?? 15;
  const items = content.items.length ? content.items : [{text: ''}];

  const rows = items
    .map((item: ListItem, itemIndex: number) => {
      const text = listItemText(item);
      const checked = listItemChecked(item);
      const marker = content.checklist
        ? `<button type="button" class="list-check ${checked ? 'on' : ''}" data-action="toggle-list-check" data-bi="${blockIndex}" data-ii="${itemIndex}">✓</button>`
        : `<span class="list-bullet">${content.ordered ? `${itemIndex + 1}.` : '•'}</span>`;
      return `<div class="list-row">
        ${marker}
        <textarea data-path="blocks.${blockIndex}.content.items.${itemIndex}" rows="1" placeholder="List item">${escapeHtml(text)}</textarea>
      </div>`;
    })
    .join('');

  return `<div class="list-block" style="font-size:${fontSize}px">
    <input class="list-title" data-path="blocks.${blockIndex}.content.title" value="${escapeHtml(content.title ?? '')}" placeholder="List title" />
    <div class="list-scroll">${rows}</div>
  </div>`;
}

function renderBlock(block: Block, blockIndex: number, originX: number, originY: number): string {
  const {style} = block;
  const chromeless = block.type === 'divider' || block.type === 'heading';
  const showChrome = !chromeless && (style?.showBorder ?? true);
  const left = block.x - originX + PAGE_PADDING;
  const top = block.y - originY + PAGE_PADDING;
  const chromeClass = showChrome ? 'block-chrome parchment' : 'block-chrome';

  let inner = '';
  switch (block.type) {
    case 'text':
      inner = `<textarea class="text-block" data-path="blocks.${blockIndex}.content.text" style="font-size:${style?.fontSize ?? 15}px;text-align:${style?.align ?? 'left'}">${escapeHtml(block.content.text)}</textarea>`;
      break;
    case 'heading':
      inner = `<div class="heading-block" style="text-align:${style?.align ?? 'left'}">
        <input data-path="blocks.${blockIndex}.content.text" value="${escapeHtml(block.content.text)}" style="font-size:${style?.fontSize ?? 34}px;color:${style?.color ?? '#7c2d12'}" />
        <input class="subtitle" data-path="blocks.${blockIndex}.content.subtitle" value="${escapeHtml(block.content.subtitle ?? '')}" placeholder="Subtitle" />
      </div>`;
      break;
    case 'statBlock':
      inner = `<div class="stat-block">
        <input class="stat-label" data-path="blocks.${blockIndex}.content.label" value="${escapeHtml(block.content.label)}" />
        <input class="stat-value" data-path="blocks.${blockIndex}.content.value" value="${escapeHtml(block.content.value)}" />
        <input class="stat-hint" data-path="blocks.${blockIndex}.content.hint" value="${escapeHtml(block.content.hint ?? '')}" placeholder="hint" />
      </div>`;
      break;
    case 'spellSlots':
      inner='<strong>Spell Slots</strong>'+block.content.rows.map((r,i)=>`<div>Level ${i+1}: ${r.total} · ${r.used.filter(Boolean).length} expended</div>`).join('');
      break;
    case 'abilityScore': {
      const content=block.content;
      inner=castingFields.map(([key,label])=>`<label>${label}<input data-path="blocks.${blockIndex}.content.${key}" value="${escapeHtml(content[key])}"/></label>`).join('');
      break;
    }
    case 'abilityScores':
      inner = `<div class="ability-grid">${block.content.abilities
        .map(
          (a, ai) => `<div class="ability-cell">
            <span class="ability-label">${escapeHtml(a.label)}</span>
            <input type="number" data-path="blocks.${blockIndex}.content.abilities.${ai}.score" value="${a.score}" />
            <span class="ability-mod">${Math.floor((a.score - 10) / 2) >= 0 ? '+' : ''}${Math.floor((a.score - 10) / 2)}</span>
          </div>`,
        )
        .join('')}</div>`;
      break;
    case 'list':
      inner = renderList(block, blockIndex);
      break;
    case 'spellList':
      inner = renderSpellList(block, blockIndex);
      break;
    case 'image':
      inner = block.content.src
        ? `<img src="${escapeHtml(block.content.src)}" alt="${escapeHtml(block.content.alt ?? '')}" style="object-fit:${block.content.fit}" />`
        : `<div class="image-placeholder">${escapeHtml(block.content.alt ?? 'Image')}</div>`;
      break;
    case 'divider':
      inner = `<div class="divider">${block.content.ornament ? '◆ ◆ ◆' : ''}</div>`;
      break;
  }

  return `<div class="block ${chromeClass}" style="left:${left}px;top:${top}px;width:${block.width}px;height:${block.height}px;${block.rotation ? `transform:rotate(${block.rotation}deg);` : ''}">
    ${inner}
  </div>`;
}

const SHEET_CSS = `
:root {
  --parchment: #f4ecd8;
  --parchment-deep: #e8dcc0;
  --ink: #2a2118;
  --accent: #7c2d12;
  --gold: #b08d57;
}
* { box-sizing: border-box; }
body { margin: 0; background: #e2e8f0; font-family: Georgia, serif; color: var(--ink); }
.toolbar {
  position: sticky; top: 0; z-index: 20; display: flex; gap: 12px; align-items: center;
  padding: 10px 16px; background: #fff; border-bottom: 1px solid #e2e8f0;
  font-family: Inter, system-ui, sans-serif; font-size: 14px;
}
.toolbar button {
  border: none; border-radius: 8px; padding: 8px 14px; font-weight: 600; cursor: pointer;
  background: var(--accent); color: #fff;
}
.toolbar button.secondary { background: #f1f5f9; color: #334155; }
.sheet-wrap { display: flex; justify-content: center; padding: 24px; }
.sheet {
  position: relative; background: var(--parchment);
  background-image:
    radial-gradient(circle at 20% 15%, rgba(176,141,87,.08), transparent 45%),
    radial-gradient(circle at 85% 80%, rgba(124,45,18,.06), transparent 40%);
  border: 1px solid rgba(176,141,87,.45); border-radius: 18px; box-shadow: 0 10px 30px rgba(15,23,42,.12);
}
.block { position: absolute; overflow: hidden; }
.block-chrome { border-radius: 12px; padding: 12px; border: 1px solid rgba(176,141,87,.55); }
.parchment { background: var(--parchment); }
textarea, input { font: inherit; color: inherit; background: rgba(255,255,255,.35); border: 1px solid transparent; border-radius: 6px; outline: none; width: 100%; }
textarea:focus, input:focus { border-color: rgba(176,141,87,.5); background: rgba(255,255,255,.6); }
.text-block { height: 100%; resize: none; line-height: 1.5; }
.heading-block { display: flex; flex-direction: column; justify-content: center; height: 100%; gap: 4px; }
.heading-block input { font-family: Cinzel, Georgia, serif; font-weight: 700; background: transparent; border-color: transparent; }
.heading-block .subtitle { font-style: italic; color: #64748b; font-size: 15px; }
.stat-block { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 2px; text-align: center; }
.stat-label { font-family: Cinzel, Georgia, serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--accent); background: transparent; text-align: center; }
.stat-value { font-size: 36px; font-weight: 700; background: transparent; text-align: center; }
.stat-hint { font-size: 11px; font-style: italic; color: #94a3b8; background: transparent; text-align: center; }
.ability-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; height: 100%; }
.ability-cell { display: flex; flex-direction: column; align-items: center; justify-content: space-between; border: 1px solid rgba(176,141,87,.4); border-radius: 8px; background: rgba(244,236,216,.6); padding: 8px 4px; }
.ability-label { font-family: Cinzel, Georgia, serif; font-size: 11px; font-weight: 700; color: var(--accent); }
.ability-cell input { width: 48px; text-align: center; font-size: 24px; font-weight: 700; }
.ability-mod { font-size: 12px; font-weight: 600; color: #5c5040; border: 1px solid rgba(176,141,87,.5); border-radius: 999px; padding: 0 8px; background: #fff; }
.list-block, .spell-list { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.list-title, .spell-title { margin-bottom: 8px; border: none; border-bottom: 1px solid rgba(176,141,87,.4); background: transparent; font-family: Cinzel, Georgia, serif; font-size: 14px; font-weight: 700; text-transform: uppercase; color: var(--accent); }
.list-scroll, .spell-scroll { flex: 1; overflow: auto; overscroll-behavior: contain; padding-right: 4px; }
.list-row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 6px; }
.list-bullet { min-width: 20px; text-align: right; color: var(--gold); font-size: 12px; font-weight: 600; }
.list-check, .prep-btn { width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(176,141,87,.6); background: rgba(244,236,216,.7); color: transparent; cursor: pointer; flex-shrink: 0; margin-top: 2px; }
.list-check.on, .prep-btn.on { background: var(--accent); border-color: var(--accent); color: #f4ecd8; }
.spell-header { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 8px; }
.summary-cell { display: flex; flex-direction: column; align-items: center; border: 1px solid rgba(176,141,87,.4); border-radius: 8px; padding: 6px; background: rgba(255,255,255,.35); }
.summary-cell span { font-family: Cinzel, Georgia, serif; font-size: 9px; font-weight: 700; text-transform: uppercase; color: var(--accent); }
.summary-cell input { text-align: center; font-weight: 700; background: transparent; border: none; }
.spell-group { border: 1px solid rgba(176,141,87,.25); border-radius: 8px; background: rgba(255,255,255,.2); margin-bottom: 10px; }
.spell-group-head { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-bottom: 1px solid rgba(176,141,87,.3); background: rgba(244,236,216,.95); }
.spell-level { font-family: Cinzel, Georgia, serif; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--accent); }
.slot-controls { display: flex; align-items: center; gap: 4px; font-size: 10px; color: #64748b; }
.slot-pip { width: 14px; height: 14px; border-radius: 999px; border: 1px solid rgba(176,141,87,.6); background: rgba(255,255,255,.4); cursor: pointer; padding: 0; }
.slot-pip.on { background: var(--accent); border-color: var(--accent); }
.slot-num { width: 36px; text-align: center; font-size: 10px; padding: 2px; }
.spell-group-body { padding: 6px; }
.spell-row { border-radius: 8px; background: rgba(255,255,255,.3); padding: 6px 8px; margin-bottom: 6px; }
.spell-row.muted { opacity: .6; }
.spell-row-head { display: flex; gap: 6px; align-items: flex-start; }
.expand-btn { border: none; background: transparent; color: rgba(124,45,18,.7); cursor: pointer; padding: 0; margin-top: 2px; }
.spell-name { flex: 1; resize: none; overflow: hidden; min-height: 24px; font-weight: 600; line-height: 1.35; }
.spell-meta { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; padding-left: 22px; font-family: Inter, system-ui, sans-serif; font-size: 10px; }
.meta { background: rgba(232,220,192,.6); border-radius: 999px; padding: 2px 6px; color: #64748b; }
.meta b { color: rgba(124,45,18,.7); text-transform: uppercase; }
.badge { border: 1px solid rgba(176,141,87,.5); border-radius: 999px; padding: 2px 6px; font-family: Inter, system-ui, sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; background: rgba(255,255,255,.7); }
.spell-details { margin-top: 8px; border: 1px solid rgba(176,141,87,.25); border-radius: 8px; background: rgba(244,236,216,.45); padding: 8px; }
.detail-label { display: block; font-family: Inter, system-ui, sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; color: rgba(124,45,18,.7); margin-bottom: 4px; }
.spell-details textarea { font-style: italic; color: #475569; resize: vertical; min-height: 64px; }
.divider { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--gold); letter-spacing: .5em; }
.image-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-style: italic; }
img { width: 100%; height: 100%; display: block; }
@media print {
  .toolbar { display: none; }
  body { background: white; }
  .sheet { box-shadow: none; }
}
`;

const SHEET_SCRIPT = `
function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}
function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i += 1) cur = cur[keys[i]];
  cur[keys[keys.length - 1]] = value;
}
function syncBoard() {
  document.getElementById('c2-board-data').textContent = JSON.stringify(board);
}
function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
function autoResizeTextareas(root) {
  (root || document).querySelectorAll('textarea').forEach(autoResizeTextarea);
}
function bindField(el) {
  if (el.dataset.bound) return;
  el.dataset.bound = '1';
  const path = el.getAttribute('data-path');
  const handler = () => {
    let value = el.type === 'number' ? Number(el.value || 0) : el.value;
    if (/\\.items\\.\\d+$/.test(path)) {
      const item = getPath(board, path);
      value = typeof item === 'object' && item !== null ? { ...item, text: el.value } : el.value;
    }
    setPath(board, path, value);
    syncBoard();
    if (el.tagName === 'TEXTAREA') autoResizeTextarea(el);
    if (/\\.abilities\\.\\d+\\.score$/.test(path)) {
      const score = Number(el.value || 0);
      const mod = Math.floor((score - 10) / 2);
      const modEl = el.closest('.ability-cell')?.querySelector('.ability-mod');
      if (modEl) modEl.textContent = (mod >= 0 ? '+' : '') + mod;
    }
    if (/\\.slotsExpended$/.test(path) || /\\.slotsTotal$/.test(path)) {
      refreshSlotPips(el.closest('.spell-group'));
    }
  };
  el.addEventListener('input', handler);
  el.addEventListener('change', handler);
}
function bindAction(el) {
  if (el.dataset.bound) return;
  el.dataset.bound = '1';
  el.addEventListener('click', () => {
    const action = el.getAttribute('data-action');
    const bi = Number(el.getAttribute('data-bi'));
    if (action === 'toggle-expanded') {
      const gi = Number(el.getAttribute('data-gi'));
      const si = Number(el.getAttribute('data-si'));
      const spell = board.blocks[bi].content.groups[gi].spells[si];
      spell.expanded = !spell.expanded;
      el.textContent = spell.expanded ? '▼' : '▶';
      const row = el.closest('.spell-row');
      let details = row.querySelector('.spell-details');
      if (spell.expanded) {
        if (!details) {
          details = document.createElement('div');
          details.className = 'spell-details';
          const base = 'blocks.' + bi + '.content.groups.' + gi + '.spells.' + si;
          const desc = spell.description ?? spell.notes ?? '';
          details.innerHTML = '<span class="detail-label">Description</span><textarea data-path="' + base + '.description" rows="3" placeholder="Spell description..."></textarea>';
          row.appendChild(details);
          const ta = details.querySelector('textarea');
          ta.value = desc;
          bindField(ta);
          autoResizeTextarea(ta);
        }
      } else {
        details?.remove();
      }
    } else if (action === 'toggle-prepared') {
      const gi = Number(el.getAttribute('data-gi'));
      const si = Number(el.getAttribute('data-si'));
      const spell = board.blocks[bi].content.groups[gi].spells[si];
      spell.prepared = !spell.prepared;
      el.classList.toggle('on', spell.prepared);
      el.closest('.spell-row')?.classList.toggle('muted', !spell.prepared);
    } else if (action === 'toggle-slot') {
      const gi = Number(el.getAttribute('data-gi'));
      const slot = Number(el.getAttribute('data-slot'));
      const group = board.blocks[bi].content.groups[gi];
      group.slotsExpended = slot + 1 === group.slotsExpended ? slot : slot + 1;
      refreshSlotPips(el.closest('.spell-group'));
      const expInput = el.closest('.spell-group')?.querySelector('[data-path$=".slotsExpended"]');
      if (expInput) expInput.value = String(group.slotsExpended);
    } else if (action === 'toggle-list-check') {
      const ii = Number(el.getAttribute('data-ii'));
      const items = board.blocks[bi].content.items;
      const item = items[ii];
      if (typeof item === 'string') items[ii] = { text: item, checked: true };
      else item.checked = !item.checked;
      el.classList.toggle('on', typeof items[ii] === 'object' && items[ii].checked);
    }
    syncBoard();
  });
}
function refreshSlotPips(groupEl) {
  if (!groupEl) return;
  const expInput = groupEl.querySelector('[data-path$=".slotsExpended"]');
  const totalInput = groupEl.querySelector('[data-path$=".slotsTotal"]');
  const expended = Number(expInput?.value || 0);
  const total = Number(totalInput?.value || 0);
  groupEl.querySelectorAll('.slot-pip').forEach((pip, i) => {
    pip.classList.toggle('on', i < expended);
    pip.style.display = i < total ? '' : 'none';
  });
}
function bindEvents(root) {
  (root || document).querySelectorAll('[data-path]').forEach(bindField);
  (root || document).querySelectorAll('[data-action]').forEach(bindAction);
}
document.getElementById('save-sheet')?.addEventListener('click', () => {
  syncBoard();
  const html = '<!DOCTYPE html>' + document.documentElement.outerHTML;
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (board.name || 'character-sheet').replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\\s+/g, '-') + '.html';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('print-sheet')?.addEventListener('click', () => window.print());
`;

export function buildInteractiveSheetHtml(board: Whiteboard): string {
  const blocks = board.blocks.filter((b) => !b.hidden);
  const bounds = boundsFor(blocks);
  const pageWidth = bounds.width + PAGE_PADDING * 2;
  const pageHeight = bounds.height + PAGE_PADDING * 2;
  const visibleBlocks = board.blocks.filter((b) => !b.hidden);
  const blockHtml = visibleBlocks
    .map((block) => {
      const blockIndex = board.blocks.findIndex((b) => b.id === block.id);
      return renderBlock(block, blockIndex, bounds.minX, bounds.minY);
    })
    .join('\n');

  const boardJson = JSON.stringify(board).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(board.name)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=EB+Garamond:ital@0;1&family=Inter:wght@400;600&display=swap" rel="stylesheet" />
  <style>${SHEET_CSS}</style>
</head>
<body>
  <div class="toolbar">
    <strong>${escapeHtml(board.name)}</strong>
    <span style="color:#64748b">Interactive character sheet — edit fields, scroll spell lists, toggle prepared spells.</span>
    <button type="button" id="save-sheet">Save Sheet</button>
    <button type="button" class="secondary" id="print-sheet">Print</button>
  </div>
  <div class="sheet-wrap">
    <div class="sheet" id="sheet-root" style="width:${pageWidth}px;height:${pageHeight}px">
      ${blockHtml}
    </div>
  </div>
  <script id="c2-board-data" type="application/json">${boardJson}</script>
  <script>
    let board = JSON.parse(document.getElementById('c2-board-data').textContent);
    ${SHEET_SCRIPT}
    bindEvents();
    autoResizeTextareas();
  </script>
</body>
</html>`;
}

export function parseInteractiveSheetHtml(html: string): Whiteboard {
  const match = html.match(/<script id="c2-board-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match?.[1]) {
    throw new Error('This HTML file does not contain editable C2 whiteboard data.');
  }
  return JSON.parse(match[1]) as Whiteboard;
}




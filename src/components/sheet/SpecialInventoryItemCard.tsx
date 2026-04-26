import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImageFileToDataUrl } from '@/lib/compressImageFileToDataUrl';
import { cleanSpecialInventoryModifiers } from '@/lib/specialInventoryModifiers';
import { ABILITIES } from '@/config/constants';
import type { Ability, SpecialInventoryItem, SpecialInventoryModifiers } from '@/types';

function parseSignedInt(raw: string): number | undefined {
  const t = raw.trim().replace(/\u2212/g, '-').replace(/^\+/, '');
  if (t === '' || t === '-') return undefined;
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? undefined : n;
}

function committedSignedDisplay(value: number | undefined): string {
  if (value === undefined || value === null || Number.isNaN(value) || value === 0) return '';
  return String(value);
}

/** Lets you type `-` then digits; commits on blur so `-` alone is not wiped mid-edit. */
function SignedModInput({
  value,
  onCommit,
  className,
  placeholder,
}: {
  value: number | undefined;
  onCommit: (n: number | undefined) => void;
  className?: string;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState('');

  const shown = focused ? text : committedSignedDisplay(value);

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      placeholder={placeholder}
      value={shown}
      onFocus={() => {
        setFocused(true);
        setText(committedSignedDisplay(value));
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/\u2212/g, '-').replace(/^\+/, '');
        if (!/^-?\d*$/.test(raw)) return;
        setText(raw);
      }}
      onBlur={() => {
        setFocused(false);
        onCommit(parseSignedInt(text));
        setText('');
      }}
    />
  );
}

const SCALAR_MOD_KEYS = [
  'ac',
  'initiative',
  'spellSaveDc',
  'spellAttack',
  'passivePerception',
  'speed',
] as const;

function mergeModifiers(
  item: SpecialInventoryItem,
  patch: Partial<SpecialInventoryModifiers>,
): SpecialInventoryItem {
  const base = item.modifiers ?? {};
  const merged: SpecialInventoryModifiers = { ...base };

  for (const k of SCALAR_MOD_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(patch, k)) continue;
    const v = patch[k as keyof typeof patch];
    if (v === undefined || v === 0 || (typeof v === 'number' && Number.isNaN(v))) {
      delete (merged as Record<string, unknown>)[k];
    } else {
      (merged as Record<string, number>)[k] = v;
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'skills')) {
    if (!patch.skills || Object.keys(patch.skills).length === 0) delete merged.skills;
    else merged.skills = patch.skills;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'saves')) {
    if (!patch.saves || Object.keys(patch.saves).length === 0) delete merged.saves;
    else merged.saves = patch.saves;
  }

  return { ...item, modifiers: cleanSpecialInventoryModifiers(merged) };
}

export function SpecialInventoryItemCard({
  item,
  skillNames,
  onChange,
  onRemove,
}: {
  item: SpecialInventoryItem;
  /** Sheet skill names (Core tab) for the skill bonus picker. */
  skillNames: string[];
  onChange: (next: SpecialInventoryItem) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [imgBroken, setImgBroken] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [bonusesOpen, setBonusesOpen] = useState(false);

  useEffect(() => {
    setImgBroken(false);
  }, [item.imageUrl]);
  const trimmed = item.imageUrl.trim();
  const isDataImage = trimmed.toLowerCase().startsWith('data:');
  const showImg = trimmed.length > 0 && !imgBroken;

  const consumeFile = useCallback(
    async (file: File | undefined) => {
      setUploadError(null);
      if (!file) return;
      setUploadBusy(true);
      try {
        const result = await compressImageFileToDataUrl(file);
        if (!result.ok) {
          setUploadError(result.error);
          return;
        }
        onChange({ ...item, imageUrl: result.dataUrl });
      } finally {
        setUploadBusy(false);
      }
    },
    [item, onChange],
  );

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    void consumeFile(file);
  };

  const endDragIfLeaving = (e: React.DragEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && previewRef.current?.contains(next)) return;
    setDragActive(false);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div
        ref={previewRef}
        className={cn(
          'relative h-36 bg-gradient-to-br from-slate-100 to-slate-50 transition-[box-shadow]',
          dragActive && 'ring-2 ring-inset ring-accent shadow-[inset_0_0_0_9999px_rgba(37,99,235,0.08)]',
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer.types.includes('Files')) setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={endDragIfLeaving}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
          if (!uploadBusy) void consumeFile(e.dataTransfer.files?.[0]);
        }}
      >
        {uploadBusy && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/85 text-[10px] font-bold uppercase tracking-wide text-slate-600"
            role="status"
            aria-live="polite"
          >
            <span
              className="inline-block size-6 animate-spin rounded-full border-2 border-accent border-t-transparent"
              aria-hidden
            />
            Compressing…
          </div>
        )}
        {showImg ? (
          <img
            src={trimmed}
            alt=""
            className="pointer-events-none h-full w-full object-cover select-none"
            onError={() => setImgBroken(true)}
            draggable={false}
          />
        ) : (
          <button
            type="button"
            disabled={uploadBusy}
            onClick={() => {
              if (!uploadBusy) fileRef.current?.click();
            }}
            className="group flex h-full w-full flex-col items-center justify-center gap-1 px-4 text-center outline-none transition-colors hover:bg-slate-200/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-60"
            aria-label="Upload item image"
            aria-busy={uploadBusy}
          >
            <Upload
              className="text-accent transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-translate-y-0.5"
              size={24}
              strokeWidth={2}
              aria-hidden
            />
            <span className="inline-block origin-center text-[10px] font-black uppercase tracking-widest text-accent transition-all duration-200 ease-out group-hover:scale-110 group-hover:tracking-[0.2em]">
              Upload image
            </span>
            <span className="text-[9px] font-medium text-slate-400 transition-colors duration-200 ease-out group-hover:text-slate-600">
              or drop an image here
            </span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Upload item image from file"
          onChange={onPickFile}
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 z-10 rounded-lg bg-black/50 p-1.5 text-white backdrop-blur-sm hover:bg-red-600 transition-colors"
          title="Remove card"
        >
          <Trash2 size={14} />
        </button>
        {showImg && (
          <button
            type="button"
            onClick={() => onChange({ ...item, imageUrl: '' })}
            className="absolute bottom-2 left-2 z-10 rounded-md bg-black/55 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-sm hover:bg-red-600/90 transition-colors"
          >
            Clear image
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <input
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          className="font-black text-sm text-slate-800 bg-transparent border-b border-slate-200 pb-1 outline-none focus:border-accent"
          placeholder="Item name"
        />
        <div className="space-y-1.5">
          {uploadError && (
            <p className="text-[10px] text-red-600 leading-snug" role="alert">
              {uploadError}
            </p>
          )}
          {isDataImage && (
            <p className="text-[9px] text-muted italic">
              Image is stored in this character (large uploads are resized automatically). Use Clear image to
              remove it.
            </p>
          )}
        </div>
        <textarea
          value={item.description}
          onChange={(e) => onChange({ ...item, description: e.target.value })}
          rows={4}
          className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 outline-none focus:border-accent resize-y min-h-[5rem]"
          placeholder="Properties, charges, attunement, story…"
        />

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={() => setBonusesOpen((o) => !o)}
            aria-expanded={bonusesOpen}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left outline-none transition-colors hover:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent dark:hover:bg-white/5"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Sheet bonuses</span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="hidden text-[9px] font-bold normal-case tracking-normal text-slate-500 sm:inline dark:text-slate-400">
                AC, saves, skills…
              </span>
              <ChevronDown
                size={16}
                className={cn('text-slate-400 transition-transform duration-200', bonusesOpen && 'rotate-180')}
                aria-hidden
              />
            </span>
          </button>
          {bonusesOpen ? (
          <div className="space-y-3 border-t border-slate-100 px-3 pb-3 pt-2">
            <p className="text-[9px] text-muted leading-snug">
              Values stack with your Core and Combat numbers. For negatives, type a hyphen, then digits (e.g.{' '}
              <span className="font-mono">-2</span>), then click outside the field to apply.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['ac', 'AC'],
                  ['initiative', 'Initiative'],
                  ['spellSaveDc', 'Spell save DC'],
                  ['spellAttack', 'Spell attack'],
                  ['passivePerception', 'Passive perception'],
                  ['speed', 'Speed (ft)'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[8px] font-black uppercase tracking-wide text-muted truncate">{label}</span>
                  <SignedModInput
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono tabular-nums outline-none focus:border-accent dark:bg-black/20"
                    placeholder="±"
                    value={item.modifiers?.[key]}
                    onCommit={(n) => onChange(mergeModifiers(item, { [key]: n }))}
                  />
                </label>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="text-[8px] font-black uppercase tracking-wide text-muted">Saving throws</div>
              <div className="grid grid-cols-3 gap-2">
                {ABILITIES.map((a) => {
                  const id = a.id as Ability;
                  const v = item.modifiers?.saves?.[id];
                  return (
                    <label key={id} className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-bold uppercase text-slate-500">{id}</span>
                      <SignedModInput
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono tabular-nums outline-none focus:border-accent dark:bg-black/20"
                        placeholder="±"
                        value={v}
                        onCommit={(n) => {
                          const nextSaves = { ...item.modifiers?.saves };
                          if (n === undefined || n === 0) delete nextSaves[id];
                          else nextSaves[id] = n;
                          onChange(mergeModifiers(item, { saves: nextSaves }));
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[8px] font-black uppercase tracking-wide text-muted">Skills</span>
                <button
                  type="button"
                  disabled={skillNames.length === 0}
                  onClick={() => {
                    const skills = { ...(item.modifiers?.skills ?? {}) };
                    const next = skillNames.find((nm) => skills[nm] === undefined);
                    if (!next) return;
                    skills[next] = 1;
                    onChange(mergeModifiers(item, { skills }));
                  }}
                  className="rounded-md border border-accent/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-accent hover:bg-accent/10 disabled:pointer-events-none disabled:opacity-40"
                >
                  + Skill
                </button>
              </div>
              {skillNames.length === 0 ? (
                <p className="text-[9px] text-muted italic">Add skills on the Core tab first.</p>
              ) : Object.keys(item.modifiers?.skills ?? {}).length === 0 ? (
                <p className="text-[9px] text-muted italic">Optional per-skill modifier.</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(item.modifiers?.skills ?? {}).map(([name, bonus]) => (
                    <div key={name} className="flex items-center gap-1.5">
                      <select
                        value={name}
                        onChange={(e) => {
                          const nextName = e.target.value;
                          const skills = { ...(item.modifiers?.skills ?? {}) };
                          delete skills[name];
                          skills[nextName] = bonus;
                          onChange(mergeModifiers(item, { skills }));
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold outline-none focus:border-accent dark:bg-black/20"
                      >
                        {skillNames.map((nm) => (
                          <option key={nm} value={nm}>
                            {nm}
                          </option>
                        ))}
                        {!skillNames.includes(name) && (
                          <option value={name}>{name} (rename)</option>
                        )}
                      </select>
                      <SignedModInput
                        className="w-12 shrink-0 rounded-lg border border-slate-200 bg-white px-1 py-1 text-center text-xs font-mono tabular-nums outline-none focus:border-accent dark:bg-black/20"
                        placeholder="±"
                        value={bonus}
                        onCommit={(n) => {
                          const skills = { ...(item.modifiers?.skills ?? {}) };
                          if (n === undefined || n === 0) delete skills[name];
                          else skills[name] = n;
                          onChange(mergeModifiers(item, { skills }));
                        }}
                      />
                      <button
                        type="button"
                        title="Remove"
                        onClick={() => {
                          const skills = { ...(item.modifiers?.skills ?? {}) };
                          delete skills[name];
                          onChange(mergeModifiers(item, { skills }));
                        }}
                        className="shrink-0 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 hover:border-red-300 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

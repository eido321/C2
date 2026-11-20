import {formatModifier} from '@/lib/utils';
import type {BlockViewProps} from './shared';

export function AbilityScoresBlock({block, editing, update}: BlockViewProps<'abilityScores'>) {
  const {abilities} = block.content;

  const setScore = (index: number, score: number) => {
    const next = abilities.map((a, i) => (i === index ? {...a, score} : a));
    update({abilities: next});
  };

  return (
    <div className="grid h-full w-full grid-cols-6 gap-2">
      {abilities.map((ability, i) => (
        <div
          key={ability.key}
          className="flex flex-col items-center justify-between rounded-lg border border-gold/40 bg-parchment/60 py-2"
        >
          <div className="font-display text-[calc(var(--block-font,15px)*0.733)] font-bold uppercase tracking-wide text-accent">{ability.label}</div>
          {editing ? (
            <input
              type="number"
              value={ability.score}
              onChange={(e) => setScore(i, Number(e.target.value) || 0)}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-12 bg-transparent text-center font-serif text-[calc(var(--block-font,15px)*1.6)] font-bold text-slate-800 outline-none"
            />
          ) : (
            <div className="font-serif text-[calc(var(--block-font,15px)*1.6)] font-bold text-slate-800">{ability.score}</div>
          )}
          <div className="rounded-full border border-gold/50 bg-white px-2 text-[calc(var(--block-font,15px)*0.8)] font-semibold text-ink-soft">
            {formatModifier(ability.score)}
          </div>
        </div>
      ))}
    </div>
  );
}


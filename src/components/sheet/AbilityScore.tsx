import React from 'react';
import { Ability } from '@/types';
import { formatModifier, getModifier } from '@/lib/utils';

interface AbilityScoreProps {
  label: string;
  ability: Ability;
  score: number;
  onChange: (score: number) => void;
}

export const AbilityScore: React.FC<AbilityScoreProps> = ({ label, ability, score, onChange }) => {
  const modifier = formatModifier(score);

  return (
    <div className="flex flex-col items-center border-2 border-ink rounded-xl p-2 bg-white shadow-sm w-24 transition-colors">
      <span className="text-[10px] font-bold uppercase tracking-widest text-ink/60">{label}</span>
      <div className="text-2xl font-bold my-1">{modifier}</div>
      <div className="mt-auto border-t border-ink/20 pt-1 w-full flex justify-center">
        <input
          type="number"
          value={score}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-12 text-center font-mono text-sm bg-transparent outline-none"
        />
      </div>
    </div>
  );
};

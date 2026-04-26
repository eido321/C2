import React, { useState } from 'react';
import { Skill } from '@/types';
import { cn, formatBonus, getSkillAutoBonus, getSkillEffectiveBonus } from '@/lib/utils';

interface SkillRowProps {
  skill: Skill;
  abilityScore: number;
  profBonus: number;
  /** Extra modifier from special inventory cards (always stacks on the value you edit). */
  itemBonus?: number;
  onToggle: (proficient: boolean, expert: boolean) => void;
  onBonusOverrideChange: (bonusOverride: number | undefined) => void;
}

export const SkillRow: React.FC<SkillRowProps> = ({
  skill,
  abilityScore,
  profBonus,
  itemBonus = 0,
  onToggle,
  onBonusOverrideChange,
}) => {
  const auto = getSkillAutoBonus(skill, abilityScore, profBonus);
  const effective = getSkillEffectiveBonus(skill, abilityScore, profBonus);
  const totalDisplayed = effective + itemBonus;
  const [focused, setFocused] = useState(false);
  const [editingText, setEditingText] = useState('');

  const handleProfClick = () => {
    if (skill.proficient) {
      onToggle(false, false);
    } else {
      onToggle(true, skill.expert ?? false);
    }
  };

  const handleExpertClick = () => {
    if (!skill.proficient) {
      onToggle(true, true);
    } else {
      onToggle(skill.proficient, !(skill.expert ?? false));
    }
  };

  const displayBonus = focused ? editingText : formatBonus(totalDisplayed);

  return (
    <div className="flex items-center gap-2 py-0.5 group">
      <button
        type="button"
        onClick={handleProfClick}
        title={skill.proficient ? 'Remove proficiency' : 'Add proficiency'}
        className={cn(
          'w-3.5 h-3.5 rounded-full border transition-colors shrink-0',
          skill.proficient
            ? 'bg-accent border-accent'
            : 'bg-transparent border-ink/30 hover:border-accent/60',
        )}
      />
      <button
        type="button"
        onClick={handleExpertClick}
        title={
          skill.expert
            ? 'Remove expertise'
            : skill.proficient
              ? 'Add expertise'
              : 'Add proficiency + expertise'
        }
        className={cn(
          'w-3.5 h-3.5 rounded-full border transition-colors shrink-0',
          skill.expert
            ? 'bg-emerald-500 border-emerald-500'
            : skill.proficient
              ? 'bg-transparent border-emerald-400/50 hover:border-emerald-500/80'
              : 'bg-transparent border-ink/10 hover:border-emerald-400/40',
        )}
      />
      <input
        type="text"
        inputMode="numeric"
        title={
          skill.bonusOverride !== undefined
            ? `Override (calculated ${formatBonus(auto)}${itemBonus ? ` + items ${formatBonus(itemBonus)}` : ''}). Clear on blur for calculated.`
            : `Modifier — edit for total including items (calculated ${formatBonus(auto)}${itemBonus ? ` + items ${formatBonus(itemBonus)}` : ''})`
        }
        value={displayBonus}
        onFocus={() => {
          setFocused(true);
          setEditingText(formatBonus(totalDisplayed).replace(/^\+/, ''));
        }}
        onChange={(e) => setEditingText(e.target.value)}
        onBlur={() => {
          setFocused(false);
          const t = editingText.trim().replace(/\u2212/g, '-').replace(/^\+/, '');
          if (t === '' || t === '-') {
            onBonusOverrideChange(undefined);
            setEditingText('');
            return;
          }
          const n = parseInt(t, 10);
          if (Number.isNaN(n)) {
            setEditingText('');
            return;
          }
          const desiredSkillOnly = n - itemBonus;
          if (desiredSkillOnly === auto) onBonusOverrideChange(undefined);
          else onBonusOverrideChange(desiredSkillOnly);
          setEditingText('');
        }}
        className={cn(
          'w-10 shrink-0 font-mono text-xs text-center tabular-nums rounded border py-0.5 outline-none focus:border-accent',
          skill.bonusOverride !== undefined
            ? 'border-accent/40 bg-accent/5 text-ink dark:bg-accent/15 dark:border-accent/50'
            : 'border-transparent bg-slate-50/50 text-ink/70 group-hover:border-slate-200 dark:group-hover:border-dark-border',
        )}
      />
      <span className="flex-1 text-xs font-medium truncate">{skill.name}</span>
      <span className="text-[9px] uppercase font-bold text-ink/30 italic shrink-0">{skill.ability}</span>
    </div>
  );
};

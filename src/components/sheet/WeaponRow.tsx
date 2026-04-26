import React, { useState, useRef, useEffect } from 'react';
import { Weapon, Ability } from '@/types';
import { Trash2, Target, Dice5, ChevronDown, Check } from 'lucide-react';
import { getModifier, formatBonus, cn } from '@/lib/utils';
import { ABILITIES, COMMON_DICE } from '@/config/constants';
import { CustomSelect } from './CustomSelect';
import { motion, AnimatePresence } from 'motion/react';

interface DiceSelectProps {
  value: string;
  onChange: (val: string) => void;
}

const DiceSelect: React.FC<DiceSelectProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-sm font-black bg-transparent outline-none text-center border-b border-slate-300 hover:border-accent focus:border-accent transition-all px-1 cursor-pointer group"
      >
        <span>{value}</span>
        <ChevronDown 
          size={10} 
          className={cn(
            "text-muted group-hover:text-accent transition-transform",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute z-50 mt-1 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden min-w-[80px]"
          >
            <div className="py-1">
              {COMMON_DICE.map((dice) => (
                <button
                  key={dice}
                  onClick={() => {
                    onChange(dice);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold hover:bg-slate-50 transition-colors",
                    value === dice ? "text-accent bg-accent/5" : "text-slate-600"
                  )}
                >
                  {dice}
                  {value === dice && <Check size={10} className="text-accent" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface WeaponRowProps {
  weapon: Weapon;
  abilities: Record<Ability, number>;
  profBonus: number;
  onUpdate: (weapon: Weapon) => void;
  onDelete: () => void;
}

export const WeaponRow: React.FC<WeaponRowProps> = ({
  weapon,
  abilities,
  profBonus,
  onUpdate,
  onDelete,
}) => {
  const atkAb = weapon.attackAbility ?? 'str';
  const abilityScore = abilities[atkAb];
  const abilityMod = getModifier(abilityScore);
  const attackBonus = abilityMod + (weapon.proficient ? profBonus : 0) + (weapon.bonus || 0);
  const damageMod = abilityMod + (weapon.bonus || 0);

  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 group relative space-y-4">
      <button 
        onClick={onDelete}
        className="absolute top-4 right-4 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 size={14} />
      </button>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
        <div className="space-y-3">
          <input
            value={weapon.name}
            onChange={(e) => onUpdate({ ...weapon, name: e.target.value })}
            className="w-full font-black text-sm bg-transparent outline-none placeholder:text-slate-300"
            placeholder="Weapon Name (e.g. Longsword)"
          />
          
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1 min-w-[6.5rem]">
              <span className="text-[8px] font-black uppercase tracking-widest text-muted">Ability</span>
              <CustomSelect
                showSearch={false}
                variant="field"
                width="w-full"
                value={ABILITIES.find((a) => a.id === atkAb)?.label ?? 'Strength'}
                options={ABILITIES.map((a) => a.label)}
                placeholder="Ability…"
                onChange={(label) => {
                  const id = ABILITIES.find((a) => a.label === label)?.id;
                  if (!id) return;
                  onUpdate({ ...weapon, attackAbility: id as Ability });
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-muted">Prof?</span>
              <input
                type="checkbox"
                checked={weapon.proficient}
                onChange={(e) => onUpdate({ ...weapon, proficient: e.target.checked })}
                className="w-4 h-4 accent-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-muted">Magic Bonus</span>
              <input
                type="number"
                value={weapon.bonus || 0}
                onChange={(e) => onUpdate({ ...weapon, bonus: parseInt(e.target.value) || 0 })}
                className="w-12 text-[10px] font-bold bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex flex-col items-center justify-center bg-accent/10 border border-accent/20 rounded-lg p-2 min-w-[70px]">
            <div className="flex items-center gap-1 text-[8px] font-black uppercase text-accent mb-1">
              <Target size={10} />
              Attack
            </div>
            <div className="text-xl font-black text-accent">{formatBonus(attackBonus)}</div>
          </div>

          <div className="flex flex-col items-center justify-center bg-slate-200/50 border border-slate-300 rounded-lg p-2 min-w-[90px]">
            <div className="flex items-center gap-1 text-[8px] font-black uppercase text-muted mb-1">
              <Dice5 size={10} />
              Damage
            </div>
            <div className="flex items-center gap-1">
              <DiceSelect
                value={weapon.damageDice}
                onChange={(val) => onUpdate({ ...weapon, damageDice: val })}
              />
              <span className="text-xs font-bold text-muted">{formatBonus(damageMod)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[8px] font-black uppercase tracking-widest text-muted text-left">Damage Type</span>
          <input
            value={weapon.damageType}
            onChange={(e) => onUpdate({ ...weapon, damageType: e.target.value })}
            className="text-[10px] font-bold bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-accent"
            placeholder="Slashing, Piercing..."
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[8px] font-black uppercase tracking-widest text-muted text-left">Properties</span>
          <input
            value={weapon.properties}
            onChange={(e) => onUpdate({ ...weapon, properties: e.target.value })}
            className="text-[10px] font-bold bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-accent"
            placeholder="Finesse, Light, Versatile..."
          />
        </div>
      </div>
    </div>
  );
};

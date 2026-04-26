import React, { useState } from 'react';
import { Spell } from '@/types';
import { cn } from '@/lib/utils';
import { Trash2, Check, Clock, MapPin, GripVertical, ChevronDown, ChevronUp, AlignLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SpellRowProps {
  spell: Spell;
  onUpdate: (spell: Spell) => void;
  onDelete: () => void;
  compact?: boolean;
}

/** Small pill shown next to casting-time when a free cast exists */
const FreeUsedBadge = ({
  isFree,
  freeUsed,
  compact,
  onToggle,
}: {
  isFree?: boolean;
  freeUsed?: boolean;
  compact?: boolean;
  onToggle: () => void;
}) => {
  if (!isFree) return null;
  return (
    <button
      onClick={onToggle}
      title={freeUsed ? 'Free cast used — click to reset' : 'Free cast available — click to mark used'}
      className={cn(
        'rounded border font-black uppercase tracking-wider transition-all shrink-0',
        compact ? 'text-[8px] px-1 py-0.5' : 'text-[7px] px-1.5 py-0.5',
        freeUsed
          ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
          : 'bg-emerald-50 text-emerald-600 border-emerald-300 hover:bg-emerald-100'
      )}
    >
      {freeUsed ? 'used' : 'free'}
    </button>
  );
};

export const SpellRow: React.FC<SpellRowProps> = ({ spell, onUpdate, onDelete, compact = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: spell.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as const,
  };

  const toggleFreeUsed = () => onUpdate({ ...spell, freeUsed: !spell.freeUsed });

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white border border-slate-200 rounded-xl hover:border-accent/30 transition-all group",
        compact ? "shadow-none" : "shadow-sm",
        isDragging && "opacity-50 shadow-2xl border-accent ring-2 ring-accent/20"
      )}
    >
      <div className={compact ? "px-3 py-1.5" : "p-4"}>
        <div className={cn("flex items-center", compact ? "gap-2 flex-wrap" : "gap-4")}>
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-1 -ml-1 shrink-0"
          >
            <GripVertical size={compact ? 12 : 16} />
          </button>

          {/* Prepared checkbox */}
          <button
            onClick={() => onUpdate({ ...spell, prepared: !spell.prepared })}
            className={cn(
              "rounded border-2 transition-all flex items-center justify-center shrink-0",
              compact ? "w-4 h-4" : "w-6 h-6",
              spell.prepared 
                ? "bg-accent border-accent text-white" 
                : "bg-white border-slate-300 hover:border-accent"
            )}
          >
            {spell.prepared && <Check size={compact ? 9 : 14} strokeWidth={3} />}
          </button>
          
          {/* Name + compact inline details */}
          <div className={cn("flex items-center min-w-0", compact ? "flex-1 gap-2" : "flex-1")}>
            <input
              value={spell.name}
              onChange={(e) => onUpdate({ ...spell, name: e.target.value })}
              placeholder="Spell Name"
              className={cn(
                "font-black bg-transparent border-b border-transparent focus:border-accent outline-none transition-all placeholder:text-slate-300",
                compact ? "text-sm w-0 flex-1 min-w-0" : "w-full text-lg"
              )}
            />
            {compact && (
              <>
                {/* Free-used badge — left of clock */}
                <FreeUsedBadge
                  isFree={spell.isFree}
                  freeUsed={spell.freeUsed}
                  compact
                  onToggle={toggleFreeUsed}
                />

                <div className="flex items-center gap-1 text-slate-500 shrink-0">
                  <Clock size={11} />
                  <input
                    value={spell.castingTime}
                    onChange={(e) => onUpdate({ ...spell, castingTime: e.target.value })}
                    placeholder="Time"
                    className="text-[11px] font-semibold bg-transparent outline-none w-20 focus:text-accent text-slate-500"
                  />
                </div>
                <div className="flex items-center gap-1 text-slate-500 shrink-0">
                  <MapPin size={11} />
                  <input
                    value={spell.range}
                    onChange={(e) => onUpdate({ ...spell, range: e.target.value })}
                    placeholder="Range"
                    className="text-[11px] font-semibold bg-transparent outline-none w-16 focus:text-accent text-slate-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* V / S / M / F / R / C — shrink-0 so compact rows don’t clip ritual & concentration */}
          <div className={cn("flex shrink-0", compact ? "gap-0.5" : "gap-1")}>
            {(['V', 'S', 'M'] as const).map((comp) => (
              <button
                key={comp}
                onClick={() => onUpdate({
                  ...spell,
                  components: {
                    ...spell.components,
                    [comp.toLowerCase()]: !spell.components[comp.toLowerCase() as keyof typeof spell.components]
                  }
                })}
                className={cn(
                  "rounded border font-black flex items-center justify-center transition-all",
                  compact ? "w-4 h-4 text-[7px]" : "w-6 h-6 text-[8px]",
                  spell.components[comp.toLowerCase() as keyof typeof spell.components]
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-400"
                )}
              >
                {comp}
              </button>
            ))}

            {/* F — free cast once per day */}
            <button
              onClick={() => onUpdate({ ...spell, isFree: !spell.isFree, freeUsed: false })}
              title={spell.isFree ? 'Remove free cast' : 'Mark as free cast (once per day)'}
              className={cn(
                "rounded border font-black flex items-center justify-center transition-all",
                compact ? "w-4 h-4 text-[7px]" : "w-6 h-6 text-[8px]",
                spell.isFree
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-400"
              )}
            >
              F
            </button>

            {/* X — doesn’t count toward class cantrip / prepared limits */}
            <button
              type="button"
              onClick={() => onUpdate({ ...spell, spellBudgetExempt: !spell.spellBudgetExempt })}
              title={
                spell.spellBudgetExempt
                  ? 'Counts toward class limits'
                  : 'Extra — doesn’t count toward cantrip / prepared limits (feat, domain, subclass)'
              }
              className={cn(
                'rounded border font-black flex items-center justify-center transition-all',
                compact ? 'w-4 h-4 text-[7px]' : 'w-6 h-6 text-[8px]',
                spell.spellBudgetExempt
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-violet-300',
              )}
            >
              X
            </button>

            {/* Compact mode hides the lower details bar — surface Ritual / Concentration here */}
            {compact && (
              <>
                <button
                  type="button"
                  onClick={() => onUpdate({ ...spell, isRitual: !spell.isRitual })}
                  title={spell.isRitual ? 'Ritual' : 'Mark as ritual'}
                  className={cn(
                    'rounded border font-black flex items-center justify-center transition-all w-4 h-4 text-[7px]',
                    spell.isRitual
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-400'
                  )}
                >
                  R
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate({ ...spell, isConcentration: !spell.isConcentration })}
                  title={spell.isConcentration ? 'Concentration' : 'Mark as concentration'}
                  className={cn(
                    'rounded border font-black flex items-center justify-center transition-all w-4 h-4 text-[7px]',
                    spell.isConcentration
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-400'
                  )}
                >
                  C
                </button>
              </>
            )}
          </div>

          {/* Expand / delete */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "p-1 rounded transition-colors",
                isExpanded ? "bg-slate-100 text-accent" : "text-slate-300 hover:text-slate-500"
              )}
              title="Toggle Description"
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            <button
              onClick={onDelete}
              className="text-slate-300 hover:text-red-500 transition-colors p-1"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Non-compact details bar */}
        {!compact && (
          <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-100">
            {/* Free-used badge — left of clock in full view */}
            <FreeUsedBadge
              isFree={spell.isFree}
              freeUsed={spell.freeUsed}
              onToggle={toggleFreeUsed}
            />

            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock size={12} />
              <input
                value={spell.castingTime}
                onChange={(e) => onUpdate({ ...spell, castingTime: e.target.value })}
                placeholder="Casting Time"
                className="text-[9px] font-black uppercase tracking-widest bg-transparent outline-none w-20 focus:text-accent"
              />
            </div>
            
            <div className="flex items-center gap-1.5 text-slate-400">
              <MapPin size={12} />
              <input
                value={spell.range}
                onChange={(e) => onUpdate({ ...spell, range: e.target.value })}
                placeholder="Range"
                className="text-[9px] font-black uppercase tracking-widest bg-transparent outline-none w-20 focus:text-accent"
              />
            </div>

            <div className="flex gap-2 ml-auto flex-wrap justify-end">
              <button
                type="button"
                onClick={() => onUpdate({ ...spell, spellBudgetExempt: !spell.spellBudgetExempt })}
                title={
                  spell.spellBudgetExempt
                    ? 'Counts toward class limits'
                    : 'Extra — doesn’t count toward cantrip / prepared limits'
                }
                className={cn(
                  'px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest transition-all',
                  spell.spellBudgetExempt
                    ? 'bg-violet-100 text-violet-800 border-violet-300'
                    : 'bg-transparent text-slate-300 border-slate-100 hover:border-violet-200',
                )}
              >
                Extra (exempt)
              </button>
              <button
                onClick={() => onUpdate({ ...spell, isRitual: !spell.isRitual })}
                className={cn(
                  "px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest transition-all",
                  spell.isRitual 
                    ? "bg-slate-800 text-white border-slate-800" 
                    : "bg-transparent text-slate-300 border-slate-100 hover:border-slate-200"
                )}
              >
                Ritual
              </button>
              <button
                onClick={() => onUpdate({ ...spell, isConcentration: !spell.isConcentration })}
                className={cn(
                  "px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest transition-all",
                  spell.isConcentration 
                    ? "bg-amber-50 text-amber-700 border-amber-200" 
                    : "bg-transparent text-slate-300 border-slate-100 hover:border-slate-200"
                )}
              >
                Concentration
              </button>
            </div>
          </div>
        )}

        {/* Description (expandable) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-slate-400">
                  <AlignLeft size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Description</span>
                </div>
                <textarea
                  value={spell.description}
                  onChange={(e) => onUpdate({ ...spell, description: e.target.value })}
                  placeholder="Enter spell description, damage, effects..."
                  className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-xs outline-none focus:border-accent resize-none leading-relaxed"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

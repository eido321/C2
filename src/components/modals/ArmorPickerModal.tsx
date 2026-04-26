import React, { useState } from 'react';
import { X, Shield, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ARMOR_LIST,
  ArmorTemplate,
  ArmorCategory,
  heavyArmorSpeedPenaltyFt,
  HEAVY_ARMOR_STR_SPEED_PENALTY_FT,
} from '@/data/armor';

interface ArmorPickerModalProps {
  equippedArmor: string;
  equippedShield: boolean;
  dexMod: number;
  /** Used to warn when heavy armor will reduce walking speed (Str below printed requirement). */
  strScore?: number;
  onConfirm: (armorName: string, hasShield: boolean, newAC: number) => void;
  onClose: () => void;
}

const CATEGORY_ORDER: ArmorCategory[] = ['Light', 'Medium', 'Heavy', 'Shield'];

const CATEGORY_COLORS: Record<ArmorCategory, string> = {
  Light:  'bg-sky-50 text-sky-700 border-sky-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Heavy:  'bg-slate-100 text-slate-700 border-slate-300',
  Shield: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function calcPreviewAC(armorName: string, hasShield: boolean, dexMod: number): number {
  if (!armorName) return 10 + dexMod + (hasShield ? 2 : 0);
  const armor = ARMOR_LIST.find((a) => a.name === armorName);
  if (!armor || armor.category === 'Shield') return 10 + dexMod + (hasShield ? 2 : 0);
  let ac = armor.acBase;
  if (armor.dexBonus === 'full')  ac += dexMod;
  if (armor.dexBonus === 'max2')  ac += Math.min(dexMod, 2);
  if (hasShield) ac += 2;
  return ac;
}

export const ArmorPickerModal: React.FC<ArmorPickerModalProps> = ({
  equippedArmor,
  equippedShield,
  dexMod,
  strScore,
  onConfirm,
  onClose,
}) => {
  const [selectedArmor, setSelectedArmor] = useState<string>(equippedArmor);
  const [hasShield, setHasShield]         = useState<boolean>(equippedShield);
  const [hoveredArmor, setHoveredArmor]   = useState<ArmorTemplate | null>(null);
  const [filterCat, setFilterCat]         = useState<ArmorCategory | 'All'>('All');

  const displayArmor = hoveredArmor ?? ARMOR_LIST.find((a) => a.name === selectedArmor) ?? null;
  const previewAC    = calcPreviewAC(selectedArmor, hasShield, dexMod);
  const speedPenaltyPreview =
    strScore != null ? heavyArmorSpeedPenaltyFt(selectedArmor, strScore) : 0;
  const selectedArmorPiece = ARMOR_LIST.find((a) => a.name === selectedArmor);
  const selectedStrReq = selectedArmorPiece?.strRequirement;

  const wornList = ARMOR_LIST.filter(
    (a) => filterCat === 'All' || a.category === filterCat,
  );

  const handleConfirm = () => {
    onConfirm(selectedArmor, hasShield, previewAC);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <Shield size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="font-black text-lg text-slate-900">Armor & Shield</h2>
              <p className="text-[11px] text-slate-400 font-medium">2024 Player's Handbook · Chapter 6</p>
            </div>
          </div>
          {/* Live AC preview */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Calculated AC</div>
              <div className="text-3xl font-black text-accent leading-none">{previewAC}</div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Category filter */}
        <div className="px-6 py-3 border-b border-slate-100 shrink-0 flex items-center gap-2 flex-wrap">
          {(['All', ...CATEGORY_ORDER] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={cn(
                'px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border',
                filterCat === cat
                  ? 'bg-accent text-white border-accent'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-accent/50',
              )}
            >
              {cat}
            </button>
          ))}

          {/* Shield toggle (separate from main armor) */}
          <button
            onClick={() => setHasShield((v) => !v)}
            className={cn(
              'ml-auto flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border',
              hasShield
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-400',
            )}
          >
            <Shield size={12} />
            {hasShield ? 'Shield equipped (+2)' : 'Equip Shield'}
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Armor list */}
          <div className="w-1/2 border-r border-slate-100 overflow-y-auto">
            {/* Unarmored option */}
            <button
              onClick={() => setSelectedArmor('')}
              onMouseEnter={() => setHoveredArmor(null)}
              onMouseLeave={() => setHoveredArmor(null)}
              className={cn(
                'w-full text-left px-5 py-3 transition-all hover:bg-slate-50 border-b border-slate-100',
                selectedArmor === '' && 'bg-accent/5 border-l-2 border-accent',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-sm text-slate-800">Unarmored</span>
                  <div className="text-[11px] text-slate-400 mt-0.5">10 + Dex modifier{hasShield ? ' + 2 (shield)' : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-accent">{10 + dexMod + (hasShield ? 2 : 0)}</span>
                  {selectedArmor === '' && <Check size={14} className="text-accent" />}
                </div>
              </div>
            </button>

            {/* Armor entries grouped by category */}
            {CATEGORY_ORDER.filter((c) => filterCat === 'All' || filterCat === c).map((cat) => {
              const items = wornList.filter((a) => a.category === cat && a.category !== 'Shield');
              const shieldItem = wornList.find((a) => a.category === 'Shield');
              const list = cat === 'Shield' ? (shieldItem ? [shieldItem] : []) : items;
              if (list.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="px-5 py-1.5 bg-slate-50 border-b border-slate-100">
                    <span className={cn('text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border', CATEGORY_COLORS[cat])}>
                      {cat} Armor{cat === 'Shield' ? '' : ''}
                    </span>
                  </div>
                  {list.map((armor) => {
                    const isSelected = armor.name === selectedArmor;
                    const itemAC = cat === 'Shield'
                      ? calcPreviewAC(selectedArmor, true, dexMod)
                      : calcPreviewAC(armor.name, hasShield, dexMod);
                    return (
                      <button
                        key={armor.name}
                        onClick={() => {
                          if (armor.category === 'Shield') {
                            setHasShield((v) => !v);
                          } else {
                            setSelectedArmor(isSelected ? '' : armor.name);
                          }
                        }}
                        onMouseEnter={() => setHoveredArmor(armor)}
                        onMouseLeave={() => setHoveredArmor(null)}
                        className={cn(
                          'w-full text-left px-5 py-3 transition-all hover:bg-slate-50 border-b border-slate-50',
                          isSelected && armor.category !== 'Shield' && 'bg-accent/5 border-l-2 border-accent',
                          armor.category === 'Shield' && hasShield && 'bg-emerald-50/60 border-l-2 border-emerald-400',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-800">{armor.name}</span>
                              {armor.stealthDisadvantage && (
                                <span className="text-[8px] font-black uppercase tracking-widest bg-red-50 text-red-500 border border-red-200 px-1 py-0.5 rounded shrink-0">Stealth ↓</span>
                              )}
                              {armor.strRequirement && (
                                <span className="text-[8px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 border border-orange-200 px-1 py-0.5 rounded shrink-0">STR {armor.strRequirement}</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{armor.cost} · {armor.weight}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-base font-black text-accent">
                              {armor.category === 'Shield' ? `+${armor.acBase}` : itemAC}
                            </span>
                            {(isSelected || (armor.category === 'Shield' && hasShield)) && (
                              <Check size={14} className="text-accent" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div className="w-1/2 overflow-y-auto">
            {displayArmor ? (
              <div className="p-6 space-y-5">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-black text-xl text-slate-900">{displayArmor.name}</h3>
                    <span className={cn('text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border shrink-0', CATEGORY_COLORS[displayArmor.category])}>
                      {displayArmor.category}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Base AC</div>
                    <div className="text-xl font-black text-accent">
                      {displayArmor.category === 'Shield' ? `+${displayArmor.acBase}` : displayArmor.acBase}
                      {displayArmor.dexBonus === 'full' && <span className="text-sm font-semibold text-slate-400"> + Dex</span>}
                      {displayArmor.dexBonus === 'max2' && <span className="text-sm font-semibold text-slate-400"> + Dex (max +2)</span>}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">With Your Dex</div>
                    <div className="text-xl font-black text-accent">
                      {displayArmor.category === 'Shield'
                        ? calcPreviewAC(selectedArmor, true, dexMod)
                        : calcPreviewAC(displayArmor.name, hasShield, dexMod)}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Cost</div>
                    <div className="text-sm font-bold text-slate-700">{displayArmor.cost}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Weight</div>
                    <div className="text-sm font-bold text-slate-700">{displayArmor.weight}</div>
                  </div>
                  {displayArmor.strRequirement && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 col-span-2">
                      <div className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-1">Strength Requirement</div>
                      <div className="text-sm font-bold text-orange-700">STR {displayArmor.strRequirement} or speed reduced by 10 ft</div>
                    </div>
                  )}
                  {displayArmor.stealthDisadvantage && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 col-span-2">
                      <div className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-1">Stealth</div>
                      <div className="text-sm font-bold text-red-700">Disadvantage on Stealth checks</div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Description</div>
                  <p className="text-sm text-slate-600 leading-relaxed">{displayArmor.description}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3 p-8">
                <Shield size={40} />
                <p className="text-sm font-bold text-center">Hover over armor to preview,<br />or select to equip</p>
                {selectedArmor && (
                  <div className="mt-2 text-center">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Currently Selected</div>
                    <div className="text-base font-black text-slate-700">{selectedArmor}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex items-center justify-between gap-4">
          <div className="text-[11px] text-slate-400 font-medium space-y-1 min-w-0">
            <div>
              {selectedArmor || 'Unarmored'}
              {hasShield ? ' + Shield' : ''} → AC{' '}
              <span className="font-black text-accent text-sm">{previewAC}</span>
            </div>
            {speedPenaltyPreview > 0 && selectedStrReq != null ? (
              <div className="text-amber-800 font-bold">
                Walking speed −{HEAVY_ARMOR_STR_SPEED_PENALTY_FT} ft. (Str {strScore}; requires Str {selectedStrReq} to avoid)
              </div>
            ) : null}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-accent/20"
            >
              Equip — Set AC to {previewAC}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

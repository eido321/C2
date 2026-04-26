import React, { useMemo, useState } from 'react';
import { Search, ShoppingCart, Store, X } from 'lucide-react';
import type { Character } from '@/types';
import {
  SHOP_CATEGORY_LABELS,
  SHOP_ITEMS,
  type ShopCategory,
  type ShopItem,
} from '@/data/phb2024ShopCatalog';
import {
  appendInventoryPurchaseLine,
  formatPriceCp,
  getTotalCp,
  trySpendCp,
} from '@/lib/characterCurrency';
import { formatToolAbilityTag } from '@/lib/toolAbility';

interface ShopModalProps {
  character: Character;
  onClose: () => void;
  onPurchase: (next: { currency: NonNullable<Character['currency']>; inventory: string }) => void;
}

const CATEGORY_FILTERS: Array<'All' | ShopCategory> = [
  'All',
  'weapon',
  'tool',
  'adventuring',
  'mount',
  'vehicle',
  'ship',
  'service',
];

export const ShopModal: React.FC<ShopModalProps> = ({ character, onClose, onPurchase }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | ShopCategory>('All');
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const totalCp = getTotalCp(character);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SHOP_ITEMS.filter((it) => {
      if (category !== 'All' && it.category !== category) return false;
      if (!q) return true;
      return it.name.toLowerCase().includes(q);
    });
  }, [query, category]);

  const getQty = (it: ShopItem) => {
    const n = qtyById[it.id];
    return typeof n === 'number' && n >= 1 ? Math.floor(n) : 1;
  };

  const buy = (it: ShopItem) => {
    setError(null);
    const qty = getQty(it);
    const cost = it.costCp * qty;
    const nextCurrency = trySpendCp(character, cost);
    if (!nextCurrency) {
      setError('Not enough coin for this purchase.');
      return;
    }
    const inv = appendInventoryPurchaseLine(character.inventory, it.name, qty, cost);
    onPurchase({ currency: nextCurrency, inventory: inv });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Store size={18} className="text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Shop</h2>
              <p className="text-[11px] text-muted truncate">
                PHB 2024 gear (armor excluded). Coin:{' '}
                <span className="font-bold text-slate-700">{formatPriceCp(totalCp)}</span> total
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items…"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_FILTERS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border transition-colors ${
                  category === c
                    ? 'bg-accent text-white border-accent'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-accent/40'
                }`}
              >
                {c === 'All' ? 'All' : SHOP_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
          <ul className="space-y-2">
            {filtered.map((it) => {
              const qty = getQty(it);
              const lineCost = it.costCp * qty;
              const broke = totalCp < lineCost;
              return (
                <li
                  key={it.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/80 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-800 truncate">{it.name}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted mt-0.5">
                      {SHOP_CATEGORY_LABELS[it.category]} · {formatPriceCp(it.costCp)} each
                    </div>
                    {it.category === 'tool' && (
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted mt-0.5">
                        Uses:{' '}
                        <span className="text-slate-700">
                          {formatToolAbilityTag(it.name) ?? '—'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-muted">
                      Qty
                      <input
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(e) => {
                          const v = Math.max(1, Math.floor(Number(e.target.value) || 1));
                          setQtyById((prev) => ({ ...prev, [it.id]: v }));
                        }}
                        className="w-14 text-center font-bold text-sm border border-slate-200 rounded-lg py-1 outline-none focus:border-accent"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={broke}
                      onClick={() => buy(it)}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-accent text-white border-accent hover:bg-accent/90"
                    >
                      <ShoppingCart size={14} />
                      Buy {formatPriceCp(lineCost)}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted py-12">No items match this filter.</p>
          )}
        </div>
      </div>
    </div>
  );
};

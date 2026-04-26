import type { Character } from '@/types';

/** 1 GP = 100 CP; 1 SP = 10 CP; 1 EP = 50 CP; 1 PP = 1000 CP */
export function getTotalCp(c: Character): number {
  const cur = c.currency ?? { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  return cur.cp + cur.sp * 10 + cur.ep * 50 + cur.gp * 100 + cur.pp * 1000;
}

export function currencyFromCp(total: number): NonNullable<Character['currency']> {
  let n = Math.max(0, Math.floor(total));
  const pp = Math.floor(n / 1000);
  n %= 1000;
  const gp = Math.floor(n / 100);
  n %= 100;
  const ep = Math.floor(n / 50);
  n %= 50;
  const sp = Math.floor(n / 10);
  n %= 10;
  return { cp: n, sp, ep, gp, pp };
}

/** Returns new currency after spending, or null if not enough coins. */
export function trySpendCp(c: Character, costCp: number): NonNullable<Character['currency']> | null {
  const total = getTotalCp(c);
  if (total < costCp) return null;
  return currencyFromCp(total - costCp);
}

export function formatPriceCp(cp: number): string {
  if (cp <= 0) return '0 CP';
  if (cp % 1000 === 0) return `${cp / 1000} PP`;
  if (cp % 100 === 0) return `${cp / 100} GP`;
  if (cp % 10 === 0) return `${cp / 10} SP`;
  return `${cp} CP`;
}

export function appendInventoryPurchaseLine(
  inventory: string | undefined,
  itemName: string,
  qty: number,
  totalCp: number
): string {
  const price = formatPriceCp(totalCp);
  const line =
    qty > 1 ? `${qty}× ${itemName} (${price})` : `${itemName} (${price})`;
  const base = (inventory ?? '').trim();
  return base ? `${base}\n${line}` : line;
}

export const slotCapacity = [4,3,3,3,3,2,2,1,1] as const;
export interface SlotRow {total:number; used:boolean[]}
export function setSlotTotal(row:SlotRow,level:number,value:number):SlotRow {
  const total=Math.min(slotCapacity[level],Math.max(0,Math.trunc(value)||0));
  return {total,used:row.used.map((checked,i)=>i<total && checked)};
}

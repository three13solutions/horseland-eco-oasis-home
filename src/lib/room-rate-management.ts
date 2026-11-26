import { addDays, dateRange } from './distribution-inventory';

export const rateFields = ['ep', 'adult', 'child'] as const;
export type RateField = typeof rateFields[number];
export type RateInputs = Record<RateField, string>;
export type RateEntry = { category_id: string; type_id: string; type_name: string; date: string; weekend: boolean; ep: number | null; adult: number | null; child: number | null; editable: boolean; reason: string | null; fingerprint: string };
export type RateGrid = { categories: { id: string; name: string; is_active: boolean }[]; entries: RateEntry[] };
export type RateChange = { type_id: string; date: string; fingerprint: string; ep?: number; adult?: number; child?: number };
export type RateReview = { before: RateEntry; change: RateChange };
export const emptyRates = (): RateInputs => ({ ep: '', adult: '', child: '' });
export const rateCellKey = (typeId: string, date: string) => `${typeId}:${date}`;
export const weekDates = (start: string) => dateRange(start, addDays(start, 6));
export function parseRateInputs(inputs: Partial<RateInputs>): Partial<Record<RateField, number>> {
  const result: Partial<Record<RateField, number>> = {};
  for (const key of rateFields) {
    const raw = inputs[key]?.trim();
    if (!raw) continue;
    if (!/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(Number(raw))) throw new Error('Enter non-negative prices with up to two decimal places.');
    result[key] = Number(raw);
  }
  return result;
}
export function reviewEntry(entry: RateEntry, inputs: Partial<RateInputs>): RateReview | null {
  const amounts = parseRateInputs(inputs);
  if (!Object.keys(amounts).length) return null;
  if (!entry.editable) throw new Error(`${entry.type_name} · ${entry.date}: ${entry.reason || 'Pricing is protected'}.`);
  if (entry.ep == null && !rateFields.every(key => amounts[key] != null)) throw new Error(`${entry.type_name} · ${entry.date}: enter EP, extra adult and extra child to create a new rate.`);
  const changed = Object.fromEntries(Object.entries(amounts).filter(([key, value]) => entry[key as RateField] !== value));
  if (!Object.keys(changed).length) return null;
  return { before: entry, change: { type_id: entry.type_id, date: entry.date, fingerprint: entry.fingerprint, ...changed } };
}
export type RoomTypeStatusFilter = 'all' | 'published' | 'unpublished';
// Room types whose publication status is unknown are treated as published so a failed status lookup never hides rates.
export function filterRoomTypesByStatus<T extends { id: string }>(types: T[], status: RoomTypeStatusFilter, published: Map<string, boolean> | null): T[] {
  if (!published || status === 'all') return types;
  return types.filter(type => (published.get(type.id) ?? true) === (status === 'published'));
}
export function weeklyReview(grid: RateGrid, draft: Record<string, Partial<RateInputs>>, visibleTypeIds?: Set<string>): RateReview[] {
  return grid.entries.flatMap(entry => {
    if (visibleTypeIds && !visibleTypeIds.has(entry.type_id)) return [];
    const inputs = draft[rateCellKey(entry.type_id, entry.date)];
    const review = inputs ? reviewEntry(entry, inputs) : null;
    return review ? [review] : [];
  });
}
export type BulkRules = { mode: 'same' | 'week' | 'specific'; same: RateInputs; weekdays: RateInputs; weekends: RateInputs; days: Record<number, RateInputs> };
export function bulkRateReview(grid: RateGrid, typeIds: string[], dates: string[], rules: BulkRules): RateReview[] {
  if (!typeIds.length) throw new Error('Select at least one room type.');
  if (!dates.length) throw new Error('Select at least one stay date.');
  for (const id of typeIds) for (const date of dates) {
    if (!grid.entries.some(entry => entry.type_id === id && entry.date === date)) throw new Error('A selected room type has no saved rate entries for these dates.');
  }
  const reviews = grid.entries.filter(entry => typeIds.includes(entry.type_id) && dates.includes(entry.date)).flatMap(entry => {
    const day = new Date(`${entry.date}T12:00:00Z`).getUTCDay();
    const inputs = rules.mode === 'same' ? rules.same : rules.mode === 'week' ? (entry.weekend ? rules.weekends : rules.weekdays) : rules.days[day] || emptyRates();
    const review = reviewEntry(entry, inputs);
    return review ? [review] : [];
  });
  if (!reviews.length) throw new Error('Enter at least one changed price for the selected days.');
  return reviews;
}
export function sharedRate(entries: RateEntry[], field: RateField): { value: string; mixed: boolean } {
  const values = new Set(entries.map(entry => entry[field]));
  return { value: values.size === 1 && entries[0]?.[field] != null ? String(entries[0][field]) : '', mixed: values.size > 1 };
}
export function roomTypesFromGrid(grid: RateGrid): { id: string; name: string; category_active: boolean }[] {
  const types = new Map<string, { id: string; name: string; category_active: boolean }>();
  for (const entry of grid.entries) {
    if (!types.has(entry.type_id)) types.set(entry.type_id, { id: entry.type_id, name: entry.type_name, category_active: grid.categories.find(category => category.id === entry.category_id)?.is_active ?? true });
  }
  return [...types.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

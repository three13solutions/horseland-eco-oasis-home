export type DistributionCategory = { id: string; name: string };
export type InventoryCell = { category_id: string; date: string; remaining: number; physical_remaining: number; version: number; configured: boolean };
export type InventoryGrid = { enabled: boolean; readiness_message: string; categories: DistributionCategory[]; cells: InventoryCell[] };
export type InventoryChange = { category_id: string; date: string; remaining: number; expected_version: number };
export type DistributionChannel = { id: string; code: string; name: string; kind: 'website' | 'offline' | 'channel_manager' | 'other'; is_active: boolean; notes: string | null };

export function hotelToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function validDate(value: string): boolean {
  const date = new Date(`${value}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function addDays(value: string, days: number): string {
  if (!validDate(value) || !Number.isInteger(days)) throw new Error('Choose a valid date.');
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function dateRange(start: string, end: string, limit = 90): string[] {
  if (!validDate(start) || !validDate(end) || start > end) throw new Error('Choose a valid date range.');
  const dates: string[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    if (dates.length >= limit) throw new Error(`Update up to ${limit} dates at a time.`);
    dates.push(date);
  }
  return dates;
}
export const cellKey = (categoryId: string, date: string) => `${categoryId}:${date}`;
export function parseRoomCount(value: string): number {
  if (!/^\d+$/.test(value.trim())) throw new Error('Enter a whole number of rooms, including 0 for sold out.');
  const count = Number(value);
  if (!Number.isSafeInteger(count)) throw new Error('The room count is too large.');
  return count;
}
export function makeChange(cell: InventoryCell, value: string, today = hotelToday()): InventoryChange {
  const remaining = parseRoomCount(value);
  if (cell.date < today) throw new Error('Past dates cannot be changed.');
  if (remaining > cell.physical_remaining) throw new Error(`Only ${cell.physical_remaining} eligible rooms remain on ${cell.date}.`);
  return { category_id: cell.category_id, date: cell.date, remaining, expected_version: cell.version };
}
export function bulkChanges(grid: InventoryGrid, categoryIds: string[], start: string, end: string, value: string, today = hotelToday()): InventoryChange[] {
  if (!grid.enabled) throw new Error('Website inventory controls are not activated yet.');
  if (!categoryIds.length) throw new Error('Select at least one category.');
  const dates = dateRange(start, end);
  const index = new Map(grid.cells.map(cell => [cellKey(cell.category_id, cell.date), cell]));
  return [...new Set(categoryIds)].flatMap(categoryId => dates.map(date => {
    const cell = index.get(cellKey(categoryId, date));
    if (!cell) throw new Error('Availability is missing. Refresh before updating.');
    return makeChange(cell, value, today);
  }));
}

export function validateChannel(name: string, code: string, kind: string): void {
  if (!name.trim() || name.trim().length > 80) throw new Error('Use a channel name of 1–80 characters.');
  if (!/^[a-z][a-z0-9_]{1,39}$/.test(code)) throw new Error('Use a stable lowercase code with letters, numbers and underscores (2–40 characters).');
  if (!['website', 'offline', 'channel_manager', 'other'].includes(kind)) throw new Error('Choose a channel type.');
}

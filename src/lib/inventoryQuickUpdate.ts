import type { InventoryChange } from './distribution-inventory';
export type QuickInventoryRequest = { schema: 1; id: string; change: InventoryChange };
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function readQuickInventoryRequest(storage: StorageLike, key: string): QuickInventoryRequest | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  const value = JSON.parse(raw);
  const change = value?.change;
  if (value?.schema !== 1 || !uuid.test(value.id) || !change || !uuid.test(change.category_id) ||
      typeof change.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(change.date) ||
      new Date(`${change.date}T12:00:00Z`).toISOString().slice(0, 10) !== change.date ||
      !Number.isSafeInteger(change.remaining) || change.remaining < 0 ||
      !Number.isSafeInteger(change.expected_version) || change.expected_version < 0) throw new Error('Saved inventory update cannot be read safely. Contact support before replacing it.');
  return { schema: 1, id: value.id, change: { category_id: change.category_id, date: change.date, remaining: change.remaining, expected_version: change.expected_version } };
}
export function persistQuickInventoryRequest(storage: StorageLike, key: string, request: QuickInventoryRequest): void {
  const raw = JSON.stringify(request);
  storage.setItem(key, raw);
  if (storage.getItem(key) !== raw) throw new Error('Browser storage could not retain this update. No save was sent.');
}

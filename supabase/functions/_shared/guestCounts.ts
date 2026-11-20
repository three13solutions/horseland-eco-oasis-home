export type GuestCounts = Record<string, number>;
export function normalizeGuestCounts(value: unknown): GuestCounts {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Guest counts must be an object.');
  const entries = Object.entries(value);
  if (!entries.length || entries.length > 100) throw new Error('Invalid guest breakdown.');
  let total = 0;
  const normalized: GuestCounts = {};
  for (const [key, count] of entries.sort(([a], [b]) => a.localeCompare(b))) {
    if (!/^[a-z][a-z0-9_]*$/.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key) || typeof count !== 'number' || !Number.isInteger(count) || count < 0 || count > 100) throw new Error('Invalid guest type or count.');
    normalized[key] = count; total += count;
  }
  if (total < 1 || total > 100) throw new Error('Choose between 1 and 100 guests.');
  return normalized;
}
export const legacyGuestCounts = (adults: number, children = 0, infants = 0): GuestCounts => ({ adult: adults, child: children, infant: infants });
export const guestHeadcount = (counts: GuestCounts) => Object.values(counts).reduce((total, count) => total + count, 0);
// Retain the historical infant occupancy exemption, not an exemption for all free types.
export const guestOccupancy = (counts: GuestCounts) => guestHeadcount(counts) - (counts.infant ?? 0);
export function writeGuestParty(params: URLSearchParams, counts: GuestCounts, revision?: number) {
  const party = normalizeGuestCounts(counts);
  params.set('guestTypes', JSON.stringify(party));
  params.set('adults', String(party.adult ?? 0));
  params.set('children', String(party.child ?? 0));
  params.set('infants', String(party.infant ?? 0));
  params.set('guests', String(guestOccupancy(party)));
  if (revision !== undefined) params.set('guestPolicyRevision', String(revision));
  return params;
}
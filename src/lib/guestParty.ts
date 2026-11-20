import { normalizeGuestCounts, legacyGuestCounts, guestOccupancy } from './guest-counts';
// Historical guest totals exclude infants; keyed types are authoritative when supplied.
export function readGuestParty(params: URLSearchParams) {
  const keyed = params.get('guestTypes');
  if (keyed) {
    if (keyed.length > 4096) throw new Error('Invalid guest selection.');
    const counts = normalizeGuestCounts(JSON.parse(keyed));
    return { adults: counts.adult ?? 0, children: counts.child ?? 0, infants: counts.infant ?? 0, guests: guestOccupancy(counts), guestCounts: counts };
  }
  const count = (name: string, fallback: number, minimum = 0) => {
    const raw = params.get(name);
    if (raw === null || raw.trim() === '') return fallback;
    const value = Number(raw);
    return Number.isInteger(value) && value >= minimum ? value : fallback;
  };
  const children = count('children', 0);
  const infants = count('infants', 0);
  const legacyTotal = count('guests', 2, 1);
  const adults = count('adults', params.has('guests') ? Math.max(1, legacyTotal - children) : 2, 1);
  return { adults, children, infants, guests: adults + children, guestCounts: legacyGuestCounts(adults, children, infants) };
}

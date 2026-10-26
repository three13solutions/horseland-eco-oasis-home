// Historical guest totals exclude infants; explicit age counts always take priority.
export function readGuestParty(params: URLSearchParams) {
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
  return { adults, children, infants, guests: adults + children };
}

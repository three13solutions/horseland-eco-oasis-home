export type GuestBandKey = 'adult' | 'child' | 'infant';
export interface GuestAgeBand { key: string; name?: string; min_age: number; max_age: number | null; accommodation_rule: 'adult' | 'child' | 'guest_type' | 'free'; meal_rule: 'full' | 'free'; enabled?: boolean }
export interface GuestAgePolicy { revision: number; bands: GuestAgeBand[]; updated_at: string }
export function validateGuestAgeBands(bands: GuestAgeBand[]): string | null {
  if (!Array.isArray(bands) || !bands.length || bands.some(b=>!b || typeof b!=='object') || new Set(bands.map(b => b.key)).size !== bands.length) return 'Each guest type must have one current policy.';
  const ordered = [...bands].sort((a,b)=>a.min_age-b.min_age);
  let previousMax = -1;
  for (let i=0;i<ordered.length;i++) {
    const band=ordered[i];
    if (!/^[a-z][a-z0-9_]*$/.test(band.key) || (band.name !== undefined && (typeof band.name !== 'string' || !band.name.trim()))) return 'Enter a guest type name.';
    if (!Number.isInteger(band.min_age) || band.min_age < 0 || (band.max_age!==null && (!Number.isInteger(band.max_age) || band.max_age<band.min_age))) return 'Enter valid whole-number ages; maximum must be at least the minimum.';
    if ((band.enabled !== undefined && typeof band.enabled !== 'boolean') || !['full','free'].includes(band.meal_rule) || !['adult','child','guest_type','free'].includes(band.accommodation_rule)) return 'Choose a valid accommodation and meal rule for each band.';
    if (band.enabled !== false) {
      if (band.min_age <= previousMax) return 'An active policy already covers these ages. Active age ranges cannot overlap.';
      previousMax=band.max_age ?? Infinity;
    }
  }
  return null;
}
export function ageBandLabel(band?: GuestAgeBand) { return band ? band.max_age===null ? `${band.min_age}+ years` : `${band.min_age}–${band.max_age} years` : 'Age policy unavailable'; }
export function validateGuestAgePolicySave(bands: GuestAgeBand[], live: boolean): string | null {
  const invalid = validateGuestAgeBands(bands);
  if (invalid || !live) return invalid;
  if (bands.length !== 3 || bands.some(b => !['adult', 'child', 'infant'].includes(b.key) || b.accommodation_rule === 'guest_type')) {
    return 'New guest types cannot be saved while current pricing is live. Custom guest types need matching booking and pricing support first.';
  }
  let expectedMin = 0;
  for (const band of [...bands].sort((a, b) => a.min_age - b.min_age)) {
    if (band.min_age !== expectedMin) {
      const missing = band.min_age - 1 === expectedMin ? `age ${expectedMin}` : `ages ${expectedMin}–${band.min_age - 1}`;
      return `Cannot save: ${missing} would have no guest policy. ${guestTypeName(band)} starts at ${band.min_age}; keep neighbouring age ranges continuous while pricing is live.`;
    }
    if (band.key === 'adult' && band.max_age !== null) {
      return 'Adult must keep No Limit while current pricing is live. A maximum age needs a separate older-guest segment and matching booking and pricing support first.';
    }
    expectedMin = (band.max_age ?? 0) + 1;
  }
  return null;
}
export function guestPolicySaveError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    if (error.message.includes('AGE_POLICY_CHANGED')) return 'The saved policy changed while you were editing. Close this form, reload the page, and review the latest policy before saving again.';
    return error.message;
  }
  return 'Policy was not saved. Please try again.';
}
export function mealChargeableCount(policy: GuestAgePolicy, counts: Record<string,number>) { return policy.bands.reduce((sum,b)=>sum+(b.enabled === false || b.meal_rule==='full'?(counts[b.key] ?? 0):0),0); }
export function guestTypeChargeRule(key: string): GuestAgeBand['accommodation_rule'] { return key === 'adult' ? 'adult' : key === 'child' || key === 'infant' ? 'child' : 'guest_type'; }
export function guestTypeName(band: Pick<GuestAgeBand, 'key' | 'name'>) { return band.name || band.key.split('_').map(word => word.charAt(0).toUpperCase()+word.slice(1)).join(' '); }
export function guestTypeKey(name: string) { return name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''); }
export function sameGuestPolicy(a: GuestAgeBand, b: GuestAgeBand) { return a.key===b.key && a.name===b.name && a.min_age===b.min_age && a.max_age===b.max_age && a.accommodation_rule===b.accommodation_rule && a.meal_rule===b.meal_rule; }
export function alternateGuestPolicy(current: GuestAgeBand, versions: GuestAgeBand[], bands: GuestAgeBand[]) {
  return versions.find(candidate => candidate.key===current.key && candidate.min_age===current.min_age && candidate.max_age===current.max_age && !sameGuestPolicy(current,candidate) && !validateGuestAgeBands(bands.map(b => b.key===current.key ? {...candidate,enabled:true} : b)));
}

export type GuestBandKey = 'adult' | 'child' | 'infant';
export interface GuestAgeBand { key: GuestBandKey; min_age: number; max_age: number | null; accommodation_rule: 'adult' | 'child' | 'free'; meal_rule: 'full' | 'free' }
export interface GuestAgePolicy { revision: number; bands: GuestAgeBand[]; updated_at: string }
export function validateGuestAgeBands(bands: GuestAgeBand[]): string | null {
  if (!Array.isArray(bands) || bands.some(b=>!b || typeof b!=='object') || bands.length !== 3 || new Set(bands.map(b => b.key)).size !== 3 || !['adult','child','infant'].every(key=>bands.some(b=>b.key===key))) return 'Exactly one adult, child and infant band is required.';
  const ordered = [...bands].sort((a,b)=>a.min_age-b.min_age);
  let next = 0;
  for (let i=0;i<ordered.length;i++) {
    const band=ordered[i];
    if (!Number.isInteger(band.min_age) || band.min_age !== next || (band.max_age!==null && (!Number.isInteger(band.max_age) || band.max_age<band.min_age))) return 'Age bands must cover every age from zero without gaps or overlaps.';
    if ((i===2)!==(band.max_age===null) || (i===2 && band.key!=='adult')) return 'The adult band must be last and have no upper age limit.';
    if (!['full','free'].includes(band.meal_rule) || !(band.key==='adult' ? band.accommodation_rule==='adult' : ['child','free'].includes(band.accommodation_rule))) return 'Choose a valid accommodation and meal rule for each band.';
    next=(band.max_age??0)+1;
  }
  return null;
}
export function ageBandLabel(band?: GuestAgeBand) { return band ? band.max_age===null ? `${band.min_age}+ years` : `${band.min_age}–${band.max_age} years` : 'Age policy unavailable'; }
export function mealChargeableCount(policy: GuestAgePolicy, counts: Record<GuestBandKey,number>) { return policy.bands.reduce((sum,b)=>sum+(b.meal_rule==='full'?counts[b.key]:0),0); }

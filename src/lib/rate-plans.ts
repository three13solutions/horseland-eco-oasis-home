/** Admin previews only. Booking totals are authoritative on the server. */
export type SourceMealPlan = 'RO' | 'BB' | 'HB' | 'FB';
export type SupplementRates = Record<SourceMealPlan, number>;
export interface RatePlanAnchor {
  id: string;
  name: string;
  room_category_id: string | null;
  room_type_id: string | null;
  room_unit_id: string | null;
  amount: number;
  source_meal_plan_code: SourceMealPlan;
  quoted_nights: number;
  included_adults: number;
  start_date: string | null;
  end_date: string | null;
  min_nights: number;
  max_nights: number | null;
  day_type: 'all' | 'weekday' | 'weekend';
  extra_adult_per_night: number | null;
  extra_child_per_night: number | null;
  extra_infant_per_night: number;
  priority: number;
  los_min_nights?: number | null;
  los_adjustment_type?: 'fixed' | 'percentage' | null;
  los_adjustment_value?: number | null;
  is_active: boolean;
  verified_basis: boolean;
  source_override_id: string | null;
  created_at?: string;
  updated_at?: string;
}
export function ratePlanPreview(
  anchor: Pick<RatePlanAnchor, 'amount' | 'quoted_nights' | 'included_adults' | 'source_meal_plan_code' | 'los_min_nights' | 'los_adjustment_type' | 'los_adjustment_value'>,
  supplements: SupplementRates,
  stayNights = 1,
) {
  if (!Number.isFinite(anchor.amount) || anchor.amount < 0) throw new Error('Enter a non-negative source price.');
  if (!Number.isInteger(anchor.quoted_nights) || anchor.quoted_nights < 1) throw new Error('Quoted nights must be a positive whole number.');
  if (!Number.isInteger(anchor.included_adults) || anchor.included_adults < 1) throw new Error('Included adults must be a positive whole number.');
  for (const code of ['RO', 'BB', 'HB', 'FB'] as const) {
    if (!Number.isFinite(supplements[code]) || supplements[code] < 0) throw new Error(`A valid ${code} meal supplement is required.`);
  }
  if (!['RO', 'BB', 'HB', 'FB'].includes(anchor.source_meal_plan_code)) throw new Error('Choose a valid source meal plan.');
  let enteredPerNight = anchor.amount / anchor.quoted_nights;
  if (anchor.los_adjustment_type) {
    if (anchor.quoted_nights > 1) throw new Error('A package-duration tier cannot also apply a length-of-stay discount.');
    if (!Number.isInteger(anchor.los_min_nights) || anchor.los_min_nights < 2 || !Number.isFinite(anchor.los_adjustment_value) || anchor.los_adjustment_value < 0) throw new Error('Enter a valid length-of-stay threshold and discount.');
    if (anchor.los_adjustment_type === 'percentage' && anchor.los_adjustment_value > 100) throw new Error('Percentage discount cannot exceed 100%.');
    if (stayNights >= anchor.los_min_nights) enteredPerNight -= anchor.los_adjustment_type === 'fixed' ? anchor.los_adjustment_value : enteredPerNight * anchor.los_adjustment_value / 100;
  }
  const roomOnly = enteredPerNight - supplements[anchor.source_meal_plan_code] * anchor.included_adults;
  if (roomOnly < 0) throw new Error('The entered price is lower than its included meals. Increase it or correct the meal basis.');
  return Object.fromEntries((['RO', 'BB', 'HB', 'FB'] as const).map(code => [code,
    Math.round((roomOnly + supplements[code] * anchor.included_adults) * 100) / 100,
  ])) as SupplementRates;
}
export function validateRatePlan(anchor: Omit<RatePlanAnchor, 'id'>, supplements: SupplementRates) {
  if (!anchor.name.trim()) throw new Error('Enter a rate name.');
  if ([anchor.room_category_id, anchor.room_type_id, anchor.room_unit_id].filter(Boolean).length !== 1) throw new Error('Choose exactly one category, room type or unit.');
  if (!Number.isInteger(anchor.min_nights) || anchor.min_nights < 1) throw new Error('Minimum stay must be at least one night.');
  if (anchor.max_nights !== null && (!Number.isInteger(anchor.max_nights) || anchor.max_nights < anchor.min_nights)) throw new Error('Maximum stay must not be below minimum stay.');
  if (anchor.start_date && anchor.end_date && anchor.start_date > anchor.end_date) throw new Error('End date must be on or after start date.');
  if (!Number.isInteger(anchor.priority)) throw new Error('Priority must be a whole number.');
  for (const rate of [anchor.extra_adult_per_night, anchor.extra_child_per_night, anchor.extra_infant_per_night]) {
    if (rate !== null && (!Number.isFinite(rate) || rate < 0)) throw new Error('Extra-person accommodation rates must be non-negative.');
  }
  if (anchor.is_active && !anchor.verified_basis) throw new Error('Confirm the entered meal basis before activating this rate.');
  ratePlanPreview(anchor, supplements);
  if (anchor.los_adjustment_type) ratePlanPreview(anchor, supplements, anchor.los_min_nights);
  return anchor;
}

export interface ManagedOverrideSource {
  id: string; room_type_id?: string | null; room_unit_id?: string | null; room_category_id?: string | null;
  start_date: string; end_date: string; min_nights?: number | null; max_nights?: number | null;
  day_type?: string | null; occupancy_type?: string | null;
}
/** Original rows remain evidence. Protect a migrated package and its copied nightly extras. */
export function managedOverrideIds(rules: ManagedOverrideSource[], anchors: {source_override_id: string | null}[]) {
  const ids = new Set(anchors.map(anchor=>anchor.source_override_id).filter((id):id is string=>!!id));
  const originals = rules.filter(rule=>ids.has(rule.id));
  const familyKeys = ['room_type_id','room_unit_id','room_category_id','start_date','end_date','min_nights','max_nights','day_type'] as const;
  for (const rule of rules) {
    if (!['extra_adult','extra_child'].includes(rule.occupancy_type||'')) continue;
    if (originals.some(source=>familyKeys.every(key=>(source[key]??null)===(rule[key]??null)))) ids.add(rule.id);
  }
  return ids;
}

export interface MealSupplementVersion { plan_code: string; amount: number; effective_from: string; recorded_at: string; id: string; }
export function supplementsForDate(versions: MealSupplementVersion[], date: string): SupplementRates {
  return Object.fromEntries((['RO','BB','HB','FB'] as const).map(code => {
    const applicable=versions.filter(version=>version.plan_code===code&&version.effective_from<=date)
      .sort((a,b)=>b.effective_from.localeCompare(a.effective_from)||b.recorded_at.localeCompare(a.recorded_at)||a.id.localeCompare(b.id));
    return [code, applicable.length ? Number(applicable[0].amount) : NaN];
  })) as SupplementRates;
}
export type RateScopeDates = Pick<RatePlanAnchor, 'room_category_id' | 'room_type_id' | 'room_unit_id' | 'start_date' | 'end_date'>;
/** Legacy forms cannot safely compete with anchors, even on a different stay-length tier. */
export function hasManagedRateOverlap(candidate: RateScopeDates, anchors: RateScopeDates[]) {
  return anchors.some(anchor => {
    const sameScope = ['room_category_id','room_type_id','room_unit_id'].every(key => (candidate[key]??null)===(anchor[key]??null));
    const validScope = !!(candidate.room_category_id||candidate.room_type_id||candidate.room_unit_id);
    const datesOverlap = (!candidate.start_date || !anchor.end_date || candidate.start_date<=anchor.end_date)
      && (!candidate.end_date || !anchor.start_date || candidate.end_date>=anchor.start_date);
    return validScope && sameScope && datesOverlap;
  });
}

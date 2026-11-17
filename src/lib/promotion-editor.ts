export interface PromotionRestrictions {
 eligible_room_category_ids: string[] | null;
 eligible_meal_plan_codes: string[] | null;
 min_stay_nights: number | null;
 excluded_stay_dates: string[];
 total_usage_limit: number | null;
 per_guest_usage_limit: number | null;
}
export const unrestrictedPromotion = ():PromotionRestrictions=>({eligible_room_category_ids:null,eligible_meal_plan_codes:null,min_stay_nights:null,excluded_stay_dates:[],total_usage_limit:null,per_guest_usage_limit:null});
export function validDate(value:string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value+'T00:00:00Z')) && new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value; }
export function restrictionError(form:PromotionRestrictions):string|null {
 for(const [key,label] of [['total_usage_limit','Total usage limit'],['per_guest_usage_limit','Per-email usage limit'],['min_stay_nights','Minimum stay']] as const) {const n=form[key];if(n!==null&&(!Number.isSafeInteger(n)||n<1))return `${label} must be a positive whole number or blank.`;}
 if(form.eligible_room_category_ids!==null&&!form.eligible_room_category_ids.length)return 'Select at least one room category or choose all categories.';
 if(form.eligible_meal_plan_codes!==null&&(!form.eligible_meal_plan_codes.length||form.eligible_meal_plan_codes.some(c=>!['RO','BB','HB','FB'].includes(c))))return 'Select at least one valid meal plan or choose all plans.';
 if(form.excluded_stay_dates.some(d=>!validDate(d)))return 'Excluded dates must be real dates in YYYY-MM-DD format.';
 if(new Set(form.excluded_stay_dates).size!==form.excluded_stay_dates.length)return 'Remove duplicate excluded dates.';
 return null;
}

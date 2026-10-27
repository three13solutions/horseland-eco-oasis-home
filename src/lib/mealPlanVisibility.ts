export type MealVisibilityRule = {
 id: string; name: string; is_active: boolean; scope_kind: 'all'|'types'|'units';
 meal_plan_ids: string[]; room_type_ids: string[]; room_unit_ids: string[];
 start_date: string|null; end_date: string|null; revision?: number; updated_at?: string;
};
export type MealVisibilitySave = {rule: MealVisibilityRule; expectedRevision: number|null};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validVisibilityDate(value:string):boolean {const date=new Date(`${value}T12:00:00Z`);return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
export function validateVisibilityRule(rule:MealVisibilityRule):void {
 if(!uuid.test(rule.id)||!rule.name.trim()||rule.name.trim().length>120)throw Error('Enter a rule name of 1–120 characters.');
 const validIds=(values:string[])=>Array.isArray(values)&&values.every(id=>uuid.test(id))&&new Set(values).size===values.length;
 if(!validIds(rule.meal_plan_ids)||!rule.meal_plan_ids.length)throw Error('Select at least one meal plan to hide.');
 if(!validIds(rule.room_type_ids)||!validIds(rule.room_unit_ids))throw Error('Room selections are invalid.');
 if(rule.scope_kind==='all'&&(rule.room_type_ids.length||rule.room_unit_ids.length))throw Error('All rooms must not include a narrower room selection.');
 if(rule.scope_kind==='types'&&(!rule.room_type_ids.length||rule.room_unit_ids.length))throw Error('Select at least one room type.');
 if(rule.scope_kind==='units'&&(!rule.room_unit_ids.length||rule.room_type_ids.length))throw Error('Select at least one room unit.');
 if(!['all','types','units'].includes(rule.scope_kind))throw Error('Choose a room scope.');
 if((rule.start_date===null)!==(rule.end_date===null))throw Error('Enter both the first and last occupied night, or choose all dates.');
 if(rule.start_date!==null&&(!validVisibilityDate(rule.start_date)||!validVisibilityDate(rule.end_date!)||rule.start_date>rule.end_date!))throw Error('Choose a valid occupied-night date range.');
}
export function mealPlanCodesOffered(variants:readonly {meal_plan_code:string}[]):Set<string>{return new Set(variants.map(v=>v.meal_plan_code));}
export function variantStillOffered<T extends {meal_plan_code:string;cancellation_policy_code:string;quote_fingerprint?:string}>(selection:T|null|undefined,variants:readonly T[]):boolean {
 return !!selection&&variants.some(v=>v.meal_plan_code===selection.meal_plan_code&&v.cancellation_policy_code===selection.cancellation_policy_code&&v.quote_fingerprint===selection.quote_fingerprint);
}

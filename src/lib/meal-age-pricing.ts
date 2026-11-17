export type MealAgeMode='full'|'percentage'|'fixed'|'free';
export interface MealAgeRule {plan_code:'RO'|'BB'|'HB'|'FB';band_key:'adult'|'child'|'infant';mode:MealAgeMode;value:number|null}
export interface MealAgePolicy {revision:number;updated_at:string;rules:MealAgeRule[]}
export function mealAgeRuleError(rules:MealAgeRule[]):string|null {
 if(!Array.isArray(rules)||rules.length!==12)return 'All four plans and all three age bands must be configured.';
 const seen=new Set<string>();for(const r of rules){if(!r||!['RO','BB','HB','FB'].includes(r.plan_code)||!['adult','child','infant'].includes(r.band_key))return 'Invalid plan or age band.';const key=r.plan_code+':'+r.band_key;if(seen.has(key))return 'Duplicate plan/age band.';seen.add(key);
 if(!['full','percentage','fixed','free'].includes(r.mode))return 'Choose a valid pricing mode.';
 if(r.plan_code==='RO'&&r.mode!=='free')return 'EP has no meal charge.';
 if(r.plan_code!=='RO'&&r.band_key==='adult'&&r.mode!=='full')return 'Adults use the current shared adult meal price.';
 if(['full','free'].includes(r.mode)){if(r.value!==null)return 'Full/free rules must not have a separate amount.';}else if(typeof r.value!=='number'||!Number.isFinite(r.value)||!Number.isSafeInteger(Math.round(r.value*100))||r.value<0||(r.mode==='percentage'&&r.value>100)||Math.abs(r.value*100-Math.round(r.value*100))>0.000001)return 'Enter a non-negative amount with at most two decimals; percentages cannot exceed 100.';
 }return null;
}
export function mealAgeAmount(adult:number,rule:MealAgeRule,globalFree:boolean):number {
 if(globalFree||rule.plan_code==='RO'||rule.mode==='free')return 0;
 const paise=Math.round(adult*100);
 if(!Number.isSafeInteger(paise)||paise<0)throw new Error('Adult amount exceeds supported precision.');
 if(rule.mode==='full')return paise/100;
 if(rule.value===null||!Number.isFinite(rule.value)||rule.value<0)throw new Error('Pricing value is required.');
 const value=Math.round(rule.value*100);
 if(!Number.isSafeInteger(value))throw new Error('Pricing value exceeds supported precision.');
 if(rule.mode==='fixed')return value/100;
 // Positive numeric SQL rounding: integer paise × hundredths of a percent.
 const rounded=(BigInt(paise)*BigInt(value)+5000n)/10000n;
 if(rounded>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Meal amount exceeds supported precision.');
 return Number(rounded)/100;
}

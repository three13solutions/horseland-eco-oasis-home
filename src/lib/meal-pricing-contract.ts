/** Validates the server workspace response before exposing shared-price editing.
 * Parsing does not authenticate, authorize, approve, or recompute prices.
 */
import { parseRupeesToPaise } from './rate-calendar-draft.ts';
import type { MealChoicePlan } from './meal-choice-draft.ts';
export interface LiveMeal { id: string; title: string; meal_type: string; variant: string; price: number; is_active: boolean; updated_at: string }
export interface LivePlan { id: string; plan_code: MealChoicePlan['code']; plan_name: string; groups: { id: string; label: string; meal_ids: string[] }[]; supplement_per_person_inr: number; is_active: boolean }
export interface MealPricingWorkspace { mode: 'staged' | 'live'; revision: number; meals: LiveMeal[]; plans: LivePlan[] }
function invalid(label: string): never { throw new Error(`Invalid meal-pricing response: ${label}. Reload before editing.`); }
function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(label);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) invalid(label);
  return value;
}
function bool(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') invalid(label);
  return value;
}
function array(value: unknown, max: number, label: string): unknown[] {
  if (!Array.isArray(value) || value.length > max) invalid(label);
  return value;
}
function amount(value: unknown, label: string): number {
  if (typeof value !== 'number' && typeof value !== 'string') invalid(label);
  const valueText = typeof value === 'string' ? value.trim() : String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(valueText)) invalid(label);
  const [whole, fraction = ''] = valueText.split('.');
  const exactPaise = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (exactPaise > BigInt(Number.MAX_SAFE_INTEGER)) invalid(label);
  const normalized = Number(valueText);
  if (!Number.isFinite(normalized) || normalized < 0) invalid(label);
  // Prevent lossy large numeric strings from becoming a different price on save.
  try { if (BigInt(parseRupeesToPaise(String(normalized))) !== exactPaise) invalid(label); }
  catch { invalid(label); }
  return normalized;
}
function revision(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^\d+$/.test(String(value))) invalid('revision');
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) invalid('revision');
  return result;
}
function timestamp(value: unknown): string {
  const result = text(value, 'meal update timestamp');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(result) || !Number.isFinite(Date.parse(result))) invalid('meal update timestamp');
  const date = result.slice(0, 10);
  if (new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) invalid('meal update timestamp');
  return result;
}
export function normalizeMealWorkspace(raw: unknown): MealPricingWorkspace {
  const value = record(raw, 'workspace');
  if (value.mode !== 'staged' && value.mode !== 'live') invalid('workspace mode');
  const result: MealPricingWorkspace = { mode: value.mode, revision: revision(value.revision), meals: [], plans: [] };
  const mealIds = new Map<string, LiveMeal>();
  result.meals = array(value.meals, 5000, 'meal array').map(rawMeal => {
    const m = record(rawMeal, 'meal');
    const meal: LiveMeal = { id: text(m.id, 'meal ID'), title: text(m.title, 'meal title'),
      meal_type: text(m.meal_type, 'meal type'), variant: text(m.variant, 'meal variant'),
      price: amount(m.price, 'meal price'), is_active: bool(m.is_active, 'meal active status'), updated_at: timestamp(m.updated_at) };
    if (mealIds.has(meal.id)) invalid('duplicate meal ID');
    mealIds.set(meal.id, meal);
    return meal;
  });
  const planIds = new Set<string>(), codes = new Set<string>();
  result.plans = array(value.plans, 4, 'plan array').map(rawPlan => {
    const p = record(rawPlan, 'plan');
    const code = text(p.plan_code, 'plan code');
    if (!['RO', 'BB', 'HB', 'FB'].includes(code)) invalid('canonical plan code');
    const plan: LivePlan = { id: text(p.id, 'plan ID'), plan_code: code as LivePlan['plan_code'], plan_name: text(p.plan_name, 'plan name'),
      supplement_per_person_inr: amount(p.supplement_per_person_inr, 'plan supplement'), is_active: bool(p.is_active, 'plan active status'), groups: [] };
    if (planIds.has(plan.id) || codes.has(code)) invalid('duplicate plan ID or code');
    planIds.add(plan.id); codes.add(code);
    const groupIds = new Set<string>(), linkedIds = new Set<string>();
    plan.groups = array(p.groups, 16, 'group array').map(rawGroup => {
      const g = record(rawGroup, 'meal group');
      const group = { id: text(g.id, 'group ID'), label: text(g.label, 'group label'), meal_ids: array(g.meal_ids, 100, 'alternative array').map(id => text(id, 'linked meal ID')) };
      if (groupIds.has(group.id)) invalid('duplicate group ID');
      groupIds.add(group.id);
      if (!group.meal_ids.length) invalid('empty group alternatives');
      for (const id of group.meal_ids) {
        if (linkedIds.has(id)) invalid('duplicate linked meal within plan');
        linkedIds.add(id);
        const meal = mealIds.get(id);
        if (!meal) invalid('missing linked meal');
        if (plan.is_active && !meal.is_active) invalid('active plan links inactive meal');
      }
      return group;
    });
    if (code === 'RO' && (plan.groups.length || plan.supplement_per_person_inr !== 0)) invalid('EP must have zero supplement and no meals');
    if (code !== 'RO' && plan.is_active && !plan.groups.length) invalid('active non-EP plan requires groups');
    return plan;
  });
  return result;
}

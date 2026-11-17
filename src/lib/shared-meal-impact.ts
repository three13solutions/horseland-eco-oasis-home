/** Explicit optional shared-price batch discovery and impact. No writes or automatic
 * equalization: connected alternatives may retain unequal prices. The caller must
 * obtain approval for the exact chosen meal IDs and amounts, not the whole closure.
 */
import { validateMealChoicePlan } from './meal-choice-draft.ts';
import type { MealCatalogueItem, MealChoicePlan, MealPriceImpact } from './meal-choice-draft.ts';

export interface SharedMealPriceChange { mealId: string; pricePaise: number }
function checked(plans: readonly MealChoicePlan[], catalogue: readonly MealCatalogueItem[]) {
  validateMealChoicePlan({ code: 'RO', groups: [] }, catalogue);
  if (!Array.isArray(plans) || plans.length > 4) throw new Error('Provide at most four canonical plans.');
  const codes = new Set<string>();
  for (const plan of plans) {
    validateMealChoicePlan(plan, catalogue);
    if (codes.has(plan.code)) throw new Error('Duplicate plan code.');
    codes.add(plan.code);
  }
  return new Map(catalogue.map(item => [item.id, item]));
}
function activeMeal(map: Map<string, MealCatalogueItem>, mealId: string) {
  if (typeof mealId !== 'string' || !mealId.trim()) throw new Error('Meal ID is required.');
  const meal = map.get(mealId);
  if (!meal) throw new Error('Meal is missing from Meal Management.');
  if (!meal.isActive) throw new Error('Meal is inactive.');
  return meal;
}
function sum(a: number, b: number) {
  const total = a + b;
  if (!Number.isSafeInteger(total)) throw new Error('Meal impact exceeds safe integer range.');
  return total;
}
/** OR edges only: AND groups never connect merely by being in the same plan.
 * Returned IDs include the seed, sorted deterministically. Passing complete plans
 * is required so an incomplete dependency graph cannot look authoritative.
 */
export function getConnectedMealIds(plans: readonly MealChoicePlan[], catalogue: readonly MealCatalogueItem[], mealId: string): string[] {
  const map = checked(plans, catalogue);
  activeMeal(map, mealId);
  const connected = new Set([mealId]);
  const groups = plans.flatMap(plan => plan.groups);
  let changed = true;
  while (changed) {
    changed = false;
    for (const group of groups) {
      if (!group.mealIds.some(id => connected.has(id))) continue;
      for (const id of group.mealIds) if (!connected.has(id)) { connected.add(id); changed = true; }
    }
  }
  return [...connected].sort();
}
/** Simultaneous change impact. Ranges describe possible choices, not a payable
 * amount. No assumption that all connected alternatives should receive one price.
 */
export function getBatchMealPriceImpact(plans: readonly MealChoicePlan[], catalogue: readonly MealCatalogueItem[], changes: readonly SharedMealPriceChange[]): MealPriceImpact[] {
  const map = checked(plans, catalogue);
  if (!Array.isArray(changes) || !changes.length || changes.length > 5000) throw new Error('Provide 1–5000 explicit meal price changes.');
  const next = new Map<string, number>();
  for (const change of changes) {
    if (!change || typeof change !== 'object') throw new Error('Invalid meal price change.');
    activeMeal(map, change.mealId);
    if (!Number.isSafeInteger(change.pricePaise) || change.pricePaise < 0) throw new Error('Meal price must be non-negative integer paise.');
    if (next.has(change.mealId)) throw new Error('Duplicate meal price change.');
    next.set(change.mealId, change.pricePaise);
  }
  const range = (plan: MealChoicePlan, updated: boolean) => plan.groups.reduce((total, group) => {
    const amounts = group.mealIds.map(id => updated && next.has(id) ? next.get(id)! : map.get(id)!.pricePaise);
    return { min: sum(total.min, Math.min(...amounts)), max: sum(total.max, Math.max(...amounts)) };
  }, { min: 0, max: 0 });
  return plans.flatMap(plan => {
    const groups = plan.groups.filter(group => group.mealIds.some(id => next.has(id)));
    return groups.length ? [{ planCode: plan.code, groups: groups.map(group => ({ groupId: group.id, label: group.label })),
      oldRangePaise: range(plan, false), newRangePaise: range(plan, true) }] : [];
  });
}

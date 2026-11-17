/** Session-draft meal choices only. No booking, anchor, database or price writes.
 * Every required group is AND; one explicitly chosen alternative per group is OR.
 * Catalogue amounts are per adult/per occupied night in integer paise. No age policy
 * is inferred. This is not an authorization or authoritative quote boundary.
 */
export type MealChoicePlanCode = 'RO' | 'BB' | 'HB' | 'FB';
export interface MealCatalogueItem {
  id: string;
  title: string;
  mealType: string;
  variant: string;
  pricePaise: number;
  isActive: boolean;
  revision: string;
}
export interface MealChoiceGroup { id: string; label: string; mealIds: string[] }
export interface MealChoicePlan { code: MealChoicePlanCode; groups: MealChoiceGroup[] }
export interface MealChoiceGuest {
  id: string;
  label: string;
  kind: 'adult' | 'child' | 'infant';
  choices: Record<string, string>;
}
export interface MealChoiceLine {
  groupId: string;
  groupLabel: string;
  mealId: string;
  title: string;
  mealType: string;
  variant: string;
  pricePaise: number;
  revision: string;
}
const CODES = ['RO', 'BB', 'HB', 'FB'];
function text(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) throw new Error(`${label} is required (up to 500 characters).`);
}
function money(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Meal price must be non-negative integer paise.');
  return value;
}
function add(a: number, b: number): number {
  const result = a + b;
  if (!Number.isSafeInteger(result)) throw new Error('Meal total exceeds safe integer range.');
  return result;
}
function catalogueMap(catalogue: readonly MealCatalogueItem[]): Map<string, MealCatalogueItem> {
  if (!Array.isArray(catalogue) || catalogue.length > 5000) throw new Error('Catalogue must contain at most 5000 meals.');
  const map = new Map<string, MealCatalogueItem>();
  for (const item of catalogue) {
    if (!item || typeof item !== 'object') throw new Error('Invalid catalogue meal.');
    text(item.id, 'Meal ID'); text(item.title, 'Meal title'); text(item.mealType, 'Meal type');
    text(item.variant, 'Meal variant'); text(item.revision, 'Meal revision'); money(item.pricePaise);
    if (typeof item.isActive !== 'boolean') throw new Error('Meal active status is required.');
    if (map.has(item.id)) throw new Error('Duplicate catalogue meal ID.');
    map.set(item.id, item);
  }
  return map;
}
function validatePlan(plan: MealChoicePlan, map: Map<string, MealCatalogueItem>): void {
  if (!plan || !CODES.includes(plan.code) || !Array.isArray(plan.groups)) throw new Error('Invalid meal plan.');
  if (plan.groups.length > 16) throw new Error('A plan may contain at most 16 required groups.');
  if (plan.code === 'RO' && plan.groups.length) throw new Error('EP must have no meal groups.');
  if (plan.code !== 'RO' && !plan.groups.length) throw new Error('Configure at least one required meal group.');
  const groupIds = new Set<string>();
  const usedMeals = new Set<string>();
  for (const group of plan.groups) {
    if (!group || typeof group !== 'object') throw new Error('Invalid meal group.');
    text(group.id, 'Group ID'); text(group.label, 'Group label');
    if (groupIds.has(group.id)) throw new Error('Duplicate meal group ID.');
    groupIds.add(group.id);
    if (!Array.isArray(group.mealIds) || !group.mealIds.length || group.mealIds.length > 100) throw new Error('Each group needs 1–100 meal alternatives.');
    for (const id of group.mealIds) {
      text(id, 'Alternative meal ID');
      if (usedMeals.has(id)) throw new Error('A meal may appear only once per plan; duplicate links could double-charge a guest.');
      usedMeals.add(id);
      const meal = map.get(id);
      if (!meal) throw new Error(`Linked meal ${id} is missing from Meal Management.`);
      if (!meal.isActive) throw new Error(`Linked meal ${meal.title} is inactive.`);
    }
  }
}
export function validateMealChoicePlan(plan: MealChoicePlan, catalogue: readonly MealCatalogueItem[]): void {
  validatePlan(plan, catalogueMap(catalogue));
}
/** One occupied night. No implicit choice, cheapest fallback, adult-count multiplier
 * or room price. Every person gets an independent choice for every required group.
 */
export function calculateMealChoices(plan: MealChoicePlan, catalogue: readonly MealCatalogueItem[], guests: readonly MealChoiceGuest[]) {
  const map = catalogueMap(catalogue);
  validatePlan(plan, map);
  if (!Array.isArray(guests) || !guests.length || guests.length > 100) throw new Error('Provide 1–100 guests.');
  const guestIds = new Set<string>();
  let subtotalPaise = 0;
  const guestBreakdown = guests.map(guest => {
    if (!guest || typeof guest !== 'object') throw new Error('Invalid guest.');
    text(guest.id, 'Guest ID'); text(guest.label, 'Guest label');
    if (guestIds.has(guest.id)) throw new Error('Duplicate guest ID.');
    guestIds.add(guest.id);
    if (!['adult', 'child', 'infant'].includes(guest.kind)) throw new Error('Unknown guest kind; no pricing policy can be inferred.');
    if (plan.code !== 'RO' && guest.kind !== 'adult') throw new Error('Child and infant meal charging policies are not configured; do not assume the adult price.');
    if (!guest.choices || typeof guest.choices !== 'object' || Array.isArray(guest.choices)) throw new Error('Guest choices are required.');
    const groupIds = new Set(plan.groups.map(group => group.id));
    if (Object.keys(guest.choices).some(id => !groupIds.has(id))) throw new Error('Guest choices contain an unknown group.');
    let guestSubtotal = 0;
    const choices: MealChoiceLine[] = plan.groups.map(group => {
      const mealId = Object.prototype.hasOwnProperty.call(guest.choices, group.id) ? guest.choices[group.id] : undefined;
      if (typeof mealId !== 'string' || !group.mealIds.includes(mealId)) throw new Error(`${guest.label}: choose exactly one option for ${group.label}.`);
      const meal = map.get(mealId)!;
      guestSubtotal = add(guestSubtotal, meal.pricePaise);
      return { groupId: group.id, groupLabel: group.label, mealId: meal.id, title: meal.title,
        mealType: meal.mealType, variant: meal.variant, pricePaise: meal.pricePaise, revision: meal.revision };
    });
    subtotalPaise = add(subtotalPaise, guestSubtotal);
    return { guestId: guest.id, label: guest.label, kind: guest.kind, subtotalPaise: guestSubtotal, choices };
  });
  return { planCode: plan.code, guestBreakdown, subtotalPaise };
}
export interface MealPriceImpact {
  planCode: MealChoicePlanCode;
  groups: { groupId: string; label: string }[];
  oldRangePaise: { min: number; max: number };
  newRangePaise: { min: number; max: number };
}
/** Ranges communicate possible impact, NEVER the amount charged. Actual charge
 * always comes from calculateMealChoices and the person's selected alternatives.
 * Requires complete valid plan definitions; never silently estimates broken plans.
 */
export function getMealPriceImpact(plans: readonly MealChoicePlan[], catalogue: readonly MealCatalogueItem[], mealId: string, nextPricePaise: number): MealPriceImpact[] {
  const map = catalogueMap(catalogue);
  text(mealId, 'Meal ID'); money(nextPricePaise);
  if (!map.has(mealId)) throw new Error('Meal to edit is missing from Meal Management.');
  if (!Array.isArray(plans) || plans.length > 4) throw new Error('Provide at most four canonical plans.');
  const codes = new Set<string>();
  const range = (plan: MealChoicePlan, next: boolean) => plan.groups.reduce((sum, group) => {
    const values = group.mealIds.map(id => next && id === mealId ? nextPricePaise : map.get(id)!.pricePaise);
    return { min: add(sum.min, Math.min(...values)), max: add(sum.max, Math.max(...values)) };
  }, { min: 0, max: 0 });
  return plans.flatMap(plan => {
    validatePlan(plan, map);
    if (codes.has(plan.code)) throw new Error('Duplicate plan code.');
    codes.add(plan.code);
    const groups = plan.groups.filter(group => group.mealIds.includes(mealId));
    if (!groups.length) return [];
    return [{ planCode: plan.code, groups: groups.map(group => ({ groupId: group.id, label: group.label })),
      oldRangePaise: range(plan, false), newRangePaise: range(plan, true) }];
  });
}

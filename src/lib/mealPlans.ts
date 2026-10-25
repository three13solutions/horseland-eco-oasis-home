/** Canonical identities; aliases are compatibility metadata, never extra plans. */
export const MEAL_PLANS = [
  { code: 'RO', name: 'Room Only', description: 'Accommodation only; no meals included.', aliases: ['EP', 'European Plan', 'room_only'] },
  { code: 'BB', name: 'Breakfast Included', description: 'Accommodation with breakfast included.', aliases: ['CP', 'Bed & Breakfast', 'Continental Plan', 'breakfast_included'] },
  { code: 'HB', name: 'Half Board', description: 'Accommodation with breakfast and dinner included.', aliases: ['MAP', 'Modified American Plan', 'Breakfast & Dinner', 'breakfast_and_dinner'] },
  { code: 'FB', name: 'Full Board', description: 'Accommodation with breakfast, lunch and dinner included.', aliases: ['AP', 'American Plan', 'All Meals', 'All Meals Inclusive', 'all_meals_inclusive'] },
] as const;
export type MealPlanCode = typeof MEAL_PLANS[number]['code'];
export function normalizeMealPlanCode(value: string | null | undefined): MealPlanCode | null {
  const input = value?.trim().toLowerCase();
  return MEAL_PLANS.find(plan => [plan.code, plan.name, ...plan.aliases].some(alias => alias.toLowerCase() === input))?.code ?? null;
}
export function getMealPlan(value: string) {
  const code = normalizeMealPlanCode(value);
  return MEAL_PLANS.find(plan => plan.code === code);
}

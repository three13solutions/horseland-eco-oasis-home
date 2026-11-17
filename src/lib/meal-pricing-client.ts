import { supabase } from '@/integrations/supabase/client';
import { parseRupeesToPaise } from './rate-calendar-draft';
import type { MealCatalogueItem, MealChoicePlan } from './meal-choice-draft';
export type { LiveMeal, LivePlan, MealPricingWorkspace } from './meal-pricing-contract';
import type { LivePlan, MealPricingWorkspace } from './meal-pricing-contract';
import { normalizeMealWorkspace } from './meal-pricing-contract';
const db = supabase as unknown as { rpc(name: string, args?: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }> };
export const mealPricingQueryKey = ['shared-meal-pricing-workspace'];
export async function fetchMealPricingWorkspace() {
  const { data, error } = await db.rpc('get_meal_pricing_workspace');
  if (error) throw new Error(error.message);
  return normalizeMealWorkspace(data);
}
export async function saveSharedMealPrices(workspace: MealPricingWorkspace, prices: { mealId: string; pricePaise: number }[], reason: string) {
  if (!prices.length || prices.some(p => !Number.isSafeInteger(p.pricePaise) || p.pricePaise < 0)) throw new Error('Enter valid meal prices.');
  const { data, error } = await db.rpc('save_shared_meal_prices', { p_prices: prices.map(p => ({ meal_id: p.mealId, price: p.pricePaise / 100 })), p_expected_revision: workspace.revision, p_reason: reason.trim() });
  if (error) throw new Error(error.message);
  return normalizeMealWorkspace(data);
}
export async function saveLiveMealGroups(workspace: MealPricingWorkspace, plan: LivePlan, groups: LivePlan['groups'], reason: string) {
  const { data, error } = await db.rpc('save_meal_plan_groups', { p_plan_id: plan.id, p_groups: groups, p_expected_revision: workspace.revision, p_reason: reason.trim() });
  if (error) throw new Error(error.message);
  return normalizeMealWorkspace(data);
}
export const workspaceCatalogue = (w: MealPricingWorkspace): MealCatalogueItem[] => w.meals.map(m => ({ id: m.id, title: m.title, mealType: m.meal_type, variant: m.variant, pricePaise: parseRupeesToPaise(String(m.price)), isActive: m.is_active, revision: m.updated_at }));
export const workspacePlans = (w: MealPricingWorkspace): MealChoicePlan[] => w.plans.map(p => ({ code: p.plan_code, groups: p.groups.map(g => ({ id: g.id, label: g.label, mealIds: g.meal_ids })) }));

export async function setLiveMealPlanActive(workspace: MealPricingWorkspace, plan: LivePlan, active: boolean, reason: string) {
  const { data, error } = await db.rpc('set_meal_plan_active', { p_plan_id: plan.id, p_is_active: active, p_expected_revision: workspace.revision, p_reason: reason.trim() });
  if (error) throw new Error(error.message);
  return normalizeMealWorkspace(data);
}

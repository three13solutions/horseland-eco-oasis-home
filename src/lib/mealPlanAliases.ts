/** Admin metadata only: aliases do not create plans or change pricing. */
export const parseMealPlanAliases = (value: string): string[] => {
  const seen = new Set<string>();
  return value.split(/[,\n]/).map(alias => alias.trim()).filter(alias => {
    const key = alias.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const mealPlanAliasPayload = (names: string, codes: string) => ({
  alias_names: parseMealPlanAliases(names),
  alias_codes: parseMealPlanAliases(codes),
});

export const findMealPlanAliasConflict = (
  aliases: string[],
  otherPlans: { plan_code: string; plan_name: string; alias_names?: string[]; alias_codes?: string[] }[],
): string | undefined => aliases.find(alias => otherPlans.some(plan =>
  [plan.plan_code, plan.plan_name, ...(plan.alias_names || []), ...(plan.alias_codes || [])]
    .some(value => value.trim().toLowerCase() === alias.toLowerCase()),
));

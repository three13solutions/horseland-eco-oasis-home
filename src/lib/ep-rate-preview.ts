/** Offline draft only. Not connected to bookings, Supabase or the existing quote engine.
 * All money values are integer paise. Meal totals are supplied explicitly by the
 * approved, effective-date/guest-policy resolver; this module does not guess them.
 */
export const PLAN_CODES = ['RO', 'BB', 'HB', 'FB'] as const;
export type PlanCode = typeof PLAN_CODES[number];
export type MoneyByPlan = Record<PlanCode, number>;
export interface ManualPlanOverride {
  amountPaise: number;
  reason: string;
  actorId: string;
}
export interface EpNightInput {
  basis: 'EP';
  epPaise: number;
  minimumEpPaise: number;
  mealTotalsPaise: MoneyByPlan;
  overrides?: Partial<Record<Exclude<PlanCode, 'RO'>, ManualPlanOverride>>;
}
function money(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be non-negative integer paise.`);
  return value;
}
export function previewEpNight(input: EpNightInput) {
  if (input.basis !== 'EP') throw new Error('Only an explicitly supplied EP base is accepted. Legacy AP prices must not be relabelled or converted.');
  money(input.epPaise, 'EP');
  money(input.minimumEpPaise, 'Minimum EP');
  if (input.epPaise < input.minimumEpPaise) throw new Error('EP is below the configured minimum.');
  if (input.mealTotalsPaise.RO !== 0) throw new Error('EP must not include a meal supplement.');
  for (const code of Object.keys(input.overrides ?? {})) {
    if (!['BB', 'HB', 'FB'].includes(code)) throw new Error('Overrides may target CP, MAP or AP only. Edit the EP base directly.');
  }
  const rows = PLAN_CODES.map(code => {
    const automaticPaise = money(input.epPaise + money(input.mealTotalsPaise[code], `${code} meals`), `${code} automatic total`);
    const override = code === 'RO' ? undefined : input.overrides?.[code];
    if (override && (!override.reason?.trim() || !override.actorId?.trim())) throw new Error('A manual override requires an actor and a reason. Server-side role authorization is also required before saving.');
    const amountPaise = override ? money(override.amountPaise, `${code} override`) : automaticPaise;
    if (amountPaise < input.minimumEpPaise) throw new Error(`${code} is below the configured minimum.`);
    return { code, amountPaise, automaticPaise, mode: override ? 'manual' as const : 'automatic' as const };
  });
  const warnings: string[] = [];
  if (rows.some((row, i) => i > 0 && row.amountPaise < rows[i - 1].amountPaise)) warnings.push('Meal-plan prices are out of EP / CP / MAP / AP order. Review before saving.');
  if (rows.some(row => row.mode === 'manual')) warnings.push('Manual prices stay fixed when the EP base changes. Reset to automatic to resume linked pricing.');
  return { rows, warnings };
}
/** Removing an override restores derivation without modifying the base or meals. */
export function resetPlanToAutomatic(input: EpNightInput, code: Exclude<PlanCode, 'RO'>): EpNightInput {
  const overrides = { ...input.overrides };
  delete overrides[code];
  return { ...input, overrides };
}

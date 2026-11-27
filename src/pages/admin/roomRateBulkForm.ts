import { rateFields, type BulkRules, type RateField, type RateInputs, type RateReview } from '../../lib/room-rate-management';

// Per rule group, which of EP room / Extra adult / Extra child the admin explicitly chose to change.
export type FieldPicks = Record<RateField, boolean>;
export type GroupPicks = Record<string, FieldPicks>;
export const noPicks = (): FieldPicks => ({ ep: false, adult: false, child: false });
export const dayGroup = (day: number) => `day${day}`;

// Unchecked fields are sent blank (unchanged) while their typed values stay in form state.
export function pickInputs(inputs: RateInputs | undefined, picks: FieldPicks | undefined): RateInputs {
  const out = { ep: '', adult: '', child: '' };
  for (const key of rateFields) if (picks?.[key]) out[key] = inputs?.[key] ?? '';
  return out;
}
export function applyPicks(rules: BulkRules, picks: GroupPicks): BulkRules {
  const days: Record<number, RateInputs> = {};
  for (let day = 0; day < 7; day++) days[day] = pickInputs(rules.days[day], picks[dayGroup(day)]);
  return { mode: rules.mode, same: pickInputs(rules.same, picks.same), weekdays: pickInputs(rules.weekdays, picks.weekdays), weekends: pickInputs(rules.weekends, picks.weekends), days };
}
// Groups relevant to the active mode; only these count toward the preview.
export function activeGroups(mode: BulkRules['mode']): string[] {
  return mode === 'same' ? ['same'] : mode === 'week' ? ['weekdays', 'weekends'] : [0, 1, 2, 3, 4, 5, 6].map(dayGroup);
}
// Identity of the submitted form; any change invalidates a prepared preview.
export function bulkFormKey(input: { typeIds: string[]; dates: string[]; rules: BulkRules; picks: GroupPicks }): string {
  const effective = applyPicks(input.rules, input.picks);
  const groups = activeGroups(input.rules.mode).map(group => {
    if (group === 'same') return effective.same;
    if (group === 'weekdays') return effective.weekdays;
    if (group === 'weekends') return effective.weekends;
    return effective.days[Number(group.slice(3))];
  });
  return JSON.stringify({ t: [...input.typeIds].sort(), d: [...input.dates].sort(), m: input.rules.mode, g: groups });
}
export function bulkSummary(rows: RateReview[]) {
  const dates = new Set(rows.map(row => row.before.date));
  const rooms = new Set(rows.map(row => row.before.type_id));
  const fields = rows.reduce((sum, row) => sum + rateFields.filter(key => row.change[key] !== undefined).length, 0);
  return { dates: dates.size, rooms: rooms.size, fields };
}

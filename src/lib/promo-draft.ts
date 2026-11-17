/** Planning only: these values never activate a promotion or alter a booking. */
export interface PromoDraft {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: string;
  bookingFrom: string;
  bookingTo: string;
  stayFrom: string;
  stayTo: string;
  limit: string;
  oncePerGuest: boolean;
}
export function validPromoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validatePromoDraft(draft: PromoDraft, others: PromoDraft[]): string[] {
  const errors: string[] = [];
  if (!/^[A-Z0-9_-]{3,30}$/.test(draft.code)) errors.push('Use 3–30 letters, numbers, underscores or hyphens for the code.');
  if (others.some(p => p.id !== draft.id && p.code.toUpperCase() === draft.code.toUpperCase())) errors.push('That code already exists in this draft list.');
  const value = Number(draft.value);
  if (!/^\d+(\.\d{1,2})?$/.test(draft.value) || !Number.isFinite(value) || value <= 0 || value > 1000000000) errors.push('Enter a positive discount with at most two decimal places (maximum ₹1 billion).');
  if (draft.type === 'percentage' && value > 100) errors.push('Percentage discount cannot exceed 100%.');
  for (const [name, start, end] of [['Booking', draft.bookingFrom, draft.bookingTo], ['Stay', draft.stayFrom, draft.stayTo]]) {
    if (!validPromoDate(start) || !validPromoDate(end)) errors.push(`${name} dates are required and must be valid.`);
    else if (end < start) errors.push(`${name} end date must not precede its start date.`);
  }
  if (!/^\d+$/.test(draft.limit) || !Number.isSafeInteger(Number(draft.limit)) || Number(draft.limit) < 1) errors.push('Enter a positive whole-number usage limit.');
  return errors;
}
export function previewPromo(draft: PromoDraft, amount: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 || Number(amount) > 1000000000 || validatePromoDraft(draft, []).length) return null;
  const originalPaise = Math.round(Number(amount) * 100);
  const discountPaise = Math.min(originalPaise, draft.type === 'percentage' ? Math.round(originalPaise * Number(draft.value) / 100) : Math.round(Number(draft.value) * 100));
  return { originalPaise, discountPaise, totalPaise: originalPaise - discountPaise };
}

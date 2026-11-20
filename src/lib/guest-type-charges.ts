export type GuestTypeCharge = { mode: 'fixed'; amount: number } | { mode: 'same_as_adult' };
export type GuestTypeCharges = Record<string, GuestTypeCharge>;

export function guestTypeChargeAmount(rule: GuestTypeCharge | undefined, entered: string, adult: string): string {
  return rule?.mode === 'same_as_adult' ? adult : entered;
}

export function validateGuestTypeCharges(charges: GuestTypeCharges): string | null {
  for (const [key, rule] of Object.entries(charges)) {
    if (!/^[a-z][a-z0-9_]*$/.test(key) || !rule || !['fixed', 'same_as_adult'].includes(rule.mode)) return 'Choose a valid guest type charge.';
    if (rule.mode === 'same_as_adult') {
      if (key === 'adult') return 'Adult charge cannot refer to itself.';
    } else if (!Number.isFinite(rule.amount) || rule.amount < 0 || Math.abs(rule.amount * 100 - Math.round(rule.amount * 100)) > 0.000001) {
      return 'Enter a non-negative charge with up to two decimal places.';
    }
  }
  return null;
}
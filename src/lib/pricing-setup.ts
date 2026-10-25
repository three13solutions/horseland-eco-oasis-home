/** Activation must not interpret a missing extra-person rate as free. */
export function validateSetupExtraRates(
  status: string | undefined,
  active: boolean,
  verified: boolean,
  extraAdult: string,
  extraChild: string,
): void {
  if ((status === 'configuration_required' || status === 'ready') && active && verified &&
      (!extraAdult.trim() || !extraChild.trim())) {
    throw new Error('Enter both adult and child extra-person accommodation rates before enabling this verified rate. Enter 0 explicitly if free, or save a disabled draft.');
  }
}

export type PricingCleanupPreview = {
  type_id: string;
  name: string;
  unit_count: number;
  counts: Record<string, number>;
  base_price: number | null;
  fingerprint: string;
};

export function canConfirmPricingCleanup(preview: PricingCleanupPreview | undefined, name: string, acknowledged: boolean): boolean {
  return !!preview && !!preview.type_id && !!preview.name && !!preview.fingerprint &&
    Number.isInteger(preview.unit_count) && preview.unit_count >= 0 && preview.unit_count <= 1 &&
    name === preview.name && acknowledged;
}

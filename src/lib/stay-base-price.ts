/** Display only the saved Room Only (EP) base price; dated stays still use canonical quotes. */
export function savedRoomOnlyBasePrice(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/** The saved Room Only (EP) base price is configured for 2 people for one night. */
export const BASE_PRICE_COVERED_PEOPLE = 2;

/**
 * The saved base price already covers two people for one night, so it is shown
 * whole: dividing it per guest would quote a rate nobody ever configured.
 */
export function basePriceForTwoPeople(value: number | null | undefined): number | null {
  return savedRoomOnlyBasePrice(value);
}

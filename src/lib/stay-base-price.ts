/** Display only the saved Room Only (EP) base price; dated stays still use canonical quotes. */
export function savedRoomOnlyBasePrice(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

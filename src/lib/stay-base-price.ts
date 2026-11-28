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

export type SavedEpAnchor = {
  id: string;
  room_type_id: string | null;
  room_unit_id: string | null;
  amount: number;
  quoted_nights: number;
  included_adults: number;
  source_meal_plan_code: string;
  source_override_id: string | null;
  is_active: boolean;
  verified_basis: boolean;
  start_date: string | null;
  end_date: string | null;
  min_nights: number;
  max_nights: number | null;
  day_type: string;
  priority: number;
  updated_at: string;
};

/** Undated display uses the current saved weekday EP anchor, not legacy room_types.base_price.
 * This is a base-price label, not an availability or selected-date quote.
 */
export function savedStayEpPrice(anchors: SavedEpAnchor[], roomTypeId: string, today: string): number | null {
  const eligible = anchors.filter(anchor =>
    anchor.room_type_id === roomTypeId && anchor.room_unit_id === null &&
    anchor.is_active && anchor.verified_basis && anchor.source_override_id === null &&
    ['RO', 'EP'].includes(anchor.source_meal_plan_code.toUpperCase()) &&
    anchor.included_adults === 2 && anchor.quoted_nights === 1 &&
    anchor.min_nights <= 1 && (anchor.max_nights === null || anchor.max_nights >= 1) &&
    (anchor.start_date === null || anchor.start_date <= today) &&
    (anchor.end_date === null || anchor.end_date >= today) &&
    ['weekday', 'all'].includes(anchor.day_type)
  ).sort((a, b) => b.priority - a.priority || b.min_nights - a.min_nights ||
    Number(a.day_type === 'all') - Number(b.day_type === 'all') ||
    b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id));
  return savedRoomOnlyBasePrice(eligible[0]?.amount);
}

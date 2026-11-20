import type { GuestTypeCharges } from './guest-type-charges';
export interface GuestPricingRecord {
  id: string; name?: string; reason?: string; is_active?: boolean;
  room_category_id?: string | null; room_type_id?: string | null; room_unit_id?: string | null;
  start_date?: string | null; end_date?: string | null; min_nights?: number | null; max_nights?: number | null; day_type?: string | null;
  guest_type_charges?: GuestTypeCharges; extra_adult_per_night?: number | null; extra_child_per_night?: number | null; extra_infant_per_night?: number | null;
  extra_adult_charge?: number | null; extra_child_charge?: number | null; extra_infant_charge?: number | null;
  occupancy_type?: string | null; guest_type_key?: string | null; guest_charge_mode?: string; adjustment_value?: number | null;
}
export interface LinkedGuestPrice { id: string; name: string; charge: string; scope: string; dates: string; mode: string; amount: number | null; enabled: boolean; href: string }
export function linkedAccommodationPrices(key: string, anchors: GuestPricingRecord[], compositions: GuestPricingRecord[], overrides: GuestPricingRecord[], names: Record<string,string>): LinkedGuestPrice[] {
  const result: LinkedGuestPrice[] = [];
  const scope = (r: GuestPricingRecord) => r.room_unit_id ? `Unit ${names[r.room_unit_id] ?? r.room_unit_id}` : r.room_type_id ? `Room type: ${names[r.room_type_id] ?? r.room_type_id}` : r.room_category_id ? `Category: ${names[r.room_category_id] ?? r.room_category_id}` : 'All rooms';
  const add = (r: GuestPricingRecord, source: string, mode: string, amount: number | null, href: string) => result.push({ id: `${source}:${r.id}`, name: r.name ?? r.reason ?? source, charge: 'Accommodation', scope: scope(r), dates: `${r.start_date ?? 'Any date'} → ${r.end_date ?? 'Any date'} · ${r.day_type ?? 'all days'} · ${r.min_nights ?? 1}–${r.max_nights ?? 'any'} nights`, mode, amount, enabled: r.is_active === true, href });
  for (const [source, records, suffix, href] of [['Rate Plan', anchors, 'per_night', '/admin/pricing/rate-plans?anchor_id='], ['Guest Composition', compositions, 'charge', '/admin/pricing/rules?rule_id=']] as const) {
    for (const r of records) {
      const rule = r.guest_type_charges?.[key];
      const adult = suffix === 'per_night' ? r.extra_adult_per_night : r.extra_adult_charge;
      const legacy = key === 'adult' ? adult : key === 'child' ? (suffix === 'per_night' ? r.extra_child_per_night : r.extra_child_charge) : key === 'infant' ? (suffix === 'per_night' ? r.extra_infant_per_night : r.extra_infant_charge) : undefined;
      if (!rule && legacy === undefined) continue;
      add(r, source, rule?.mode ?? 'fixed', rule?.mode === 'same_as_adult' ? adult ?? null : rule?.mode === 'fixed' ? rule.amount : legacy ?? null, href + encodeURIComponent(r.id));
    }
  }
  for (const r of overrides) {
    const overrideKey = r.guest_type_key ?? (r.occupancy_type?.startsWith('extra_') ? r.occupancy_type.slice(6) : null);
    if (overrideKey === key) add(r, 'Rate Override', r.guest_charge_mode ?? 'fixed', r.adjustment_value ?? null, `/admin/pricing/overrides?override_id=${encodeURIComponent(r.id)}`);
  }
  return result;
}
import { useState } from 'react';
import GuestSelector from '@/components/GuestSelector';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, Info, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { appliedOverrideIds, stayDateRange, promoMatchesLiveRate, couponPreviewUnavailable, matchesRoomPublicationFilter, DEFAULT_ROOM_PUBLICATION_FILTER, type RoomPublicationFilter, type NightlyRateDetail } from '@/lib/live-rate-details';

interface RateVariant {
  meal_plan_code: string;
  meal_plan_name: string;
  cancellation_policy_code: string;
  cancellation_policy_name: string;
  room_rate: number;
  meal_cost: number;
  policy_adjustment: number;
  total_price: number;
  price_per_night: number;
  quote_fingerprint?: string;
  nightly_breakdown?: NightlyRateDetail[];
  applied_rules?: Record<string, unknown>[];
  pricing_message?: string;
  promotion?: { code: string; discount_amount: number };
  couponError?: string;
  original_variant?: RateVariant;
  guest_age_policy?: { revision: number };
}
interface RoomType {
  id: string;
  name: string;
  is_published: boolean;
  room_categories: { name: string; is_active: boolean } | null;
}
interface OverridePolicy {
  id: string; reason: string | null; start_date: string; end_date: string;
  override_price: number | null; adjustment_type: string | null; adjustment_value: number | null;
  min_nights: number | null; max_nights: number | null; meal_plan_code: string | null;
  day_type: string | null;
}
interface Offer { code: string; label: string; stay_from: string | null; stay_to: string | null }
const money = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const MEAL_PLAN_ALT_CODES: Record<string, string> = { RO: 'EP', BB: 'CP', HB: 'MAP', FB: 'AP' };
const mealPlanCodeLabel = (code: string) => MEAL_PLAN_ALT_CODES[code] ? `${code} · ${MEAL_PLAN_ALT_CODES[code]}` : code;

function RateBreakdown({ variant, policies, nights, roomTypeId }: { variant: RateVariant; policies: OverridePolicy[]; nights: number; roomTypeId: string }) {
  const nightly = variant.nightly_breakdown ?? [];
  const ids = appliedOverrideIds(nightly);
  const rules = [...(variant.applied_rules ?? []), ...nightly.flatMap(n => n.dynamic_rules ?? [])];
  const overrideRules = rules.filter(r => String(r.type ?? r.rule_type ?? '').includes('override'));
  const usedPolicies = policies.filter(p => ids.includes(p.id));
  return <div className="space-y-3">
    <div><h3 className="font-semibold">Rate Calculation Breakdown</h3><p className="text-xs text-muted-foreground">{variant.meal_plan_name} · {variant.cancellation_policy_name}</p></div>
    {nightly.map(n => <div key={n.date} className="flex justify-between gap-3 text-sm"><span>{format(new Date(`${n.date}T12:00:00`), 'dd MMM yyyy')}</span><span>{typeof n.room_only === 'number' ? money(n.room_only) : '—'}</span></div>)}
    {usedPolicies.map(p => <Popover key={p.id}><PopoverTrigger asChild><Button variant="outline" size="sm" className="w-full justify-between gap-2 h-auto py-2 whitespace-normal"><span>Override: {p.reason || 'Manual override'}</span><ExternalLink className="h-3 w-3 shrink-0" /></Button></PopoverTrigger><PopoverContent className="w-80 space-y-2" side="right">
      <h4 className="font-semibold">{p.reason || 'Manual override'}</h4>
      <p className="text-sm">{p.start_date} – {p.end_date}</p>
      <p className="text-sm">{p.override_price !== null ? `Fixed rate: ${money(p.override_price)}` : `Adjustment: ${p.adjustment_value ?? 0}${p.adjustment_type === 'percentage' ? '%' : ' INR'}`}</p>
      <p className="text-xs text-muted-foreground">Stay: {p.min_nights ?? 1}–{p.max_nights ?? 'any'} nights · {p.day_type || 'All days'} · {p.meal_plan_code || 'All meal plans'}</p>
      <Button asChild variant="link" size="sm"><Link to={`/admin/pricing/overrides?override_id=${encodeURIComponent(p.id)}`}>Open override policy <ExternalLink className="ml-2 h-3 w-3" /></Link></Button>
    </PopoverContent></Popover>)}
    {ids.filter(id => !usedPolicies.some(p => p.id === id)).map(id => <p key={id} className="text-xs">Applied override: {id} · policy details unavailable</p>)}
    {overrideRules.map((r, i) => <div key={i} className="text-xs border-l-2 border-primary pl-2"><span className="font-medium">Applied override</span>: {String(r.reason ?? r.rule ?? 'Manual rate adjustment')}{typeof r.adjustment === 'number' && ` (${money(r.adjustment)})`}<Button asChild variant="link" size="sm"><Link to="/admin/pricing/overrides">View policies</Link></Button></div>)}
    {nightly.some(n => n.anchor_id) && <Button asChild variant="link" size="sm" className="h-auto p-0"><Link to={`/admin/pricing/rate-plans?room_type_id=${encodeURIComponent(roomTypeId)}`}>View rate plan <ExternalLink className="ml-2 h-3 w-3" /></Link></Button>}
    {rules.filter(r => !String(r.type ?? r.rule_type ?? '').includes('override')).map((r, i) => <p key={i} className="text-xs text-muted-foreground">{String(r.reason ?? r.rule ?? r.type ?? 'Rate adjustment')}{typeof r.adjustment === 'number' && `: ${money(r.adjustment)}`}</p>)}
    {nightly.filter(n => (n.length_of_stay_discount ?? 0) > 0).map(n => <p key={`discount-${n.date}`} className="text-xs">Stay discount ({n.date}): −{money(n.length_of_stay_discount ?? 0)}</p>)}
    <dl className="space-y-1 border-t pt-2 text-sm">
      <div className="flex justify-between"><dt>Accommodation</dt><dd>{money(variant.original_variant?.room_rate ?? variant.room_rate)}</dd></div>
      <div className="flex justify-between"><dt>Meals</dt><dd>{money(variant.meal_cost)}</dd></div>
      <div className="flex justify-between"><dt>Cancellation policy adjustment</dt><dd>{money(variant.policy_adjustment)}</dd></div>
      {variant.promotion && <div className="flex justify-between text-primary"><dt>Promo code · {variant.promotion.code}</dt><dd>−{money(variant.promotion.discount_amount)}</dd></div>}
      {variant.couponError && <p className="text-xs text-destructive">Promo code not applied: {variant.couponError}</p>}
      <div className="flex justify-between font-semibold"><dt>{nights}-night total</dt><dd>{money(variant.total_price)}</dd></div>
      <div className="flex justify-between"><dt>Average / night</dt><dd>{money(variant.price_per_night)}</dd></div>
    </dl>
    {variant.pricing_message && <p className="text-xs text-muted-foreground">{variant.pricing_message}</p>}
  </div>;
}

export default function LiveRateCard() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [stayNights, setStayNights] = useState(1);
  const [coupon, setCoupon] = useState('');
  const [guests, setGuests] = useState({ adults: 2, children: 0, infants: 0 });
  const [publicationFilter, setPublicationFilter] = useState<RoomPublicationFilter>(DEFAULT_ROOM_PUBLICATION_FILTER);
  const [policyFilter, setPolicyFilter] = useState('');
  const { checkOut } = stayDateRange(selectedDate, stayNights);
  const checkInDate = format(selectedDate, 'yyyy-MM-dd');
  const checkOutDate = format(checkOut, 'yyyy-MM-dd');
  const { data: roomTypes = [], error: roomError } = useQuery<RoomType[]>({
    queryKey: ['live-rate-card-room-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('room_types').select('id, name, is_published, room_categories(name, is_active), room_units!inner(id)').order('name');
      if (error) throw error;
      return (data ?? []) as unknown as RoomType[];
    },
  });
  const { data: policies = [] } = useQuery({
    queryKey: ['live-rate-card-overrides', checkInDate, checkOutDate],
    queryFn: async () => {
      const { data, error } = await supabase.from('tactical_overrides').select('id, reason, start_date, end_date, override_price, adjustment_type, adjustment_value, min_nights, max_nights, meal_plan_code, day_type').lte('start_date', format(new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate() - 1), 'yyyy-MM-dd')).gte('end_date', checkInDate);
      if (error) throw error;
      return (data ?? []) as OverridePolicy[];
    },
  });
  const { data: offers = [], error: offersError } = useQuery<Offer[]>({
    queryKey: ['live-rate-card-offers'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-razorpay-order-v3', { body: { action: 'promotions' } });
      if (error || !Array.isArray(data?.offers)) throw new Error('Promo codes could not be loaded.');
      return data.offers;
    },
  });
  const availableOffers = offers.filter(o => (!o.stay_from || checkOutDate > o.stay_from) && (!o.stay_to || checkInDate <= o.stay_to));
  const visibleRoomTypes = roomTypes.filter(room => matchesRoomPublicationFilter(room, publicationFilter));
  const ratesQuery = useQuery({
    queryKey: ['live-rate-card-variants', checkInDate, checkOutDate, coupon, guests.adults, guests.children, guests.infants, visibleRoomTypes.map(r => r.id)],
    enabled: visibleRoomTypes.length > 0,
    queryFn: async () => Promise.all(visibleRoomTypes.map(async room => {
      const { data, error } = await supabase.rpc('calculate_rate_variants_v2', { p_room_type_id: room.id, p_check_in: checkInDate, p_check_out: checkOutDate, p_adults_count: guests.adults, p_children_count: guests.children, p_infants_count: guests.infants, p_booking_channel: 'direct' });
      if (error) throw error;
      const baseVariants = (Array.isArray(data) ? data : []) as unknown as RateVariant[];
      let websiteVariants: RateVariant[] = [];
      let eligibilityError = '';
      if (coupon && room.is_published && room.room_categories?.is_active !== false) {
        try {
          const { data: websiteData, error: websiteError } = await supabase.rpc('calculate_website_rate_variants', { p_room_type_id: room.id, p_room_unit_id: null, p_check_in: checkInDate, p_check_out: checkOutDate, p_adults_count: guests.adults, p_children_count: guests.children, p_infants_count: guests.infants, p_booking_channel: 'direct' });
          if (websiteError) eligibilityError = 'Website meal availability could not be verified. Rates remain unchanged.';
          else websiteVariants = (Array.isArray(websiteData) ? websiteData : []) as unknown as RateVariant[];
        } catch {
          eligibilityError = 'Website meal availability could not be verified. Rates remain unchanged.';
        }
      }
      const variants = !coupon ? baseVariants : await Promise.all(baseVariants.map(async base => {
        const unavailable = eligibilityError || couponPreviewUnavailable(room, base, websiteVariants);
        if (unavailable) return { ...base, couponError: unavailable };
        try {
        const { data: result, error: quoteError } = await supabase.functions.invoke('create-razorpay-order-v3', { body: { action: 'promo', promo_code: coupon, quote_request: { room_type_id: room.id, room_unit_id: null, check_in: checkInDate, check_out: checkOutDate, adults_count: guests.adults, children_count: guests.children, infants_count: guests.infants, meal_plan_code: base.meal_plan_code, cancellation_policy_code: base.cancellation_policy_code, ...(base.guest_age_policy ? { guest_age_policy_revision: base.guest_age_policy.revision } : {}), addons: [] } } });
        const quote = result?.quote;
        if (quoteError || !result?.valid || !promoMatchesLiveRate(quote, coupon, base.quote_fingerprint)) {
          return { ...base, couponError: result?.error || 'Unavailable for this rate, or the price changed. Refresh to check again.' };
        }
        return { ...quote.variant, promotion: quote.promotion, original_variant: quote.original_variant } as RateVariant;
        } catch {
          return { ...base, couponError: 'Promo code preview unavailable. The original rate has been retained.' };
        }
      }));
      return { room, variants };
    })),
  });
  const rates = (ratesQuery.data ?? []).filter(({ room }) => matchesRoomPublicationFilter(room, publicationFilter));
  const summaryRates = rates.flatMap(r => {
    const v = r.variants.find(v => v.meal_plan_code === 'RO' && v.cancellation_policy_code === 'refundable_credit') ?? r.variants.find(v => v.meal_plan_code === 'RO');
    return v ? [{ room: r.room, variant: v }] : [];
  });
  const average = summaryRates.length ? summaryRates.reduce((s, r) => s + r.variant.price_per_night, 0) / summaryRates.length : null;
  const sorted = [...summaryRates].sort((a, b) => a.variant.price_per_night - b.variant.price_per_night);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  const policyOptions: { code: string; name: string }[] = [];
  for (const r of rates) for (const v of r.variants) {
    if (!policyOptions.some(p => p.code === v.cancellation_policy_code)) policyOptions.push({ code: v.cancellation_policy_code, name: v.cancellation_policy_name });
  }
  const selectedPolicy = policyOptions.find(p => p.code === policyFilter)?.code ?? policyOptions.find(p => p.code === 'refundable_credit')?.code ?? policyOptions[0]?.code ?? '';
  const mealPlanColumns: { code: string; name: string }[] = [];
  for (const r of rates) for (const v of r.variants) {
    if (v.cancellation_policy_code === selectedPolicy && v.meal_plan_code !== 'RO' && !mealPlanColumns.some(m => m.code === v.meal_plan_code)) mealPlanColumns.push({ code: v.meal_plan_code, name: v.meal_plan_name });
  }
  const stayDiscountCount = rates.filter(r => r.variants.some(v => v.nightly_breakdown?.some(n => (n.length_of_stay_discount ?? 0) > 0))).length;
  const appliedCount = rates.reduce((s, r) => s + r.variants.filter(v => v.promotion).length, 0);
  return <div className="p-4 md:p-6 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Live Rate Card</h1><p className="text-muted-foreground mt-2">{guests.adults} {guests.adults === 1 ? 'adult' : 'adults'}{guests.children ? ` · ${guests.children} ${guests.children === 1 ? 'child' : 'children'}` : ''}{guests.infants ? ` · ${guests.infants} below 4` : ''} · Direct website · Rates before tax</p></div><Button variant="outline" disabled={ratesQuery.isFetching} onClick={() => { void queryClient.invalidateQueries({ queryKey: ['live-rate-card-room-types'] }); void queryClient.invalidateQueries({ queryKey: ['live-rate-card-variants'] }); void queryClient.invalidateQueries({ queryKey: ['live-rate-card-offers'] }); void queryClient.invalidateQueries({ queryKey: ['live-rate-card-overrides'] }); }}><RefreshCw className={cn('h-4 w-4 mr-2', ratesQuery.isFetching && 'animate-spin')} />Refresh</Button></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[{ title: 'Average Rate', value: average, note: 'Room Only · per night' }, { title: 'Lowest Rate', value: lowest?.variant.price_per_night, note: lowest?.room.name }, { title: 'Highest Rate', value: highest?.variant.price_per_night, note: highest?.room.name }].map(s => <Card key={s.title}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{s.value == null ? '—' : money(s.value)}</p><p className="text-xs text-muted-foreground mt-1">{s.note || 'Room Only · per night'}</p></CardContent></Card>)}
    </div>
    <section className="space-y-4">
      <div className="flex flex-wrap justify-between items-end gap-4"><div><h2 className="text-lg font-semibold">{publicationFilter === 'all' ? 'All Room Types' : publicationFilter === 'published' ? 'Published Room Types' : 'Unpublished Room Types'} — Live Rates</h2><p className="text-sm text-muted-foreground">{format(selectedDate, 'dd MMM yyyy')} – {format(checkOut, 'dd MMM yyyy')} · {stayNights} {stayNights === 1 ? 'night' : 'nights'}</p></div><div className="flex flex-wrap items-end gap-3"><div className="space-y-1"><label htmlFor="room-publication-filter" className="text-sm">Room status</label><Select value={publicationFilter} onValueChange={value => { if (value === 'all' || value === 'published' || value === 'unpublished') setPublicationFilter(value); }}><SelectTrigger id="room-publication-filter" aria-label="Room status" className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="unpublished">Unpublished</SelectItem></SelectContent></Select></div><div className="space-y-1"><label htmlFor="live-rate-cancellation-policy" className="text-sm">Cancellation Policy</label><Select value={selectedPolicy} onValueChange={setPolicyFilter}><SelectTrigger id="live-rate-cancellation-policy" aria-label="Cancellation Policy" className="w-48"><SelectValue /></SelectTrigger><SelectContent>{policyOptions.map(p => <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><label htmlFor="live-rate-promo-code" className="text-sm">Promo Codes</label><Select value={coupon || 'no-promo-codes'} onValueChange={value => setCoupon(value === 'no-promo-codes' ? '' : value)}><SelectTrigger id="live-rate-promo-code" aria-label="Promo Codes" className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no-promo-codes">No Promo Codes</SelectItem>{availableOffers.map(offer => <SelectItem key={offer.code} value={offer.code}>{offer.code}</SelectItem>)}{coupon && !availableOffers.some(offer => offer.code === coupon) && <SelectItem value={coupon} disabled>{coupon} · Unavailable</SelectItem>}</SelectContent></Select></div><div className="space-y-1"><span className="text-sm block">Guests</span><GuestSelector totalGuests={guests.adults + guests.children} adultsCount={guests.adults} childrenCount={guests.children} infantsCount={guests.infants} onGuestsChange={(_t, adults, children, infants) => setGuests({ adults, children, infants: infants ?? 0 })} className="w-56" /></div><Popover><PopoverTrigger asChild><Button variant="outline"><Calendar className="mr-2 h-4 w-4" />{format(selectedDate, 'PPP')}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><CalendarComponent mode="single" selected={selectedDate} onSelect={date => date && setSelectedDate(date)} initialFocus /></PopoverContent></Popover><label className="text-sm space-y-1 block">Stay nights<Input aria-label="Stay nights" type="number" min="1" max="365" step="1" value={stayNights} onChange={e => setStayNights(Math.min(365, Math.max(1, Math.trunc(Number(e.target.value) || 1))))} className="w-24" /></label></div></div>
      {(coupon || offersError || stayDiscountCount > 0) && <div className="space-y-1">
        {(coupon || offersError) && <p role="status" className={cn('text-sm', coupon && !ratesQuery.isFetching && !appliedCount ? 'text-destructive' : 'text-muted-foreground')}>{ratesQuery.isFetching && coupon ? `Checking ${coupon}…` : coupon ? appliedCount ? `${coupon} applied to ${appliedCount} eligible rates. Other rates remain unchanged.` : `${coupon} was not applied to any rate for this stay.` : 'Promo codes could not be loaded.'}</p>}
        {stayDiscountCount > 0 && <p className="text-sm text-primary">Stay-length discounts applied to {stayDiscountCount} room types.</p>}
      </div>}
      {roomError || ratesQuery.error ? <p role="alert" className="text-destructive">Rates could not be loaded. Please refresh.</p> : ratesQuery.isPending && visibleRoomTypes.length ? <p className="text-muted-foreground py-8 text-center">Loading live rates…</p> : !rates.length ? <p className="text-muted-foreground py-8 text-center">No rates available for this filter.</p> : <div className="border rounded-md overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Room Type / Category</TableHead><TableHead className="text-right">Base / night</TableHead><TableHead className="text-right"><div>Room Only / night</div><div className="text-xs font-normal text-muted-foreground">{mealPlanCodeLabel('RO')}</div></TableHead>{mealPlanColumns.map(m => <TableHead key={m.code} className="text-right border-l whitespace-nowrap"><div>{m.name}</div><div className="text-xs font-normal text-muted-foreground">{mealPlanCodeLabel(m.code)}</div></TableHead>)}</TableRow></TableHeader><TableBody>{rates.map(({ room, variants }) => {
        const ro = variants.find(v => v.meal_plan_code === 'RO' && v.cancellation_policy_code === selectedPolicy) ?? variants.find(v => v.meal_plan_code === 'RO');
        return <TableRow key={room.id} className={cn(!room.is_published && "bg-destructive/5 hover:bg-destructive/10")}><TableCell className="min-w-48"><div className="font-medium">{room.name}</div><div className="text-xs text-muted-foreground">{room.room_categories?.name || 'Uncategorised'}</div>{room.room_categories?.is_active === false && <span className="text-xs text-muted-foreground">Inactive category</span>}</TableCell><TableCell className="text-right whitespace-nowrap text-muted-foreground">{ro ? money((ro.original_variant?.room_rate ?? ro.room_rate) / stayNights) : '—'}</TableCell><TableCell className="text-right whitespace-nowrap">{ro ? money(ro.price_per_night) : '—'}</TableCell>{mealPlanColumns.map(m => {
          const v = variants.find(v => v.meal_plan_code === m.code && v.cancellation_policy_code === selectedPolicy);
          return <TableCell key={m.code} className="text-right border-l">{v ? <Popover><PopoverTrigger asChild><Button variant="ghost" className="h-auto px-1 py-2 flex-col items-end gap-1" aria-label={`${room.name}, ${m.name}, ${v.cancellation_policy_name}: rate calculation breakdown`}><span className="font-semibold whitespace-nowrap">{money(v.price_per_night)} <Info className="h-3 w-3 inline text-muted-foreground" /></span><span className="text-xs text-muted-foreground whitespace-nowrap">{money(v.total_price)} total</span>{(appliedOverrideIds(v.nightly_breakdown ?? []).length > 0 || (v.nightly_breakdown ?? []).some(n => n.dynamic_rules?.some(r => String(r.type ?? '').includes('override')))) && <Badge variant="secondary">Override</Badge>}</Button></PopoverTrigger><PopoverContent className="w-96 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto" align="end"><RateBreakdown variant={v} policies={policies} nights={stayNights} roomTypeId={room.id} /></PopoverContent></Popover> : '—'}</TableCell>;
        })}</TableRow>;
      })}</TableBody></Table></div>}
    </section>
  </div>;
}

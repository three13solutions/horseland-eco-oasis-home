import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { linkedAccommodationPrices, type GuestPricingRecord, type LinkedGuestPrice } from '@/lib/guest-linked-pricing';
import { mealAgeAmount, type MealAgeRule } from '@/lib/meal-age-pricing';
import type { GuestAgeBand } from '@/lib/guest-age-policy';
const api = supabase as SupabaseClient;
async function rows(table: string) {
  const out: Record<string, any>[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await api.from(table).select('*').order('id').range(offset,offset+499);
    if (error) throw error;
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) return out;
  }
}
const price = (value: number | null) => value === null ? 'Not configured' : `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / person / night`;
export function GuestLinkedPricing({ band, staged }: { band: GuestAgeBand; staged: boolean }) {
  const query = useQuery({ queryKey: ['guest-linked-pricing'], staleTime: 0, queryFn: async () => {
    const [anchors, compositions, overrides, types, categories, units, mealPolicy, supplements] = await Promise.all([
      rows('rate_plan_anchors'), rows('guest_composition_rules'), rows('tactical_overrides'), rows('room_types'), rows('room_categories'), rows('room_units'),
      api.from('meal_age_pricing_versions').select('rules').order('revision',{ascending:false}).limit(1),
      api.from('meal_supplement_versions').select('plan_code,amount,effective_from,recorded_at').order('effective_from',{ascending:false}).order('recorded_at',{ascending:false}),
    ]);
    if (mealPolicy.error) throw mealPolicy.error;
    if (supplements.error) throw supplements.error;
    return { anchors: anchors as GuestPricingRecord[], compositions: compositions as GuestPricingRecord[], overrides: overrides as GuestPricingRecord[], names: Object.fromEntries([...types,...categories,...units].map(r=>[r.id,r.unit_number ?? r.name])), rules: (mealPolicy.data?.[0]?.rules ?? []) as MealAgeRule[], supplements: supplements.data ?? [] };
  }});
  if (query.isLoading) return <p className="py-3 text-sm">Loading linked prices…</p>;
  if (query.isError || !query.data) return <p role="alert" className="text-destructive text-sm">Linked prices could not be loaded. <Button size="sm" variant="outline" onClick={()=>query.refetch()}>Retry</Button></p>;
  const data = query.data;
  const links = linkedAccommodationPrices(band.key,data.anchors,data.compositions,data.overrides,data.names);
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  for (const rule of data.rules.filter(r=>r.band_key===band.key)) {
    const adult = data.supplements.find(r=>r.plan_code===rule.plan_code && r.effective_from<=today);
    const amount = rule.plan_code==='RO' || rule.mode==='free' ? 0 : rule.mode==='fixed' ? rule.value : adult ? mealAgeAmount(Number(adult.amount),rule,false) : null;
    links.push({ id:`meal:${rule.plan_code}`, name: `${({RO:'EP / RO',BB:'CP / BB',HB:'MAP / HB',FB:'AP / FB'})[rule.plan_code]} Meal Plan`, charge:'Meal', scope:'Shared meal plan', dates:`Current adult supplement · ${today}`, mode:rule.mode==='full'?'same_as_adult':rule.mode==='percentage'?`${rule.value}% of Adult`:rule.mode, amount, enabled:true, href:'/admin/pricing/meal-plans' } satisfies LinkedGuestPrice);
  }
  return <div className="py-3 space-y-3">
    <h3 className="text-sm font-semibold">Linked Pricing</h3>
    {(band.accommodation_rule==='free' || band.meal_rule==='free') && <p className="text-xs text-muted-foreground">Policy: {band.accommodation_rule==='free'?'No accommodation charge. ':''}{band.meal_rule==='free'?'No automatic meal charge.':''} Saved rates below are retained.</p>}
    <Table><TableHeader><TableRow><TableHead>Pricing Record</TableHead><TableHead>Charge</TableHead><TableHead>Applies To</TableHead><TableHead>Dates / Stay</TableHead><TableHead>Mapped Rate</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Edit</span></TableHead></TableRow></TableHeader><TableBody>
      {links.map(r=><TableRow key={r.id}><TableCell>{r.name}</TableCell><TableCell>{r.charge}</TableCell><TableCell>{r.scope}</TableCell><TableCell className="text-xs max-w-56 whitespace-normal">{r.dates}</TableCell><TableCell><p>{price(r.amount)}</p>{r.mode!=='fixed'&&<p className="text-xs text-muted-foreground">{r.mode==='same_as_adult'?'Same as Adult':r.mode}</p>}</TableCell><TableCell>{r.amount===null?'Missing configuration':!r.enabled?'Disabled':staged?'Staged':'Enabled'}</TableCell><TableCell><Button asChild variant="ghost" size="icon" aria-label={`Edit ${r.name}`}><Link to={r.href}><ExternalLink className="h-4 w-4" /></Link></Button></TableCell></TableRow>)}
      {!links.length&&<TableRow><TableCell colSpan={7} className="text-muted-foreground">No prices linked to this guest type yet.</TableCell></TableRow>}
    </TableBody></Table>
  </div>;
}
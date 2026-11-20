import { guestTypeName } from '@/lib/guest-age-policy';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mealAgeRuleError, type MealAgePolicy } from '@/lib/meal-age-pricing';
import { useGuestAgePolicy } from '@/hooks/useGuestAgePolicy';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { parseRupeesToPaise } from '@/lib/rate-calendar-draft';
import { calculateMealChoices, getMealPriceImpact, validateMealChoicePlan } from '@/lib/meal-choice-draft';
import type { MealCatalogueItem, MealChoicePlan, MealChoiceGuest } from '@/lib/meal-choice-draft';

const names = { RO: 'EP', BB: 'CP', HB: 'MAP', FB: 'AP' };
const money = (n: number) => (n / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
const selectClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
const group = (id: string, label: string) => ({ id, label, mealIds: [] as string[] });
const initialPlans = (): MealChoicePlan[] => [
  { code: 'RO', groups: [] },
  { code: 'BB', groups: [group('cp-breakfast', 'Breakfast')] },
  { code: 'HB', groups: [group('map-breakfast', 'Breakfast'), group('map-major', 'One major meal')] },
  { code: 'FB', groups: [group('ap-breakfast', 'Breakfast'), group('ap-lunch', 'Lunch'), group('ap-dinner', 'Dinner'), group('ap-tea', 'Evening tea & snacks')] },
];
const initialGuests = (): MealChoiceGuest[] => [
  { id: 'person-1', label: 'Person 1', kind: 'adult', choices: {} },
  { id: 'person-2', label: 'Person 2', kind: 'adult', choices: {} },
];

/** Read-only catalogue + session simulation. Never writes meals, plans, anchors or bookings. */
export default function MealChoiceDrafts() {
  const catalogueQuery = useQuery({
    queryKey: ['pricing-workspace-meal-catalogue'],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<MealCatalogueItem[]> => {
      const { data, error } = await supabase.from('meals')
        .select('id,title,meal_type,variant,price,is_active,updated_at').order('title');
      if (error) throw error;
      return (data ?? []).map(item => ({
        id: item.id, title: item.title, mealType: item.meal_type, variant: item.variant,
        pricePaise: parseRupeesToPaise(String(item.price)), isActive: item.is_active,
        revision: item.updated_at,
      }));
    },
  });
  const agePolicy = useGuestAgePolicy();
  const mealAgePolicy = useQuery({queryKey:['meal-age-pricing-policy'],queryFn:async()=>{
    const {data,error}=await (supabase as SupabaseClient).rpc('get_meal_age_pricing_policy');
    if(error)throw error;const policy=data as MealAgePolicy;
    if(!policy||mealAgeRuleError(policy.rules))throw new Error('Meal age pricing policy is invalid.');return policy;
  },staleTime:0,refetchOnWindowFocus:true});
  const [plans, setPlans] = useState(initialPlans);
  const [code, setCode] = useState<MealChoicePlan['code']>('HB');
  const [guests, setGuests] = useState(initialGuests);
  const [draftPrices, setDraftPrices] = useState<Record<string, { pricePaise: number; revision: string }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nextPrice, setNextPrice] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [editError, setEditError] = useState('');
  const [notice, setNotice] = useState('');
  const [ep, setEp] = useState('');
  const [clearOpen, setClearOpen] = useState(false);
  const catalogue = (catalogueQuery.data ?? []).map(item => ({ ...item, ...draftPrices[item.id] }));
  const plan = plans.find(item => item.code === code)!;
  const editing = catalogue.find(item => item.id === editingId);
  const linkedPlans = editing ? plans.filter(item => item.groups.some(g => g.mealIds.includes(editing.id))) : [];
  let quote: ReturnType<typeof calculateMealChoices> | undefined;
  let previewError = '';
  let combined: number | undefined;
  try {
    if (!agePolicy.data) throw new Error('Guest age policy must load before a meal preview can be calculated.');
    if (!mealAgePolicy.data || mealAgePolicy.isError || mealAgePolicy.isFetching) throw new Error('The current plan age-pricing policy must be verified before previewing.');
    if (plan.code !== 'RO' && mealAgePolicy.data.rules.some(r => r.plan_code === plan.code && guests.some(g => g.kind === r.band_key) && agePolicy.band(r.band_key)?.meal_rule !== 'free' && r.mode !== 'full')) throw new Error('This independent-choice simulation does not support custom plan age rates. Use Meal Plans Management for an age-rate preview; no misleading total is calculated here.');
    quote = calculateMealChoices(plan, catalogue, guests, agePolicy.data);
    if (ep.trim()) {
      combined = parseRupeesToPaise(ep) + quote.subtotalPaise;
      if (!Number.isSafeInteger(combined)) throw new Error('Combined total exceeds the supported amount.');
    }
  } catch (error) { previewError = (error as Error).message; }
  let impact: ReturnType<typeof getMealPriceImpact> = [];
  let priceError = '';
  let parsedPrice: number | undefined;
  if (editing && nextPrice.trim()) {
    try {
      parsedPrice = parseRupeesToPaise(nextPrice);
      const complete = linkedPlans.filter(p => { try { validateMealChoicePlan(p, catalogue); return true; } catch { return false; } });
      impact = getMealPriceImpact(complete, catalogue, editing.id, parsedPrice);
    } catch (error) { priceError = (error as Error).message; }
  }

  function updateGroups(groups: MealChoicePlan['groups']) {
    setPlans(previous => previous.map(p => p.code === code ? { ...p, groups } : p));
    // Invalid choices must be explicitly reselected, not silently mapped to another meal.
    setGuests(previous => previous.map(person => ({ ...person, choices: Object.fromEntries(
      Object.entries(person.choices).filter(([id, mealId]) => groups.some(g => g.id === id && g.mealIds.includes(mealId))),
    ) })));
    setNotice('');
  }
  function changePlan(value: MealChoicePlan['code']) {
    setCode(value);
    setGuests(previous => previous.map(person => ({ ...person, choices: {} })));
    setNotice('Plan changed. Please choose each person’s meals for this plan; previous plan selections have been cleared.');
  }
  function editSharedPrice(id: string) {
    const item = catalogue.find(meal => meal.id === id);
    if (!item) return;
    setEditingId(id); setNextPrice(String(item.pricePaise / 100)); setConfirmed(false); setEditError('');
  }
  function closePrice() { setEditingId(null); setConfirmed(false); setNextPrice(''); setEditError(''); }
  function applyPrice() {
    if (!editing || !confirmed || parsedPrice === undefined || priceError || parsedPrice === editing.pricePaise) return;
    try {
      const amount = parseRupeesToPaise(nextPrice);
      setDraftPrices(previous => ({ ...previous, [editing.id]: { pricePaise: amount, revision: `session-draft:${crypto.randomUUID()}` } }));
      setNotice(`Shared draft price for ${editing.title} changed. Every linked draft plan now uses it. Live Services prices and existing bookings are unchanged.`);
      closePrice();
    } catch (error) { setEditError((error as Error).message); }
  }
  function exportDraft() {
    const blob = new Blob([JSON.stringify({ status: 'DRAFT_NOT_APPROVED_NOT_LIVE', scope: 'ONE_NIGHT_MEAL_CHOICES',
      catalogueCapturedAt: catalogueQuery.dataUpdatedAt ? new Date(catalogueQuery.dataUpdatedAt).toISOString() : null,
      catalogue, sharedDraftPrices: draftPrices, plans, preview: { planCode: code, guests, epInputRupees: ep, quote: previewError ? null : quote },
      exclusions: ['No checkout integration', 'No effective-date policy', 'Custom plan age prices block this independent-choice preview; use Meal Plans Management', 'No accommodation extras or taxes'],
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'horseland-meal-choice-draft.json'; a.click(); URL.revokeObjectURL(url);
  }

  return <section className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-2xl font-serif font-semibold">Meal plans & individual choices</h2><p className="text-sm text-muted-foreground">One shared meal catalogue. Required groups joined by AND. Alternatives within each group joined by OR.</p></div>
      <Button variant="outline" onClick={exportDraft} disabled={!catalogue.length}>Export meal draft</Button>
    </div>
    <div className="border border-primary/40 bg-primary/10 rounded-lg p-4 text-sm space-y-2">
      <p><strong>Session simulation only.</strong> Meal names and prices are read from Services → Meal Management. Editing a shared price here changes this draft only, not the database. Reloading or leaving loses this work; export it first.</p>
      <p>Catalogue is a captured snapshot, not a future-date price schedule. Choose exact records below; no meal or cheapest alternative is selected automatically. Current calendar previews remain separate manual inputs.</p>
      <p>Production activation requires versioned meal prices and server integration of the current all-guests/full-price policy. Non-EP anchors, confirmed bookings and payment quotes are untouched.</p>
    </div>
    {notice && <p role="status" className="rounded border bg-muted p-3 text-sm">{notice}</p>}
    {catalogueQuery.isPending && <p role="status">Loading Meal Management catalogue…</p>}
    {catalogueQuery.error && <div role="alert" className="text-destructive">Could not load valid catalogue prices. No fallback prices are used. <Button variant="outline" onClick={() => catalogueQuery.refetch()}>Retry catalogue</Button></div>}
    {!catalogueQuery.isPending && !catalogueQuery.error && catalogue.length === 0 && <p role="status">No meal records found. Configure Meal Management before building linked plans.</p>}
    <div className="flex flex-wrap gap-3 items-end"><label className="grid gap-2 text-sm font-medium">Configure plan<select className={selectClass} value={code} onChange={e => changePlan(e.target.value as MealChoicePlan['code'])}>{plans.map(p => <option key={p.code} value={p.code}>{names[p.code]}</option>)}</select></label><Button variant="outline" onClick={() => setClearOpen(true)}>Reset this meal workspace</Button><Link className="underline text-sm pb-2" to="/admin/meals">Open live Meal Management</Link></div>
    <Card><CardHeader><CardTitle className="font-serif">{names[code]}: required meal groups</CardTitle><p className="text-sm text-muted-foreground">Every person selects exactly one alternative in every group. A group containing one meal means that meal is required. Different people can choose differently.</p></CardHeader><CardContent className="space-y-4">
      {code === 'RO' ? <p>EP is room only. It cannot contain meal groups and its meal addition is ₹0.</p> : <>
        {plan.groups.length === 0 && <p className="text-amber-800">Add at least one required group; this non-EP plan cannot be priced while empty.</p>}
        {plan.groups.map((g, index) => <div key={g.id} className="border rounded-lg p-4 space-y-3">
          {index > 0 && <p className="text-xs font-semibold uppercase text-primary">AND</p>}
          <div className="flex items-end gap-3"><label className="grid gap-1 text-sm flex-1">Group {index + 1} name<Input value={g.label} onChange={e => updateGroups(plan.groups.map(item => item.id === g.id ? { ...item, label: e.target.value } : item))}/></label><Button variant="ghost" onClick={() => updateGroups(plan.groups.filter(item => item.id !== g.id))}>Remove group</Button></div>
          <p className="text-xs text-muted-foreground">Choose allowed alternatives (OR). These checkboxes define options, not the person's final choice. A meal already linked in another group is disabled to prevent double charging.</p>
          <div className="grid sm:grid-cols-2 gap-2">{catalogue.map(item => <div key={item.id} className={`border rounded p-3 flex gap-2 items-start ${!item.isActive ? 'opacity-70' : ''}`}>
            <label className="flex items-start gap-2 flex-1 text-sm"><input type="checkbox" checked={g.mealIds.includes(item.id)} disabled={(!item.isActive && !g.mealIds.includes(item.id)) || plan.groups.some(other => other.id !== g.id && other.mealIds.includes(item.id))} onChange={e => updateGroups(plan.groups.map(x => x.id === g.id ? { ...x, mealIds: e.target.checked ? [...x.mealIds, item.id] : x.mealIds.filter(id => id !== item.id) } : x))}/><span>{item.title}<span className="block text-xs text-muted-foreground">{item.mealType} · {item.variant} · {money(item.pricePaise)}{!item.isActive ? ' · inactive' : ''}{draftPrices[item.id] ? ' · draft price' : ''}{plan.groups.some(other => other.id !== g.id && other.mealIds.includes(item.id)) ? ' · linked in another group' : ''}</span></span></label>
            <Button variant="ghost" size="sm" aria-label={`Edit shared draft price for ${item.title} in ${g.label}`} onClick={() => editSharedPrice(item.id)}>Edit price</Button>
          </div>)}</div>
          {!g.mealIds.length && <p className="text-xs text-amber-800">No linked alternative. This group must be configured before pricing.</p>}
        </div>)}
        <Button variant="outline" disabled={plan.groups.length >= 12} onClick={() => updateGroups([...plan.groups, group(crypto.randomUUID(), `Required group ${plan.groups.length + 1}`)])}>Add required group (AND)</Button>
      </>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="font-serif">Per-person selection & price preview</CardTitle><p className="text-sm text-muted-foreground">One night. Actual chosen alternatives are charged at their linked catalogue prices. This is a meal subtotal, not a final booking quote.</p></CardHeader><CardContent className="space-y-4">
      <p className="text-sm border rounded p-3">Current approved preview basis: one catalogue unit per person per selected meal for one night. Guest category meal charges follow Guest Age & Pricing Policy. Free bands retain their guest count but have no automatic meal charge. This session-only simulation is not a booking feature. If custom plan age rates apply, this simulation is blocked; use Meal Plans Management for the current price preview. EP contains no meals, so its meal addition stays zero for every guest. Accommodation, extra-person room charges, taxes and discounts are not included.</p>
      <div className="grid lg:grid-cols-2 gap-4">{guests.map((person, personIndex) => <fieldset key={person.id} className="rounded-lg border p-4 space-y-3"><legend className="font-semibold px-1">{person.label}</legend>
        <div className="flex gap-3 items-end"><label className="grid gap-1 text-sm flex-1">Guest type<select className={selectClass} aria-label={`${person.label} type`} value={person.kind} onChange={e => setGuests(previous => previous.map(g => g.id === person.id ? { ...g, kind: e.target.value as MealChoiceGuest['kind'] } : g))}>{agePolicy.data?.bands.filter(b=>b.enabled!==false).map(b=><option key={b.key} value={b.key}>{guestTypeName(b)}</option>)}</select></label><Button variant="ghost" disabled={guests.length <= 1} onClick={() => setGuests(previous => previous.filter(g => g.id !== person.id))}>Remove person {personIndex + 1}</Button></div>
        {plan.groups.map(g => <label key={g.id} className="grid gap-1 text-sm">{g.label || 'Unnamed group'}<select className={selectClass} aria-label={`${person.label}: ${g.label || 'Unnamed group'}`} value={person.choices[g.id] ?? ''} onChange={e => setGuests(previous => previous.map(p => p.id === person.id ? { ...p, choices: e.target.value ? { ...p.choices, [g.id]: e.target.value } : Object.fromEntries(Object.entries(p.choices).filter(([id]) => id !== g.id)) } : p))}><option value="">Choose one alternative</option>{g.mealIds.map(id => { const meal = catalogue.find(item => item.id === id); return <option key={id} value={id} disabled={!meal?.isActive}>{meal ? `${meal.title} (${meal.variant}) · ${money(meal.pricePaise)}${!meal.isActive ? ' · inactive' : ''}` : 'Missing meal record'}</option>; })}</select></label>)}
        {quote?.guestBreakdown.find(g => g.guestId === person.id) && <p className="font-semibold text-sm">Meal addition: {money(quote.guestBreakdown.find(g => g.guestId === person.id)!.subtotalPaise)}</p>}
      </fieldset>)}</div>
      <Button variant="outline" disabled={guests.length >= 20} onClick={() => setGuests(previous => [...previous, { id: crypto.randomUUID(), label: `Person ${Math.max(0, ...previous.map(p => Number(p.label.replace('Person ', '')) || 0)) + 1}`, kind: 'adult', choices: {} }])}>Add another person</Button>
      {previewError ? <p role="status" className="rounded border border-amber-500 bg-amber-50 p-3 text-sm text-amber-950">Price not ready: {previewError}</p> : quote && <div className="rounded-lg bg-primary/10 p-4 space-y-2"><p className="font-semibold">{names[code]} meal addition for {guests.length} person(s): {money(quote.subtotalPaise)} / night</p>{quote.guestBreakdown.map(person => <p key={person.guestId} className="text-sm">{person.label}: {person.choices.map(choice => `${choice.title} ${money(choice.pricePaise)}`).join(' + ') || 'No meals'} = {money(person.subtotalPaise)}</p>)}</div>}
      <label className="grid gap-1 text-sm max-w-sm">Optional EP room total for this preview (₹)<Input inputMode="decimal" value={ep} onChange={e => setEp(e.target.value)} placeholder="No EP rate inferred"/></label>
      {!previewError && combined !== undefined && <p className="font-semibold">EP + selected meals: {money(combined)} / night, before room extras and taxes.</p>}
    </CardContent></Card>
    <details className="rounded border p-4"><summary className="cursor-pointer font-semibold">Shared meal catalogue snapshot</summary><p className="text-xs my-3 text-muted-foreground">Both this list and the plan editor use the same session price. Live Meal Management remains unchanged.</p><div className="space-y-2">{catalogue.map(item => <div key={item.id} className="flex flex-wrap items-center gap-3 border-b pb-2"><span className="flex-1 text-sm">{item.title} · {item.variant} · {money(item.pricePaise)}{draftPrices[item.id] ? ' (draft)' : ''}</span><Button variant="outline" size="sm" onClick={() => editSharedPrice(item.id)}>Edit shared draft price</Button></div>)}</div></details>
    <Dialog open={!!editing} onOpenChange={open => { if (!open) closePrice(); }}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit shared meal price · draft only</DialogTitle></DialogHeader>
      <p className="text-sm">{editing?.title} · {editing?.variant}. Current session price: {editing ? money(editing.pricePaise) : ''} per person.</p>
      <label className="grid gap-1 text-sm">New shared draft price (₹)<Input inputMode="decimal" value={nextPrice} onChange={e => { setNextPrice(e.target.value); setConfirmed(false); setEditError(''); }}/></label>
      <div className="border border-amber-500 bg-amber-50 text-amber-950 rounded p-3 text-sm space-y-2"><p><strong>This is a shared price, not a plan-only override.</strong> Every draft plan that links this meal will recalculate, including alternatives selected by different people.</p><p>In production this may also change separately sold meal extras. Existing AP/non-EP anchors must not be recalculated from changed supplements: migrate/protect their source basis first. Existing confirmed bookings and payment snapshots must stay fixed.</p><p>This confirmation changes only the session draft. Live prices, bookings, anchors and calendar inputs are unchanged.</p></div>
      <div className="space-y-2 text-sm"><h3 className="font-semibold">Affected draft plans</h3>{!linkedPlans.length && <p>No configured draft plan currently links this meal. Other production usage has not been scanned.</p>}{linkedPlans.map(p => { const values = impact.find(i => i.planCode === p.code); return <div key={p.code} className="border rounded p-2"><p>{names[p.code]}: {p.groups.filter(g => g.mealIds.includes(editing!.id)).map(g => g.label).join(', ')}</p>{values ? <p>Possible one-person meal total: {money(values.oldRangePaise.min)}–{money(values.oldRangePaise.max)} → {money(values.newRangePaise.min)}–{money(values.newRangePaise.max)}.</p> : <p>Full plan range unavailable until all groups are valid and a new price is entered.</p>}</div>; })}<p className="text-xs text-muted-foreground">Ranges describe allowed alternatives, not a chosen price. The preview charges each person's exact selection.</p></div>
      {(priceError || editError) && <p role="alert" className="text-destructive text-sm">{priceError || editError}</p>}
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>I understand the shared impact and want to apply this price to all linked session drafts only.</label>
      <DialogFooter><Button variant="outline" onClick={closePrice}>Cancel</Button><Button disabled={!confirmed || parsedPrice === undefined || !!priceError || parsedPrice === editing?.pricePaise} onClick={applyPrice}>Apply shared draft price</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={clearOpen} onOpenChange={setClearOpen}><DialogContent><DialogHeader><DialogTitle>Reset meal workspace?</DialogTitle></DialogHeader><p>Discard configured groups, per-person choices and shared draft price edits. Export first to keep a copy. This does not change live data or other workspace tabs.</p><DialogFooter><Button variant="outline" onClick={() => setClearOpen(false)}>Keep draft</Button><Button onClick={() => { setPlans(initialPlans()); setGuests(initialGuests()); setCode('HB'); setDraftPrices({}); setEp(''); setNotice('Meal workspace reset to the captured catalogue. Live prices unchanged.'); setClearOpen(false); closePrice(); }}>Discard meal draft</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}

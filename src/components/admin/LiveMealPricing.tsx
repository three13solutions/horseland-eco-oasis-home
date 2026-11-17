import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { parseRupeesToPaise } from '@/lib/rate-calendar-draft';
import { getConnectedMealIds } from '@/lib/shared-meal-impact';
import { validateMealChoicePlan } from '@/lib/meal-choice-draft';
import { fetchMealPricingWorkspace, mealPricingQueryKey, saveSharedMealPrices, saveLiveMealGroups, setLiveMealPlanActive, workspaceCatalogue, workspacePlans } from '@/lib/meal-pricing-client';
import type { MealPricingWorkspace, LivePlan } from '@/lib/meal-pricing-client';

const money = (n: number) => n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
const names = { RO: 'EP', BB: 'CP', HB: 'MAP', FB: 'AP' };
const style = 'border rounded-md px-3 py-2 bg-background text-sm w-full';
function useWorkspace() { return useQuery({ queryKey: mealPricingQueryKey, queryFn: fetchMealPricingWorkspace, refetchOnWindowFocus: false }); }
function priceRange(plan: LivePlan, workspace: MealPricingWorkspace, changed: Record<string, number> = {}) {
  validateMealChoicePlan(workspacePlans({ ...workspace, plans: [plan] })[0], workspaceCatalogue(workspace));
  let min = 0, max = 0;
  for (const g of plan.groups) {
    const prices = g.meal_ids.map(id => parseRupeesToPaise(String(changed[id] ?? workspace.meals.find(m => m.id === id)!.price)));
    min += Math.min(...prices); max += Math.max(...prices);
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) throw new Error('Plan amount exceeds supported limit.');
  }
  return { min: min / 100, max: max / 100 };
}
function connectedAlternatives(workspace: MealPricingWorkspace, id: string) { return getConnectedMealIds(workspacePlans(workspace), workspaceCatalogue(workspace), id); }

/** Both production screens use this exact admin-only RPC path and workspace revision. */
export function LiveMealPricing({ catalogueOnly = false, onSaved }: { catalogueOnly?: boolean; onSaved?: () => void }) {
  const query = useWorkspace();
  const client = useQueryClient();
  const [priceEdit, setPriceEdit] = useState<{ workspace: MealPricingWorkspace; mealId: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [applyAlternatives, setApplyAlternatives] = useState(false);
  const [planEdit, setPlanEdit] = useState<{ workspace: MealPricingWorkspace; plan: LivePlan; groups: LivePlan['groups'] } | null>(null);
  const [reviewPlan, setReviewPlan] = useState(false);
  const [statusEdit, setStatusEdit] = useState<{ workspace: MealPricingWorkspace; plan: LivePlan; active: boolean } | null>(null);
  const [reason, setReason] = useState('');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const mode = priceEdit?.workspace.mode ?? planEdit?.workspace.mode ?? statusEdit?.workspace.mode ?? query.data?.mode ?? 'staged';
  const staged = mode === 'staged';
  function close() { if (busy) return; setPriceEdit(null); setPlanEdit(null); setStatusEdit(null); setReviewPlan(false); setAck(false); setReason(''); setError(''); setApplyAlternatives(false); }
  function openPrice(workspace: MealPricingWorkspace, id: string) { setPriceEdit({ workspace: structuredClone(workspace), mealId: id }); setAmount(String(workspace.meals.find(m => m.id === id)!.price)); setAck(false); setReason(''); setError(''); setApplyAlternatives(false); }
  async function saved(workspace: MealPricingWorkspace) {
    client.setQueryData(mealPricingQueryKey, workspace);
    for (const key of ['meal-plans', 'meal-supplement-versions', 'rate-plan-admin', 'rate-variants', 'pricing-workspace-meal-catalogue']) await client.invalidateQueries({ queryKey: [key] });
    onSaved?.(); setPriceEdit(null); setPlanEdit(null); setStatusEdit(null); setReviewPlan(false); setAck(false); setReason('');
    setNotice(workspace.mode === 'staged' ? 'Saved securely in staging. Staged plan totals are recalculated; public meal prices, booking quotes and existing bookings are unchanged.' : 'Saved securely. Linked meal-plan supplements have been recalculated. Existing confirmed booking and payment snapshots were not changed.');
  }
  let proposed: number | undefined;
  let validation = '';
  let editedIds: string[] = [];
  let relatedIds: string[] = [];
  let impacts: { plan: LivePlan; old: number; next: { min: number; max: number } }[] = [];
  if (priceEdit) {
    try {
      proposed = parseRupeesToPaise(amount) / 100;
      relatedIds = connectedAlternatives(priceEdit.workspace, priceEdit.mealId);
      editedIds = applyAlternatives ? relatedIds : [priceEdit.mealId];
      const updates = Object.fromEntries(editedIds.map(id => [id, proposed!]));
      impacts = priceEdit.workspace.plans.filter(p => p.groups.some(g => g.meal_ids.some(id => editedIds.includes(id)))).map(p => ({ plan: p, old: p.supplement_per_person_inr, next: priceRange(p, priceEdit.workspace, updates) }));
      if (impacts.some(i => i.next.min !== i.next.max)) validation = 'An OR group would have unequal prices. Guest meal selection is deferred, so this cannot go live. Include the linked alternatives at the same price, or revise the plan groups first.';
      if (editedIds.every(id => priceEdit.workspace.meals.find(m => m.id === id)!.price === proposed)) validation = 'Enter a changed price.';
    } catch (e) { validation = (e as Error).message; }
  }
  let planTotal: number | undefined;
  let planValidation = '';
  if (planEdit) {
    try { const range = priceRange({ ...planEdit.plan, groups: planEdit.groups }, planEdit.workspace); if (range.min !== range.max) throw new Error('Each OR group must have equal prices until guest meal selection is enabled. No cheapest or default choice will be used.'); planTotal = range.min; }
    catch (e) { planValidation = (e as Error).message; }
  }
  async function commitPrice() {
    if (!priceEdit || !ack || !reason.trim() || validation || proposed === undefined || busy) return;
    setBusy(true); setError('');
    try { await saved(await saveSharedMealPrices(priceEdit.workspace, editedIds.map(id => ({ mealId: id, pricePaise: parseRupeesToPaise(String(proposed)) })), reason)); }
    catch (e) { setError(`Save was not confirmed: ${(e as Error).message}. Close and reload current prices before retrying.`); setAck(false); }
    finally { setBusy(false); }
  }
  async function commitPlan() {
    if (!planEdit || !reviewPlan || !ack || !reason.trim() || planValidation || busy) return;
    setBusy(true); setError('');
    try { await saved(await saveLiveMealGroups(planEdit.workspace, planEdit.plan, planEdit.groups, reason)); }
    catch (e) { setError(`Save was not confirmed: ${(e as Error).message}. Close and reload current prices before retrying.`); setAck(false); }
    finally { setBusy(false); }
  }
  async function commitStatus() {
    if (!statusEdit || !ack || !reason.trim() || busy) return;
    setBusy(true); setError('');
    try { await saved(await setLiveMealPlanActive(statusEdit.workspace, statusEdit.plan, statusEdit.active, reason)); }
    catch (e) { setError(`Save was not confirmed: ${(e as Error).message}. Close and reload current prices before retrying.`); setAck(false); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border p-4 md:p-5 space-y-4 my-5">
    <header><h2 className="font-serif text-xl font-semibold">{staged ? 'Staged · ' : ''}{catalogueOnly ? 'Shared meal prices' : 'Linked meal-plan pricing'}</h2><p className="text-sm text-muted-foreground">One price source in Meal Management. Every adult, child and infant currently pays the same meal rate per night. Only the primary guest and plan are collected at booking; individual meal selections are deferred. Protected rate policies may retain earlier pricing for excluded categories or dates.</p></header>
    {staged && <p className="rounded border border-amber-500 bg-amber-50 p-3 text-sm text-amber-950"><strong>Unpublished staging workspace.</strong> Saves here do not change public catalogue prices or guest quotes. Publishing the frontend alone does not activate these database changes; a separate coordinated pricing activation is required. Live metadata and the current public catalogue remain separate below.</p>}
    {notice && <p role="status" className="bg-primary/10 rounded p-3 text-sm">{notice}</p>}
    {query.isPending && <p role="status">Loading linked meal prices…</p>}
    {query.error && <div role="alert" className="text-destructive text-sm">Shared pricing could not load: {(query.error as Error).message}. No save has been made. <Button variant="outline" onClick={() => query.refetch()}>Reload</Button></div>}
    {query.data && <>
      <p className="text-xs text-muted-foreground">Workspace revision {query.data.revision}. Saves are checked against this revision. {staged ? 'Changes stay in unpublished staging; public prices are unchanged.' : 'Changes apply to new pricing; saved booking snapshots stay fixed.'}</p><Button variant="outline" disabled={busy || !!priceEdit || !!planEdit || !!statusEdit || query.isFetching} onClick={() => query.refetch()}>Reload current prices</Button>
      {!catalogueOnly && <div className="grid md:grid-cols-2 gap-3">{query.data.plans.map(p => <div key={p.id} className="border rounded-lg p-4 space-y-2"><div className="flex justify-between gap-3"><h3 className="font-semibold">{names[p.plan_code]} · {p.plan_name}</h3><span>{money(p.supplement_per_person_inr)} / person</span></div>{p.groups.length ? p.groups.map((g, i) => <p key={g.id} className="text-sm">{i > 0 && <strong className="text-primary">AND </strong>}{g.label}: {g.meal_ids.map(id => { const m = query.data!.meals.find(x => x.id === id); return m ? `${m.title} (${m.variant}) ${money(m.price)}` : 'Missing meal'; }).join(' OR ')}</p>) : <p className="text-sm">{p.plan_code === 'RO' ? 'No meals. EP addition is zero.' : 'Plan groups are not configured. Do not activate until reviewed.'}</p>}<Button variant="outline" onClick={() => { setPlanEdit({ workspace: structuredClone(query.data!), plan: structuredClone(p), groups: structuredClone(p.groups) }); setAck(false); setReason(''); setReviewPlan(false); setError(''); }}>Edit required groups / alternatives</Button><Button variant="ghost" onClick={() => { setStatusEdit({ workspace: structuredClone(query.data!), plan: p, active: !p.is_active }); setAck(false); setReason(''); setError(''); }}>{p.is_active ? 'Deactivate plan' : 'Activate plan'}</Button></div>)}</div>}
      <details open={catalogueOnly}><summary className="cursor-pointer font-semibold">Edit shared prices (also updates linked plans)</summary><div className="space-y-2 mt-3">{query.data.meals.map(m => <div key={m.id} className="flex flex-wrap gap-3 items-center border-b pb-2"><span className="flex-1 text-sm">{m.title} · {m.variant} · {money(m.price)}{!m.is_active ? ' · inactive' : ''}</span><Button variant="outline" size="sm" onClick={() => openPrice(query.data!, m.id)}>Edit shared price</Button></div>)}</div></details>
    </>}
    <Dialog open={!!priceEdit} onOpenChange={open => { if (!open) close(); }}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={e => { if (busy) e.preventDefault(); }} onEscapeKeyDown={e => { if (busy) e.preventDefault(); }}><DialogHeader><DialogTitle>Review {staged ? 'staged' : 'shared live'} meal-price change</DialogTitle></DialogHeader>
      <label className="grid gap-1 text-sm">New price per person (₹)<Input inputMode="decimal" disabled={busy} value={amount} onChange={e => { setAmount(e.target.value); setAck(false); setError(''); }}/></label>
      {priceEdit && relatedIds.length > 1 && <label className="text-sm flex items-start gap-2"><input type="checkbox" disabled={busy} checked={applyAlternatives} onChange={e => { setApplyAlternatives(e.target.checked); setAck(false); }}/><span>Also set the following linked OR alternatives to this same price: {relatedIds.filter(id => id !== priceEdit.mealId).map(id => priceEdit.workspace.meals.find(m => m.id === id)!.title + ' (' + priceEdit.workspace.meals.find(m => m.id === id)!.variant + ')').join(', ')}. This is an explicit batch change, not automatic propagation.</span></label>}
      <div className="border rounded p-3 space-y-2 text-sm"><strong>Meals being changed</strong>{priceEdit && editedIds.map(id => { const m = priceEdit.workspace.meals.find(x => x.id === id)!; return <p key={id}>{m.title} ({m.variant}): {money(m.price)} → {proposed === undefined ? 'Not set' : money(proposed)}</p>; })}<strong className="block pt-2">Affected plan supplements / person / night</strong>{impacts.map(i => <p key={i.plan.id}>{names[i.plan.plan_code]}: {money(i.old)} → {i.next.min === i.next.max ? money(i.next.min) : `${money(i.next.min)}–${money(i.next.max)} (blocked)`}</p>)}{!impacts.length && <p>No linked plan uses the selected meal records.</p>}</div>
      <p className="rounded border border-amber-500 bg-amber-50 p-3 text-sm text-amber-950">{staged ? 'This changes only the staged shared catalogue and staged plan supplements. Public meal extras, guest quotes and existing bookings are unchanged.' : 'This changes shared catalogue prices, affected automatic plan supplements and separately sold meal extras. Protected category/date policies may retain their earlier pricing. It does not revise existing confirmed booking/payment snapshots.'} All guest ages currently use the full meal price. Review before saving.</p>
      {validation && <p role="alert" className="text-destructive text-sm">{validation}</p>}
      <label className="grid gap-1 text-sm">Reason for audit record<Input disabled={busy} value={reason} onChange={e => { setReason(e.target.value); setAck(false); }}/></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" disabled={busy} checked={ack} onChange={e => setAck(e.target.checked)}/>I reviewed the meals and affected plans and approve this {staged ? 'staged' : 'shared live'} price change.</label>
      {error && <p role="alert" className="text-destructive text-sm">{error} Close and reload the workspace if another administrator changed it.</p>}
      <DialogFooter><Button variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button disabled={busy || !ack || !reason.trim() || !!validation || proposed === undefined} onClick={commitPrice}>{busy ? 'Saving…' : staged ? 'Save staged meal prices' : 'Save shared meal prices'}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={!!planEdit} onOpenChange={open => { if (!open) close(); }}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onInteractOutside={e => { if (busy) e.preventDefault(); }} onEscapeKeyDown={e => { if (busy) e.preventDefault(); }}><DialogHeader><DialogTitle>{reviewPlan ? 'Review' : 'Configure'} {planEdit ? names[planEdit.plan.plan_code] : ''} meal groups</DialogTitle></DialogHeader>
      <p className="text-sm">Required groups are AND; alternatives inside each group are OR. Until individual guest choices are enabled, all alternatives in a group must have the same price. No arbitrary choice is made.</p>
      {planEdit?.plan.plan_code === 'RO' && <p>EP has no meals and cannot contain groups.</p>}
      {planEdit?.groups.map((g, i) => <div key={g.id} className="border rounded p-3 space-y-2"><div className="flex gap-3"><label className="flex-1 text-sm">{i > 0 ? 'AND · ' : ''}Group name<Input disabled={busy || reviewPlan} value={g.label} onChange={e => { setPlanEdit(p => p && ({ ...p, groups: p.groups.map(x => x.id === g.id ? { ...x, label: e.target.value } : x) })); setAck(false); }}/></label>{!reviewPlan && <Button variant="ghost" disabled={busy} onClick={() => setPlanEdit(p => p && ({ ...p, groups: p.groups.filter(x => x.id !== g.id) }))}>Remove</Button>}</div><div className="grid sm:grid-cols-2 gap-2">{planEdit.workspace.meals.map(m => <label key={m.id} className="text-sm flex gap-2 items-start"><input type="checkbox" checked={g.meal_ids.includes(m.id)} disabled={busy || reviewPlan || (!m.is_active && !g.meal_ids.includes(m.id)) || planEdit.groups.some(other => other.id !== g.id && other.meal_ids.includes(m.id))} onChange={e => { setPlanEdit(p => p && ({ ...p, groups: p.groups.map(x => x.id === g.id ? { ...x, meal_ids: e.target.checked ? [...x.meal_ids, m.id] : x.meal_ids.filter(id => id !== m.id) } : x) })); setAck(false); }}/>{m.title} ({m.variant}) {money(m.price)}{!m.is_active ? ' inactive' : ''}</label>)}</div></div>)}
      {planEdit && planEdit.plan.plan_code !== 'RO' && !reviewPlan && <Button variant="outline" disabled={busy || planEdit.groups.length >= 12} onClick={() => setPlanEdit(p => p && ({ ...p, groups: [...p.groups, { id: crypto.randomUUID(), label: `Group ${p.groups.length + 1}`, meal_ids: [] }] }))}>Add required group (AND)</Button>}
      {planValidation ? <p role="alert" className="text-destructive text-sm">{planValidation}</p> : planEdit && <p className="font-semibold">Meal supplement: {money(planEdit.plan.supplement_per_person_inr)} → {money(planTotal!)} / person / night, all ages.</p>}
      {reviewPlan && <><label className="grid gap-1 text-sm">Reason for audit record<Input disabled={busy} value={reason} onChange={e => { setReason(e.target.value); setAck(false); }}/></label><label className="flex gap-2 text-sm"><input type="checkbox" disabled={busy} checked={ack} onChange={e => setAck(e.target.checked)}/>I approve these {staged ? 'staged' : 'live'} plan components and their resulting supplement. {staged ? 'Public pricing is unchanged.' : 'Existing booking/payment snapshots stay fixed.'}</label></>}
      {error && <p role="alert" className="text-destructive text-sm">{error} Close and reload if the revision changed.</p>}
      <DialogFooter><Button variant="outline" disabled={busy} onClick={close}>Cancel</Button>{reviewPlan ? <><Button variant="outline" disabled={busy} onClick={() => { setReviewPlan(false); setAck(false); }}>Back to edit</Button><Button disabled={busy || !ack || !reason.trim() || !!planValidation} onClick={commitPlan}>{busy ? 'Saving…' : staged ? 'Save staged plan groups' : 'Save plan groups'}</Button></> : <Button disabled={busy || !!planValidation} onClick={() => { setReviewPlan(true); setAck(false); }}>Review impact</Button>}</DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={!!statusEdit} onOpenChange={open => { if (!open) close(); }}><DialogContent onInteractOutside={e => { if (busy) e.preventDefault(); }} onEscapeKeyDown={e => { if (busy) e.preventDefault(); }}><DialogHeader><DialogTitle>{statusEdit?.active ? 'Activate' : 'Deactivate'} {statusEdit ? names[statusEdit.plan.plan_code] : ''} plan?</DialogTitle></DialogHeader><p className="text-sm">{staged ? 'This changes plan availability only in staging, not public guest quotes.' : 'This changes availability for new quotes. Existing bookings are not changed.'} Enabling a plan validates linked meals and recalculates its supplement.</p><label className="grid gap-1 text-sm">Reason for audit record<Input disabled={busy} value={reason} onChange={e => { setReason(e.target.value); setAck(false); }}/></label><label className="flex gap-2 text-sm"><input type="checkbox" disabled={busy} checked={ack} onChange={e => setAck(e.target.checked)}/>I approve this {staged ? 'staged' : 'live'} plan availability change.</label>{error && <p role="alert" className="text-destructive text-sm">{error}</p>}<DialogFooter><Button variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button disabled={busy || !ack || !reason.trim()} onClick={commitStatus}>{busy ? 'Saving…' : 'Confirm plan status'}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}

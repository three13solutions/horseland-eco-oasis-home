import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const client = supabase as SupabaseClient;
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
interface Rule { revision: number; effective_from: string; effective_to: string | null; weekend_days: number[] }
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export default function EffectiveWeekendRules() {
 const cache = useQueryClient();
 const [start, setStart] = useState(today);
 const [end, setEnd] = useState('');
 const [selected, setSelected] = useState<number[]>([6]);
 const [confirmed, setConfirmed] = useState(false);
 const [saving, setSaving] = useState(false);
 const [notice, setNotice] = useState('');
 const { data, error, isLoading } = useQuery({ queryKey: ['pricing-day-rules'], queryFn: async () => {
   const result = await client.from('pricing_day_rules').select('revision,effective_from,effective_to,weekend_days').order('revision', { ascending: false });
   if (result.error) throw result.error;
   return result.data as Rule[];
 }});
 const revision = data?.[0]?.revision ?? 0;
 useEffect(() => { setConfirmed(false); }, [revision]);
 const active = data?.find(r => r.effective_from <= today() && (!r.effective_to || r.effective_to >= today()));
 const valid = start >= today() && (!end || end >= start);
 const changed = () => { setConfirmed(false); setNotice(''); };
 async function save() {
   if (!valid || !confirmed || saving || !data) return;
   setSaving(true); setNotice('');
   try {
     const result = await client.rpc('save_pricing_day_rule', { p_effective_from: start, p_effective_to: end || null, p_weekend_days: selected, p_expected_revision: revision });
     if (result.error) throw result.error;
     setConfirmed(false);
     await cache.invalidateQueries({ queryKey: ['pricing-day-rules'] });
     await cache.invalidateQueries();
     setNotice('Day rule saved. New quotes use it for the selected stay dates. Existing bookings are unchanged.');
   } catch (err) { setNotice(err instanceof Error ? err.message : (err as { message?: string }).message || 'Could not save. Reload and try again.'); }
   finally { setSaving(false); }
 }
 return <Card><CardHeader><CardTitle>Weekday / weekend definition</CardTitle></CardHeader><CardContent className="space-y-4">
   {error ? <p role="alert">Day-rule settings are unavailable. No changes saved. {error.message}</p> : isLoading ? <p>Loading saved rules…</p> : <p className="text-sm">Current rule: {active ? active.weekend_days.map(d => days[d]).join(', ') || 'No weekend days' : 'Legacy definitions (pricing engine: Friday–Sunday; seasonal base: Saturday–Sunday)'}. All other days are weekdays.</p>}
   <fieldset disabled={saving || !!error || isLoading} className="space-y-3"><legend className="font-medium">Weekend days</legend><div className="flex flex-wrap gap-4">{days.map((name, i) => <label key={name} className="flex items-center gap-2"><input type="checkbox" checked={selected.includes(i)} onChange={e => { changed(); setSelected(e.target.checked ? [...selected, i].sort() : selected.filter(d => d !== i)); }} />{name}</label>)}</div>
   <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="weekend-start">Effective from (stay date)</Label><Input id="weekend-start" type="date" min={today()} value={start} onChange={e => { changed(); setStart(e.target.value); }} /></div><div><Label htmlFor="weekend-end">Through (inclusive; blank = indefinitely)</Label><Input id="weekend-end" type="date" min={start} value={end} onChange={e => { changed(); setEnd(e.target.value); }} /></div></div>
   <p className="text-sm text-muted-foreground">Historical definitions and confirmed booking prices are unchanged. A newer overlapping rule takes priority only within its dates. After a temporary rule ends, the previous matching rule resumes. Existing holiday-specific pricing remains separate.</p>
   <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I understand that this changes which weekday/weekend rates new quotes use from {start || 'the selected date'}{end ? ` through ${end}` : ' onward'}.</label>
   {!valid && <p role="alert">Choose today or a future start date, and an end date on or after the start.</p>}
   <Button disabled={!valid || !confirmed || saving || !data} onClick={save}>{saving ? 'Saving…' : 'Save day rule'}</Button></fieldset>
   {notice && <p role="status">{notice}</p>}
   {!!data?.length && <details><summary className="cursor-pointer">Saved rule history</summary><ul className="mt-2 space-y-1 text-sm">{data.map(r => <li key={r.revision}>#{r.revision}: {r.effective_from} → {r.effective_to || 'indefinitely'} · {r.weekend_days.map(d => days[d]).join(', ') || 'No weekend days'}</li>)}</ul></details>}
 </CardContent></Card>;
}

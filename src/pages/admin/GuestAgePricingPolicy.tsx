import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Pencil, Plus, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAgePolicy } from '@/hooks/useGuestAgePolicy';
import { validateGuestAgeBands, type GuestAgeBand, type GuestBandKey } from '@/lib/guest-age-policy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const TYPE_LABEL: Record<GuestBandKey, string> = { infant: 'Infant', child: 'Child', adult: 'Adult' };
const ORDER: GuestBandKey[] = ['infant', 'child', 'adult'];
const accLabel = (r: string) => (r === 'free' ? 'No charge' : r === 'child' ? 'Child rate' : 'Adult rate');
const mealLabel = (r: string) => (r === 'free' ? 'No charge' : 'Plan age pricing');
const sameBand = (a: GuestAgeBand, b: GuestAgeBand) =>
  a.key === b.key && a.min_age === b.min_age && a.max_age === b.max_age && a.accommodation_rule === b.accommodation_rule && a.meal_rule === b.meal_rule;

type Row = GuestAgeBand & { id: string; revision: number; active: boolean };
type FormState = { mode: 'edit' | 'new'; band: GuestAgeBand };

export default function GuestAgePricingPolicy() {
  const policy = useGuestAgePolicy({ allowInactive: true });
  const client = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const live = policy.data?.active !== false;

  const history = useQuery({
    queryKey: ['guest-age-policy-history', policy.data?.revision],
    enabled: !!policy.data,
    queryFn: async () => {
      const { data, error } = await (supabase as SupabaseClient).from('guest_age_policy_versions').select('revision,bands').order('revision', { ascending: false });
      if (error) throw error;
      return (data ?? []) as { revision: number; bands: GuestAgeBand[] }[];
    },
  });

  const rows = useMemo<Row[]>(() => {
    const current = policy.data?.bands ?? [];
    const out: Row[] = [];
    for (const v of history.data ?? []) for (const b of v.bands ?? []) {
      if (out.some((r) => sameBand(r, b))) continue;
      out.push({ ...b, id: `${v.revision}-${b.key}`, revision: v.revision, active: current.some((c) => sameBand(c, b)) });
    }
    return out.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key) || Number(b.active) - Number(a.active) || b.revision - a.revision);
  }, [history.data, policy.data]);

  async function refresh() {
    await Promise.all(['guest-age-policy', 'guest-age-policy-history', 'rate-variants', 'website-rate-variants'].map((k) => client.invalidateQueries({ queryKey: [k] })));
  }

  async function applyBand(band: GuestAgeBand) {
    if (!policy.data) return false;
    if (!live) { toast.error('Activate the policy before making changes.'); return false; }
    const bands = policy.data.bands.map((b) => (b.key === band.key ? band : b));
    const err = validateGuestAgeBands(bands);
    if (err) { setFormError(`${err} Adjust the neighbouring age group first so ranges don't overlap.`); toast.error(err); return false; }
    setSaving(true);
    try {
      const { error } = await (supabase as SupabaseClient).rpc('save_guest_age_policy', { p_expected_revision: policy.data.revision, p_bands: bands });
      if (error) throw error;
      await refresh();
      toast.success(`${TYPE_LABEL[band.key]} policy is now active; the previous one was deactivated.`);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Policy was not saved.');
      return false;
    } finally { setSaving(false); }
  }

  async function submit() {
    if (!form) return;
    setFormError(null);
    const b = form.band;
    if (!Number.isInteger(b.min_age) || b.min_age < 0 || (b.max_age !== null && (!Number.isInteger(b.max_age) || b.max_age < b.min_age))) { setFormError('Enter valid whole-number ages; maximum must be at least the minimum.'); return; }
    if (form.mode === 'new' && rows.some((r) => r.active && r.key === b.key)) {
      setFormError(`An active ${TYPE_LABEL[b.key]} policy already exists. Edit it instead, or reactivate a different one.`);
      return;
    }
    if (await applyBand(b)) setForm(null);
  }

  async function reactivate(row: Row) {
    if (!window.confirm(`Reactivate this ${TYPE_LABEL[row.key]} policy? The current active ${TYPE_LABEL[row.key]} policy will be deactivated.`)) return;
    const { id: _i, revision: _r, active: _a, ...band } = row;
    await applyBand(band);
  }

  async function setActive(on: boolean) {
    if (on && !window.confirm('Turn on the Guest Type Policy? These age rules will start affecting new website and admin quotes.')) return;
    setToggling(true);
    try {
      const { error } = await (supabase as SupabaseClient).rpc('set_guest_age_pricing_active', { p_active: on });
      if (error) throw error;
      await refresh();
      toast.success(on ? 'Guest Type Policy is now live.' : 'Guest Type Policy turned off.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not change status.'); } finally { setToggling(false); }
  }

  const setBand = (patch: Partial<GuestAgeBand>) => form && setForm({ ...form, band: { ...form.band, ...patch } });

  return (
    <main className="p-6 space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Guest Type Policy</h1>
          <p className="text-sm text-muted-foreground">Age ranges are inclusive. Only one policy per guest type can be active, and age ranges never overlap. Changes affect new quotes only.</p>
        </div>
        <Button disabled={!policy.data} onClick={() => { setFormError(null); setForm({ mode: 'new', band: { key: 'child', min_age: 0, max_age: 0, accommodation_rule: 'child', meal_rule: 'full' } }); }}>
          <Plus className="h-4 w-4 mr-1" /> New Policy
        </Button>
      </div>

      {policy.isLoading && <p>Loading policy…</p>}
      {policy.isError && <p role="alert">Could not load the saved policy. <Button size="sm" onClick={() => policy.refetch()}>Try again</Button></p>}

      {policy.data && (
        <div className={`border rounded p-4 flex flex-wrap items-center justify-between gap-3 ${live ? 'border-primary/40 bg-primary/5' : 'border-destructive/40 bg-destructive/5'}`}>
          <div>
            <p className="font-semibold">{live ? 'Live' : 'Not live yet'}</p>
            <p className="text-sm text-muted-foreground">{live ? 'Active policies apply to new website and admin quotes.' : 'Policies are shown but do not affect prices. Activate to start using them and to enable editing.'}</p>
          </div>
          <Button variant={live ? 'outline' : 'default'} disabled={toggling} onClick={() => setActive(!live)}>{toggling ? 'Updating…' : live ? 'Turn off' : 'Activate'}</Button>
        </div>
      )}

      {policy.data && (
        <div className="border rounded">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest Type</TableHead><TableHead>Minimum Age</TableHead><TableHead>Maximum Age</TableHead>
                <TableHead>Accommodation Charge</TableHead><TableHead>Meal Charge</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className={r.active ? '' : 'text-muted-foreground'}>
                  <TableCell className="font-medium">{TYPE_LABEL[r.key]}</TableCell>
                  <TableCell>{r.min_age}</TableCell>
                  <TableCell>{r.max_age ?? 'No limit'}</TableCell>
                  <TableCell>{accLabel(r.accommodation_rule)}</TableCell>
                  <TableCell>{mealLabel(r.meal_rule)}</TableCell>
                  <TableCell><Badge variant={r.active ? 'default' : 'secondary'}>{r.active ? 'Active' : 'Deactivated'}</Badge></TableCell>
                  <TableCell className="text-right">
                    {r.active ? (
                      <Button size="icon" variant="ghost" aria-label={`Edit ${TYPE_LABEL[r.key]} policy`} disabled={!live || saving}
                        onClick={() => { setFormError(null); const { id: _i, revision: _r, active: _a, ...band } = r; setForm({ mode: 'edit', band }); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled={!live || saving} onClick={() => reactivate(r)}><RotateCcw className="h-3 w-3 mr-1" />Reactivate</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.mode === 'new' ? 'New Policy' : `Edit ${form ? TYPE_LABEL[form.band.key] : ''} Policy`}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3">
              <label className="text-sm">Guest Type
                <select className="block border rounded p-2 w-full bg-background" disabled={form.mode === 'edit'} value={form.band.key}
                  onChange={(e) => { const key = e.target.value as GuestBandKey; setBand({ key, accommodation_rule: key === 'adult' ? 'adult' : 'child', max_age: key === 'adult' ? null : form.band.max_age ?? 0 }); setFormError(null); }}>
                  {ORDER.map((k) => <option key={k} value={k}>{TYPE_LABEL[k]}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Minimum Age<Input type="number" min={0} step={1} value={form.band.min_age} onChange={(e) => setBand({ min_age: Number(e.target.value) })} /></label>
                <label className="text-sm">Maximum Age{form.band.key === 'adult' ? <p className="p-2">No limit</p> : <Input type="number" min={0} step={1} value={form.band.max_age ?? ''} onChange={(e) => setBand({ max_age: Number(e.target.value) })} />}</label>
              </div>
              <label className="text-sm">Accommodation Charge
                <select className="block border rounded p-2 w-full bg-background" value={form.band.accommodation_rule} onChange={(e) => setBand({ accommodation_rule: e.target.value as GuestAgeBand['accommodation_rule'] })}>
                  {(form.band.key === 'adult' ? ['adult'] : ['child', 'free']).map((v) => <option key={v} value={v}>{accLabel(v)}</option>)}
                </select>
              </label>
              <label className="text-sm">Meal Charge
                <select className="block border rounded p-2 w-full bg-background" value={form.band.meal_rule} onChange={(e) => setBand({ meal_rule: e.target.value as GuestAgeBand['meal_rule'] })}>
                  <option value="full">Plan age pricing</option><option value="free">No charge</option>
                </select>
              </label>
              {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button disabled={saving} onClick={submit}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Pencil, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAgePolicy } from '@/hooks/useGuestAgePolicy';
import { validateGuestAgePolicySave, guestPolicySaveError, guestTypeChargeRule, guestTypeName, guestTypeKey, sameGuestPolicy, alternateGuestPolicy, type GuestAgeBand } from '@/lib/guest-age-policy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const accLabel = (r: string) => (r === 'free' ? 'No Charge' : 'Guest Type Charge');
const mealLabel = accLabel;
const sameBand = sameGuestPolicy;

type Row = GuestAgeBand & { id: string; revision: number; active: boolean; current: boolean };
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
      const selected = current.find((c) => sameBand(c, b));
      out.push({ ...b, id: `${v.revision}-${b.key}`, revision: v.revision, current: !!selected, active: !!selected && selected.enabled !== false });
    }
    return out.sort((a, b) => a.min_age - b.min_age || Number(b.active) - Number(a.active) || b.revision - a.revision);
  }, [history.data, policy.data]);

  async function refresh() {
    await Promise.all(['guest-age-policy', 'guest-age-policy-history', 'rate-variants', 'website-rate-variants'].map((k) => client.invalidateQueries({ queryKey: [k] })));
  }

  async function applyBand(band: GuestAgeBand) {
    if (!policy.data) return false;
    const exists = policy.data.bands.some(b => b.key === band.key);
    const bands = exists ? policy.data.bands.map((b) => (b.key === band.key ? { ...band, enabled: true } : b)) : [...policy.data.bands, { ...band, enabled: true }];
    const err = validateGuestAgePolicySave(bands, live);
    if (err) { setFormError(err); return false; }
    setSaving(true);
    try {
      const { error } = await (supabase as SupabaseClient).rpc('save_guest_age_policy', { p_expected_revision: policy.data.revision, p_bands: bands });
      if (error) throw error;
      await refresh();
      toast.success(`${guestTypeName(band)} policy saved.`);
      return true;
    } catch (e) {
      const message = guestPolicySaveError(e);
      setFormError(message);
      toast.error(message);
      return false;
    } finally { setSaving(false); }
  }

  async function submit() {
    if (!form) return;
    setFormError(null);
    const b = form.band;
    if (!b.name?.trim() || !/^[a-z][a-z0-9_]*$/.test(b.key)) { setFormError('Enter a guest type name beginning with a letter.'); return; }
    if (!Number.isInteger(b.min_age) || b.min_age < 0 || (b.max_age !== null && (!Number.isInteger(b.max_age) || b.max_age < b.min_age))) { setFormError('Enter valid whole-number ages; maximum must be at least the minimum.'); return; }
    if (form.mode === 'new' && rows.some((r) => r.active && r.key === b.key)) {
      setFormError(`An active ${guestTypeName(b)} policy already exists. Edit it instead, or reactivate a different one.`);
      return;
    }
    if (await applyBand(b)) setForm(null);
  }

  async function setActive(row: Row, on: boolean) {
    if (!policy.data) return;
    if (!on) {
      const alternate = alternateGuestPolicy(row, rows, policy.data.bands);
      if (!alternate) { toast.error('An alternate policy covering the same ages is required before deactivation.'); return; }
      if (!window.confirm(`Deactivate this policy and activate the alternate ${guestTypeName(alternate)} policy for the same ages?`)) return;
    }
    if (on && !row.current && !window.confirm(`Activate this ${guestTypeName(row)} policy and deactivate its current version?`)) return;
    const { id: _i, revision: _r, active: _a, current: _c, ...band } = row;
    setToggling(true);
    try {
      const { error } = await (supabase as SupabaseClient).rpc('set_guest_type_policy_status', { p_expected_revision: policy.data.revision, p_band: band, p_enabled: on });
      if (error) throw error;
      await refresh();
      toast.success(`${guestTypeName(row)} policy ${on ? 'activated' : 'deactivated'}.`);
    } catch (e) { toast.error(guestPolicySaveError(e)); } finally { setToggling(false); }
  }

  const setBand = (patch: Partial<GuestAgeBand>) => form && setForm({ ...form, band: { ...form.band, ...patch } });

  return (
    <main className="p-6 space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Guest Type Policy</h1>
          <p className="text-sm text-muted-foreground">Pricing status: {live ? 'Live' : 'Staged — not applied to live prices'}</p>
        </div>
        <Button disabled={!policy.data} onClick={() => { setFormError(null); setForm({ mode: 'new', band: { key: '', name: '', min_age: 0, max_age: 0, accommodation_rule: 'guest_type', meal_rule: 'full' } }); }}>
          <Plus className="h-4 w-4 mr-1" /> New Policy
        </Button>
      </div>

      {policy.isLoading && <p>Loading policy…</p>}
      {history.isError && <p role="alert" className="text-destructive">Could not load policy history. <Button size="sm" onClick={() => history.refetch()}>Try again</Button></p>}
      {policy.isError && <p role="alert">Could not load the saved policy. <Button size="sm" onClick={() => policy.refetch()}>Try again</Button></p>}

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
                  <TableCell className="font-medium">{guestTypeName(r)}</TableCell>
                  <TableCell>{r.min_age}</TableCell>
                  <TableCell>{r.max_age ?? 'No limit'}</TableCell>
                  <TableCell>{accLabel(r.accommodation_rule)}</TableCell>
                  <TableCell>{mealLabel(r.meal_rule)}</TableCell>
                  <TableCell><div className="flex items-center gap-2 whitespace-nowrap"><Switch aria-label={`${r.active ? 'Deactivate' : 'Activate'} ${guestTypeName(r)} policy revision ${r.revision}`} checked={r.active} disabled={saving || toggling || (r.active && !alternateGuestPolicy(r, rows, policy.data.bands))} title={r.active && !alternateGuestPolicy(r, rows, policy.data.bands) ? 'An alternate policy for the same ages is required before deactivation' : undefined} onCheckedChange={(on) => setActive(r, on)} /><span className="text-sm">{r.active ? 'Active' : 'Deactivated'}</span></div></TableCell>
                  <TableCell className="text-right">
                    {r.current && (
                      <Button size="icon" variant="ghost" aria-label={`Edit ${guestTypeName(r)} policy`} disabled={saving || toggling}
                        onClick={() => { setFormError(null); const { id: _i, revision: _r, active: _a, current: _c, ...band } = r; setForm({ mode: 'edit', band: { ...band, name: guestTypeName(band) } }); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
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
          <DialogHeader>
            <DialogTitle>{form?.mode === 'new' ? 'New Policy' : `Edit ${form ? guestTypeName(form.band) : ''} Policy`}</DialogTitle>
            <DialogDescription>{live ? 'Live pricing requires continuous age ranges and an Adult policy with no upper age limit.' : 'This policy is staged and is not applied to live prices.'}</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid gap-3">
              <label className="text-sm">Guest Type
                <Input aria-label="Guest Type" value={form.band.name ?? guestTypeName(form.band)} onChange={e => {
                  const name=e.target.value; const key=form.mode==='new' ? guestTypeKey(name) : form.band.key;
                  setBand({name,key,accommodation_rule:form.band.accommodation_rule==='free' ? 'free' : guestTypeChargeRule(key)}); setFormError(null);
                }} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Minimum Age<Input type="number" min={0} step={1} value={form.band.min_age} onChange={(e) => setBand({ min_age: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>
                <div className="space-y-2"><label className="text-sm">Maximum Age<Input aria-label="Maximum Age" disabled={form.band.max_age===null} type="number" min={0} step={1} value={form.band.max_age ?? ''} onChange={(e) => setBand({ max_age: e.target.value === '' ? NaN : Number(e.target.value) })} /></label><label className="flex items-center gap-2 text-sm"><Switch aria-label="No Limit" checked={form.band.max_age===null} onCheckedChange={on=>setBand({max_age:on ? null : form.band.min_age})} />No Limit</label></div>
              </div>
              <label className="text-sm">Accommodation Charge
                <Select value={form.band.accommodation_rule === 'free' ? 'free' : 'guest_type'} onValueChange={(v) => setBand({ accommodation_rule: v === 'free' ? 'free' : guestTypeChargeRule(form.band.key) })}>
                  <SelectTrigger aria-label="Accommodation Charge"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="free">No Charge</SelectItem><SelectItem value="guest_type">Guest Type Charge</SelectItem></SelectContent>
                </Select>
              </label>
              <label className="text-sm">Meal Charge
                <Select value={form.band.meal_rule} onValueChange={(v) => setBand({ meal_rule: v as GuestAgeBand['meal_rule'] })}>
                  <SelectTrigger aria-label="Meal Charge"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="free">No Charge</SelectItem><SelectItem value="full">Guest Type Charge</SelectItem></SelectContent>
                </Select>
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

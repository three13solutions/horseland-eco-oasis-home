import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readDistributionInventory as readGrid, saveDistributionInventory } from '@/lib/distributionInventoryApi';
import { supabase } from '@/integrations/supabase/client';
import { addDays, bulkChanges, cellKey, dateRange, hotelToday, makeChange, validDate, type InventoryChange } from '@/lib/distribution-inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Info, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import DistributionHolds from '@/components/admin/DistributionHolds';

const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', ...options }).format(new Date(`${date}T12:00:00Z`));

export default function WebsiteAvailability() {
  const today = hotelToday();
  const [start, setStart] = useState(today);
  const [draft, setDraft] = useState<Record<string, InventoryChange>>({});
  const [inputs, setInputs] = useState<Record<string, { value: string; version: number; error: string }>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDays(today, 6));
  const [count, setCount] = useState('');
  const [applying, setApplying] = useState(false);
  const [draftStorageKey, setDraftStorageKey] = useState<string | null>(null);
  const [recovered, setRecovered] = useState(false);
  const client = useQueryClient();
  const saveRequest = useRef<{ signature: string; id: string } | null>(null);
  const end = addDays(start, 6);
  const query = useQuery({ queryKey: ['distribution-inventory', start, end], queryFn: () => readGrid(start, end), refetchOnWindowFocus: true });
  const changes = Object.values(draft);
  const dirty = changes.length > 0 || Object.keys(inputs).length > 0;
  const enabled = !!query.data?.enabled && !query.isError;
  const cells = useMemo(() => new Map((query.data?.cells || []).map(cell => [cellKey(cell.category_id, cell.date), cell])), [query.data]);
  const busy = applying;

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active || !data.session?.user.id) return;
      const key = `distribution-inventory-draft:${data.session.user.id}`;
      try {
        const saved = sessionStorage.getItem(key);
        if (saved) {
          const previous = JSON.parse(saved);
          if (previous.schema === 1 && previous.draft && typeof previous.draft === 'object') {
            setDraft(previous.draft); setInputs(previous.inputs || {});
            if (typeof previous.start === 'string' && validDate(previous.start)) setStart(previous.start);
            if (previous.save_request?.id && previous.save_request?.signature) saveRequest.current = previous.save_request;
            setRecovered(true);
          }
        }
      } catch { /* A corrupt or disabled local cache must never prevent loading live inventory. */ }
      setDraftStorageKey(key);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!draftStorageKey) return;
    try {
      if (dirty) sessionStorage.setItem(draftStorageKey, JSON.stringify({ schema: 1, start, draft, inputs, save_request: saveRequest.current }));
      else sessionStorage.removeItem(draftStorageKey);
    } catch { /* Navigation confirmation remains active when session storage is unavailable. */ }
  }, [draftStorageKey, start, draft, inputs, dirty]);

  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a') : null;
      if (target && target.href !== location.href && !window.confirm('Leave this page? Unsaved availability edits will be retained in this browser session when storage is available.')) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); };
  }, [dirty]);

  const save = useMutation({
    mutationFn: async () => {
      if (!enabled || !changes.length) throw new Error('There are no saveable changes.');
      if (Object.keys(inputs).length) throw new Error('Finish editing the highlighted cells before saving.');
      const canonicalChanges = [...changes].sort((a, b) => cellKey(a.category_id, a.date).localeCompare(cellKey(b.category_id, b.date)));
      const signature = JSON.stringify(canonicalChanges);
      if (saveRequest.current?.signature !== signature) saveRequest.current = { signature, id: crypto.randomUUID() };
      if (draftStorageKey) { try { sessionStorage.setItem(draftStorageKey, JSON.stringify({ schema: 1, start, draft, inputs, save_request: saveRequest.current })); } catch { /* Retry stays stable in this mounted page. */ } }
      await saveDistributionInventory(canonicalChanges, saveRequest.current.id);
    },
    onSuccess: async () => { setDraft({}); setInputs({}); await client.invalidateQueries({ queryKey: ['distribution-inventory'] }); toast.success('Room inventory saved. Room statuses were not changed.'); },
    onError: (error: Error & { code?: string }) => toast.error(error.code === '40001' ? 'Availability changed while you were editing. Nothing from this request was applied. Discard and refresh, then review your counts again.' : `Save not confirmed: ${error.message}. Your changes are retained. Retry without editing to safely check the same request.`),
  });

  const move = (next: string) => {
    if (dirty && !window.confirm('Discard unsaved changes and change the displayed week?')) return;
    setDraft({}); setInputs({}); setStart(next);
  };
  const apply = async () => {
    try {
      dateRange(from, to);
      setApplying(true);
      const latest = await readGrid(from, to);
      const patches = bulkChanges(latest, selected, from, to, count);
      // Preserve the version originally edited: concurrent updates must conflict, not be overwritten.
      setDraft(old => Object.fromEntries([...Object.entries(old), ...patches.map(patch => {
        const key = cellKey(patch.category_id, patch.date);
        return [key, { ...patch, expected_version: old[key]?.expected_version ?? patch.expected_version }];
      })]));
      setInputs(old => Object.fromEntries(Object.entries(old).filter(([key]) => !patches.some(patch => cellKey(patch.category_id, patch.date) === key))));
      toast.success(`${patches.length} category/date cells prepared. Review, then save.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not prepare the update.'); }
    finally { setApplying(false); }
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-3xl font-heading font-bold">Room Inventory</h1><p className="mt-1 text-muted-foreground">Enter how many more rooms guests can book on the website.</p></div>
      <Button asChild variant="outline"><Link to="/admin/distribution/channels">Channels</Link></Button>
    </div>
    <div className="flex gap-6 border-b"><span className="border-b-2 border-primary pb-3 font-medium text-primary">Room Inventory</span><Link className="pb-3 text-muted-foreground" to="/admin/pricing/rate-plans">Rate Plans</Link></div>
    <Alert><Info className="h-4 w-4" /><AlertDescription>Website inventory only. Offline and OTA bookings stay in your existing systems. These counts do not change any individual room’s status.</AlertDescription></Alert>
    {recovered && dirty && <Alert><Info className="h-4 w-4" /><AlertDescription>Unsaved edits were recovered from this browser session. Review all pending dates before saving; stale edits will be rejected. <Button variant="link" className="h-auto p-0" onClick={() => { setDraft({}); setInputs({}); setRecovered(false); }}>Discard recovered edits</Button></AlertDescription></Alert>}
    {query.isError && <Alert variant="destructive"><AlertDescription>Availability controls could not be loaded. No inventory or room statuses have changed. <Button variant="link" className="h-auto p-0 text-inherit" onClick={() => query.refetch()}>Retry</Button></AlertDescription></Alert>}
    {query.data && !enabled && <Alert><ShieldCheck className="h-4 w-4" /><AlertDescription>{query.data.readiness_message || 'Inventory controls are staged, not activated. Saving is disabled until booking and payment safeguards are verified.'}</AlertDescription></Alert>}
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3"><CardTitle>Available rooms</CardTitle><div className="flex items-center gap-2">
        <Button aria-label="Previous week" size="icon" variant="outline" disabled={start <= today || save.isPending || busy} onClick={() => move(addDays(start, -7) < today ? today : addDays(start, -7))}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="min-w-36 text-center text-sm font-medium">{dateLabel(start, { month: 'long', year: 'numeric' })}</span>
        <Button aria-label="Next week" size="icon" variant="outline" disabled={save.isPending || busy} onClick={() => move(addDays(start, 7))}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="outline" disabled={save.isPending || busy} onClick={() => move(today)}>Today</Button>
      </div></CardHeader>
      <CardContent className="p-0"><Table><TableHeader><TableRow><TableHead className="min-w-36">Category</TableHead>{dateRange(start, end).map(date => <TableHead key={date} className="min-w-28 text-center"><div className="font-semibold">{dateLabel(date, { weekday: 'short', day: 'numeric' })}</div><div className="text-xs">{dateLabel(date, { month: 'short' })}</div></TableHead>)}</TableRow></TableHeader><TableBody>
        {query.isLoading ? <TableRow><TableCell colSpan={8} className="p-8 text-center text-muted-foreground">Loading current availability…</TableCell></TableRow> : query.data?.categories.map(category => <TableRow key={category.id}><TableCell className="font-semibold">{category.name}</TableCell>{dateRange(start, end).map(date => {
          const key = cellKey(category.id, date); const cell = cells.get(key); const patch = draft[key];
          const value = inputs[key]?.value ?? String(patch?.remaining ?? cell?.remaining ?? '');
          const soldOut = value === '0';
          return <TableCell key={date} className="align-top text-center"><Input type="number" inputMode="numeric" min="0" max={cell?.physical_remaining} step="1" value={value} aria-label={`${category.name}, ${date}, rooms available`} aria-invalid={inputs[key] !== undefined} aria-describedby={inputs[key] ? `error-${key}` : undefined} className={`text-center ${soldOut ? 'border-destructive/40 bg-destructive/5 text-destructive' : patch ? 'border-primary bg-primary/5' : ''}`} disabled={!enabled || !cell || save.isPending || busy} onChange={event => {
            if (!cell) return;
            const raw = event.target.value;
            const version = draft[key]?.expected_version ?? inputs[key]?.version ?? cell.version;
            try {
              const change = makeChange(cell, raw);
              setDraft(old => ({ ...old, [key]: { ...change, expected_version: version } }));
              setInputs(old => { const next = { ...old }; delete next[key]; return next; });
            } catch (error) {
              setInputs(old => ({ ...old, [key]: { value: raw, version, error: error instanceof Error ? error.message : 'Invalid room count.' } }));
            }
          }} />{inputs[key] && <p id={`error-${key}`} className="mt-1 max-w-32 text-xs text-destructive">{inputs[key].error}</p>}{soldOut ? <p className="mt-1 text-xs text-destructive">Sold out</p> : <p className="mt-1 text-xs text-muted-foreground">{cell ? `Up to ${cell.physical_remaining} eligible` : 'Unavailable'}</p>}{patch && <span className="sr-only">Unsaved change</span>}</TableCell>;
        })}</TableRow>)}
      </TableBody></Table><p className="border-t px-4 py-3 text-sm text-muted-foreground">Enter 0 to close website sales for that category and date. Dates are in Mumbai time; each date is an occupied night.</p></CardContent>
    </Card>
    <Card className="border-primary/20 bg-primary/[0.03]"><CardHeader><CardTitle>Update multiple dates</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
      <div><Label>Categories</Label><div className="mt-2 flex flex-wrap gap-3">{query.data?.categories.map(category => <label key={category.id} className="flex items-center gap-2 rounded-md border bg-background p-2 text-sm"><Checkbox checked={selected.includes(category.id)} disabled={!enabled || save.isPending || busy} onCheckedChange={checked => setSelected(old => checked ? [...old, category.id] : old.filter(id => id !== category.id))} />{category.name}</label>)}</div></div>
      <div><Label htmlFor="bulk-from">From</Label><Input id="bulk-from" type="date" min={today} value={from} disabled={!enabled || save.isPending || busy} onChange={e => setFrom(e.target.value)} className="mt-2" /></div>
      <div><Label htmlFor="bulk-to">To (inclusive)</Label><Input id="bulk-to" type="date" min={from || today} value={to} disabled={!enabled || save.isPending || busy} onChange={e => setTo(e.target.value)} className="mt-2" /></div>
      <div><Label htmlFor="bulk-count">Available rooms</Label><Input id="bulk-count" type="number" min="0" step="1" value={count} disabled={!enabled || save.isPending || busy} onChange={e => setCount(e.target.value)} className="mt-2" /></div>
      <Button className="self-end" variant="outline" disabled={!enabled || save.isPending || busy} onClick={apply}>{applying ? 'Checking…' : 'Apply to grid'}</Button>
    </div><p className="text-sm text-muted-foreground">Apply the same remaining count to each selected category and date, up to 90 dates. This is not the total room capacity and does not add to the previous count.</p></CardContent></Card>
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-4 border-t bg-background/95 py-4 backdrop-blur">
      <div><p className="font-medium">{changes.length ? `${changes.length} category/date changes to review` : 'Review your changes, then save.'}</p><p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" />Existing bookings, maintenance, management blocks and unpublished rooms stay protected.</p></div>
      <div className="flex gap-2"><Button variant="outline" disabled={save.isPending || busy} onClick={() => { if (!dirty || window.confirm('Discard all unsaved availability changes?')) { setDraft({}); setInputs({}); query.refetch(); } }}><RefreshCw className="mr-2 h-4 w-4" />{dirty ? 'Discard' : 'Refresh'}</Button><Button disabled={!enabled || !changes.length || Object.keys(inputs).length > 0 || save.isPending || busy} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save changes'}</Button></div>
    </div>
    {changes.length > 0 && <details className="rounded-md border p-4"><summary className="cursor-pointer text-sm font-medium">Review all pending changes, including dates outside this week <Badge variant="secondary" className="ml-2">{changes.length}</Badge></summary><ul className="mt-3 max-h-56 space-y-1 overflow-auto text-sm">{changes.sort((a, b) => a.date.localeCompare(b.date) || a.category_id.localeCompare(b.category_id)).map(change => <li key={cellKey(change.category_id, change.date)}>{query.data?.categories.find(c => c.id === change.category_id)?.name || change.category_id} · {change.date}: {change.remaining === 0 ? 'Sold out' : `${change.remaining} remaining rooms`}</li>)}</ul></details>}
  </div>;
}

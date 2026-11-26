import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { addDays, dateRange, hotelToday, validDate } from '@/lib/distribution-inventory';
import { bulkRateReview, emptyRates, rateCellKey, rateFields, roomTypesFromGrid, sharedRate, weekDates, weeklyReview, type BulkRules, type RateGrid, type RateInputs, type RateReview } from '@/lib/room-rate-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, RefreshCw, Save, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

const labels = { ep: 'EP room', adult: 'Extra adult', child: 'Extra child' };
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', ...options }).format(new Date(`${date}T12:00:00Z`));
const money = (value: number | null | undefined) => value == null ? 'Not set' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
async function readRates(from: string, to: string): Promise<RateGrid> {
  const { data, error } = await supabase.rpc('room_rate_management_grid', { p_from: from, p_to: to });
  if (error) throw error;
  return data as unknown as RateGrid;
}
function PriceFields({ name, value, onChange }: { name: string; value: RateInputs; onChange: (value: RateInputs) => void }) {
  return <div className="grid grid-cols-3 gap-3">{rateFields.map(key => <div key={key}><Label htmlFor={`${name}-${key}`} className="text-xs">{labels[key]} (₹)</Label><Input id={`${name}-${key}`} inputMode="decimal" placeholder="Unchanged" value={value[key]} onChange={event => onChange({ ...value, [key]: event.target.value })} className="mt-1" /></div>)}</div>;
}

export default function RoomRateManagement({ embedded = false }: { embedded?: boolean }) {
  const today = hotelToday();
  const [start, setStart] = useState(today);
  const [draft, setDraft] = useState<Record<string, Partial<RateInputs>>>({});
  const [tab, setTab] = useState('weekly');
  const [selected, setSelected] = useState<string[]>([]);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDays(today, 6));
  const [dateMode, setDateMode] = useState('range');
  const [specificDates, setSpecificDates] = useState<string[]>([]);
  const [dateToAdd, setDateToAdd] = useState(today);
  const [rules, setRules] = useState<BulkRules>({ mode: 'same', same: emptyRates(), weekdays: emptyRates(), weekends: emptyRates(), days: {} });
  const [review, setReview] = useState<RateReview[] | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const client = useQueryClient();
  const end = addDays(start, 6);
  const query = useQuery({ queryKey: ['room-rate-management', start, end], queryFn: () => readRates(start, end), refetchOnWindowFocus: Object.keys(draft).length === 0 });
  const dirty = Object.values(draft).some(inputs => Object.values(inputs).some(value => value !== ''));
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      if (link && link.href !== location.href && !window.confirm('Leave this page and discard unsaved rate changes?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', handler);
    document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', handler); document.removeEventListener('click', navigate, true); };
  }, [dirty]);
  const save = useMutation({
    mutationFn: async () => {
      if (!review?.length) throw new Error('There are no changes to save.');
      const { error } = await supabase.rpc('save_room_rate_management', { p_changes: review.map(row => row.change) });
      if (error) throw error;
    },
    onSuccess: async () => { setReview(null); setDraft({}); setError(''); await client.invalidateQueries(); toast.success('Room rates saved. Meal plans and new website quotes use the updated EP rates.'); },
    onError: (error: Error) => { setError(error.message); toast.error(error.message); setReview(null); },
  });
  const move = (next: string) => {
    if (!validDate(next)) return;
    if (dirty && !window.confirm('Discard unsaved rates and change the week?')) return;
    setDraft({}); setStart(next); setError('');
  };
  const prepare = async (bulk: boolean) => {
    setError(''); setPreparing(true);
    try {
      if (bulk && dirty) throw new Error('Save or discard your weekly edits before applying a bulk update.');
      if (bulk) {
        const dates = dateMode === 'range' ? dateRange(from, to, 366) : [...specificDates].sort();
        if (!dates.length) throw new Error('Select at least one date.');
        const latest = await readRates(dates[0], dates[dates.length - 1]);
        setReview(bulkRateReview(latest, selected, dates, rules));
      } else {
        if (!query.data) throw new Error('Wait for rates to load.');
        const rows = weeklyReview(query.data, draft);
        if (!rows.length) throw new Error('There are no changed prices to save.');
        setReview(rows);
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not prepare changes.'); }
    finally { setPreparing(false); }
  };
  const roomTypes = query.data ? roomTypesFromGrid(query.data) : [];
  const busy = save.isPending || preparing;
  return <div className="space-y-5">
    {!embedded && <div className="flex flex-wrap items-start justify-between gap-3"><h1 className="font-heading text-3xl font-bold">Room Rate Management</h1><Button asChild variant="outline"><Link to="/admin/distribution/inventory">Room Inventory</Link></Button></div>}
    <Tabs value={tab} onValueChange={setTab} className="space-y-4"><TabsList><TabsTrigger value="weekly">Weekly Rate View</TabsTrigger><TabsTrigger value="bulk">Bulk Rate Update</TabsTrigger></TabsList>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {query.isError && <Alert variant="destructive"><AlertDescription>Rates could not be loaded. No prices have changed. <Button variant="link" onClick={() => query.refetch()}>Retry</Button></AlertDescription></Alert>}
      <TabsContent value="weekly" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">Room rates · ₹ / night</p><p className="text-xs text-muted-foreground">EP includes two adults. Extra guest prices exclude meals.</p></div><div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="icon" aria-label="Previous week" disabled={busy} onClick={() => move(addDays(start, -7))}><ChevronLeft className="h-4 w-4" /></Button><Input aria-label="Week starting" type="date" value={start} onChange={event => move(event.target.value)} className="w-40" disabled={busy} /><Button variant="outline" size="icon" aria-label="Next week" disabled={busy} onClick={() => move(addDays(start, 7))}><ChevronRight className="h-4 w-4" /></Button><Button variant="outline" onClick={() => move(today)} disabled={busy}>Today</Button></div></div>
        <div className="overflow-hidden rounded-md border"><Table><TableHeader><TableRow><TableHead className="min-w-40">Room type</TableHead>{weekDates(start).map(date => <TableHead key={date} className="min-w-36 text-center"><p className="font-semibold">{dateLabel(date, { weekday: 'short', day: 'numeric' })}</p><p className="text-xs">{dateLabel(date, { month: 'short', year: 'numeric' })}</p></TableHead>)}</TableRow></TableHeader><TableBody>
          {query.isPending ? <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">Loading saved rates…</TableCell></TableRow> : roomTypes.map(roomType => <TableRow key={roomType.id}><TableCell className="align-top font-semibold">{roomType.name}{!roomType.category_active && <p className="text-xs font-normal text-muted-foreground">Inactive</p>}</TableCell>{weekDates(start).map(date => {
            const entries = query.data?.entries.filter(entry => entry.type_id === roomType.id && entry.date === date) || [];
            const key = rateCellKey(roomType.id, date);
            const editable = entries.length > 0 && entries.every(entry => entry.editable);
            return <TableCell key={date} className={`align-top ${draft[key] ? 'bg-primary/5' : ''}`}><div className="space-y-2">{rateFields.map(field => {
              const saved = sharedRate(entries, field);
              return <label key={field} className="block"><span className="mb-1 block text-xs text-muted-foreground">{labels[field]}</span><Input inputMode="decimal" aria-label={`${roomType.name}, ${date}, ${labels[field]}`} disabled={!editable || busy} value={draft[key]?.[field] ?? saved.value} placeholder={saved.mixed ? 'Mixed' : 'Not set'} className="h-8 text-right" onChange={event => setDraft(old => ({ ...old, [key]: { ...old[key], [field]: event.target.value } }))} /></label>;
            })}</div>{!editable && <p className="mt-2 text-xs text-muted-foreground">{entries.find(entry => !entry.editable)?.reason || 'No saved rates'}</p>}</TableCell>;
          })}</TableRow>)}
        </TableBody></Table></div>
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 py-3 backdrop-blur"><p className="text-sm text-muted-foreground">{dirty ? 'Unsaved rate changes' : 'Saved EP rates'} · {dateLabel(start, { day: 'numeric', month: 'short' })} – {dateLabel(end, { day: 'numeric', month: 'short' })}</p><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => { if (!dirty || window.confirm('Discard unsaved rate changes?')) { setDraft({}); query.refetch(); } }}><RefreshCw className="mr-2 h-4 w-4" />{dirty ? 'Discard' : 'Refresh'}</Button><Button disabled={!dirty || busy || query.isError} onClick={() => prepare(false)}><Save className="mr-2 h-4 w-4" />Save changes</Button></div></div>
      </TabsContent>
      <TabsContent value="bulk" className="space-y-5">
        <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Room types</h2><Button variant="link" className="h-auto p-0" disabled={busy} onClick={() => setSelected(selected.length === roomTypes.length ? [] : roomTypes.map(roomType => roomType.id))}>{selected.length === roomTypes.length ? 'Clear all' : 'Select all'}</Button></div><div className="flex flex-wrap gap-4">{roomTypes.map(roomType => <label key={roomType.id} className="flex items-center gap-2 text-sm"><Checkbox checked={selected.includes(roomType.id)} disabled={busy} onCheckedChange={checked => setSelected(old => checked ? [...old, roomType.id] : old.filter(id => id !== roomType.id))} />{roomType.name}</label>)}</div></section>
        <section className="space-y-3 border-t pt-4"><h2 className="font-semibold">Stay dates</h2><div className="flex flex-wrap items-end gap-3"><div className="w-48"><Label>Date selection</Label><Select value={dateMode} onValueChange={setDateMode}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="range">Date range</SelectItem><SelectItem value="specific">Specific dates</SelectItem></SelectContent></Select></div>{dateMode === 'range' ? <><div><Label htmlFor="rate-from">From</Label><Input id="rate-from" type="date" value={from} onChange={event => setFrom(event.target.value)} className="mt-1" /></div><div><Label htmlFor="rate-to">Through (inclusive)</Label><Input id="rate-to" type="date" value={to} min={from} onChange={event => setTo(event.target.value)} className="mt-1" /></div></> : <><Input aria-label="Add stay date" type="date" value={dateToAdd} onChange={event => setDateToAdd(event.target.value)} className="w-44" /><Button variant="outline" size="icon" aria-label="Add date" onClick={() => { if (validDate(dateToAdd)) setSpecificDates(old => [...new Set([...old, dateToAdd])].sort()); }}><Plus className="h-4 w-4" /></Button></>}</div>{dateMode === 'specific' && <div className="flex flex-wrap gap-3">{specificDates.map(date => <div key={date} className="flex items-center gap-1 text-sm"><span>{date}</span><Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Remove ${date}`} onClick={() => setSpecificDates(old => old.filter(value => value !== date))}><X className="h-3 w-3" /></Button></div>)}</div>}</section>
        <section className="space-y-4 border-t pt-4"><div className="max-w-xs"><Label>Prices by day</Label><Select value={rules.mode} onValueChange={mode => setRules(old => ({ ...old, mode: mode as BulkRules['mode'] }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="same">Same price on all days</SelectItem><SelectItem value="week">Weekday / weekend prices</SelectItem><SelectItem value="specific">Specific days of the week</SelectItem></SelectContent></Select></div><div className="max-w-3xl space-y-4">{rules.mode === 'same' ? <PriceFields name="same" value={rules.same} onChange={same => setRules(old => ({ ...old, same }))} /> : rules.mode === 'week' ? <>{(['weekdays', 'weekends'] as const).map(key => <div key={key} className="space-y-2"><h3 className="text-sm font-medium capitalize">{key}</h3><PriceFields name={key} value={rules[key]} onChange={value => setRules(old => ({ ...old, [key]: value }))} /></div>)}</> : dayNames.map((day, index) => <div key={day} className="space-y-2"><h3 className="text-sm font-medium">{day}</h3><PriceFields name={day} value={rules.days[index] || emptyRates()} onChange={value => setRules(old => ({ ...old, days: { ...old.days, [index]: value } }))} /></div>)}</div></section>
        <div className="flex justify-end border-t pt-4"><Button disabled={busy || query.isError || query.isPending} onClick={() => prepare(true)}>{preparing ? 'Preparing…' : 'Preview changes'}</Button></div>
      </TabsContent>
    </Tabs>
    <Dialog open={review !== null} onOpenChange={open => { if (!open && !save.isPending) setReview(null); }}><DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto" onInteractOutside={event => { if (save.isPending) event.preventDefault(); }}><DialogHeader><DialogTitle>Review room rate changes</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{review?.length} room-type nights · prices before tax · existing bookings stay unchanged</p><Table><TableHeader><TableRow><TableHead>Room type / date</TableHead>{rateFields.map(key => <TableHead key={key}>{labels[key]}</TableHead>)}</TableRow></TableHeader><TableBody>{review?.map(row => <TableRow key={`${row.before.type_id}:${row.before.date}`}><TableCell><p className="font-medium">{row.before.type_name}</p><p className="text-xs text-muted-foreground">{row.before.date}</p></TableCell>{rateFields.map(key => <TableCell key={key}><p className="text-xs text-muted-foreground">{money(row.before[key])}</p>{row.change[key] !== undefined && <p className="font-medium text-primary">→ {money(row.change[key])}</p>}</TableCell>)}</TableRow>)}</TableBody></Table><DialogFooter><Button variant="outline" disabled={save.isPending} onClick={() => setReview(null)}>Cancel</Button><Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Confirm & save'}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
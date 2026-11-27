import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { addDays, dateRange, hotelToday, validDate } from '@/lib/distribution-inventory';
import { bulkRateReview, DEFAULT_ROOM_TYPE_STATUS_FILTER, emptyRates, filterRoomTypesByStatus, rateCellKey, rateFields, roomTypesFromGrid, sharedRate, weekDates, weeklyReview, type BulkRules, type RateField, type RateGrid, type RateInputs, type RateReview, type RoomTypeStatusFilter } from '@/lib/room-rate-management';
import { activeGroups, applyPicks, bulkFormKey, bulkSummary, dayGroup, noPicks, type GroupPicks } from './roomRateBulkForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, RefreshCw, Save, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

const labels: Record<RateField, string> = { ep: 'EP room', adult: 'Extra adult', child: 'Extra child' };
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', ...options }).format(new Date(`${date}T12:00:00Z`));
const isSaturday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay() === 6;
const money = (value: number | null | undefined) => value == null ? 'Not set' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
async function readRates(from: string, to: string): Promise<RateGrid> {
  const { data, error } = await supabase.rpc('room_rate_management_grid', { p_from: from, p_to: to });
  if (error) throw error;
  return data as unknown as RateGrid;
}

function RuleGroup({ name, title, value, picks, disabled, onChange }: { name: string; title?: string; value: RateInputs; picks: GroupPicks[string] | undefined; disabled: boolean; onChange: (value: RateInputs, picks: GroupPicks[string]) => void }) {
  const current = picks ?? noPicks();
  return <fieldset className="rounded-md border p-3" disabled={disabled}>
    {title && <legend className="px-1 text-sm font-medium">{title}</legend>}
    <div className="space-y-2">{rateFields.map(key => {
      const id = `${name}-${key}`;
      return <div key={key} className="grid grid-cols-[1.25rem_7rem_1fr] items-center gap-2">
        <Checkbox id={`${id}-pick`} aria-label={`Change ${labels[key]}${title ? ` (${title})` : ''}`} checked={current[key]} onCheckedChange={checked => onChange(value, { ...current, [key]: checked === true })} />
        <Label htmlFor={`${id}-pick`} className="text-sm font-normal">{labels[key]}</Label>
        <Input id={id} aria-label={`${labels[key]} price${title ? ` (${title})` : ''}`} inputMode="decimal" placeholder={current[key] ? 'Unchanged if blank' : 'Unchanged'} value={value[key]} className="h-8" onChange={event => { const next = event.target.value; onChange({ ...value, [key]: next }, next.trim() && !current[key] ? { ...current, [key]: true } : current); }} />
      </div>;
    })}</div>
  </fieldset>;
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
  const [picks, setPicks] = useState<GroupPicks>({});
  const [review, setReview] = useState<RateReview[] | null>(null);
  const [bulkPreview, setBulkPreview] = useState<{ key: string; rows: RateReview[] } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [statusFilter, setStatusFilter] = useState<RoomTypeStatusFilter>(DEFAULT_ROOM_TYPE_STATUS_FILTER);
  const previewToken = useRef(0);
  const client = useQueryClient();
  const end = addDays(start, 6);
  const query = useQuery({ queryKey: ['room-rate-management', start, end], queryFn: () => readRates(start, end), refetchOnWindowFocus: Object.keys(draft).length === 0 });
  const publication = useQuery({ queryKey: ['room-type-publication-status'], queryFn: async () => { const { data, error } = await supabase.from('room_types').select('id, is_published'); if (error) throw error; return new Map((data ?? []).map(row => [row.id as string, row.is_published !== false])); }, staleTime: 5 * 60 * 1000, retry: false });
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

  const allTypes = query.data ? roomTypesFromGrid(query.data) : [];
  const roomTypes = filterRoomTypesByStatus(allTypes, statusFilter, publication.data ?? null);
  const visibleIds = new Set(roomTypes.map(roomType => roomType.id));
  const visibleSelected = selected.filter(id => visibleIds.has(id));
  const hiddenDirty = Object.entries(draft).filter(([key, inputs]) => Object.values(inputs).some(value => value !== '') && !visibleIds.has(key.split(':')[0])).length;
  const bulkDates = useMemo(() => { try { return dateMode === 'range' ? dateRange(from, to, 366) : [...specificDates].sort(); } catch { return null; } }, [dateMode, from, to, specificDates]);
  const formKey = bulkFormKey({ typeIds: visibleSelected, dates: bulkDates ?? [`invalid:${from}:${to}`], rules, picks });
  // Any form edit retires in-flight and prepared previews so a late response cannot resurrect them.
  useEffect(() => { previewToken.current += 1; setBulkPreview(null); setBulkError(''); }, [formKey]);
  const shownPreview = bulkPreview && bulkPreview.key === formKey ? bulkPreview : null;

  const save = useMutation({
    mutationFn: async (rows: RateReview[]) => {
      if (!rows.length) throw new Error('There are no changes to save.');
      const { error } = await supabase.rpc('save_room_rate_management', { p_changes: rows.map(row => row.change) });
      if (error) throw error;
    },
    onSuccess: async () => { setReview(null); setBulkPreview(null); setDraft({}); setError(''); setBulkError(''); await client.invalidateQueries(); toast.success('Room rates saved. Meal plans and new website quotes use the updated EP rates.'); },
    onError: (error: Error) => { setError(error.message); setBulkError(error.message); toast.error(error.message); setReview(null); setBulkPreview(null); },
  });
  const move = (next: string) => {
    if (!validDate(next)) return;
    if (dirty && !window.confirm('Discard unsaved rates and change the week?')) return;
    setDraft({}); setStart(next); setError('');
  };
  const prepareWeekly = () => {
    setError('');
    try {
      if (!query.data) throw new Error('Wait for rates to load.');
      const rows = weeklyReview(query.data, draft, visibleIds);
      if (!rows.length) throw new Error('There are no changed prices to save.');
      setReview(rows);
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not prepare changes.'); }
  };
  const prepareBulk = async () => {
    const token = ++previewToken.current;
    const key = formKey;
    setBulkError(''); setBulkPreview(null); setPreparing(true);
    try {
      if (dirty) throw new Error('Save or discard your weekly edits before applying a bulk update.');
      const dates = dateMode === 'range' ? dateRange(from, to, 366) : [...specificDates].sort();
      if (!dates.length) throw new Error('Select at least one date.');
      const latest = await readRates(dates[0], dates[dates.length - 1]);
      const rows = bulkRateReview(latest, visibleSelected, dates, applyPicks(rules, picks));
      if (token === previewToken.current) setBulkPreview({ key, rows });
    } catch (error) { if (token === previewToken.current) setBulkError(error instanceof Error ? error.message : 'Could not prepare changes.'); }
    finally { if (token === previewToken.current) setPreparing(false); }
  };
  useEffect(() => { setPreparing(false); }, [formKey]);
  const busy = save.isPending || preparing;
  const dates = weekDates(start);
  const summary = shownPreview ? bulkSummary(shownPreview.rows) : null;
  const statusFilterControl = <div className="flex items-center gap-2"><Label htmlFor="room-rate-status-filter" className="text-sm text-muted-foreground">Room status</Label><Select value={statusFilter} onValueChange={value => { if (value === 'all' || value === 'published' || value === 'unpublished') setStatusFilter(value); }}><SelectTrigger id="room-rate-status-filter" aria-label="Room status" className="h-9 w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="unpublished">Unpublished</SelectItem></SelectContent></Select></div>;
  const countText = <p className="text-xs text-muted-foreground">{roomTypes.length} of {allTypes.length} room types{publication.isPending ? ' · checking statuses…' : ''}{hiddenDirty ? <span className="font-medium text-destructive"> · {hiddenDirty} hidden with unsaved edits</span> : null}</p>;
  const setGroup = (group: string, value: RateInputs, groupPicks: GroupPicks[string]) => {
    setPicks(old => ({ ...old, [group]: groupPicks }));
    setRules(old => group === 'same' || group === 'weekdays' || group === 'weekends' ? { ...old, [group]: value } : { ...old, days: { ...old.days, [Number(group.slice(3))]: value } });
  };

  return <div className="space-y-5">
    {!embedded && <div className="flex flex-wrap items-start justify-between gap-3"><h1 className="font-heading text-3xl font-bold">Room Rate Management</h1><Button asChild variant="outline"><Link to="/admin/distribution/inventory">Room Inventory</Link></Button></div>}
    <Tabs value={tab} onValueChange={setTab} className="space-y-4"><TabsList><TabsTrigger value="weekly">Weekly Rate View</TabsTrigger><TabsTrigger value="bulk">Bulk Rate Update</TabsTrigger></TabsList>
      {query.isError && <Alert variant="destructive"><AlertDescription>Rates could not be loaded. No prices have changed. <Button variant="link" onClick={() => query.refetch()}>Retry</Button></AlertDescription></Alert>}

      <TabsContent value="weekly" className="space-y-3">
        <div role="toolbar" aria-label="Weekly rate filters and week" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border bg-muted/30 px-3 py-2">
          {statusFilterControl}
          {countText}
          <div className="ml-auto flex flex-wrap items-center gap-2"><Button variant="outline" size="icon" className="h-9 w-9" aria-label="Previous week" disabled={busy} onClick={() => move(addDays(start, -7))}><ChevronLeft className="h-4 w-4" /></Button><Input aria-label="Week starting" type="date" value={start} onChange={event => move(event.target.value)} className="h-9 w-40" disabled={busy} /><Button variant="outline" size="icon" className="h-9 w-9" aria-label="Next week" disabled={busy} onClick={() => move(addDays(start, 7))}><ChevronRight className="h-4 w-4" /></Button><Button variant="outline" className="h-9" onClick={() => move(today)} disabled={busy}>Today</Button></div>
        </div>
        <p className="text-xs text-muted-foreground">Room rates · ₹ / night · EP includes two adults. Extra guest prices exclude meals. Click any rate to edit.</p>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="border-b bg-muted/40">
              <th scope="col" className="sticky left-0 z-20 w-28 min-w-28 sm:w-36 sm:min-w-36 bg-muted px-3 py-2 text-left font-medium text-muted-foreground">Room type</th>
              <th scope="col" className="sticky left-28 sm:left-36 z-20 min-w-24 border-r bg-muted px-2 py-2 text-left font-medium text-muted-foreground">Rate</th>
              {dates.map(date => <th key={date} scope="col" className={cn('min-w-24 px-1 py-2 text-center font-medium', isSaturday(date) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground', date === today && 'underline decoration-primary decoration-2 underline-offset-4')}><span className="block">{dateLabel(date, { weekday: 'short', day: 'numeric' })}</span><span className="block text-xs font-normal">{dateLabel(date, { month: 'short' })}{isSaturday(date) ? ' · Sat' : ''}</span></th>)}
            </tr></thead>
            <tbody>
              {query.isPending ? <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">Loading saved rates…</td></tr> : roomTypes.length === 0 ? <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">No {statusFilter} room types have saved rates for this week. <Button variant="link" className="h-auto p-0" onClick={() => setStatusFilter('all')}>Show all room types</Button></td></tr> : roomTypes.map(roomType => rateFields.map((field, fieldIndex) => <tr key={`${roomType.id}-${field}`} className={cn(fieldIndex === rateFields.length - 1 && 'border-b')}>
                {fieldIndex === 0 && <th scope="rowgroup" rowSpan={3} className="sticky left-0 z-10 w-28 min-w-28 sm:w-36 sm:min-w-36 border-b bg-background px-3 py-1.5 text-left align-top font-semibold">{roomType.name}{!roomType.category_active && <span className="block text-xs font-normal text-muted-foreground">Inactive</span>}</th>}
                <th scope="row" className="sticky left-28 sm:left-36 z-10 min-w-24 whitespace-nowrap border-r bg-background px-2 py-0.5 text-left text-xs font-normal text-muted-foreground">{labels[field]}</th>
                {dates.map(date => {
                  const entries = query.data?.entries.filter(entry => entry.type_id === roomType.id && entry.date === date) || [];
                  const key = rateCellKey(roomType.id, date);
                  const editable = entries.length > 0 && entries.every(entry => entry.editable);
                  const saved = sharedRate(entries, field);
                  const drafted = draft[key]?.[field];
                  const changed = drafted !== undefined && drafted !== '' && drafted !== saved.value;
                  const reason = !editable ? entries.find(entry => !entry.editable)?.reason || 'No saved rates' : '';
                  return <td key={date} className={cn('px-1 py-0.5 text-center', isSaturday(date) && 'bg-accent/40')} title={reason || undefined}>
                    <Input inputMode="decimal" aria-label={`${roomType.name}, ${date}, ${labels[field]}`} aria-describedby={reason ? `${key}-reason` : undefined} disabled={!editable || busy} value={drafted ?? saved.value} placeholder={saved.mixed ? 'Mixed' : 'Not set'}
                      className={cn('h-7 w-full min-w-20 rounded-sm border-transparent bg-transparent px-1 text-center shadow-none placeholder:text-xs placeholder:text-muted-foreground hover:border-input focus-visible:border-input focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed', changed && 'border-primary/40 bg-primary/10 font-semibold text-primary')}
                      onChange={event => setDraft(old => ({ ...old, [key]: { ...old[key], [field]: event.target.value } }))} />
                    {reason && fieldIndex === rateFields.length - 1 && <span id={`${key}-reason`} className="block truncate text-[10px] leading-tight text-muted-foreground">{reason}</span>}
                  </td>;
                })}
              </tr>))}
            </tbody>
          </table>
        </div>
        <div className="sticky bottom-0 z-30 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 py-3 backdrop-blur"><p className="text-sm text-muted-foreground">{dirty ? 'Unsaved rate changes' : 'Saved EP rates'} · {dateLabel(start, { day: 'numeric', month: 'short' })} – {dateLabel(end, { day: 'numeric', month: 'short' })}</p><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => { if (!dirty || window.confirm('Discard unsaved rate changes?')) { setDraft({}); query.refetch(); } }}><RefreshCw className="mr-2 h-4 w-4" />{dirty ? 'Discard' : 'Refresh'}</Button><Button disabled={!dirty || busy || query.isError} onClick={prepareWeekly}><Save className="mr-2 h-4 w-4" />Save changes</Button></div></div>
      </TabsContent>

      <TabsContent value="bulk">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div className="space-y-4">
            <section aria-labelledby="bulk-dates" className="space-y-3 rounded-md border p-4">
              <h2 id="bulk-dates" className="font-semibold">1. Dates &amp; days</h2>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-44"><Label htmlFor="bulk-date-mode">Date selection</Label><Select value={dateMode} onValueChange={setDateMode}><SelectTrigger id="bulk-date-mode" className="mt-1 h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="range">Date range</SelectItem><SelectItem value="specific">Specific dates</SelectItem></SelectContent></Select></div>
                {dateMode === 'range' ? <><div><Label htmlFor="rate-from">From</Label><Input id="rate-from" type="date" value={from} onChange={event => setFrom(event.target.value)} className="mt-1 h-9" /></div><div><Label htmlFor="rate-to">Through (inclusive)</Label><Input id="rate-to" type="date" value={to} min={from} onChange={event => setTo(event.target.value)} className="mt-1 h-9" /></div></> : <div className="flex items-end gap-2"><div><Label htmlFor="bulk-add-date">Add date</Label><Input id="bulk-add-date" aria-label="Add stay date" type="date" value={dateToAdd} onChange={event => setDateToAdd(event.target.value)} className="mt-1 h-9 w-44" /></div><Button variant="outline" size="icon" className="h-9 w-9" aria-label="Add date" onClick={() => { if (validDate(dateToAdd)) setSpecificDates(old => [...new Set([...old, dateToAdd])].sort()); }}><Plus className="h-4 w-4" /></Button></div>}
              </div>
              {dateMode === 'specific' && <ul className="flex flex-wrap gap-2" aria-label="Selected dates">{specificDates.length === 0 && <li className="text-sm text-muted-foreground">No dates added yet.</li>}{specificDates.map(date => <li key={date} className="flex items-center gap-1 rounded-md border bg-muted/40 py-0.5 pl-2 text-sm"><span>{dateLabel(date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span><Button variant="ghost" size="icon" className="h-6 w-6" aria-label={`Remove ${date}`} onClick={() => setSpecificDates(old => old.filter(value => value !== date))}><X className="h-3 w-3" /></Button></li>)}</ul>}
              <p className="text-xs text-muted-foreground">{bulkDates ? `${bulkDates.length} date${bulkDates.length === 1 ? '' : 's'} selected` : 'Choose a valid date range (up to 366 dates).'}</p>
            </section>

            <section aria-labelledby="bulk-rooms" className="space-y-3 rounded-md border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="bulk-rooms" className="font-semibold">2. Rooms</h2>{statusFilterControl}</div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span>{visibleSelected.length} of {roomTypes.length} shown selected{selected.length > visibleSelected.length ? ` · ${selected.length - visibleSelected.length} hidden selection${selected.length - visibleSelected.length === 1 ? '' : 's'} won't be applied` : ''}</span><Button variant="link" className="h-auto p-0 text-xs" disabled={busy || roomTypes.length === 0} onClick={() => setSelected(old => [...new Set([...old, ...roomTypes.map(roomType => roomType.id)])])}>Select all shown</Button><Button variant="link" className="h-auto p-0 text-xs" disabled={busy || selected.length === 0} onClick={() => setSelected([])}>Clear</Button></div>
              <div className="grid gap-2 sm:grid-cols-2">{roomTypes.length === 0 ? <p className="text-sm text-muted-foreground">No {statusFilter} room types to select. <Button variant="link" className="h-auto p-0" onClick={() => setStatusFilter('all')}>Show all room types</Button></p> : roomTypes.map(roomType => <label key={roomType.id} className="flex items-center gap-2 text-sm"><Checkbox checked={selected.includes(roomType.id)} disabled={busy} onCheckedChange={checked => setSelected(old => checked ? [...new Set([...old, roomType.id])] : old.filter(id => id !== roomType.id))} />{roomType.name}{!roomType.category_active && <span className="text-xs text-muted-foreground">(inactive)</span>}</label>)}</div>
            </section>

            <section aria-labelledby="bulk-rates" className="space-y-3 rounded-md border p-4">
              <h2 id="bulk-rates" className="font-semibold">3. Rates to change</h2>
              <div className="max-w-xs"><Label htmlFor="bulk-price-mode">Prices by day</Label><Select value={rules.mode} onValueChange={mode => setRules(old => ({ ...old, mode: mode as BulkRules['mode'] }))}><SelectTrigger id="bulk-price-mode" className="mt-1 h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="same">Same price on all days</SelectItem><SelectItem value="week">Weekday / weekend prices</SelectItem><SelectItem value="specific">Specific days of the week</SelectItem></SelectContent></Select></div>
              <p className="text-xs text-muted-foreground">Tick a field to change it. Unticked or blank fields stay unchanged; 0 is a valid price.{rules.mode === 'week' ? ' Weekend follows the hotel pricing calendar (currently Saturday).' : ''}</p>
              <div className={cn('grid gap-3', rules.mode !== 'same' && 'md:grid-cols-2')}>
                {activeGroups(rules.mode).map(group => {
                  const value = group === 'same' || group === 'weekdays' || group === 'weekends' ? rules[group] : rules.days[Number(group.slice(3))] || emptyRates();
                  const title = group === 'same' ? undefined : group === 'weekdays' ? 'Weekdays' : group === 'weekends' ? 'Weekend' : dayNames[Number(group.slice(3))];
                  return <RuleGroup key={group} name={`bulk-${group}`} title={title} value={value} picks={picks[group]} disabled={busy} onChange={(next, nextPicks) => setGroup(group, next, nextPicks)} />;
                })}
              </div>
            </section>
          </div>

          <aside aria-labelledby="bulk-review" className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <div className="space-y-3 rounded-md border bg-muted/20 p-4">
              <h2 id="bulk-review" className="font-semibold">Before / after review</h2>
              <p className="text-xs text-muted-foreground">Prices before tax · existing bookings stay unchanged · rates are re-read when you preview.</p>
              {dirty && <Alert><AlertDescription>Save or discard your weekly edits before applying a bulk update.</AlertDescription></Alert>}
              {bulkError && <Alert variant="destructive"><AlertDescription>{bulkError}</AlertDescription></Alert>}
              <Button variant="outline" className="w-full" disabled={busy || dirty || query.isError || query.isPending} onClick={prepareBulk}>{preparing ? 'Preparing…' : shownPreview ? 'Refresh preview' : 'Preview changes'}</Button>
              {shownPreview && summary ? <>
                <dl className="grid grid-cols-3 gap-2 text-center" aria-live="polite">
                  <div className="rounded-md border bg-background p-2"><dt className="text-xs text-muted-foreground">Dates</dt><dd className="font-semibold">{summary.dates}</dd></div>
                  <div className="rounded-md border bg-background p-2"><dt className="text-xs text-muted-foreground">Rooms</dt><dd className="font-semibold">{summary.rooms}</dd></div>
                  <div className="rounded-md border bg-background p-2"><dt className="text-xs text-muted-foreground">Changes</dt><dd className="font-semibold">{summary.fields}</dd></div>
                </dl>
                <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-md border bg-background text-sm">{shownPreview.rows.map(row => <li key={`${row.before.type_id}:${row.before.date}`} className="px-3 py-2"><p className="font-medium">{row.before.type_name} <span className="font-normal text-muted-foreground">· {dateLabel(row.before.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span></p>{rateFields.filter(key => row.change[key] !== undefined).map(key => <p key={key} className="flex justify-between gap-2 text-xs"><span className="text-muted-foreground">{labels[key]}</span><span><span className="text-muted-foreground line-through">{money(row.before[key])}</span> → <span className="font-semibold text-primary">{money(row.change[key])}</span></span></p>)}</li>)}</ul>
              </> : !bulkError && <p className="text-sm text-muted-foreground">Preview to see each room and night before anything is saved. Editing the form clears the preview.</p>}
              <Button className="w-full" disabled={!shownPreview || summary?.fields === 0 || busy || dirty} onClick={() => shownPreview && save.mutate(shownPreview.rows)}>{save.isPending ? 'Applying…' : `Apply ${summary?.fields ?? 0} rate change${summary?.fields === 1 ? '' : 's'}`}</Button>
            </div>
          </aside>
        </div>
      </TabsContent>
    </Tabs>
    <Dialog open={review !== null} onOpenChange={open => { if (!open && !save.isPending) setReview(null); }}><DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto" onInteractOutside={event => { if (save.isPending) event.preventDefault(); }}><DialogHeader><DialogTitle>Review room rate changes</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{review?.length} room-type nights · prices before tax · existing bookings stay unchanged</p><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 font-medium">Room type / date</th>{rateFields.map(key => <th key={key} className="py-2 font-medium">{labels[key]}</th>)}</tr></thead><tbody>{review?.map(row => <tr key={`${row.before.type_id}:${row.before.date}`} className="border-b"><td className="py-2"><p className="font-medium">{row.before.type_name}</p><p className="text-xs text-muted-foreground">{row.before.date}</p></td>{rateFields.map(key => <td key={key} className="py-2"><p className="text-xs text-muted-foreground">{money(row.before[key])}</p>{row.change[key] !== undefined && <p className="font-medium text-primary">→ {money(row.change[key])}</p>}</td>)}</tr>)}</tbody></table><DialogFooter><Button variant="outline" disabled={save.isPending} onClick={() => setReview(null)}>Cancel</Button><Button disabled={save.isPending} onClick={() => review && save.mutate(review)}>{save.isPending ? 'Saving…' : 'Confirm & save'}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

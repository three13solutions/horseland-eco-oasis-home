import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ratePlanPreview, validateRatePlan, supplementsForDate, type MealSupplementVersion, type RatePlanAnchor, type SourceMealPlan, type SupplementRates } from '@/lib/rate-plans';
import { validateSetupExtraRates, canConfirmPricingCleanup, type PricingCleanupPreview } from '@/lib/pricing-setup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Calculator, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

// New schema is managed by the rate-plan migration; keep row types explicit here.
const db = supabase as SupabaseClient;
type Scope = 'category' | 'type' | 'unit';
type Named = { id: string; name: string };
type RoomType = Named & { base_price: number | null; pricing_status: 'legacy' | 'configuration_required' | 'ready'; category_id: string | null };
type Unit = { id: string; unit_number: string; unit_name: string | null; room_type_id: string };
type Meal = { plan_code: SourceMealPlan; supplement_per_person_inr: number | null; is_active: boolean };
const codes: SourceMealPlan[] = ['RO', 'BB', 'HB', 'FB'];
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
const initial = () => ({ name:'', scope:'type' as Scope, scopeId:'', amount:'', source:'RO' as SourceMealPlan, quotedNights:'1', includedAdults:'2', start:'', end:'', min:'1', max:'', day:'all' as RatePlanAnchor['day_type'], extraAdult:'', extraChild:'', extraInfant:'0', priority:'0', losType:'' as '' | 'fixed' | 'percentage', losMin:'2', losValue:'', previewNights:'2', active:false, verified:false });
const nullableNumber = (value: string) => value.trim() === '' ? null : Number(value);

export default function RatePlans() {
  const client = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RatePlanAnchor | null>(null);
  const [form, setForm] = useState(initial);
  const [cleanupTypeId, setCleanupTypeId] = useState<string | null>(null);
  const [cleanupName, setCleanupName] = useState('');
  const [cleanupAcknowledged, setCleanupAcknowledged] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const previewDate = open && form.start ? form.start : today;
  const history = useQuery({
    queryKey:['rate-plan-history',editing?.id],
    enabled:!!editing?.id && open,
    queryFn: async()=>{ const {data:versions,error}=await db.from('rate_plan_anchor_versions').select('id,recorded_at,snapshot').eq('anchor_id',editing!.id).order('recorded_at',{ascending:false}).limit(10); if(error)throw error; return versions as {id:string;recorded_at:string;snapshot:Partial<RatePlanAnchor>}[]; },
  });
  const query = useQuery({
    queryKey: ['rate-plan-admin'],
    queryFn: async () => {
      const responses = await Promise.all([
        db.from('rate_plan_anchors').select('*').order('name'),
        db.from('room_categories').select('id,name').order('name'),
        db.from('room_types').select('id,name,base_price,category_id,pricing_status').order('name'),
        db.from('room_units').select('id,unit_number,unit_name,room_type_id').order('unit_number'),
        db.from('meal_plan_rules').select('plan_code,supplement_per_person_inr,is_active'),
        db.from('meal_supplement_versions').select('id,plan_code,amount,effective_from,recorded_at'),
      ]);
      for (const response of responses) if (response.error) throw response.error;
      return { anchors:responses[0].data as RatePlanAnchor[], categories:responses[1].data as Named[], types:responses[2].data as RoomType[], units:responses[3].data as Unit[], meals:responses[4].data as Meal[], versions:responses[5].data as MealSupplementVersion[] };
    },
  });
  const data = query.data;
  const cleanupPreview = useQuery({
    queryKey: ['pricing-cleanup-preview', cleanupTypeId],
    enabled: !!cleanupTypeId,
    staleTime: 0,
    queryFn: async () => {
      const {data: preview, error} = await db.rpc('get_room_type_pricing_cleanup_preview', {p_type_id: cleanupTypeId});
      if (error) throw error;
      if (!preview || preview.type_id !== cleanupTypeId) throw new Error('The cleanup preview does not match this room type. Close and try again.');
      return preview as PricingCleanupPreview;
    },
  });
  useEffect(() => { setCleanupName(''); setCleanupAcknowledged(false); }, [cleanupPreview.data?.fingerprint]);
  const closeCleanup = () => { setCleanupTypeId(null); setCleanupName(''); setCleanupAcknowledged(false); };
  const clearPricing = useMutation({
    mutationFn: async () => {
      const preview = cleanupPreview.data;
      if (cleanupPreview.isFetching || cleanupPreview.error || !canConfirmPricingCleanup(preview, cleanupName, cleanupAcknowledged) || preview?.type_id !== cleanupTypeId) {
        throw new Error('Review the current preview, type the exact room-type name and confirm permanent deletion.');
      }
      const {error} = await db.rpc('clear_room_type_pricing', {
        p_type_id: preview.type_id,
        p_confirmation_name: cleanupName,
        p_expected_fingerprint: preview.fingerprint,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      closeCleanup();
      client.invalidateQueries();
      toast.success('Pricing cleared. Complete pricing setup before this room type can accept new bookings.');
    },
    onError: (error: Error) => {
      setCleanupName(''); setCleanupAcknowledged(false);
      client.invalidateQueries({queryKey: ['pricing-cleanup-preview', cleanupTypeId]});
      toast.error(error.message);
    },
  });
  const unitCount = (typeId: string) => data?.units.filter(unit => unit.room_type_id === typeId).length || 0;
  const setup = (typeId: string) => { setEditing(null); setForm({...initial(), scope:'type', scopeId:typeId}); setOpen(true); };
  useEffect(() => {
    const typeId = searchParams.get('room_type_id');
    if (!data || !typeId) return;
    if (data.types.some(type => type.id === typeId) && data.units.some(unit => unit.room_type_id === typeId)) {
      setEditing(null); setForm({...initial(), scope:'type', scopeId:typeId}); setOpen(true);
    } else toast.error('Assign a unit to this room type before configuring its pricing.');
    const next = new URLSearchParams(searchParams); next.delete('room_type_id'); setSearchParams(next, {replace:true});
  }, [data, searchParams, setSearchParams]);
  const supplements = useMemo(() => supplementsForDate(data?.versions || [], previewDate), [data,previewDate]);
  const scopeLabel = (anchor: Pick<RatePlanAnchor, 'room_category_id' | 'room_type_id' | 'room_unit_id'>) => {
    if (anchor.room_unit_id) { const unit=data?.units.find(u=>u.id===anchor.room_unit_id); return `Unit ${unit?.unit_number || anchor.room_unit_id}`; }
    if (anchor.room_type_id) return `Room type: ${data?.types.find(t=>t.id===anchor.room_type_id)?.name || anchor.room_type_id}`;
    return `Category: ${data?.categories.find(c=>c.id===anchor.room_category_id)?.name || anchor.room_category_id}`;
  };
  const payload = (): Omit<RatePlanAnchor, 'id'> => ({
    name:form.name.trim(), room_category_id:form.scope==='category'?form.scopeId:null,
    room_type_id:form.scope==='type'?form.scopeId:null, room_unit_id:form.scope==='unit'?form.scopeId:null,
    amount:Number(form.amount),source_meal_plan_code:form.source,quoted_nights:Number(form.quotedNights),included_adults:Number(form.includedAdults),
    start_date:form.start||null,end_date:form.end||null,min_nights:Number(form.min),max_nights:nullableNumber(form.max),day_type:form.day,
    extra_adult_per_night:nullableNumber(form.extraAdult),extra_child_per_night:nullableNumber(form.extraChild),extra_infant_per_night:Number(form.extraInfant),
    los_min_nights:form.losType?Number(form.losMin):null,los_adjustment_type:form.losType||null,los_adjustment_value:form.losType?Number(form.losValue):null,
    priority:Number(form.priority),is_active:form.active,verified_basis:form.verified,source_override_id:editing?.source_override_id||null,
  });
  let preview: SupplementRates | null=null; let previewError='';
  try { if(form.amount.trim()) preview=ratePlanPreview(payload(), supplements, Number(form.previewNights)); } catch(error) { previewError=error instanceof Error?error.message:'Invalid price'; }
  const close = () => { setOpen(false); setEditing(null); setForm(initial()); };
  const save = useMutation({
    mutationFn: async () => {
      if(form.scope==='type' && !unitCount(form.scopeId)) throw new Error('Assign a unit to this room type before configuring pricing.');
      const targetTypeId = form.scope === 'type' ? form.scopeId : form.scope === 'unit' ? data?.units.find(unit => unit.id === form.scopeId)?.room_type_id : undefined;
      const targetType = data?.types.find(type => type.id === targetTypeId);
      validateSetupExtraRates(targetType?.pricing_status, form.active, form.verified, form.extraAdult, form.extraChild);
      if(!form.amount.trim()) throw new Error('Enter the source price.');
      const value=validateRatePlan(payload(), supplements);
      if(editing) {
        let request=db.from('rate_plan_anchors').update(value).eq('id',editing.id);
        if(editing.updated_at) request=request.eq('updated_at',editing.updated_at);
        const {data:written,error}=await request.select('id').maybeSingle();
        if(error) throw error;
        if(!written) throw new Error('This rate changed while you were editing. Close and refresh before trying again.');
      } else {
        const {error}=await db.from('rate_plan_anchors').insert(value).select('id').single();
        if(error) throw error;
      }
    },
    onSuccess: () => { client.invalidateQueries({queryKey:['rate-plan-admin']}); client.invalidateQueries({queryKey:['rate-plan-history']}); client.invalidateQueries({queryKey:['rate-variants']}); toast.success(editing?'Rate updated':'Rate created'); close(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const edit = (anchor: RatePlanAnchor) => {
    setEditing(anchor);
    setForm({name:anchor.name,scope:anchor.room_unit_id?'unit':anchor.room_type_id?'type':'category',scopeId:anchor.room_unit_id||anchor.room_type_id||anchor.room_category_id||'',amount:String(anchor.amount),source:anchor.source_meal_plan_code,quotedNights:String(anchor.quoted_nights),includedAdults:String(anchor.included_adults),start:anchor.start_date||'',end:anchor.end_date||'',min:String(anchor.min_nights),max:anchor.max_nights==null?'':String(anchor.max_nights),day:anchor.day_type,extraAdult:anchor.extra_adult_per_night==null?'':String(anchor.extra_adult_per_night),extraChild:anchor.extra_child_per_night==null?'':String(anchor.extra_child_per_night),extraInfant:String(anchor.extra_infant_per_night),priority:String(anchor.priority),losType:anchor.los_adjustment_type||'',losMin:String(anchor.los_min_nights||2),losValue:anchor.los_adjustment_value==null?'':String(anchor.los_adjustment_value),previewNights:String(anchor.min_nights||1),active:anchor.is_active,verified:anchor.verified_basis});
    setOpen(true);
  };
  const visible = (data?.anchors||[]).filter(anchor=>(filter==='all'||(filter==='active'?anchor.is_active:!anchor.is_active))&&`${anchor.name} ${scopeLabel(anchor)}`.toLowerCase().includes(search.toLowerCase()));
  const field = (key: keyof typeof form, value: string | boolean) => setForm(previous=>({...previous,[key]:value}));
  if(query.isLoading) return <p className="p-6">Loading rate plans…</p>;
  if(query.error) return <Alert variant="destructive"><AlertDescription>Rate plans could not be loaded: {query.error.message}. No values have been changed. <Button variant="outline" onClick={()=>query.refetch()}>Retry</Button></AlertDescription></Alert>;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">Rate Plans</h1><p className="text-muted-foreground">Enter one room or package price. Derive all four meal-plan options.</p></div><Button onClick={()=>{setEditing(null);setForm(initial());setOpen(true);}}><Plus className="mr-2 h-4 w-4"/>Add Rate</Button></div>
    <Alert><Calculator className="h-4 w-4"/><AlertDescription>One entered price remains the reference. Its included meal value is removed once, then the selected meals are added. Extra-person accommodation is separate. <Link className="underline font-medium" to="/admin/pricing/meal-plans">Manage meal supplements</Link>.</AlertDescription></Alert>
    <div className="grid gap-3 sm:grid-cols-4">{codes.map(code=><Card key={code}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{code} supplement</p><p className="text-xl font-semibold">{Number.isFinite(supplements[code])?money(supplements[code]):'Not configured'}</p><p className="text-xs text-muted-foreground">per person / night · {previewDate}</p></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Configured reference rates</CardTitle><CardDescription>Unit overrides take precedence over room-type rates, then category defaults. Eligibility, dates and explicit priority determine which applicable rate is used. Two-night packages are normalized once; no second stay-length discount is applied.</CardDescription></CardHeader><CardContent>
      <div className="flex flex-wrap gap-3 mb-4"><Input aria-label="Search rates" className="sm:max-w-sm" placeholder="Search name or room scope" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Rate status" className={`${selectClass} sm:w-44`} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All rates</option><option value="active">Enabled</option><option value="inactive">Disabled</option></select></div>
      <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Name / scope</TableHead><TableHead>Entered price</TableHead><TableHead>Stay eligibility</TableHead><TableHead>Dates / days</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{visible.map(anchor=><TableRow key={anchor.id}><TableCell><p className="font-medium">{anchor.name}</p><p className="text-xs text-muted-foreground">{scopeLabel(anchor)}</p></TableCell><TableCell><p>{money(Number(anchor.amount))} · {anchor.source_meal_plan_code}</p><p className="text-xs text-muted-foreground">covers {anchor.quoted_nights} night(s), {anchor.included_adults} adult(s)</p><p className="text-xs">{money(Number(anchor.amount)/anchor.quoted_nights)} / night before conversion</p></TableCell><TableCell>{anchor.min_nights}{anchor.max_nights?`–${anchor.max_nights}`:'+'} night(s)</TableCell><TableCell className="text-xs">{anchor.start_date||'No start limit'} → {anchor.end_date||'No end limit'}<p>{anchor.day_type}</p></TableCell><TableCell><Badge variant={anchor.is_active?'default':'secondary'}>{anchor.is_active?'Enabled':'Disabled'}</Badge>{!anchor.verified_basis&&<p className="text-xs text-amber-700 mt-1">Basis unconfirmed</p>}</TableCell><TableCell><Button variant="outline" size="sm" aria-label={`Edit ${anchor.name}`} onClick={()=>edit(anchor)}><Pencil className="h-4 w-4 mr-1"/>Edit</Button></TableCell></TableRow>)}{!visible.length&&<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No matching reference rates.</TableCell></TableRow>}</TableBody></Table></div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Room-type pricing readiness</CardTitle><CardDescription>Empty types have no pricing. After assigning a unit, complete a direct, enabled and verified room-type rate plan. Legacy populated types retain their existing calculation until explicitly classified.</CardDescription></CardHeader><CardContent><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data?.types.map(type=><div key={type.id} className="border rounded p-3 text-sm space-y-2"><div className="flex justify-between gap-2"><span>{type.name}</span><span className="font-medium">{type.base_price == null ? 'Not configured' : money(Number(type.base_price))}</span></div><p className="text-xs text-muted-foreground">{unitCount(type.id)} assigned unit(s) · {unitCount(type.id)===0?'Empty — pricing blank':type.pricing_status==='configuration_required'?'Complete pricing setup required':type.pricing_status==='ready'?'Rate plans configured; date coverage applies':'Legacy rate basis'}</p>{unitCount(type.id)>0 && type.pricing_status==='configuration_required' && <Button size="sm" variant="outline" onClick={()=>setup(type.id)}>Complete pricing setup</Button>}{unitCount(type.id)<=1 && <Button size="sm" variant="outline" onClick={()=>{setCleanupName('');setCleanupAcknowledged(false);setCleanupTypeId(type.id);}}>Clear pricing…</Button>}</div>)}</div></CardContent></Card>
    <Dialog open={!!cleanupTypeId} onOpenChange={value=>{if(!value&&!clearPricing.isPending)closeCleanup();}}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Permanently clear room-type pricing</DialogTitle></DialogHeader>
        {cleanupPreview.isFetching ? <p>Loading current pricing and assignment counts…</p> : cleanupPreview.error ? <Alert variant="destructive"><AlertDescription>{cleanupPreview.error.message}<Button variant="outline" onClick={()=>cleanupPreview.refetch()}>Refresh preview</Button></AlertDescription></Alert> : cleanupPreview.data && <>
          <p className="font-medium">{cleanupPreview.data.name} · {cleanupPreview.data.unit_count} assigned unit(s)</p>
          <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertDescription>This permanently deletes the directly scoped pricing, policy records and rate-plan history listed below, and clears the base price. It cannot be undone. Room types, units and historical booking snapshots are retained. Publication status is unchanged, but new quotes are blocked until complete pricing is configured again.{cleanupPreview.data.unit_count===1 && ' The currently assigned unit will temporarily be unavailable for new bookings.'}</AlertDescription></Alert>
          <div className="text-sm"><p>Base price to clear: {cleanupPreview.data.base_price == null ? 'Already blank' : money(Number(cleanupPreview.data.base_price))}</p><ul className="list-disc pl-5">{Object.entries(cleanupPreview.data.counts).map(([key,count])=><li key={key}>{key.replace(/_/g,' ')}: {count}</li>)}</ul></div>
          {cleanupPreview.data.unit_count>1 ? <p role="alert" className="text-destructive">This action is available only for room types with zero or one assigned unit. No pricing will be cleared.</p> : <>
            <div><Label htmlFor="cleanup-name">Type exactly: {cleanupPreview.data.name}</Label><Input id="cleanup-name" autoComplete="off" value={cleanupName} disabled={clearPricing.isPending} onChange={event=>setCleanupName(event.target.value)}/></div>
            <label className="flex items-start gap-2 text-sm"><Checkbox checked={cleanupAcknowledged} disabled={clearPricing.isPending} onCheckedChange={checked=>setCleanupAcknowledged(checked===true)}/><span>I understand this is permanent and new bookings require complete pricing setup afterwards.</span></label>
          </>}
        </>}
        <DialogFooter><Button variant="outline" disabled={clearPricing.isPending} onClick={closeCleanup}>Cancel</Button><Button variant="destructive" disabled={clearPricing.isPending||cleanupPreview.isFetching||!!cleanupPreview.error||!canConfirmPricingCleanup(cleanupPreview.data,cleanupName,cleanupAcknowledged)} onClick={()=>clearPricing.mutate()}>{clearPricing.isPending?'Clearing…':'Permanently clear pricing'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={open} onOpenChange={value=>{if(!value&&!save.isPending)close();}}><DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?'Edit':'Add'} Rate Plan</DialogTitle></DialogHeader>
      <form onSubmit={event=>{event.preventDefault();save.mutate();}} className="space-y-5">
        {form.scope==='type' && data?.types.find(type=>type.id===form.scopeId)?.pricing_status==='configuration_required' && <Alert><AlertTriangle className="h-4 w-4"/><AlertDescription>Complete the price basis, included guests, applicable dates and extra-person rates. Enable and verify the rate only when configuration is complete. Uncovered dates remain unavailable, with no automatic inherited fallback.</AlertDescription></Alert>}
        <div><Label htmlFor="rate-name">Rate name</Label><Input id="rate-name" required value={form.name} onChange={e=>field('name',e.target.value)} placeholder="Standard · Diwali · 2+ nights"/></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="rate-scope">Applies to</Label><select id="rate-scope" className={selectClass} value={form.scope} onChange={e=>setForm({...form,scope:e.target.value as Scope,scopeId:''})}><option value="category">Category default</option><option value="type">Room type</option><option value="unit">Individual unit</option></select></div><div><Label htmlFor="rate-scope-id">{form.scope==='category'?'Category':form.scope==='type'?'Room type':'Room unit'}</Label><select id="rate-scope-id" required className={selectClass} value={form.scopeId} onChange={e=>field('scopeId',e.target.value)}><option value="">Choose…</option>{form.scope==='category'?data?.categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>):form.scope==='type'?data?.types.map(item=><option key={item.id} value={item.id} disabled={!unitCount(item.id)}>{item.name}{!unitCount(item.id)?' · Assign a unit first':''}</option>):data?.units.map(item=><option key={item.id} value={item.id}>{item.unit_number} · {item.unit_name}</option>)}</select></div></div>
        <div className="grid gap-4 sm:grid-cols-4"><div><Label htmlFor="source-plan">Entered price includes</Label><select id="source-plan" className={selectClass} value={form.source} onChange={e=>field('source',e.target.value)}><option value="RO">Room Only · RO / EP</option><option value="BB">Breakfast · BB / CP</option><option value="HB">Half Board · HB / MAP</option><option value="FB">Full Board · FB / AP</option></select></div><div><Label htmlFor="rate-amount">Entered amount (₹)</Label><Input id="rate-amount" required type="number" min="0" step="0.01" value={form.amount} onChange={e=>field('amount',e.target.value)}/></div><div><Label htmlFor="quoted-nights">Amount covers nights</Label><Input id="quoted-nights" required type="number" min="1" step="1" value={form.quotedNights} onChange={e=>setForm(previous=>({...previous,quotedNights:e.target.value,losType:Number(e.target.value)>1?'':previous.losType}))}/></div><div><Label htmlFor="included-adults">Included adults</Label><Input id="included-adults" required type="number" min="1" step="1" value={form.includedAdults} onChange={e=>field('includedAdults',e.target.value)}/></div></div>
        <p className="text-xs text-muted-foreground">Use 1 quoted night for a nightly rate. For a two-night package, enter the total and 2 quoted nights. The normalized nightly price applies to every eligible stay night. Included adults do not automatically include children.</p>
        <div className="grid gap-4 sm:grid-cols-4"><div><Label htmlFor="start-date">First stay night</Label><Input id="start-date" type="date" value={form.start} onChange={e=>field('start',e.target.value)}/></div><div><Label htmlFor="end-date">Last stay night (inclusive)</Label><Input id="end-date" type="date" value={form.end} onChange={e=>field('end',e.target.value)}/></div><div><Label htmlFor="min-nights">Minimum stay</Label><Input id="min-nights" required type="number" min="1" value={form.min} onChange={e=>field('min',e.target.value)}/></div><div><Label htmlFor="max-nights">Maximum stay</Label><Input id="max-nights" type="number" min="1" placeholder="No limit" value={form.max} onChange={e=>field('max',e.target.value)}/></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="rate-days">Stay nights</Label><select id="rate-days" className={selectClass} value={form.day} onChange={e=>field('day',e.target.value)}><option value="all">All days</option><option value="weekday">Weekday</option><option value="weekend">Weekend</option></select></div><div><Label htmlFor="rate-priority">Priority within scope</Label><Input id="rate-priority" required type="number" step="1" value={form.priority} onChange={e=>field('priority',e.target.value)}/></div></div>
        <fieldset className="rounded border p-4"><legend className="px-2 font-medium text-sm">Optional length-of-stay discount</legend><div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="los-type">Discount method</Label><select id="los-type" className={selectClass} value={form.losType} disabled={Number(form.quotedNights)>1} onChange={e=>field('losType',e.target.value)}><option value="">No additional discount</option><option value="fixed">Fixed ₹ per eligible night</option><option value="percentage">Percentage per eligible night</option></select></div>{form.losType&&<><div><Label htmlFor="los-min">Minimum qualifying nights</Label><Input id="los-min" required type="number" min="2" value={form.losMin} onChange={e=>field('losMin',e.target.value)}/></div><div><Label htmlFor="los-value">Discount {form.losType==='fixed'?'(₹)':'(%)'}</Label><Input id="los-value" required type="number" min="0" max={form.losType==='percentage'?100:undefined} step="0.01" value={form.losValue} onChange={e=>field('losValue',e.target.value)}/></div></>}</div><p className="text-xs text-muted-foreground mt-2">Applies to every eligible night of a qualifying stay, on the entered base package before meal conversion. Extra-person accommodation and separately added meals are excluded. Package tiers covering more than one quoted night cannot stack another stay discount.</p></fieldset>
        <fieldset className="rounded border p-4"><legend className="px-2 font-medium text-sm">Extra-person accommodation only, per night</legend><div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="extra-adult">Extra adult (₹)</Label><Input id="extra-adult" type="number" min="0" step="0.01" value={form.extraAdult} onChange={e=>field('extraAdult',e.target.value)}/></div><div><Label htmlFor="extra-child">Extra child (₹)</Label><Input id="extra-child" type="number" min="0" step="0.01" value={form.extraChild} onChange={e=>field('extraChild',e.target.value)}/></div><div><Label htmlFor="extra-infant">Infant accommodation (₹)</Label><Input id="extra-infant" required type="number" min="0" step="0.01" value={form.extraInfant} onChange={e=>field('extraInfant',e.target.value)}/></div></div><p className="text-xs text-muted-foreground mt-2">These charges are never divided by package nights and never have meals deducted. Selected meals are added for all guests, including children and infants at the full rate for now. A blank extra rate is not a confirmed free rate. For a room type using configured rate plans, enter both adult and child extra rates before enabling a verified rate. Enter 0 explicitly only if that extra accommodation is free; incomplete drafts may remain disabled.</p></fieldset>
        <Card className="bg-muted/40"><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ArrowRight className="h-4 w-4"/>Calculated nightly prices · {form.includedAdults||'—'} included adult(s)</CardTitle><CardDescription>Before extras, cancellation adjustments and tax. Meal supplements effective on {previewDate} are used. Changing them can change derived amounts while the entered price stays fixed. This is a reference-night preview; stays crossing a meal-price change are calculated per date by the server.</CardDescription></CardHeader><CardContent><div className="mb-3 max-w-48"><Label htmlFor="preview-nights">Preview stay length</Label><Input id="preview-nights" type="number" min="1" step="1" value={form.previewNights} onChange={e=>field('previewNights',e.target.value)}/></div>{previewError?<p className="text-destructive" role="alert">{previewError}</p>:preview?<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{codes.map(code=><div key={code}><p className="text-xs text-muted-foreground">{code}{code===form.source?' · entered basis':''}</p><p className="text-lg font-semibold">{money(preview[code])}</p></div>)}</div>:<p className="text-sm text-muted-foreground">Enter a price to preview the four plans.</p>}</CardContent></Card>
        <div className="space-y-3"><label className="flex items-start gap-2 text-sm"><Checkbox checked={form.verified} onCheckedChange={checked=>setForm(previous=>({...previous,verified:checked===true,active:checked===true?previous.active:false}))}/><span>I confirm the source meal plan, covered nights and included adults are correct.</span></label><label className="flex items-center gap-2 text-sm"><Checkbox checked={form.active} disabled={!form.verified} onCheckedChange={checked=>field('active',checked===true)}/><span>Enable this rate for eligible quotes</span></label></div>
        {editing?.source_override_id&&<Alert><AlertTriangle className="h-4 w-4"/><AlertDescription>This rate was migrated from a tactical override. Edit this reference rate here; the preserved original is retained for traceability. Changing its scope, dates or stay eligibility can leave some stays without a verified rate. Review those boundaries before saving; do not assume an old package will automatically apply outside the revised coverage.</AlertDescription></Alert>}
        {editing&&<details className="border rounded p-3"><summary className="cursor-pointer text-sm font-medium">Saved version history (latest 10)</summary><div className="mt-3 space-y-2">{history.isLoading?<p className="text-sm">Loading history…</p>:history.error?<p className="text-sm text-destructive">Version history could not be loaded.</p>:history.data?.length?history.data.map(version=><div key={version.id} className="border-t pt-2 text-xs"><p>{new Date(version.recorded_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</p><p>{version.snapshot.name}: {money(Number(version.snapshot.amount||0))} {version.snapshot.source_meal_plan_code}, {version.snapshot.quoted_nights} quoted night(s), {version.snapshot.included_adults} included adult(s)</p><p>{version.snapshot.is_active?'Enabled':'Disabled'} · {version.snapshot.start_date||'No start limit'} to {version.snapshot.end_date||'No end limit'}</p></div>):<p className="text-sm text-muted-foreground">No recorded versions yet.</p>}</div></details>}
        <DialogFooter><Button type="button" variant="outline" disabled={save.isPending} onClick={close}>Cancel</Button><Button type="submit" disabled={save.isPending||!!previewError||!preview}>{save.isPending?'Saving…':editing?'Save Rate':'Create Rate'}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </div>;
}

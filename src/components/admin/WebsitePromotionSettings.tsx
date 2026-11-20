import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { unrestrictedPromotion, restrictionError, type PromotionRestrictions } from '@/lib/promotion-editor';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search } from 'lucide-react';

type Offer = PromotionRestrictions & {code:string;label:string;revision?:number;is_active:boolean;is_public:boolean;discount_kind:string;discount_basis:string|null;discount_value:number|null;amount_per_night?:number;amount_per_booking?:number;booking_from:string|null;booking_to:string|null;stay_from:string|null;stay_to:string|null;day_scope:string;mixed_stay_mode:string|null};
const api = supabase as unknown as {rpc:(name:string,args?:Record<string,unknown>)=>Promise<{data:unknown;error:{message:string}|null}>};
const initial = ():Offer=>({...unrestrictedPromotion(),code:'',label:'',is_active:false,is_public:false,discount_kind:'fixed',discount_basis:null,discount_value:null,booking_from:null,booking_to:null,stay_from:null,stay_to:null,day_scope:'both',mixed_stay_mode:null});
const inputClass = 'h-9 min-w-0 text-sm';
const selectClass = 'h-9 w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const noteClass = 'text-xs leading-relaxed text-muted-foreground';
const sectionClass = 'min-w-0 space-y-2.5 border-t pt-3';
const fieldGrid = 'grid min-w-0 gap-2.5 sm:grid-cols-2';
const modes = [['RO','Room Only (EP)'], ['BB','Bed & Breakfast (CP)'], ['HB','Half Board (MAP)'], ['FB','Full Board (AP)']] as const;
function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
 return <div className="min-w-0 space-y-1"><Label htmlFor={id}>{label}</Label>{children}</div>;
}
export default function WebsitePromotionSettings(){
 const [offers,setOffers]=useState<Offer[]>([]),[enabled,setEnabled]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState(''),[form,setForm]=useState<Offer|null>(initial),[review,setReview]=useState(false);
 async function load(){const {data,error}=await api.rpc('website_promotion_settings');if(error)throw Error(error.message);const r=data as {enabled:boolean;offers:Offer[]};if(!Array.isArray(r?.offers))throw Error('Invalid promotion settings');setOffers(r.offers.map(o=>({...unrestrictedPromotion(),...o})));setEnabled(r.enabled);setReady(r.offers.every(o=>typeof o.day_scope==='string'&&'total_usage_limit' in o&&'eligible_room_category_ids' in o));}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 const change=(key:keyof Offer,value:unknown)=>{setReview(false);setForm(f=>f?{...f,[key]:value}:null)};
 const [statusFilter,setStatusFilter]=useState<'all'|'enabled'|'disabled'>('all');
 const query=search.trim().toLowerCase();
 const visibleOffers=offers.filter(o=>(o.code+' '+o.label).toLowerCase().includes(query)&&
   (statusFilter==='all'||o.is_active===(statusFilter==='enabled')));
 const [categories,setCategories]=useState<{id:string;name:string}[]>([]);
 const editorRef=useRef<HTMLHeadingElement>(null);
 const editOffer=(offer: Offer = initial())=>{
  setReview(false);
  setForm({...offer});
  requestAnimationFrame(()=>editorRef.current?.focus());
 };
 useEffect(()=>{
  let active=true;
  void (async()=>{
   try {
    const {data,error}=await supabase.from('room_categories').select('id,name').order('name');
    if(error)throw Error(error.message);
    if(active)setCategories(data??[]);
   } catch {
    if(active)setError('Room categories could not load. Refresh the page to retry.');
   }
  })();
  return ()=>{active=false;};
 },[]);
 const restricted=!!form&&(form.day_scope!=='both'||!!form.stay_from||!!form.stay_to||form.excluded_stay_dates.length>0);
 const flat=form?.code==='DIRECT1000'||form?.discount_basis==='booking';
 const restrictionsError=form?restrictionError(form):null;
 const valid=!!form&&!restrictionsError&&/^[A-Z0-9_-]{3,30}$/.test(form.code)&&!!form.label.trim()&&(form.discount_kind==='legacy'||(!!form.discount_basis&&Number(form.discount_value)>0&&(form.discount_kind!=='percentage'||Number(form.discount_value)<=100)))&&(!restricted||!!form.mixed_stay_mode)&&(!flat||form.mixed_stay_mode!=='eligible_nights')&&(!form.booking_from||!form.booking_to||form.booking_from<=form.booking_to)&&(!form.stay_from||!form.stay_to||form.stay_from<=form.stay_to);
 async function save(){if(!form||!valid||!ready||busy)return;setBusy(true);setError('');try{const {error}=await api.rpc('save_managed_website_promotion',{p_settings:form,p_expected_revision:form.revision??null});if(error)throw Error(error.message);await load();setForm(initial());setReview(false);}catch(e){setError(e instanceof Error?e.message:'Save failed');}finally{setBusy(false)}}
 const unavailable = !ready || busy;
 return <section aria-label="Website promotions" className="space-y-3">
  <header className="flex flex-wrap items-start justify-between gap-2">
   <div>
    <h1 className="text-3xl font-bold tracking-tight">Promo Codes</h1>
    <p className="mt-1 text-sm text-muted-foreground">Manage accommodation discounts without changing room rates. One code per checkout.</p>
    <p className="mt-1 text-sm text-muted-foreground">View and apply available promo codes in the <Link to="/admin/pricing/rate-card" className="rounded-sm font-medium text-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Live Rate Card</Link>.</p>
   </div>
   <Badge variant={enabled?'default':'secondary'}>{enabled?'Offer release enabled':'Offer release off'}</Badge>
  </header>
  <p className={noteClass}>{enabled?'Changes apply to new quotes only. Existing bookings and payment snapshots are not repriced.':'This page cannot enable the offer release. Existing bookings and payment snapshots are not repriced.'}</p>
  {!ready&&<p role="status" className={noteClass}>Promotion-management migration is not installed. Settings are read-only.</p>}
  {error&&<p role="alert" className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>}
  <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:items-start">
   <Card className="min-w-0">
    <CardHeader className="p-3 sm:p-4">
     <div className="flex flex-wrap items-center justify-between gap-2">
      <CardTitle className="text-lg">Manage codes</CardTitle>
      <Button size="sm" type="button" disabled={unavailable} onClick={()=>editOffer()}>
       <Plus aria-hidden="true" className="mr-1.5 h-4 w-4"/> New code
      </Button>
     </div>
     <div className="flex flex-wrap items-center gap-2 pt-1">
      <div className="relative min-w-36 flex-1">
       <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
       <Input className="h-9 pl-8 text-sm" aria-label="Search promotions" placeholder="Search code or description" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <select aria-label="Filter promotions by status" className={selectClass.replace('w-full','w-auto')} value={statusFilter} onChange={e=>{const value=e.target.value;if(value==='all'||value==='enabled'||value==='disabled')setStatusFilter(value);}}>
       <option value="all">All statuses</option><option value="enabled">Enabled</option><option value="disabled">Disabled / draft</option>
      </select>
     </div>
    </CardHeader>
    <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
     {ready&&visibleOffers.length===0&&<p role="status" className={noteClass}>{offers.length===0?'No promotion codes yet.':'No promotions match these filters.'}</p>}
     {visibleOffers.length>0&&<div className="rounded-md border">
      <Table className="min-w-[26rem]" aria-label="Promo codes">
       <TableHeader className="bg-muted/50"><TableRow>
        <TableHead scope="col" className="h-9 px-2">Code</TableHead><TableHead scope="col" className="h-9 px-2">Offer</TableHead>
        <TableHead scope="col" className="h-9 px-2">Validity</TableHead><TableHead scope="col" className="h-9 px-2">Status</TableHead>
        <TableHead scope="col" className="h-9 px-2"><span className="sr-only">Actions</span></TableHead>
       </TableRow></TableHeader>
       <TableBody>{visibleOffers.map(o=><TableRow key={o.code} data-state={form?.revision&&form.code===o.code?'selected':undefined}>
        <th scope="row" className="p-2 text-left font-medium">{o.code}</th>
        <TableCell className="p-2">{o.code==='EP300'&&o.discount_kind==='legacy'?'₹300 / room-only night':o.code==='DIRECT1000'&&o.discount_kind==='legacy'?'₹1,000 / booking':o.discount_value==null?o.label:o.discount_kind==='percentage'?`${o.discount_value}% off`:`₹${o.discount_value.toLocaleString('en-IN')} off`}</TableCell>
        <TableCell className={`p-2 ${noteClass}`}><p>Book: {o.booking_from??'Any'} to {o.booking_to??'Any'}</p><p>Stay: {o.stay_from??'Any'} to {o.stay_to??'Any'}</p></TableCell>
        <TableCell className="p-2"><Badge variant={o.is_active?'default':'secondary'}>{o.is_active?'Enabled':'Disabled'}</Badge><span className="mt-0.5 block text-xs text-muted-foreground">{o.is_public===false?'Private':'Public'}</span></TableCell>
        <TableCell className="p-1 text-right"><Button type="button" variant="ghost" size="sm" aria-label={`Edit ${o.code}`} disabled={unavailable} onClick={()=>editOffer(o)}>Edit</Button></TableCell>
       </TableRow>)}</TableBody>
      </Table>
     </div>}
    </CardContent>
   </Card>

   <Card className="min-w-0 xl:col-start-2">
    <CardHeader className="p-3 sm:p-4">
     <h2 tabIndex={-1} ref={editorRef} className="text-lg font-semibold leading-tight">{form?.revision?`Edit ${form.code}`:'Create promo code'}</h2>
    </CardHeader>
    <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">{form&&<fieldset disabled={unavailable} className="min-w-0 space-y-3">
     <legend className="sr-only">Promo code settings</legend>
     <div className="grid min-w-0 gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <Field id="promo-code" label="Code"><Input id="promo-code" className={inputClass} autoCapitalize="characters" spellCheck={false} disabled={!!form.revision||unavailable} value={form.code} onChange={e=>change('code',e.target.value.toUpperCase())}/></Field>
      <Field id="promo-description" label="Guest-facing description"><Input id="promo-description" className={inputClass} value={form.label} onChange={e=>change('label',e.target.value)}/></Field>
     </div>
     {form.discount_kind==='legacy'?<p className="rounded-md bg-muted px-3 py-2 text-sm">Existing discount preserved: {form.code==='EP300'?'₹300 per verified room-only night':'₹1,000 per booking, accommodation only'}.</p>:<>
      <fieldset className="min-w-0 space-y-1.5">
       <legend className="text-sm font-medium">Discount type</legend>
       <div className="grid grid-cols-2 gap-2">
        {([['percentage','Percentage'],['fixed','Fixed amount']] as const).map(([value,label])=><Button key={value} size="sm" type="button" aria-pressed={form.discount_kind===value} variant={form.discount_kind===value?'default':'outline'} onClick={()=>change('discount_kind',value)}>{label}</Button>)}
       </div>
      </fieldset>
      <div className={fieldGrid}>
       <Field id="promo-value" label={form.discount_kind==='percentage'?'Discount (%)':'Discount (₹)'}><Input id="promo-value" className={inputClass} type="number" min="0.01" step="0.01" value={form.discount_value??''} onChange={e=>change('discount_value',e.target.value===''?null:Number(e.target.value))}/></Field>
       <Field id="promo-basis" label="Apply discount">
        <select id="promo-basis" className={selectClass} value={form.discount_basis??''} onChange={e=>change('discount_basis',e.target.value||null)}>
         <option value="">Choose explicitly</option><option value="booking">Once per booking accommodation amount</option><option value="night">Per verified room-only occupied night</option>
        </select>
       </Field>
      </div>
     </>}
     <section className={sectionClass} aria-labelledby="promo-dates">
      <h3 id="promo-dates" className="text-sm font-semibold">Dates and day eligibility</h3>
      <div className="space-y-2">
       {([['Booking dates','booking_from','booking_to'],['Eligible stay dates','stay_from','stay_to']] as const).map(([title,from,to])=><fieldset key={title} className="min-w-0 space-y-1">
        <legend className="text-xs font-medium text-muted-foreground">{title}</legend>
        <div className="grid min-w-0 grid-cols-1 gap-2 min-[400px]:grid-cols-2">{([[from,'Start'],[to,'End']] as const).map(([key,label])=><Field id={`promo-${key}`} key={key} label={label}>
         <Input id={`promo-${key}`} className={inputClass} aria-label={`${title}: ${label}`} type="date" value={form[key]??''} onChange={e=>change(key,e.target.value||null)}/>
        </Field>)}</div>
       </fieldset>)}
      </div>
      <p className={noteClass}>Booking dates control when the reservation is made. Stay dates control which occupied nights qualify, not checkout day. Dates are inclusive in Asia/Kolkata. Leave blank for no limit.</p>
      <div className={fieldGrid}>
       <Field id="promo-day-scope" label="Day eligibility">
        <select id="promo-day-scope" className={selectClass} value={form.day_scope} onChange={e=>change('day_scope',e.target.value)}><option value="both">Weekdays and weekends</option><option value="weekday">Weekdays only</option><option value="weekend">Weekends only</option></select>
       </Field>
       <Field id="promo-stay-mode" label="Stay eligibility policy">
        <select id="promo-stay-mode" className={selectClass} value={form.mixed_stay_mode??''} onChange={e=>change('mixed_stay_mode',e.target.value||null)}><option value="">Choose for stay/day restrictions</option><option value="all_nights">All occupied nights must qualify</option>{!flat&&<option value="eligible_nights">Discount only eligible nights</option>}</select>
       </Field>
      </div>
      <p className={noteClass}>Weekend eligibility follows the hotel’s date-specific rules, including protected periods.{flat?' All nights must qualify for once-per-booking offers.':''}</p>
     </section>
     <section className={sectionClass} aria-labelledby="promo-eligibility">
      <h3 id="promo-eligibility" className="text-sm font-semibold">Room and meal eligibility</h3>
      <div className={fieldGrid}>
       <Field id="promo-categories" label="Room categories"><select id="promo-categories" className={selectClass} value={form.eligible_room_category_ids===null?'all':'selected'} onChange={e=>change('eligible_room_category_ids',e.target.value==='all'?null:[])}><option value="all">All categories</option><option value="selected">Selected categories only</option></select></Field>
       <Field id="promo-meal-plans" label="Meal plans"><select id="promo-meal-plans" className={selectClass} value={form.eligible_meal_plan_codes===null?'all':'selected'} onChange={e=>change('eligible_meal_plan_codes',e.target.value==='all'?null:[])}><option value="all">All plans</option><option value="selected">Selected plans only</option></select></Field>
      </div>
      {form.eligible_room_category_ids!==null&&<fieldset className="min-w-0"><legend className={noteClass}>Eligible categories</legend><div className="flex flex-wrap gap-x-3 gap-y-1">
       {categories.map(c=><div key={c.id} className="flex min-h-7 items-center gap-2">
        <Checkbox id={`promo-category-${c.id}`} disabled={unavailable} checked={form.eligible_room_category_ids!.includes(c.id)} onCheckedChange={checked=>change('eligible_room_category_ids',checked===true?[...form.eligible_room_category_ids!,c.id]:form.eligible_room_category_ids!.filter(id=>id!==c.id))}/>
        <Label htmlFor={`promo-category-${c.id}`}>{c.name}</Label>
       </div>)}
      </div></fieldset>}
      {form.eligible_meal_plan_codes!==null&&<fieldset className="min-w-0"><legend className={noteClass}>Eligible plans</legend><div className="flex flex-wrap gap-x-3 gap-y-1">
       {modes.map(([code,name])=><div key={code} className="flex min-h-7 items-center gap-2">
        <Checkbox id={`promo-meal-${code}`} disabled={unavailable} checked={form.eligible_meal_plan_codes!.includes(code)} onCheckedChange={checked=>change('eligible_meal_plan_codes',checked===true?[...form.eligible_meal_plan_codes!,code]:form.eligible_meal_plan_codes!.filter(c=>c!==code))}/>
        <Label htmlFor={`promo-meal-${code}`}>{name}</Label>
       </div>)}
      </div></fieldset>}
     </section>
     <section className={sectionClass} aria-labelledby="promo-stay-limits">
      <h3 id="promo-stay-limits" className="text-sm font-semibold">Stay length and excluded nights</h3>
       <Field id="promo-minimum-nights" label="Minimum occupied nights"><Input id="promo-minimum-nights" className={inputClass} type="number" min="1" step="1" placeholder="No minimum" value={form.min_stay_nights??''} onChange={e=>change('min_stay_nights',e.target.value===''?null:Number(e.target.value))}/></Field>
       <Field id="promo-exclusions" label="Excluded nights"><Textarea id="promo-exclusions" rows={2} className="min-h-16 text-sm" placeholder="One YYYY-MM-DD date per line" value={form.excluded_stay_dates.join('\n')} onChange={e=>change('excluded_stay_dates',e.target.value===''?[]:e.target.value.split(/[\n,]/).map(v=>v.trim()))}/></Field>
       <p className={noteClass}>Block particular nights even if they fall in the eligible stay window. The selected stay eligibility policy still applies.</p>
     </section>

     <section className={sectionClass} aria-labelledby="promo-limits">
      <h3 id="promo-limits" className="text-sm font-semibold">Usage limits</h3>
      <div className={fieldGrid}>{([['total_usage_limit','Total reserved + completed uses'],['per_guest_usage_limit','Uses per booking email']] as const).map(([key,label])=><Field key={key} id={`promo-${key}`} label={label}><Input id={`promo-${key}`} className={inputClass} type="number" min="1" step="1" placeholder="Unlimited" value={form[key]??''} onChange={e=>change(key,e.target.value===''?null:Number(e.target.value))}/></Field>)}</div>
      <p className={noteClass}>Limits count completed redemptions and reserved checkout attempts, not quotes. Per-email limits use the booking email, not a verified person. Cancellations do not automatically restore a completed use.</p>
     </section>
     <section className={sectionClass} aria-labelledby="promo-visibility">
      <h3 id="promo-visibility" className="text-sm font-semibold">Visibility and activation</h3>
      <div className="space-y-1.5">
       <div className="flex min-h-9 items-center justify-between gap-3"><Label htmlFor="promo-public">List publicly in booking offers</Label><Switch id="promo-public" disabled={unavailable} checked={form.is_public} onCheckedChange={checked=>change('is_public',checked)}/></div>
       <div className="flex min-h-9 items-center justify-between gap-3"><Label htmlFor="promo-active">Enable for eligible new checkouts</Label><Switch id="promo-active" disabled={unavailable} checked={form.is_active} onCheckedChange={checked=>change('is_active',checked)}/></div>
      </div>
     </section>
     {!valid&&<p className={`text-xs ${restrictionsError?'text-destructive':'text-muted-foreground'}`}>{restrictionsError || 'Complete the required fields. Date ranges must be ordered, and stay restrictions need a stay policy.'}</p>}
     {review?<div className="space-y-2 rounded-md border bg-muted/40 p-2.5 text-sm">
      <p className="font-medium">Review {form.code}</p>
      <p>{form.is_active?'Enabled':'Disabled'} · {form.is_public?'Public':'Private'} · {form.day_scope}. Booking and stay windows above apply. Existing bookings remain unchanged.</p>
      <p className={noteClass}>Total limit: {form.total_usage_limit??'unlimited'}; per-email limit: {form.per_guest_usage_limit??'unlimited'}. Minimum nights: {form.min_stay_nights??'none'}. Categories: {form.eligible_room_category_ids===null?'all':form.eligible_room_category_ids.map(id=>categories.find(c=>c.id===id)?.name??id).join(', ')}. Plans: {form.eligible_meal_plan_codes?.map(code=>modes.find(([value])=>value===code)?.[1]??code).join(', ')??'all'}. Excluded nights: {form.excluded_stay_dates.join(', ')||'none'}.</p>
      <div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled={unavailable||!valid} onClick={()=>void save()}>{busy?'Saving…':form.is_active?'Confirm and enable':form.revision?'Save disabled code':'Save draft'}</Button><Button type="button" size="sm" variant="outline" disabled={unavailable} onClick={()=>setReview(false)}>Back</Button></div>
     </div>:<div className="flex flex-wrap gap-2 border-t pt-3">
      {!form.revision&&!form.is_active&&<Button type="button" size="sm" variant="outline" disabled={unavailable||!valid} onClick={()=>void save()}>{busy?'Saving…':'Save draft'}</Button>}
      <Button type="button" size="sm" disabled={unavailable||!valid} onClick={()=>setReview(true)}>{form.is_active?'Review & enable':'Review changes'}</Button>
     </div>}
    </fieldset>}</CardContent>
   </Card>

  </div>
 </section>;
}

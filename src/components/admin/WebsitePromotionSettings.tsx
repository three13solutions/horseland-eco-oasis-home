import { type ReactNode, useEffect, useRef, useState } from 'react';
import { unrestrictedPromotion, restrictionError, validDate, type PromotionRestrictions } from '@/lib/promotion-editor';
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
import { ChevronDown, Plus, Search } from 'lucide-react';

interface PromotionPreviewQuote { preview_as_of?:string; total_amount:number; subtotal:number; tax_amount:number; promotion:{discount_amount:number}; activation_simulated?:boolean }
interface PromotionPreviewResponse { preview_as_of?:string; quote?:PromotionPreviewQuote; preview_only?:boolean; activation_simulated?:boolean; error?:string }
type Offer = PromotionRestrictions & {code:string;label:string;revision?:number;is_active:boolean;is_public:boolean;discount_kind:string;discount_basis:string|null;discount_value:number|null;amount_per_night?:number;amount_per_booking?:number;booking_from:string|null;booking_to:string|null;stay_from:string|null;stay_to:string|null;day_scope:string;mixed_stay_mode:string|null};
const api = supabase as unknown as {rpc:(name:string,args?:Record<string,unknown>)=>Promise<{data:unknown;error:{message:string}|null}>};
const initial = ():Offer=>({...unrestrictedPromotion(),code:'',label:'',is_active:false,is_public:false,discount_kind:'fixed',discount_basis:null,discount_value:null,booking_from:null,booking_to:null,stay_from:null,stay_to:null,day_scope:'both',mixed_stay_mode:null});
const inputClass = 'h-9 min-w-0 text-sm';
const selectClass = 'h-9 w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const noteClass = 'text-xs leading-relaxed text-muted-foreground';
const sectionClass = 'min-w-0 space-y-2.5 border-t pt-3';
const fieldGrid = 'grid min-w-0 gap-2.5 sm:grid-cols-2';
const modes = [['RO','EP'], ['BB','CP'], ['HB','MAP'], ['FB','AP']] as const;
function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
 return <div className="min-w-0 space-y-1"><Label htmlFor={id}>{label}</Label>{children}</div>;
}
export default function WebsitePromotionSettings(){
 const [offers,setOffers]=useState<Offer[]>([]),[enabled,setEnabled]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState(''),[form,setForm]=useState<Offer|null>(initial),[review,setReview]=useState(false);
 async function load(){const {data,error}=await api.rpc('website_promotion_settings');if(error)throw Error(error.message);const r=data as {enabled:boolean;offers:Offer[]};if(!Array.isArray(r?.offers))throw Error('Invalid promotion settings');setOffers(r.offers.map(o=>({...unrestrictedPromotion(),...o})));setEnabled(r.enabled);setReady(r.offers.every(o=>typeof o.day_scope==='string'&&'total_usage_limit' in o&&'eligible_room_category_ids' in o));}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 const change=(key:keyof Offer,value:unknown)=>{invalidatePreview();setReview(false);setForm(f=>f?{...f,[key]:value}:null)};
 const [statusFilter,setStatusFilter]=useState<'all'|'enabled'|'disabled'>('all');
 const query=search.trim().toLowerCase();
 const visibleOffers=offers.filter(o=>(o.code+' '+o.label).toLowerCase().includes(query)&&
   (statusFilter==='all'||o.is_active===(statusFilter==='enabled')));
 const [previewAsOf,setPreviewAsOf]=useState('');
 const [optionsAttempt,setOptionsAttempt]=useState(0);
 const [categories,setCategories]=useState<{id:string;name:string}[]>([]),[roomTypes,setRoomTypes]=useState<{id:string;name:string}[]>([]),[policyCodes,setPolicyCodes]=useState<{code:string;name:string}[]>([]);
 const [quoteInput,setQuoteInput]=useState({room_type_id:'',check_in:'',check_out:'',adults_count:1,children_count:0,infants_count:0,meal_plan_code:'',cancellation_policy_code:''});
 const [preview,setPreview]=useState<PromotionPreviewQuote|null>(null),[previewError,setPreviewError]=useState(''),[previewLoading,setPreviewLoading]=useState(false); const previewGeneration=useRef(0);
 const editorRef=useRef<HTMLHeadingElement>(null);
 const previewRef=useRef<HTMLHeadingElement>(null);
 const invalidatePreview=()=>{previewGeneration.current++;setPreview(null);setPreviewError('');setPreviewLoading(false)};
 const editOffer=(offer: Offer = initial())=>{
  invalidatePreview();
  setReview(false);
  setForm({...offer});
  requestAnimationFrame(()=>editorRef.current?.focus());
 };
 useEffect(()=>{let active=true;const generationRef=previewGeneration;void Promise.all([supabase.from('room_categories').select('id,name').order('name'),supabase.from('room_types').select('id,name').order('name'),supabase.from('cancellation_policy_rules').select('policy_code,policy_name').eq('is_active',true)]).then(results=>{if(!active)return;const failure=results.find(r=>r.error);if(failure){setError('Preview options could not load. Retry before previewing.');return;}setCategories(results[0].data??[]);setRoomTypes(results[1].data??[]);setPolicyCodes([...new Map((results[2].data??[]).map(c=>[c.policy_code,{code:c.policy_code,name:c.policy_name}])).values()]);});return()=>{active=false;generationRef.current++;}},[optionsAttempt]);
 const previewInputValid=validDate(previewAsOf)&&!!quoteInput.room_type_id&&validDate(quoteInput.check_in)&&validDate(quoteInput.check_out)&&quoteInput.check_out>quoteInput.check_in&&!!quoteInput.meal_plan_code&&!!quoteInput.cancellation_policy_code&&Number.isInteger(quoteInput.adults_count)&&quoteInput.adults_count>=1&&[quoteInput.children_count,quoteInput.infants_count].every(n=>Number.isInteger(n)&&n>=0);
 const editQuote=(patch:Partial<typeof quoteInput>)=>{invalidatePreview();setReview(false);setQuoteInput(q=>({...q,...patch}));};
 async function runPreview(){if(!form||!valid||!previewInputValid)return;const generation=++previewGeneration.current;setPreview(null);setPreviewError('');setPreviewLoading(true);try{const {data,error}=await supabase.functions.invoke<PromotionPreviewResponse>('admin-promotion-preview',{body:{promotion:form,preview_as_of:previewAsOf,quote_request:{...quoteInput,room_unit_id:null,addons:[]}}});if(generation!==previewGeneration.current)return;if(error||!data?.preview_only||!data.quote||data.preview_as_of!==previewAsOf||![data.quote.total_amount,data.quote.subtotal,data.quote.tax_amount,data.quote.promotion?.discount_amount].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0))throw Error(error?.message||data?.error||'The server did not return a verified preview.');setPreview({...data.quote,activation_simulated:data.activation_simulated,preview_as_of:data.preview_as_of});}catch(e){if(generation===previewGeneration.current)setPreviewError(e instanceof Error?e.message:'Preview failed.');}finally{if(generation===previewGeneration.current)setPreviewLoading(false);}}
 const restricted=!!form&&(form.day_scope!=='both'||!!form.stay_from||!!form.stay_to||form.excluded_stay_dates.length>0);
 const flat=form?.code==='DIRECT1000'||form?.discount_basis==='booking';
 const restrictionsError=form?restrictionError(form):null;
 const valid=!!form&&!restrictionsError&&/^[A-Z0-9_-]{3,30}$/.test(form.code)&&!!form.label.trim()&&(form.discount_kind==='legacy'||(!!form.discount_basis&&Number(form.discount_value)>0&&(form.discount_kind!=='percentage'||Number(form.discount_value)<=100)))&&(!restricted||!!form.mixed_stay_mode)&&(!flat||form.mixed_stay_mode!=='eligible_nights')&&(!form.booking_from||!form.booking_to||form.booking_from<=form.booking_to)&&(!form.stay_from||!form.stay_to||form.stay_from<=form.stay_to);
 async function save(){if(!form||!valid||busy||(form.is_active&&!preview))return;setBusy(true);setError('');try{const {error}=await api.rpc('save_managed_website_promotion',{p_settings:form,p_expected_revision:form.revision??null});if(error)throw Error(error.message);await load();invalidatePreview();setForm(initial());setReview(false);}catch(e){setError(e instanceof Error?e.message:'Save failed');}finally{setBusy(false)}}
 const unavailable = !ready || busy;
 const previewDisabled = unavailable || previewLoading;
 return <section aria-label="Website promotions" className="space-y-3">
  <header className="flex flex-wrap items-start justify-between gap-2">
   <div>
    <h1 className="text-3xl font-bold tracking-tight">Promo Codes</h1>
    <p className="mt-1 text-sm text-muted-foreground">Manage accommodation discounts without changing room rates. One code per checkout.</p>
   </div>
   <Badge variant={enabled?'default':'secondary'}>{enabled?'Offer release enabled':'Offer release off'}</Badge>
  </header>
  <p className={noteClass}>{enabled?'Changes apply to new quotes only. Existing bookings and payment snapshots are not repriced.':'This page cannot enable the offer release. Existing bookings and payment snapshots are not repriced.'}</p>
  {!ready&&<p role="status" className={noteClass}>Promotion-management migration is not installed. Settings are read-only.</p>}
  {error&&<p role="alert" className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>}
  <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:grid-rows-[auto_1fr] xl:items-start">
   <Card className="min-w-0 xl:col-start-1 xl:row-start-1">
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

   <Card className="min-w-0 xl:col-start-2 xl:row-start-1 xl:row-span-2">
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
      <p className={noteClass}>Dates are inclusive in Asia/Kolkata. Stay dates count occupied nights, not checkout. Leave dates blank for no limit.</p>
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
     <details key={form.code&&form.revision?form.code:'create'} className="group rounded-md border">
      <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 px-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
       <span>Advanced conditions{(form.min_stay_nights || form.excluded_stay_dates.length>0)&&<span className="ml-2 text-xs text-muted-foreground">Configured</span>}</span>
       <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground group-open:rotate-180"/>
      </summary>
      <div className="space-y-2 border-t p-2.5">
       <Field id="promo-minimum-nights" label="Minimum occupied nights"><Input id="promo-minimum-nights" className={inputClass} type="number" min="1" step="1" placeholder="No minimum" value={form.min_stay_nights??''} onChange={e=>change('min_stay_nights',e.target.value===''?null:Number(e.target.value))}/></Field>
       <Field id="promo-exclusions" label="Excluded occupied dates"><Textarea id="promo-exclusions" rows={2} className="min-h-16 text-sm" placeholder="One YYYY-MM-DD date per line" value={form.excluded_stay_dates.join('\n')} onChange={e=>change('excluded_stay_dates',e.target.value===''?[]:e.target.value.split(/[\n,]/).map(v=>v.trim()))}/></Field>
       <p className={noteClass}>Excluded dates follow the selected stay eligibility policy. Checkout day is not an occupied night.</p>
      </div>
     </details>
     <section className={sectionClass} aria-labelledby="promo-limits">
      <h3 id="promo-limits" className="text-sm font-semibold">Usage limits</h3>
      <div className={fieldGrid}>{([['total_usage_limit','Total reserved + completed uses'],['per_guest_usage_limit','Uses per booking email']] as const).map(([key,label])=><Field key={key} id={`promo-${key}`} label={label}><Input id={`promo-${key}`} className={inputClass} type="number" min="1" step="1" placeholder="Unlimited" value={form[key]??''} onChange={e=>change(key,e.target.value===''?null:Number(e.target.value))}/></Field>)}</div>
      <details className={noteClass}><summary className="w-fit cursor-pointer rounded-sm underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">How limits are counted</summary><p className="mt-1">Set per-email limit to 1 for one use per booking email. Email addresses are normalized, not ownership-verified; alternate addresses can bypass a real-person limit. Limits count completed uses plus reserved or still-payable checkout intents. Quotes and previews do not reserve usage; the authoritative check occurs at payment preparation. Uncertain provider orders retain their reservation until reconciliation. Completed uses are not automatically restored after cancellation. Changing limits does not reprice existing bookings.</p></details>
     </section>
     <section className={sectionClass} aria-labelledby="promo-visibility">
      <h3 id="promo-visibility" className="text-sm font-semibold">Visibility and activation</h3>
      <div className="space-y-1.5">
       <div className="flex min-h-9 items-center justify-between gap-3"><Label htmlFor="promo-public">List publicly in booking offers</Label><Switch id="promo-public" disabled={unavailable} checked={form.is_public} onCheckedChange={checked=>change('is_public',checked)}/></div>
       <div className="flex min-h-9 items-center justify-between gap-3"><Label htmlFor="promo-active">Enable for eligible new checkouts</Label><Switch id="promo-active" disabled={unavailable} checked={form.is_active} onCheckedChange={checked=>change('is_active',checked)}/></div>
      </div>
     </section>
     {!valid&&<p className={`text-xs ${restrictionsError?'text-destructive':'text-muted-foreground'}`}>{restrictionsError || 'Complete the required fields. Date ranges must be ordered, and stay restrictions need a stay policy.'}</p>}
     {form.is_active&&!preview&&<p className="rounded-md bg-muted/50 px-2.5 py-2 text-xs">Calculate a preview of the current draft before enabling. <button type="button" className="rounded-sm font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={()=>previewRef.current?.focus()}>Go to price preview</button></p>}
     {review?<div className="space-y-2 rounded-md border bg-muted/40 p-2.5 text-sm">
      <p className="font-medium">Review {form.code}</p>
      <p>{form.is_active?'Enabled':'Disabled'} · {form.is_public?'Public':'Private'} · {form.day_scope}. Booking and stay windows above apply. Existing bookings remain unchanged.</p>
      <p className={noteClass}>Total limit: {form.total_usage_limit??'unlimited'}; per-email limit: {form.per_guest_usage_limit??'unlimited'}. Minimum nights: {form.min_stay_nights??'none'}. Categories: {form.eligible_room_category_ids===null?'all':form.eligible_room_category_ids.map(id=>categories.find(c=>c.id===id)?.name??id).join(', ')}. Plans: {form.eligible_meal_plan_codes?.join(', ')??'all'}. Excluded nights: {form.excluded_stay_dates.join(', ')||'none'}.</p>
      <div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled={unavailable||!valid||(form.is_active&&!preview)} onClick={()=>void save()}>{busy?'Saving…':form.is_active?'Confirm and enable':form.revision?'Save disabled code':'Save draft'}</Button><Button type="button" size="sm" variant="outline" disabled={unavailable} onClick={()=>setReview(false)}>Back</Button></div>
     </div>:<div className="flex flex-wrap gap-2 border-t pt-3">
      {!form.revision&&!form.is_active&&<Button type="button" size="sm" variant="outline" disabled={unavailable||!valid} onClick={()=>void save()}>{busy?'Saving…':'Save draft'}</Button>}
      <Button type="button" size="sm" disabled={unavailable||!valid||(form.is_active&&!preview)} onClick={()=>setReview(true)}>{form.is_active?'Review & enable':'Review changes'}</Button>
     </div>}
    </fieldset>}</CardContent>
   </Card>

   <Card className="min-w-0 xl:col-start-1 xl:row-start-2">
    <CardHeader className="p-3 sm:p-4"><h2 tabIndex={-1} ref={previewRef} className="text-lg font-semibold leading-tight">Guest price preview</h2><p className={noteClass}>Test the current draft without creating an order or reserving usage. Calendar rates stay unchanged.</p></CardHeader>
    <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4"><fieldset disabled={unavailable} className="min-w-0 space-y-2.5">
     <legend className="sr-only">Preview quote settings</legend>
     <div className={fieldGrid}>
      <Field id="promo-preview-booking-date" label="Simulated booking date"><Input id="promo-preview-booking-date" className={inputClass} type="date" disabled={previewDisabled} value={previewAsOf} onChange={e=>{invalidatePreview();setReview(false);setPreviewAsOf(e.target.value);}}/></Field>
      <Field id="promo-preview-room" label="Room type"><select id="promo-preview-room" className={selectClass} value={quoteInput.room_type_id} disabled={previewDisabled} onChange={e=>editQuote({room_type_id:e.target.value})}><option value="">Select room</option>{roomTypes.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
     </div>
     <p className={noteClass}>Use the India booking date. This does not change production booking windows or guarantee usage availability at payment.</p>
     <div className="grid min-w-0 grid-cols-1 gap-2 min-[400px]:grid-cols-2">{([['check_in','Check-in'],['check_out','Check-out']] as const).map(([key,label])=><Field id={`promo-preview-${key}`} key={key} label={label}><Input id={`promo-preview-${key}`} className={inputClass} type="date" disabled={previewDisabled} value={quoteInput[key]} onChange={e=>editQuote({[key]:e.target.value})}/></Field>)}</div>
     <div className="grid min-w-0 grid-cols-3 gap-2">{([['adults_count','Adults'],['children_count','Children'],['infants_count','Infants']] as const).map(([key,label])=><Field id={`promo-preview-${key}`} key={key} label={label}><Input id={`promo-preview-${key}`} className={inputClass} type="number" step="1" min={key==='adults_count'?1:0} disabled={previewDisabled} value={quoteInput[key]} onChange={e=>editQuote({[key]:Number(e.target.value)})}/></Field>)}</div>
     <div className={fieldGrid}>
      <Field id="promo-preview-meal" label="Meal plan"><select id="promo-preview-meal" className={selectClass} value={quoteInput.meal_plan_code} disabled={previewDisabled} onChange={e=>editQuote({meal_plan_code:e.target.value})}><option value="">Choose plan</option>{modes.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></Field>
      <Field id="promo-preview-cancellation" label="Cancellation policy"><select id="promo-preview-cancellation" className={selectClass} value={quoteInput.cancellation_policy_code} disabled={previewDisabled} onChange={e=>editQuote({cancellation_policy_code:e.target.value})}><option value="">Choose policy</option>{policyCodes.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select></Field>
     </div>
     <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" disabled={previewDisabled||!valid||!previewInputValid} onClick={()=>void runPreview()}>{previewLoading?'Checking server quote…':'Calculate preview'}</Button>
      {previewLoading?<Button type="button" size="sm" variant="outline" onClick={invalidatePreview}>Cancel preview</Button>:<Button type="button" size="sm" variant="ghost" onClick={()=>{invalidatePreview();setOptionsAttempt(n=>n+1);}}>Reload preview options</Button>}
     </div>
     {previewError&&<p role="alert" className="text-sm text-destructive">{previewError}</p>}
     {preview&&<div role="status" className="rounded-md border bg-muted/40 px-3 py-2.5 text-sm">
      {preview.activation_simulated&&<p className={noteClass}>Preview simulates an enabled code. The draft has not been activated.</p>}
      <p className={noteClass}>Simulated booking date: {preview.preview_as_of} (Asia/Kolkata)</p>
      <div className="my-2 flex flex-wrap items-baseline gap-2 tabular-nums">
       <span className="text-muted-foreground"><span className="sr-only">Subtotal before discount: </span><s>₹{(preview.subtotal+preview.promotion.discount_amount).toLocaleString('en-IN')}</s></span>
       <strong className="text-xl font-semibold"><span className="sr-only">Subtotal after discount: </span>₹{preview.subtotal.toLocaleString('en-IN')}</strong>
      </div>
      <dl className="mb-2 space-y-1 text-sm tabular-nums">
       <div className="flex justify-between gap-2"><dt>Accommodation discount</dt><dd>−₹{preview.promotion.discount_amount.toLocaleString('en-IN')}</dd></div>
       <div className="flex justify-between gap-2"><dt>Tax</dt><dd>₹{preview.tax_amount.toLocaleString('en-IN')}</dd></div>
       <div className="flex justify-between gap-2 border-t pt-2 font-semibold"><dt>Preview total</dt><dd>₹{preview.total_amount.toLocaleString('en-IN')}</dd></div>
      </dl>
      <p className={noteClass}>Meals and extras are not discounted. No extras are selected in this preview.</p>
     </div>}
    </fieldset></CardContent>
   </Card>
  </div>
 </section>;
}

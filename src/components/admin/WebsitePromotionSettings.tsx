import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Offer = {code:string;label:string;revision?:number;is_active:boolean;is_public:boolean;discount_kind:string;discount_basis:string|null;discount_value:number|null;amount_per_night?:number;amount_per_booking?:number;booking_from:string|null;booking_to:string|null;stay_from:string|null;stay_to:string|null;day_scope:string;mixed_stay_mode:string|null};
const api = supabase as unknown as {rpc:(name:string,args?:Record<string,unknown>)=>Promise<{data:unknown;error:{message:string}|null}>};
const initial = ():Offer=>({code:'',label:'',is_active:false,is_public:false,discount_kind:'fixed',discount_basis:null,discount_value:null,booking_from:null,booking_to:null,stay_from:null,stay_to:null,day_scope:'both',mixed_stay_mode:null});
const selectClass='h-10 w-full rounded border bg-background px-2';
export default function WebsitePromotionSettings(){
 const [offers,setOffers]=useState<Offer[]>([]),[enabled,setEnabled]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState(''),[form,setForm]=useState<Offer|null>(null),[review,setReview]=useState(false);
 async function load(){const {data,error}=await api.rpc('website_promotion_settings');if(error)throw Error(error.message);const r=data as {enabled:boolean;offers:Offer[]};if(!Array.isArray(r?.offers))throw Error('Invalid promotion settings');setOffers(r.offers);setEnabled(r.enabled);setReady(r.offers.every(o=>typeof o.day_scope==='string'));}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 const change=(key:keyof Offer,value:unknown)=>{setReview(false);setForm(f=>f?{...f,[key]:value}:null)};
 const restricted=!!form&&(form.day_scope!=='both'||!!form.stay_from||!!form.stay_to);
 const flat=form?.code==='DIRECT1000'||form?.discount_basis==='booking';
 const valid=!!form&&/^[A-Z0-9_-]{3,30}$/.test(form.code)&&!!form.label.trim()&&(form.discount_kind==='legacy'||(!!form.discount_basis&&Number(form.discount_value)>0&&(form.discount_kind!=='percentage'||Number(form.discount_value)<=100)))&&(!restricted||!!form.mixed_stay_mode)&&(!flat||form.mixed_stay_mode!=='eligible_nights')&&(!form.booking_from||!form.booking_to||form.booking_from<=form.booking_to)&&(!form.stay_from||!form.stay_to||form.stay_from<=form.stay_to);
 async function save(){if(!form||!valid||busy)return;setBusy(true);setError('');try{const {error}=await api.rpc('save_managed_website_promotion',{p_settings:form,p_expected_revision:form.revision??null});if(error)throw Error(error.message);await load();setForm(null);setReview(false);}catch(e){setError(e instanceof Error?e.message:'Save failed');}finally{setBusy(false)}}
 return <Card><CardHeader><CardTitle>Website promotions</CardTitle></CardHeader><CardContent className="space-y-4">
 <p>Manage each offer separately. Discounts affect accommodation, not meals or extras. Only one code per checkout. Saved bookings and existing payment snapshots are not repriced.</p>
 <p>{enabled?'Offer release enabled. Saving enabled settings affects new quotes.':'Offer release is OFF. This panel cannot enable the release.'}</p>
 {!ready&&<p role="status">Promotion-management migration is not installed. Settings are read-only.</p>}
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 <div className="flex gap-2"><Input aria-label="Search promotions" placeholder="Search code or description" value={search} onChange={e=>setSearch(e.target.value)}/><Button disabled={!ready||busy} onClick={()=>{setReview(false);setForm(initial())}}>New code</Button></div>
 {offers.filter(o=>(o.code+' '+o.label).toLowerCase().includes(search.toLowerCase())).map(o=><div key={o.code} className="rounded border p-3 flex justify-between gap-3"><div><strong>{o.code}</strong><p>{o.label}</p><p className="text-sm">{o.is_active?'Enabled':'Disabled'} · {o.is_public===false?'Private':'Public'} · {o.day_scope??'both'} · revision {o.revision}</p><p className="text-sm">Booking window: {o.booking_from??'No start'} to {o.booking_to??'No end'}; occupied stay nights: {o.stay_from??'No start'} to {o.stay_to??'No end'}</p></div><Button disabled={!ready||busy} onClick={()=>{setReview(false);setForm({...o})}}>Edit</Button></div>)}
 <p className="text-sm text-muted-foreground">Room/meal-plan restrictions, usage caps, one-use-per-guest, minimum stay and excluded-date lists are not implemented here. No example promo or commercial restriction is automatically activated.</p>
 <Dialog open={!!form} onOpenChange={open=>{if(!busy&&!open){setForm(null);setReview(false)}}}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{form?.revision?'Edit':'Create'} promotion</DialogTitle></DialogHeader>{form&&<div className="space-y-3">
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 <Label>Code<Input disabled={!!form.revision||busy} value={form.code} onChange={e=>change('code',e.target.value.toUpperCase())}/></Label>
 <Label>Guest-facing description<Input disabled={busy} value={form.label} onChange={e=>change('label',e.target.value)}/></Label>
 {form.discount_kind==='legacy'?<p>Existing discount preserved: {form.code==='EP300'?'₹300 per verified room-only night':'₹1,000 per booking, accommodation only'}.</p>:<><Label>Discount type<select className={selectClass} disabled={busy} value={form.discount_kind} onChange={e=>change('discount_kind',e.target.value)}><option value="fixed">Fixed ₹</option><option value="percentage">Percentage</option></select></Label><Label>Value<Input disabled={busy} type="number" min="0.01" step="0.01" value={form.discount_value??''} onChange={e=>change('discount_value',e.target.value===''?null:Number(e.target.value))}/></Label><Label>Apply discount<select className={selectClass} disabled={busy} value={form.discount_basis??''} onChange={e=>change('discount_basis',e.target.value||null)}><option value="">Choose explicitly</option><option value="booking">Once per booking accommodation amount</option><option value="night">Per verified room-only occupied night</option></select></Label></>}
 <div className="grid grid-cols-2 gap-3">{(['booking_from','booking_to','stay_from','stay_to'] as const).map(k=><Label key={k}>{k.replace(/_/g,' ')}<Input type="date" disabled={busy} value={form[k]??''} onChange={e=>change(k,e.target.value||null)}/></Label>)}</div>
 <p className="text-sm">Dates are inclusive in Asia/Kolkata. Stay windows apply to occupied nights, not checkout. Blank dates impose no limit.</p>
 <Label>Day eligibility<select className={selectClass} disabled={busy} value={form.day_scope} onChange={e=>change('day_scope',e.target.value)}><option value="both">Weekdays and weekends</option><option value="weekday">Weekdays only</option><option value="weekend">Weekends only</option></select></Label>
 <p className="text-sm">Uses the existing effective-dated hotel weekend rules, including protected periods. Does not hardcode Friday/Saturday/Sunday.</p>
 <Label>Stay eligibility policy<select className={selectClass} disabled={busy} value={form.mixed_stay_mode??''} onChange={e=>change('mixed_stay_mode',e.target.value||null)}><option value="">Choose when setting stay/day restrictions</option><option value="all_nights">All occupied nights must qualify</option>{!flat&&<option value="eligible_nights">Discount only eligible nights</option>}</select></Label>
 {flat&&<p className="text-sm">Once-per-booking offers require all nights to qualify; partial-night proration is not offered.</p>}
 <Label className="flex gap-2"><input type="checkbox" disabled={busy} checked={form.is_public} onChange={e=>change('is_public',e.target.checked)}/>List publicly in booking offers</Label><Label className="flex gap-2"><input type="checkbox" disabled={busy} checked={form.is_active} onChange={e=>change('is_active',e.target.checked)}/>Enabled for eligible new checkouts</Label>
 {!valid&&<p className="text-sm text-destructive">Complete required fields and select an explicit stay policy for restrictions. Date ranges must be ordered.</p>}
 {review?<div className="rounded border p-3 space-y-2"><p>Review: {form.code} will be {form.is_active?'enabled':'disabled'}, {form.is_public?'public':'private'}, for {form.day_scope}. Booking and stay windows above apply. Existing bookings remain unchanged. No usage limits are configured.</p><Button disabled={busy||!valid} onClick={()=>void save()}>{busy?'Saving…':'Confirm and save'}</Button><Button variant="outline" disabled={busy} onClick={()=>setReview(false)}>Back</Button></div>:<Button disabled={busy||!valid} onClick={()=>setReview(true)}>Review changes</Button>}
 </div>}</DialogContent></Dialog>
 </CardContent></Card>;
}

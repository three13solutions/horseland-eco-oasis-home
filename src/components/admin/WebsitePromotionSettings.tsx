import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, CalendarDays, Info, Plus, Search } from 'lucide-react';

type Offer = PromotionRestrictions & {code:string;label:string;revision?:number;is_active:boolean;is_public:boolean;discount_kind:string;discount_basis:string|null;discount_value:number|null;amount_per_night?:number;amount_per_booking?:number;booking_from:string|null;booking_to:string|null;stay_from:string|null;stay_to:string|null;day_scope:string;mixed_stay_mode:string|null};
const api = supabase as unknown as {rpc:(name:string,args?:Record<string,unknown>)=>Promise<{data:unknown;error:{message:string}|null}>};
const promoStatuses = ['Active', 'Draft / disabled', 'Scheduled', 'Expired'] as const;
type PromoStatus = typeof promoStatuses[number];
const promoDayFormatter = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
function promoToday(now = new Date()) {
 const parts = promoDayFormatter.formatToParts(now);
 return ['year', 'month', 'day'].map(part => parts.find(value => value.type === part)?.value).join('-');
}
function promotionStatus(offer: Offer, today: string): PromoStatus {
 if ((offer.booking_to && offer.booking_to < today) || (offer.stay_to && offer.stay_to < today)) return 'Expired';
 if (!offer.is_active) return 'Draft / disabled';
 if (offer.booking_from && offer.booking_from > today) return 'Scheduled';
 return 'Active';
}
type TableSwitch = 'is_public' | 'is_active';
type PendingSwitch = { offer: Offer; field: TableSwitch; checked: boolean };
function isRestricted(offer: Offer) {
 return offer.day_scope!=='both'||!!offer.stay_from||!!offer.stay_to||offer.excluded_stay_dates.length>0;
}
function isFlat(offer: Offer) {
 return offer.code==='DIRECT1000'||offer.discount_basis==='booking';
}
function validOffer(offer: Offer) {
 const { code,label,discount_kind,discount_basis,discount_value,mixed_stay_mode,booking_from,booking_to,stay_from,stay_to }=offer;
 return !restrictionError(offer)&&/^[A-Z0-9_-]{3,30}$/.test(code)&&!!label.trim()
  &&(discount_kind==='legacy'||(!!discount_basis&&Number(discount_value)>0&&(discount_kind!=='percentage'||Number(discount_value)<=100)))
  &&(!isRestricted(offer)||!!mixed_stay_mode)&&(!isFlat(offer)||mixed_stay_mode!=='eligible_nights')
  &&(!booking_from||!booking_to||booking_from<=booking_to)&&(!stay_from||!stay_to||stay_from<=stay_to);
}
async function readOffers() {
 const {data,error}=await api.rpc('website_promotion_settings');
 if(error)throw Error(error.message);
 const settings=data as {enabled:boolean;offers:Offer[]};
 if(!Array.isArray(settings?.offers))throw Error('Invalid promotion settings');
 return settings;
}
const switchName=(field:TableSwitch)=>field==='is_public'?'Visibility':'Activation';
const switchDescription=(field:TableSwitch,on:boolean)=>field==='is_public'?(on?'Make public':'Make private'):(on?'Enable code':'Disable code');
const initial = ():Offer=>({...unrestrictedPromotion(),code:'',label:'',is_active:false,is_public:false,discount_kind:'fixed',discount_basis:null,discount_value:null,booking_from:null,booking_to:null,stay_from:null,stay_to:null,day_scope:'both',mixed_stay_mode:null});
const inputClass = 'h-9 min-w-0 text-sm';
const selectClass = 'h-9 w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const noteClass = 'text-xs leading-relaxed text-muted-foreground';
const sectionClass = 'min-w-0 space-y-2.5 border-t pt-3';
const fieldGrid = 'grid min-w-0 gap-2.5 sm:grid-cols-2';
const identityDiscountGrid = 'grid min-w-0 gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))]';
const roomMealUsageGrid = 'grid min-w-0 items-start gap-2.5 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]';
const eligibilityGrid = 'grid min-w-0 items-start gap-2.5 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]';
const visibilityGrid = 'grid min-w-0 gap-2.5 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))]';
const modes = [['RO','Room Only (EP)'], ['BB','Bed & Breakfast (CP)'], ['HB','Half Board (MAP)'], ['FB','Full Board (AP)']] as const;
function FieldHelp({ label, children }: { label: string; children: ReactNode }) {
 const descriptionId=useId();
 const [open,setOpen]=useState(false);
 const [pinned,setPinned]=useState(false);
 const hoverTimer=useRef<ReturnType<typeof setTimeout> | null>(null);
 const cancelHoverClose=()=>{
  if(hoverTimer.current!==null){clearTimeout(hoverTimer.current);hoverTimer.current=null;}
 };
 useEffect(()=>()=>{if(hoverTimer.current!==null)clearTimeout(hoverTimer.current);},[]);
 const scheduleHoverClose=()=>{
  if(pinned)return;
  cancelHoverClose();
  hoverTimer.current=setTimeout(()=>{setOpen(false);hoverTimer.current=null;},220);
 };
 return <>
  <span id={descriptionId} className="sr-only">{children}</span>
  <Popover open={open} onOpenChange={next=>{cancelHoverClose();setOpen(next);if(!next)setPinned(false);}}>
   <PopoverTrigger asChild>
    <button type="button" aria-label={`Help: ${label}`} aria-describedby={descriptionId}
     className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
     onPointerEnter={event=>{if(event.pointerType==='mouse'){cancelHoverClose();setOpen(true);}}}
     onPointerLeave={event=>{if(event.pointerType==='mouse'&&document.activeElement!==event.currentTarget)scheduleHoverClose();}}
     onFocus={()=>{cancelHoverClose();setOpen(true);}}
     onBlur={()=>{if(!pinned)setOpen(false);}}
     onClick={event=>{event.preventDefault();cancelHoverClose();setPinned(!pinned);setOpen(!pinned);}}>
     <Info aria-hidden="true" className="h-3.5 w-3.5"/>
    </button>
   </PopoverTrigger>
   <PopoverContent aria-label={`Help: ${label}`} align="start" side="top" sideOffset={5}
    className="w-64 max-w-[calc(100vw-1rem)] p-2.5 text-xs leading-relaxed"
    onPointerEnter={cancelHoverClose} onPointerLeave={scheduleHoverClose}
    onOpenAutoFocus={event=>event.preventDefault()} onCloseAutoFocus={event=>event.preventDefault()}>
    {children}
   </PopoverContent>
  </Popover>
 </>;
}
function Field({ id, label, help, children }: { id: string; label: string; help?: ReactNode; children: ReactNode }) {
 return <div className="min-w-0 space-y-1">
  {help?<div className="flex items-center gap-1"><Label htmlFor={id}>{label}</Label><FieldHelp label={label}>{help}</FieldHelp></div>:<Label htmlFor={id}>{label}</Label>}
  {children}
 </div>;
}
type DateWindow = { from: string | null; to: string | null };

function calendarDate(value: string | null) {
 if (!value || !validDate(value)) return undefined;
 const [year, month, day] = value.split('-').map(Number);
 const local = new Date(2000, 0, 1, 12);
 local.setFullYear(year, month - 1, day);
 return local;
}
function calendarValue(date: Date) {
 return [String(date.getFullYear()).padStart(4, '0'), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
const rangeFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
function displayRange({ from, to }: DateWindow) {
 const format = (value: string) => validDate(value) ? rangeFormatter.format(new Date(value + 'T00:00:00Z')) : value;
 if (from && to) return from === to ? format(from) : `${format(from)} to ${format(to)}`;
 if (from) return `From ${format(from)}`;
 if (to) return `Through ${format(to)}`;
 return 'Any date';
}

function PromoDateRange({ id, label, value, today, disabled, onChange }: {
 id: string; label: string; value: DateWindow; today: string; disabled: boolean; onChange: (range: DateWindow) => void;
}) {
 const [open, setOpen] = useState(false);
 const [draft, setDraft] = useState<DateWindow>(value);
 const indiaToday = calendarDate(today);
 const start = calendarDate(draft.from);
 const end = calendarDate(draft.to);
 const selected = !start && !end ? undefined : { from: start ?? end, to: start && end ? end : start ? undefined : end };
 const selectDay = (day: Date) => {
  const picked = calendarValue(day);
  setDraft(current => {
   if (!!current.from === !!current.to) return { from: picked, to: null };
   const other = current.from ?? current.to!;
   return picked <= other ? { from: picked, to: other } : { from: other, to: picked };
  });
 };
 return <Field id={id} label={label} help={label==='Booking dates'
  ? 'Controls when the reservation is made. Dates are inclusive in India time (Asia/Kolkata). Choose Any date for no limit.'
  : 'Controls which occupied nights qualify, not checkout day. Dates are inclusive in India time (Asia/Kolkata). Choose Any date for no limit.'}>
  <Popover open={open} onOpenChange={next => {
   if (next) setDraft(value);
   setOpen(next);
  }}>
   <PopoverTrigger asChild>
    <Button id={id} type="button" size="sm" variant="outline" disabled={disabled} aria-label={`${label}: ${displayRange(value)}`} className="w-full justify-start px-2.5 text-left font-normal">
     <CalendarDays aria-hidden="true" className="mr-1 h-4 w-4 shrink-0 text-muted-foreground"/>
     <span className="min-w-0 truncate">{displayRange(value)}</span>
    </Button>
   </PopoverTrigger>
   <PopoverContent align="start" className="w-auto max-w-[calc(100vw-1rem)] p-0" aria-label={`${label} calendar`}>
    <div className="space-y-1 border-b px-3 py-2">
     <p className="text-sm font-medium">{label}</p>
     <p className={noteClass}>Pick two dates, the same date twice for one day, or leave either end open.</p>
    </div>
    <Calendar mode="range" defaultMonth={start ?? end ?? indiaToday} today={indiaToday} initialFocus
     selected={selected} onDayClick={selectDay} showOutsideDays={false} className="p-2"
     classNames={{ month: 'space-y-2', head_cell: 'w-9 text-xs font-medium text-muted-foreground', row: 'mt-1 flex w-full', cell: 'relative h-9 w-9 p-0 text-center text-sm [&:has([aria-selected])]:bg-accent', day: 'h-9 w-9 rounded-md p-0 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', day_hidden: 'invisible' }}/>
    <div className="space-y-2 border-t p-2">
     <p className="px-1 text-xs" aria-live="polite">{displayRange(draft)}</p>
     <div className="flex flex-wrap gap-1">
      <Button type="button" size="sm" variant="ghost" disabled={!draft.from} onClick={()=>setDraft(current=>({...current, from:null}))}>Clear start</Button>
      <Button type="button" size="sm" variant="ghost" disabled={!draft.to} onClick={()=>setDraft(current=>({...current, to:null}))}>Clear end</Button>
      <Button type="button" size="sm" variant="ghost" disabled={!draft.from&&!draft.to} onClick={()=>setDraft({from:null,to:null})}>Any date</Button>
     </div>
     <div className="flex justify-end gap-1">
      <Button type="button" variant="outline" size="sm" onClick={()=>setOpen(false)}>Cancel</Button>
      <Button type="button" size="sm" onClick={()=>{if(draft.from!==value.from||draft.to!==value.to)onChange(draft);setOpen(false);}}>Apply dates</Button>
     </div>
    </div>
   </PopoverContent>
  </Popover>
 </Field>;
}

export default function WebsitePromotionSettings(){
 const [offers,setOffers]=useState<Offer[]>([]),[enabled,setEnabled]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState(''),[form,setForm]=useState<Offer|null>(initial),[review,setReview]=useState(false);
 async function load(){
  const settings=await readOffers();
  setOffers(settings.offers.map(offer=>({...unrestrictedPromotion(),...offer})));
  setEnabled(settings.enabled);
  setReady(settings.offers.every(offer=>typeof offer.day_scope==='string'&&'total_usage_limit' in offer&&'eligible_room_category_ids' in offer));
 }
 const [pendingSwitch,setPendingSwitch]=useState<PendingSwitch|null>(null);
 const [switchError,setSwitchError]=useState('');
 const switchTrigger=useRef<HTMLButtonElement|null>(null);
 const statusControl=useRef<HTMLSelectElement>(null);
 const switchCandidate=pendingSwitch?{...pendingSwitch.offer,[pendingSwitch.field]:pendingSwitch.checked}:null;
 const canSwitch=switchCandidate!==null&&validOffer(switchCandidate)&&Number.isInteger(switchCandidate.revision);
 const beginSwitch=(offer:Offer,field:TableSwitch,checked:boolean,trigger:HTMLButtonElement|null)=>{
  if(busy||!ready)return;
  switchTrigger.current=trigger;
  setSwitchError('');
  setPendingSwitch({offer,field,checked});
 };
 async function confirmSwitch(){
  if(!pendingSwitch||!canSwitch||busy||!ready)return;
  const {offer,field,checked}=pendingSwitch;
  setBusy(true);
  setSwitchError('');
  try {
   const settings=await readOffers();
   const persisted=settings.offers.find(item=>item.code===offer.code);
   if(!persisted||persisted.revision!==offer.revision||persisted[field]!==offer[field]||settings.enabled!==enabled){
    throw Error('Promotion settings changed. Close this review, then try again using the refreshed list.');
   }
   const next={...persisted,[field]:checked};
   if(!validOffer(next))throw Error('This code’s settings need attention. Open Edit and check the required fields first.');
   const {data,error}=await api.rpc('save_managed_website_promotion',{p_settings:next,p_expected_revision:persisted.revision});
   if(error)throw Error(error.message);
   const saved=data as Offer;
   if(saved?.code===offer.code&&Number.isInteger(saved.revision)){
    setOffers(current=>current.map(item=>item.code===saved.code?{...unrestrictedPromotion(),...saved}:item));
   }else{
    // A successful RPC must not be retried merely because the response could not be read.
    try {await load();} catch {setError('The switch was saved, but the list could not refresh. Reload the page to see its final state.');}
   }
   // Preserve unsaved editor inputs, rebasing only an editor on the same reviewed revision.
   if(saved?.code===offer.code&&Number.isInteger(saved.revision)){
    setForm(current=>current&&current.code===offer.code&&current.revision===offer.revision
      ? {...current,[field]:current[field]===offer[field]?checked:current[field],revision:saved.revision}
      : current);
   }
   setReview(false);
   setPendingSwitch(null);
  } catch (e) {
   const message=e instanceof Error?e.message:'The switch could not be saved.';
   setSwitchError(message);
   if(/changed/i.test(message))try {await load();} catch {/* keep the original failure visible */}
  } finally {setBusy(false);}
 }
 useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 const change=(key:keyof Offer,value:unknown)=>{setReview(false);setForm(f=>f?{...f,[key]:value}:null)};
 const [statusFilter,setStatusFilter]=useState<PromoStatus | 'all'>('all');
 const query=search.trim().toLowerCase();
 const today=promoToday();
 const visibleOffers=offers.filter(o=>(o.code+' '+o.label).toLowerCase().includes(query)&&
   (statusFilter==='all'||promotionStatus(o, today)===statusFilter));
 const [categories,setCategories]=useState<{id:string;name:string;is_active:boolean}[]>([]);
 const [excludedDate,setExcludedDate]=useState('');
 const [customEmail,setCustomEmail]=useState(false);
 const editorRef=useRef<HTMLHeadingElement>(null);
 const manageRef=useRef<HTMLButtonElement>(null);
 const [tab,setTab]=useState<'manage'|'editor'>('manage');
 const focusView=useRef<'manage'|'editor'|null>(null);
 useEffect(()=>{
  if(focusView.current!==tab||busy)return;
  const frame=requestAnimationFrame(()=>{
   const target=tab==='manage'?manageRef.current:editorRef.current;
   if(target&&focusView.current===tab){target.focus();focusView.current=null;}
  });
  return ()=>cancelAnimationFrame(frame);
 },[tab,form?.revision,busy]);
 const goToManage=()=>{
  focusView.current='manage';
  setTab('manage');
 };
 const editOffer=(offer: Offer = initial())=>{
  setReview(false);
  setForm({...offer});
  focusView.current='editor';
  setTab('editor');
  setExcludedDate('');setCustomEmail(false);
 };
 useEffect(()=>{
  let active=true;
  void (async()=>{
   try {
    const {data,error}=await supabase.from('room_categories').select('id,name,is_active').order('name');
    if(error)throw Error(error.message);
    if(active)setCategories(data??[]);
   } catch {
    if(active)setError('Room categories could not load. Refresh the page to retry.');
   }
  })();
  return ()=>{active=false;};
 },[]);
 const restricted=!!form&&isRestricted(form);
 const flat=!!form&&isFlat(form);
 const restrictionsError=form?restrictionError(form):null;
 const valid=!!form&&validOffer(form);
 const customEmailIncomplete=customEmail&&form?.per_guest_usage_limit==null;
 const canSave=valid&&!customEmailIncomplete;
 const emailMode=customEmail||(form?.per_guest_usage_limit!=null&&form.per_guest_usage_limit!==1)?'custom':form?.per_guest_usage_limit===1?'once':'unlimited';
 const activeCategories=categories.filter(c=>c.is_active);
 const activeCategoryIds=activeCategories.map(c=>c.id);
 const roomSelection=form?.eligible_room_category_ids??activeCategoryIds;
 const savedInactiveIds=(form?.eligible_room_category_ids??[]).filter(id=>!activeCategoryIds.includes(id));
 const planSelection=form?.eligible_meal_plan_codes??modes.map(([code])=>code);
 async function save(){if(!form||!canSave||!ready||busy)return;setBusy(true);setError('');try{const {error}=await api.rpc('save_managed_website_promotion',{p_settings:form,p_expected_revision:form.revision??null});if(error)throw Error(error.message);await load();setForm(initial());setReview(false);setExcludedDate('');setCustomEmail(false);goToManage();}catch(e){setError(e instanceof Error?e.message:'Save failed');}finally{setBusy(false)}}
 const unavailable = !ready || busy;
 return <section aria-label="Website promotions" className="space-y-3">
  <header className="flex flex-wrap items-start justify-between gap-2">
   <div>
    <h1 className="text-3xl font-bold tracking-tight">Promo Codes</h1>
    <p className="mt-1 text-sm text-muted-foreground">Manage accommodation discounts without changing room rates. One code per checkout.</p>
    <p className="mt-1 text-sm text-muted-foreground">View and apply available promo codes in the <Link to="/admin/pricing/rate-card" className="rounded-sm font-medium text-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Live Rate Card</Link>.</p>
   </div>
  </header>
  <p className={noteClass}>{enabled?'Changes apply to new quotes only. Existing bookings and payment snapshots are not repriced.':'This page cannot enable the offer release. Existing bookings and payment snapshots are not repriced.'}</p>
  {!ready&&<p role="status" className={noteClass}>Promotion-management migration is not installed. Settings are read-only.</p>}
  {error&&<p role="alert" className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>}
  <Tabs value={tab} activationMode="manual" onValueChange={value=>{if(value==='manage'||value==='editor')setTab(value);}} className="min-w-0">
   <TabsList aria-label="Promotion code views">
    <TabsTrigger ref={manageRef} value="manage" disabled={busy}>Manage Codes</TabsTrigger>
    <TabsTrigger value="editor" disabled={unavailable}>{form?.revision?'Edit Code':'New Code'}</TabsTrigger>
   </TabsList>
   <TabsContent value="manage" className="min-w-0">
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
      <select ref={statusControl} aria-label="Filter promotions by status" className={selectClass.replace('w-full','w-auto')} value={statusFilter} onChange={e=>{const value=e.target.value;const status=promoStatuses.find(item=>item===value);setStatusFilter(status??'all');}}>
       <option value="all">All statuses</option>{promoStatuses.map(status=><option key={status} value={status}>{status}</option>)}
      </select>
     </div>
    </CardHeader>
    <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
     {ready&&visibleOffers.length===0&&<p role="status" className={noteClass}>{offers.length===0?'No promotion codes yet.':'No promotions match these filters.'}</p>}
     {visibleOffers.length>0&&<div className="rounded-md border">
      <Table className="min-w-[42rem]" aria-label="Promo codes">
       <TableHeader className="bg-muted/50"><TableRow>
        <TableHead scope="col" className="h-9 px-2">Code</TableHead><TableHead scope="col" className="h-9 px-2">Offer</TableHead>
        <TableHead scope="col" className="h-9 px-2">Validity</TableHead><TableHead scope="col" className="h-9 px-2">Status</TableHead>
        <TableHead scope="col" className="h-9 px-2">Visibility</TableHead><TableHead scope="col" className="h-9 px-2">Activation</TableHead>
        <TableHead scope="col" className="h-9 px-2"><span className="sr-only">Actions</span></TableHead>
       </TableRow></TableHeader>
       <TableBody>{visibleOffers.map(o=><TableRow key={o.code} data-state={form?.revision&&form.code===o.code?'selected':undefined}>
        <th scope="row" className="p-2 text-left font-medium">{o.code}</th>
        <TableCell className="p-2">{o.code==='EP300'&&o.discount_kind==='legacy'?'₹300 / room-only night':o.code==='DIRECT1000'&&o.discount_kind==='legacy'?'₹1,000 / booking':o.discount_value==null?o.label:o.discount_kind==='percentage'?`${o.discount_value}% off`:`₹${o.discount_value.toLocaleString('en-IN')} off`}</TableCell>
        <TableCell className={`p-2 ${noteClass}`}><p>Book: {o.booking_from??'Any'} to {o.booking_to??'Any'}</p><p>Stay: {o.stay_from??'Any'} to {o.stay_to??'Any'}</p></TableCell>
        <TableCell className="p-2"><Badge variant={promotionStatus(o, today)==='Active'?'default':'secondary'}>{promotionStatus(o, today)}</Badge></TableCell>
        {(['is_public','is_active'] as const).map(field=><TableCell key={field} className="p-2">
         <div className="flex items-center gap-2">
          <Switch type="button" disabled={unavailable||!Number.isInteger(o.revision)} checked={o[field]} aria-label={`${switchName(field)} for ${o.code}`}
           onCheckedChange={checked=>beginSwitch(o,field,checked,document.activeElement instanceof HTMLButtonElement?document.activeElement:null)}/>
          <span className={noteClass}>{field==='is_public'?(o.is_public?'Public':'Private'):(o.is_active?'Enabled':'Disabled')}</span>
         </div>
        </TableCell>)}
        <TableCell className="p-1 text-right"><Button type="button" variant="ghost" size="sm" aria-label={`Edit ${o.code}`} disabled={unavailable} onClick={()=>editOffer(o)}>Edit</Button></TableCell>
       </TableRow>)}</TableBody>
      </Table>
     </div>}
    </CardContent>
   </Card>
   </TabsContent>

   <TabsContent value="editor" className="min-w-0">
   <Card className="min-w-0">
    <CardHeader className="p-3 sm:p-4">
     <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 tabIndex={-1} ref={editorRef} className="text-lg font-semibold leading-tight">{form?.revision?`Edit ${form.code}`:'Create promo code'}</h2>
      <div className="flex flex-wrap items-center gap-2">
       <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={goToManage}><ArrowLeft aria-hidden="true" className="mr-1 h-4 w-4"/> Back to Manage Codes</Button>
       {form?.revision&&<Button type="button" size="sm" variant="outline" disabled={unavailable} onClick={()=>editOffer()}><Plus aria-hidden="true" className="mr-1 h-4 w-4"/> New Code</Button>}
      </div>
     </div>
    </CardHeader>
    <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">{form&&<fieldset disabled={unavailable} className="min-w-0 space-y-3">
     <legend className="sr-only">Promo code settings</legend>
     <div className={identityDiscountGrid} data-promo-layout="identity-discount">
      <div className="row-span-3 grid min-w-0 grid-rows-[subgrid] items-start">
       <Field id="promo-code" label="Code"><Input id="promo-code" className={inputClass} autoCapitalize="characters" spellCheck={false} disabled={!!form.revision||unavailable} value={form.code} onChange={e=>change('code',e.target.value.toUpperCase())}/></Field>
       <Field id="promo-description" label="Guest-facing description"><Input id="promo-description" className={inputClass} value={form.label} onChange={e=>change('label',e.target.value)}/></Field>
       <section className="min-w-0 space-y-1.5" aria-labelledby="promo-visibility">
        <h3 id="promo-visibility" className="text-sm font-semibold">Visibility and activation</h3>
        <div className={visibilityGrid} data-promo-layout="visibility">
         <div className="flex min-w-0 min-h-9 items-center justify-between gap-3 rounded-md border px-2.5 py-1.5"><Label htmlFor="promo-public">List publicly in booking offers</Label><Switch id="promo-public" disabled={unavailable} checked={form.is_public} onCheckedChange={checked=>change('is_public',checked)}/></div>
         <div className="flex min-w-0 min-h-9 items-center justify-between gap-3 rounded-md border px-2.5 py-1.5"><Label htmlFor="promo-active">Enable for eligible new checkouts</Label><Switch id="promo-active" disabled={unavailable} checked={form.is_active} onCheckedChange={checked=>change('is_active',checked)}/></div>
        </div>
       </section>
      </div>
      <div className="row-span-3 grid min-w-0 grid-rows-[subgrid] items-start">
       {form.discount_kind==='legacy'?<p className="rounded-md bg-muted px-3 py-2 text-sm">Existing discount preserved: {form.code==='EP300'?'₹300 per verified room-only night':'₹1,000 per booking, accommodation only'}.</p>:<>
        <fieldset className="min-w-0 space-y-1.5">
         <legend className="mb-1 text-sm font-medium leading-5">Discount type</legend>
         <div className="grid grid-cols-2 gap-2">
          {([['percentage','Percentage'],['fixed','Fixed amount']] as const).map(([value,label])=><Button key={value} size="sm" type="button" aria-pressed={form.discount_kind===value} variant={form.discount_kind===value?'default':'outline'} onClick={()=>change('discount_kind',value)}>{label}</Button>)}
         </div>
        </fieldset>
         <Field id="promo-value" label={form.discount_kind==='percentage'?'Discount (%)':'Discount (₹)'}><Input id="promo-value" className={inputClass} type="number" min="0.01" step="0.01" value={form.discount_value??''} onChange={e=>change('discount_value',e.target.value===''?null:Number(e.target.value))}/></Field>
         <fieldset className="min-w-0 space-y-1.5">
          <legend className="mb-1 text-sm font-medium leading-5">Apply discount</legend>
          <div className="grid grid-cols-2 gap-2">
           {([['booking','Per booking'],['night','Per night']] as const).map(([value,label])=><Button key={value} size="sm" type="button" aria-pressed={form.discount_basis===value} variant={form.discount_basis===value?'default':'outline'} onClick={()=>change('discount_basis',value)}>{label}</Button>)}
          </div>
          <p className={noteClass}>Per-night rates must be verified room-only rates.</p>
         </fieldset>
       </>}
      </div>
     </div>
     <section className={sectionClass} aria-labelledby="promo-eligibility">
      <h3 id="promo-eligibility" className="text-sm font-semibold">Room and meal eligibility</h3>
      <div className={roomMealUsageGrid} data-promo-layout="room-meal-usage">
       <fieldset className="min-w-0 space-y-1.5">
        <legend className="text-sm font-medium">Room categories</legend>
        <div className="space-y-1 rounded-md border p-2.5">
         <div className="flex min-h-7 items-center gap-2">
          <Checkbox id="promo-all-rooms" disabled={unavailable||activeCategoryIds.length===0} checked={form.eligible_room_category_ids===null||activeCategoryIds.every(id=>roomSelection.includes(id))} onCheckedChange={checked=>{
           change('eligible_room_category_ids',checked===true?(savedInactiveIds.length>0?[...activeCategoryIds,...savedInactiveIds]:null):savedInactiveIds);
          }}/>
          <Label htmlFor="promo-all-rooms">All active rooms</Label>
         </div>
         {activeCategories.map(c=><div key={c.id} className="flex min-h-7 items-center gap-2">
          <Checkbox id={`promo-category-${c.id}`} disabled={unavailable} checked={roomSelection.includes(c.id)} onCheckedChange={checked=>change('eligible_room_category_ids',checked===true?[...roomSelection,c.id]:roomSelection.filter(id=>id!==c.id))}/>
          <Label htmlFor={`promo-category-${c.id}`}>{c.name}</Label>
         </div>)}
         {activeCategories.length===0&&<p className={noteClass}>No active room categories available.</p>}
         {savedInactiveIds.map(id=><div key={id} className="flex min-h-7 flex-wrap items-center gap-2">
          <span className={noteClass}>{categories.find(c=>c.id===id)?.name??id} (saved inactive or unavailable category)</span>
          <Button size="sm" type="button" variant="ghost" aria-label={`Remove saved room category ${categories.find(c=>c.id===id)?.name??id}`} onClick={()=>change('eligible_room_category_ids',roomSelection.filter(value=>value!==id))}>Remove</Button>
         </div>)}
        </div>
       </fieldset>
       <fieldset className="min-w-0 space-y-1.5">
        <legend className="text-sm font-medium"><span className="inline-flex items-center gap-1">Meal plans<FieldHelp label="Meal plans">Discount applies to room charges only. Room categories and meal plans determine which bookings qualify. Meals aren’t discounted.</FieldHelp></span></legend>
        <div className="space-y-1 rounded-md border p-2.5">
         <div className="flex min-h-7 items-center gap-2">
          <Checkbox id="promo-all-plans" disabled={unavailable} checked={form.eligible_meal_plan_codes===null||modes.every(([code])=>planSelection.includes(code))} onCheckedChange={checked=>change('eligible_meal_plan_codes',checked===true?null:[])}/>
          <Label htmlFor="promo-all-plans">All plans</Label>
         </div>
         {modes.map(([code,label])=><div key={code} className="flex min-h-7 items-center gap-2">
          <Checkbox id={`promo-plan-${code}`} disabled={unavailable} checked={planSelection.includes(code)} onCheckedChange={checked=>change('eligible_meal_plan_codes',checked===true?[...planSelection,code]:planSelection.filter(value=>value!==code))}/>
          <Label htmlFor={`promo-plan-${code}`}>{label}</Label>
         </div>)}
        </div>
       </fieldset>
       <section className="min-w-0 space-y-1.5" aria-labelledby="promo-limits">
        <h4 id="promo-limits" className="text-sm font-medium">Usage limits</h4>
        <div className="grid min-w-0 gap-2.5">
         <Field id="promo-total_usage_limit" label="Total uses" help="Limits count completed redemptions and reserved checkout attempts, not quotes. Leave blank for unlimited."><Input id="promo-total_usage_limit" className={inputClass} type="number" min="1" step="1" placeholder="Unlimited" value={form.total_usage_limit??''} onChange={e=>change('total_usage_limit',e.target.value===''?null:Number(e.target.value))}/></Field>
         <fieldset className="min-w-0 space-y-1.5">
          <legend className="text-sm font-medium"><span className="inline-flex items-center gap-1">Uses per booking email<FieldHelp label="Uses per booking email">Uses the booking email, not a verified person.</FieldHelp></span></legend>
          <div className="flex flex-wrap gap-1.5">
           {([['unlimited','Unlimited'],['once','Once'],['custom','Custom']] as const).map(([mode,label])=><Button key={mode} size="sm" type="button" aria-pressed={emailMode===mode} variant={emailMode===mode?'default':'outline'} onClick={()=>{setReview(false);setCustomEmail(mode==='custom');if(mode!=='custom')change('per_guest_usage_limit',mode==='once'?1:null);}}>{label}</Button>)}
          </div>
          {emailMode==='custom'&&<Field id="promo-per_guest_usage_limit" label="Custom limit"><Input id="promo-per_guest_usage_limit" className={inputClass} type="number" min="1" step="1" placeholder="Enter number of uses" value={form.per_guest_usage_limit??''} onChange={e=>change('per_guest_usage_limit',e.target.value===''?null:Number(e.target.value))}/></Field>}
         </fieldset>
        </div>
        <p className={noteClass}>Cancellations do not automatically restore a completed use.</p>
       </section>
      </div>
     </section>
     <section className={sectionClass} aria-labelledby="promo-dates">
      <h3 id="promo-dates" className="text-sm font-semibold">Date and stay eligibility</h3>
      <div className={eligibilityGrid} data-promo-layout="eligibility">
       <div className="min-w-0 space-y-2.5">
        {([['Booking dates','booking_from','booking_to'],['Eligible stay dates','stay_from','stay_to']] as const).map(([title,from,to])=>
         <PromoDateRange key={title} id={`promo-${from}-range`} label={title} today={today} disabled={unavailable}
          value={{ from: form[from], to: form[to] }} onChange={dates=>{
           setReview(false);
           setForm(current=>current?{...current,[from]:dates.from,[to]:dates.to}:current);
          }}/>)}
       </div>
       <fieldset className="min-w-0 space-y-1.5">
        <legend className="mb-1 text-sm font-medium leading-5"><span className="inline-flex items-center gap-1">Applicable days<FieldHelp label="Applicable days">Weekend eligibility follows the hotel’s date-specific rules, including protected periods.</FieldHelp></span></legend>
        <div className="grid gap-1.5">
         {([['both','All days'],['weekday','Weekdays'],['weekend','Weekends']] as const).map(([value,label])=><Button key={value} size="sm" type="button" aria-pressed={form.day_scope===value} variant={form.day_scope===value?'default':'outline'} onClick={()=>change('day_scope',value)}>{label}</Button>)}
        </div>
       </fieldset>
       <div className="min-w-0 space-y-2.5">
        {(restricted||(flat&&form.mixed_stay_mode==='eligible_nights'))&&<Field id="promo-stay-mode" label="Stay eligibility policy">
         <select id="promo-stay-mode" className={selectClass} value={form.mixed_stay_mode??''} onChange={e=>change('mixed_stay_mode',e.target.value||null)}><option value="">Choose a stay policy</option><option value="all_nights">All occupied nights must qualify</option>{!flat&&<option value="eligible_nights">Discount only eligible nights</option>}</select>
        </Field>}
        <Field id="promo-minimum-nights" label="Stay length (minimum nights)"><Input id="promo-minimum-nights" className={inputClass} type="number" min="1" step="1" placeholder="No minimum" value={form.min_stay_nights??''} onChange={e=>change('min_stay_nights',e.target.value===''?null:Number(e.target.value))}/></Field>
       </div>
       <fieldset className="min-w-0 space-y-1.5">
        <legend className="mb-1 text-sm font-medium leading-5"><span className="inline-flex items-center gap-1">Excluded nights<FieldHelp label="Excluded nights">Blocks particular nights even if they fall in the eligible stay window.</FieldHelp></span></legend>
        <div className="flex flex-wrap items-center gap-2">
         <Input id="promo-excluded-date" aria-label="Date to exclude" type="date" className={`${inputClass} w-full max-w-48 flex-1 basis-28`} value={excludedDate} onChange={e=>setExcludedDate(e.target.value)}/>
         <Button size="sm" type="button" variant="outline" disabled={!validDate(excludedDate)||form.excluded_stay_dates.includes(excludedDate)} onClick={()=>{if(validDate(excludedDate)&&!form.excluded_stay_dates.includes(excludedDate)){change('excluded_stay_dates',[...form.excluded_stay_dates,excludedDate]);setExcludedDate('');}}}>Add date</Button>
        </div>
        {form.excluded_stay_dates.length>0&&<ul className="flex flex-wrap gap-1.5">{form.excluded_stay_dates.map((date,index)=><li key={`${date}-${index}`}><Button size="sm" type="button" variant="outline" aria-label={`Remove excluded night ${date}`} onClick={()=>change('excluded_stay_dates',form.excluded_stay_dates.filter((_,i)=>i!==index))}>{date} <span aria-hidden="true">×</span></Button></li>)}</ul>}
        {form.excluded_stay_dates.some(date=>!validDate(date))&&<Field id="promo-exclusions" label="Correct existing date values"><Textarea id="promo-exclusions" rows={2} className="min-h-16 text-sm" placeholder="One YYYY-MM-DD date per line" value={form.excluded_stay_dates.join('\n')} onChange={e=>change('excluded_stay_dates',e.target.value===''?[]:e.target.value.split(/[\n,]/).map(v=>v.trim()))}/></Field>}
       </fieldset>
      </div>
      {flat&&<p className={noteClass}>All nights must qualify for once-per-booking offers.</p>}
     </section>
     {!canSave&&<p className={`text-xs ${restrictionsError||customEmailIncomplete?'text-destructive':'text-muted-foreground'}`}>{restrictionsError || (customEmailIncomplete?'Enter the custom per-email limit or choose Unlimited.':'Complete the required fields. Date ranges must be ordered, and stay restrictions need a stay policy.')}</p>}
     {review?<div className="space-y-2 rounded-md border bg-muted/40 p-2.5 text-sm">
      <p className="font-medium">Review {form.code}</p>
      <p>{form.is_active?'Enabled':'Disabled'} · {form.is_public?'Public':'Private'} · {form.day_scope}. Booking and stay windows above apply. Existing bookings remain unchanged.</p>
      <p className={noteClass}>Total limit: {form.total_usage_limit??'unlimited'}; per-email limit: {form.per_guest_usage_limit??'unlimited'}. Minimum nights: {form.min_stay_nights??'none'}. Categories: {form.eligible_room_category_ids===null?'all':form.eligible_room_category_ids.map(id=>categories.find(c=>c.id===id)?.name??id).join(', ')}. Plans: {form.eligible_meal_plan_codes?.map(code=>modes.find(([value])=>value===code)?.[1]??code).join(', ')??'all'}. Excluded nights: {form.excluded_stay_dates.join(', ')||'none'}.</p>
      <div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled={unavailable||!canSave} onClick={()=>void save()}>{busy?'Saving…':form.is_active?'Confirm and enable':form.revision?'Save disabled code':'Save draft'}</Button><Button type="button" size="sm" variant="outline" disabled={unavailable} onClick={()=>setReview(false)}>Back</Button></div>
     </div>:<div className="flex flex-wrap gap-2 border-t pt-3">
      {!form.revision&&!form.is_active&&<Button type="button" size="sm" variant="outline" disabled={unavailable||!canSave} onClick={()=>void save()}>{busy?'Saving…':'Save draft'}</Button>}
      <Button type="button" size="sm" disabled={unavailable||!canSave} onClick={()=>setReview(true)}>{form.is_active?'Review & enable':'Review changes'}</Button>
     </div>}
    </fieldset>}</CardContent>
   </Card>
   </TabsContent>
  </Tabs>
  <AlertDialog open={pendingSwitch!==null} onOpenChange={open=>{if(!open&&!busy)setPendingSwitch(null);}}>
   {pendingSwitch&&switchCandidate&&<AlertDialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto" onCloseAutoFocus={event=>{
    event.preventDefault();
    const trigger=switchTrigger.current;
    if(trigger?.isConnected&&!trigger.disabled)trigger.focus();else statusControl.current?.focus();
   }}>
    <AlertDialogHeader>
     <AlertDialogTitle>{switchDescription(pendingSwitch.field,pendingSwitch.checked)}: {pendingSwitch.offer.code}</AlertDialogTitle>
     <AlertDialogDescription>
      {pendingSwitch.field==='is_public'?'Public codes can appear in the website’s booking offers when eligible. Private codes are not listed but can still be entered if enabled and eligible.':'Enabled codes can be applied to new eligible bookings. Disabled codes cannot be applied, even when marked Public.'} Existing bookings and payment snapshots are unchanged.
     </AlertDialogDescription>
    </AlertDialogHeader>
    <div className="space-y-1 rounded-md border bg-muted/40 p-2.5 text-sm">
     <p><strong>{switchCandidate.is_public?'Public':'Private'}</strong> · <strong>{switchCandidate.is_active?'Enabled':'Disabled'}</strong> · Status: {promotionStatus(switchCandidate,today)}</p>
     <p className={noteClass}>{switchCandidate.label} · {switchCandidate.day_scope} days</p>
     <p className={noteClass}>Booking dates: {displayRange({from:switchCandidate.booking_from,to:switchCandidate.booking_to})}. Eligible stay dates: {displayRange({from:switchCandidate.stay_from,to:switchCandidate.stay_to})}.</p>
     <p className={noteClass}>Stay policy: {switchCandidate.mixed_stay_mode==='eligible_nights'?'Discount only eligible nights':switchCandidate.mixed_stay_mode==='all_nights'?'All nights must qualify':'No additional restriction'}. Minimum nights: {switchCandidate.min_stay_nights??'none'}. Excluded nights: {switchCandidate.excluded_stay_dates.join(', ')||'none'}.</p>
     <p className={noteClass}>Total uses: {switchCandidate.total_usage_limit??'unlimited'}; per email: {switchCandidate.per_guest_usage_limit??'unlimited'}. Rooms: {switchCandidate.eligible_room_category_ids?.map(id=>categories.find(category=>category.id===id)?.name??id).join(', ')??'all'}. Meal plans: {switchCandidate.eligible_meal_plan_codes?.map(code=>modes.find(([value])=>value===code)?.[1]??code).join(', ')??'all'}.</p>
     {!enabled&&<p className={noteClass}>The website-wide promo release is off. This change does not turn it on.</p>}
    </div>
    {!canSwitch&&<p role="alert" className="text-sm text-destructive">This code’s settings need attention. Open Edit and check the required fields first.</p>}
    {switchError&&<p role="alert" className="text-sm text-destructive">{switchError}</p>}
    <AlertDialogFooter>
     <AlertDialogCancel type="button" disabled={busy}>Cancel</AlertDialogCancel>
     <Button type="button" disabled={busy||!canSwitch||/changed/i.test(switchError)} onClick={()=>void confirmSwitch()}>{busy?'Saving…':`Confirm and ${switchDescription(pendingSwitch.field,pendingSwitch.checked).toLowerCase()}`}</Button>
    </AlertDialogFooter>
   </AlertDialogContent>}
  </AlertDialog>
 </section>;
}

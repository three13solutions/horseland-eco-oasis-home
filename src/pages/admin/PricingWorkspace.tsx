import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, addMonths, getDay } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { applyDraftRates, selectDates, previewDraftRate, parseRupeesToPaise, type DraftRate } from '@/lib/rate-calendar-draft';
import PromoDrafts from '@/components/admin/pricing-workspace/PromoDrafts';
import MealChoiceDrafts from '@/components/admin/pricing-workspace/MealChoiceDrafts';

const planNames = { RO:'EP', BB:'CP', HB:'MAP', FB:'AP' };
const money = (n: number | null | undefined) => n == null ? 'Not set' : new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(n/100);
const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
const field = 'grid gap-2 text-sm font-medium';
const today = () => format(new Date(),'yyyy-MM-dd');

/** Deliberately isolated from booking prices. No database writes or automatic legacy conversions. */
export default function PricingWorkspace() {
  const categories = useQuery({queryKey:['pricing-workspace-categories'],queryFn:async()=>{
    const {data,error}=await supabase.from('room_categories').select('id,name').order('name');
    if(error) throw error; return data;
  }});
  const [category,setCategory] = useState('');
  const [month,setMonth] = useState(startOfMonth(new Date()));
  const [dates,setDates] = useState<string[]>([]);
  const [start,setStart] = useState(today);
  const [end,setEnd] = useState(today);
  const [dayFilter,setDayFilter] = useState<'all'|'weekdays'|'weekends'>('all');
  const [ep,setEp] = useState('');
  const [meal,setMeal] = useState({BB:'',HB:'',FB:''});
  const [override,setOverride] = useState({plan:'BB' as 'BB'|'HB'|'FB',amount:'',reason:''});
  const [records,setRecords] = useState<DraftRate[]>([]);
  const [review,setReview] = useState<DraftRate[]|null>(null);
  const [accepted,setAccepted] = useState(false);
  const [error,setError] = useState('');
  const [status,setStatus] = useState('');
  const [previewDate,setPreviewDate] = useState(today);
  const [coverageEnd,setCoverageEnd] = useState('2027-03-31');
  const [coverage,setCoverage] = useState('');
  const name = categories.data?.find(c=>c.id===category)?.name ?? 'Choose category';
  const monthDates = selectDates(format(startOfMonth(month),'yyyy-MM-dd'),format(endOfMonth(month),'yyyy-MM-dd'));
  const closeReview = () => {setReview(null);setAccepted(false);};
  const selectRange = () => {try {setDates(selectDates(start,end,dayFilter,[6]));setError('');}catch(e){setError((e as Error).message);}};
  function buildReview() {
    try {
      if(!category) throw new Error('Choose a room category.');
      if(!dates.length) throw new Error('Select at least one date.');
      const mealTotalsPaise = Object.fromEntries(Object.entries(meal).filter(([,value])=>value.trim()!=='').map(([code,value])=>[code,parseRupeesToPaise(value)]));
      const overrides = override.amount.trim() ? {[override.plan]:{amountPaise:parseRupeesToPaise(override.amount),reason:override.reason,actorId:'session-draft'}} : {};
      const changes=applyDraftRates([], {categoryId:category,dates,epPaise:parseRupeesToPaise(ep),mealTotalsPaise,overrides});
      setReview(changes);setAccepted(false);setError('');setStatus('');
    } catch(e) {setError((e as Error).message);}
  }
  function saveReview() {
    if(!review || !accepted) return;
    setRecords(previous=>[...previous.filter(row=>!review.some(next=>next.categoryId===row.categoryId&&next.date===row.date)),...review]);
    setStatus(`${review.length} nights saved to this session's draft. Live prices unchanged.`);closeReview();
  }
  function exportDraft() {
    const blob=new Blob([JSON.stringify({status:'DRAFT_NOT_APPROVED_NOT_LIVE',basis:'EP',includedAdults:2,weekendDays:[6],rates:records},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='horseland-ep-draft.json';a.click();URL.revokeObjectURL(url);
  }
  function checkCoverage() {
    try {const scope=selectDates(previewDate,coverageEnd);const cats=categories.data??[];if(!cats.length)throw new Error('No categories available.');let missing=0;for(const c of cats)for(const date of scope)if(!records.some(r=>r.categoryId===c.id&&r.date===date))missing++;
      setCoverage(`${missing} category-nights have no EP draft rate out of ${scope.length*cats.length}. This checks session drafts only, not live availability.`);setError('');
    } catch(e){setError((e as Error).message);}
  }
  return <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">
    <header className="flex flex-wrap justify-between gap-3"><div><h1 className="text-3xl font-serif font-semibold">Pricing & Rates</h1><p className="text-muted-foreground mt-1">Set the EP rate once. Add meals. Review every change.</p></div><Button variant="outline" disabled={!records.length} onClick={exportDraft}><Download className="w-4 h-4 mr-2"/>Export rate draft</Button></header>
    <div className="rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm flex gap-3"><Info className="w-5 h-5 shrink-0"/><div><strong>Draft workspace · not connected to live prices.</strong><p>Work stays in this page session and is lost on refresh or leaving the page. Export rate drafts to retain them. No rates are prefilled or published. Existing bookings and pricing are unchanged.</p></div></div>
    {error&&<p role="alert" className="border border-destructive p-3 rounded text-destructive">{error}</p>}
    {status&&<p role="status" className="rounded bg-muted p-3 text-sm">{status}</p>}
    <Tabs defaultValue="calendar" className="space-y-5"><TabsList className="flex flex-wrap h-auto justify-start"><TabsTrigger value="calendar">Rate Calendar</TabsTrigger><TabsTrigger value="card">Rate Card Preview</TabsTrigger><TabsTrigger value="plans">Meal Plans & Choices</TabsTrigger><TabsTrigger value="promos">Promo Codes</TabsTrigger></TabsList>
      <TabsContent value="calendar" forceMount className="data-[state=inactive]:hidden space-y-4">
        <div className="grid sm:grid-cols-2 gap-4 rounded-lg border p-4"><label className={field}>Room category<select className={inputClass} value={category} onChange={e=>{setCategory(e.target.value);setDates([]);setEp('');setOverride({plan:'BB',amount:'',reason:''});setStatus('');}}><option value="">Choose category</option>{categories.data?.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="flex items-center gap-2 justify-end"><Button variant="outline" size="icon" aria-label="Previous month" onClick={()=>setMonth(addMonths(month,-1))}><ChevronLeft/></Button><h2 className="font-semibold min-w-40 text-center">{format(month,'MMMM yyyy')}</h2><Button variant="outline" size="icon" aria-label="Next month" onClick={()=>setMonth(addMonths(month,1))}><ChevronRight/></Button></div></div>
        {categories.isPending&&<p role="status">Loading categories…</p>}{categories.error&&<div role="alert">Could not load room categories. <Button variant="outline" onClick={()=>categories.refetch()}>Retry</Button></div>}
        <div className="grid xl:grid-cols-[1.4fr_1fr] gap-5"><Card><CardHeader><CardTitle className="font-serif">Choose nights to update</CardTitle><p className="text-sm text-muted-foreground">Click individual dates, or select a range. Dates represent stay nights.</p></CardHeader><CardContent><div className="grid grid-cols-7 border-t border-l rounded overflow-hidden">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} className="bg-muted border-r border-b p-2 text-center text-xs sm:text-sm font-semibold">{d}</div>)}{Array.from({length:getDay(startOfMonth(month))},(_,i)=><div key={`pad-${i}`} className="border-r border-b bg-muted/30"/>)}{monthDates.map(date=>{const r=records.find(r=>r.categoryId===category&&r.date===date);return <button key={date} disabled={!category} aria-label={`${date}, ${r?money(r.epPaise):'EP not set'}`} aria-pressed={dates.includes(date)} onClick={()=>setDates(previous=>previous.includes(date)?previous.filter(d=>d!==date):[...previous,date].sort())} className={`min-h-20 sm:min-h-24 border-r border-b p-1 sm:p-2 text-left disabled:opacity-40 hover:bg-muted focus-visible:outline-primary ${dates.includes(date)?'bg-primary/20 ring-1 ring-inset ring-primary':''}`}><span className="block font-semibold">{Number(date.slice(-2))}</span><span className="block text-[10px] sm:text-xs mt-2 text-muted-foreground break-words">{r?`EP ${money(r.epPaise)}`:'Not set'}</span></button>;})}</div><p className="text-xs mt-3 text-muted-foreground">Saturday is the draft weekend filter. The live weekend setting is not changed.</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="font-serif">Update selected dates</CardTitle><p className="text-sm">{name} · {dates.length} nights selected</p></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-3"><label className={field}>From<Input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label className={field}>Through (inclusive)<Input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label></div><div className="flex gap-2"><select aria-label="Day filter" className={inputClass} value={dayFilter} onChange={e=>setDayFilter(e.target.value as typeof dayFilter)}><option value="all">All days</option><option value="weekdays">Sunday–Friday</option><option value="weekends">Saturday</option></select><Button variant="outline" onClick={selectRange}>Select range</Button><Button variant="ghost" onClick={()=>setDates([])}>Clear</Button></div><label className={field}>EP room-only rate (₹)<Input inputMode="decimal" value={ep} onChange={e=>setEp(e.target.value)} placeholder="Enter EP rate"/></label><p className="text-xs text-muted-foreground">Per room, per night, 2 included adults. Before taxes and extra guests.</p>
          <details className="border rounded p-3"><summary className="cursor-pointer font-medium text-sm">Meal additions for preview</summary><p className="text-xs text-muted-foreground my-3">Enter total meal additions for both adults per night. These are manual draft inputs, separate from the Meal Plans & Choices simulation. They are not linked to live meal charges. Leave unknown values blank.</p><div className="grid grid-cols-3 gap-2">{(['BB','HB','FB'] as const).map(code=><label key={code} className={field}>{planNames[code]} + ₹<Input inputMode="decimal" value={meal[code]} onChange={e=>setMeal({...meal,[code]:e.target.value})}/></label>)}</div></details>
          <details className="border rounded p-3"><summary className="cursor-pointer font-medium text-sm">Optional plan override</summary><p className="text-xs my-2 text-muted-foreground">Applies to the selected category and dates only. Leave amount blank to restore automatic calculations for these dates.</p><div className="grid grid-cols-2 gap-2"><label className={field}>Plan<select className={inputClass} value={override.plan} onChange={e=>setOverride({...override,plan:e.target.value as typeof override.plan})}>{['BB','HB','FB'].map(c=><option key={c} value={c}>{planNames[c]}</option>)}</select></label><label className={field}>Amount (₹)<Input inputMode="decimal" value={override.amount} onChange={e=>setOverride({...override,amount:e.target.value})}/></label></div><label className={`${field} mt-3`}>Reason<Input value={override.reason} onChange={e=>setOverride({...override,reason:e.target.value})}/></label></details>
          <Button className="w-full" onClick={buildReview}>Review changes</Button><p className="text-xs text-muted-foreground">No guessed festive rates. Group confirmation is required before production activation.</p></CardContent></Card></div>
      </TabsContent>
      <TabsContent value="card" forceMount className="data-[state=inactive]:hidden space-y-4"><Card><CardHeader><CardTitle className="font-serif">Rate Card Preview</CardTitle><p className="text-sm text-muted-foreground">Session drafts only · 1 night · 2 adults · before taxes and extras</p></CardHeader><CardContent className="space-y-4"><label className={`${field} max-w-xs`}>Stay night<Input type="date" value={previewDate} onChange={e=>{setPreviewDate(e.target.value);setCoverage('');}}/></label><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted"><tr>{['Category','EP','CP','MAP','AP'].map(s=><th key={s} className="p-3 text-left">{s}</th>)}</tr></thead><tbody>{categories.data?.map(c=>{const record=records.find(r=>r.categoryId===c.id&&r.date===previewDate);const rows=record?previewDraftRate(record).rows:[];return <tr key={c.id} className="border-b"><th className="p-3 text-left font-medium">{c.name}</th>{['RO','BB','HB','FB'].map(code=><td key={code} className="p-3">{money(rows.find(r=>r.code===code)?.amountPaise)}{rows.find(r=>r.code===code)?.mode==='manual'&&<span className="block text-xs text-amber-700">Manual override</span>}</td>)}</tr>;})}</tbody></table></div><div className="flex flex-wrap items-end gap-3"><label className={field}>Coverage through<Input type="date" value={coverageEnd} onChange={e=>{setCoverageEnd(e.target.value);setCoverage('');}}/></label><Button variant="outline" onClick={checkCoverage}><CalendarDays className="w-4 h-4 mr-2"/>Check draft coverage</Button></div>{coverage&&<p role="status" className="text-sm bg-muted p-3 rounded">{coverage}</p>}<Link className="underline text-sm" to="/admin/pricing/rate-card">Open existing live rate card</Link></CardContent></Card></TabsContent>
      <TabsContent value="plans" forceMount className="data-[state=inactive]:hidden"><MealChoiceDrafts/></TabsContent>
      <TabsContent value="promos" forceMount className="data-[state=inactive]:hidden"><PromoDrafts/></TabsContent>
    </Tabs>
    <Dialog open={!!review} onOpenChange={open=>{if(!open)closeReview();}}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="font-serif text-2xl">Review rate changes</DialogTitle></DialogHeader><p>{name} · {review?.length} nights · session draft only</p><div className="max-h-64 overflow-auto"><table className="w-full text-sm"><thead><tr>{['Date','Current draft EP','New EP','CP','MAP','AP'].map(t=><th key={t} className="p-2 text-left">{t}</th>)}</tr></thead><tbody>{review?.map(row=><tr key={row.date} className="border-t"><td className="p-2 whitespace-nowrap">{row.date}</td><td className="p-2">{money(records.find(r=>r.categoryId===row.categoryId&&r.date===row.date)?.epPaise)}</td>{previewDraftRate(row).rows.map(p=><td className="p-2" key={p.code}>{money(p.amountPaise)}{p.mode==='manual'?' *':''}</td>)}</tr>)}</tbody></table></div>{review?.[0]&&[...previewDraftRate(review[0]).warnings,...(previewDraftRate(review[0]).missingPlans.length?['Some meal additions are missing. Those plans remain Not set.']:[])].map(w=><p key={w} className="bg-primary/10 p-3 rounded text-sm">{w}</p>)}<p className="text-xs text-muted-foreground">* Manual override. Existing drafts for these dates will be replaced, including their meal inputs and overrides. No live rates or bookings change.</p><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>I have reviewed the dates and understand this saves only a session draft.</label><DialogFooter><Button variant="outline" onClick={closeReview}>Back to calendar</Button><Button disabled={!accepted} onClick={saveReview}>Save session draft</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

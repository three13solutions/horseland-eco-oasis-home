import { useState } from 'react';
import { Pencil, Trash2, Plus, Tag, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { previewPromo, validatePromoDraft, type PromoDraft } from '@/lib/promo-draft';

const blank = (): PromoDraft => ({ id: '', code: '', type: 'percentage', value: '', bookingFrom: '', bookingTo: '', stayFrom: '', stayTo: '', limit: '', oncePerGuest: true });
const money = (paise: number) => (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export default function PromoDrafts() {
  const [drafts, setDrafts] = useState<PromoDraft[]>([]);
  const [draft, setDraft] = useState<PromoDraft>(blank);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [previewAmount, setPreviewAmount] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const change = <K extends keyof PromoDraft>(key: K, value: PromoDraft[K]) => {
    setDraft(current => ({ ...current, [key]: value }));
    setErrors([]); setNotice('');
  };
  const reset = () => { setDraft(blank()); setErrors([]); setNotice(''); setPreviewAmount(''); };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const issues = validatePromoDraft(draft, drafts);
    setErrors(issues);
    if (issues.length) return;
    const saved = { ...draft, id: draft.id || crypto.randomUUID() };
    setDrafts(current => current.some(item => item.id === saved.id) ? current.map(item => item.id === saved.id ? saved : item) : [...current, saved]);
    setDraft(saved);
    setNotice('Draft kept in this page only. It is not active and will be lost when you leave or reload.');
  };
  const preview = previewPromo(draft, previewAmount);
  const field = (key: 'value' | 'bookingFrom' | 'bookingTo' | 'stayFrom' | 'stayTo' | 'limit', label: string, type = 'text') => (
    <label className="space-y-1.5 text-sm block" htmlFor={`promo-${key}`}>
      <span className="font-medium">{label}</span>
      <Input id={`promo-${key}`} type={type} value={draft[key]} required onChange={e => change(key, e.target.value)} inputMode={type === 'text' ? 'decimal' : undefined} />
    </label>
  );
  return <section className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-2xl font-serif font-semibold">Promo codes</h2><p className="text-muted-foreground">Plan website offers without changing your room rates.</p></div>
      <Badge variant="outline" className="border-amber-500 text-amber-900">Draft workspace only</Badge>
    </div>
    <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-950 flex gap-2"><Info className="h-5 w-5 shrink-0" /><p>No promotions are active here. Drafts are held in memory for this page only and are lost on navigation or reload. Server validation, usage tracking and booking integration are required before activation.</p></div>
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="space-y-5">
        <Card className="border-amber-900/15">
          <CardHeader className="flex-row justify-between items-center gap-3"><CardTitle className="font-serif">Your draft offers</CardTitle><Button type="button" variant="outline" onClick={reset}><Plus />New draft</Button></CardHeader>
          <CardContent>
            {drafts.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground"><Tag className="mx-auto mb-2 h-6 w-6" />No draft codes yet.<br />Create an offer on the right to start planning.</div> : <ul className="space-y-3">{drafts.map(item => <li key={item.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-wrap justify-between gap-2"><strong>{item.code}</strong><Badge variant="secondary">Draft</Badge></div>
              <p className="text-sm">{item.type === 'percentage' ? `${item.value}%` : money(Math.round(Number(item.value) * 100))} off room-only portion</p>
              <p className="text-xs text-muted-foreground">Booking: {item.bookingFrom} to {item.bookingTo}<br />Stay nights: {item.stayFrom} to {item.stayTo}</p>
              <div className="flex gap-2"><Button type="button" size="sm" variant="outline" aria-label={`Edit ${item.code}`} onClick={() => { setDraft({ ...item }); setErrors([]); setNotice(''); setPreviewAmount(''); }}><Pencil />Edit</Button><Button type="button" size="sm" variant="ghost" aria-label={`Delete ${item.code}`} onClick={() => setDeleteId(item.id)}><Trash2 />Delete</Button></div>
              {deleteId === item.id && <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">Remove this local draft?<div className="flex gap-2 mt-2"><Button type="button" size="sm" variant="destructive" onClick={() => { setDrafts(current => current.filter(p => p.id !== item.id)); if (draft.id === item.id) reset(); setDeleteId(null); }}>Remove draft</Button><Button type="button" size="sm" variant="outline" onClick={() => setDeleteId(null)}>Keep draft</Button></div></div>}
            </li>)}</ul>}
          </CardContent>
        </Card>
        <Card className="border-amber-900/15"><CardHeader><CardTitle className="font-serif">Price preview</CardTitle></CardHeader><CardContent className="space-y-3">
          <label htmlFor="promo-preview" className="text-sm font-medium block">Room-only subtotal before tax (₹)</label><Input id="promo-preview" value={previewAmount} inputMode="decimal" placeholder="Enter an amount to preview" onChange={e => setPreviewAmount(e.target.value)} />
          {preview ? <dl className="space-y-2 text-sm"><div className="flex justify-between"><dt>Original room subtotal</dt><dd>{money(preview.originalPaise)}</dd></div><div className="flex justify-between"><dt>Proposed discount</dt><dd>−{money(preview.discountPaise)}</dd></div><div className="flex justify-between border-t pt-3 font-semibold text-lg"><dt>After discount</dt><dd>{money(preview.totalPaise)}</dd></div></dl> : <p className="text-sm text-muted-foreground">Complete a valid offer and enter a positive subtotal to preview it.</p>}
          <p className="text-xs text-muted-foreground">Arithmetic preview only, not an eligibility check or booking quote. Discount is capped at the room subtotal. Meals, tax and extras are excluded; rates stay unchanged.</p>
        </CardContent></Card>
      </div>
      <Card className="border-amber-900/15"><CardHeader><CardTitle className="font-serif">{draft.id ? 'Edit draft offer' : 'Create draft offer'}</CardTitle></CardHeader><CardContent>
        <form onSubmit={save} className="space-y-4" noValidate>
          <label className="block space-y-1.5 text-sm" htmlFor="promo-code"><span className="font-medium">Code</span><Input id="promo-code" value={draft.code} maxLength={30} placeholder="e.g. DIRECT10" onChange={e => change('code', e.target.value.toUpperCase().trim())} /></label>
          <fieldset><legend className="text-sm font-medium mb-2">Discount type</legend><div className="grid grid-cols-2 gap-2">{(['percentage', 'fixed'] as const).map(type => <label key={type} className={`rounded-md border p-3 text-sm cursor-pointer ${draft.type === type ? 'bg-amber-50 border-amber-500' : ''}`}><input className="mr-2 accent-amber-700" type="radio" name="promo-type" checked={draft.type === type} onChange={() => change('type', type)} />{type === 'percentage' ? 'Percentage' : 'Fixed amount'}</label>)}</div></fieldset>
          {field('value', draft.type === 'percentage' ? 'Discount (%)' : 'Discount (₹)')}
          <p className="rounded bg-muted p-3 text-sm">Applies to: <strong>room-only portion</strong> · All categories and meal plans in this draft.</p>
          <fieldset><legend className="text-sm font-medium mb-2">Eligible booking dates (inclusive)</legend><div className="grid grid-cols-2 gap-3">{field('bookingFrom', 'From', 'date')}{field('bookingTo', 'Through', 'date')}</div></fieldset>
          <fieldset><legend className="text-sm font-medium mb-2">Eligible stay nights (inclusive)</legend><div className="grid grid-cols-2 gap-3">{field('stayFrom', 'First night', 'date')}{field('stayTo', 'Last night', 'date')}</div></fieldset>
          {field('limit', 'Total usage limit')}
          <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={draft.oncePerGuest} onChange={e => change('oncePerGuest', e.target.checked)} className="accent-amber-700" />Propose one use per guest</label>
          <p className="text-xs text-muted-foreground">Cannot combine with another promo. These are proposed rules, not enforced booking restrictions.</p>
          {errors.length > 0 && <ul role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800 list-disc list-inside">{errors.map(error => <li key={error}>{error}</li>)}</ul>}
          {notice && <p role="status" className="rounded bg-amber-50 p-3 text-sm">{notice}</p>}
          <div className="flex flex-wrap gap-2 pt-2"><Button type="submit" className="bg-amber-600 text-white hover:bg-amber-700">{draft.id ? 'Update local draft' : 'Keep local draft'}</Button><Button type="button" variant="outline" onClick={reset}>Clear editor</Button></div>
        </form>
      </CardContent></Card>
    </div>
  </section>;
}

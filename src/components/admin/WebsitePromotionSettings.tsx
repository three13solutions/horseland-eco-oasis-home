import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

type Offer = {code: string; label: string; amount_per_night: number; revision: number; is_active: boolean};
// No generated RPC types until the independently staged migration is installed.
const api = supabase as unknown as {rpc: (name: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: {message: string}|null}>};
export default function WebsitePromotionSettings() {
 const [offer,setOffer]=useState<Offer|null>(null),[enabled,setEnabled]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[review,setReview]=useState(false);
 async function load() {
  const {data,error}=await api.rpc('website_promotion_settings');
  const result=data as {enabled?:unknown;offers?:Offer[]}|null;
  if(error||typeof result?.enabled!=='boolean'||!Array.isArray(result.offers))throw new Error(error?.message??'Promotion settings could not be verified.');
  const row=result.offers.find(o=>o.code==='EP300');
  if(!row||row.amount_per_night!==300||!Number.isSafeInteger(row.revision)||row.revision<1||typeof row.is_active!=='boolean')throw new Error('Promotion configuration is invalid.');
  setOffer(row);setEnabled(result.enabled);
 }
 useEffect(()=>{let active=true; load().catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[]);
 async function save() {
  if(!offer||busy)return;setBusy(true);setError('');
  try { const {error}=await api.rpc('save_website_promotion',{p_code:offer.code,p_expected_revision:offer.revision,p_active:!offer.is_active});if(error)throw new Error(error.message);await load();setReview(false); }
  catch(e){setError(e instanceof Error?e.message:'Could not save. Reload and verify before retrying.');}
  finally{setBusy(false)}
 }
 return <Card><CardHeader><CardTitle>Website offer: EP300</CardTitle></CardHeader><CardContent className="space-y-4">
  <p>₹300 off the room-only (EP) component per occupied night, once per room, not per guest. Available across meal plans when the nightly EP basis is verified. Meals, extras and cancellation-policy adjustments are not discounted.</p>
  <p className="rounded border p-3 text-sm">{enabled?'Website promotion release is enabled.':'Staged / unpublished: website promotion release is OFF. This panel cannot activate the release. Installing or editing the configuration does not make the offer available to guests.'}</p>
  <ul className="list-disc pl-5 text-sm"><li>One promo per checkout; no expiry or use limit configured.</li><li>Discount cannot exceed that night’s room-only amount.</li><li>The current tax-rate selection policy remains unchanged; tax is calculated on the discounted subtotal.</li><li>Confirmed / retained checkouts preserve their accepted amount.</li></ul>
  {error&&<p role="alert" className="text-destructive">{error}</p>}
  {offer&&<><p>Configured status: {offer.is_active?'Available when released':'Disabled'} · Revision {offer.revision}</p><Button disabled={busy} onClick={()=>setReview(true)}>{offer.is_active?'Disable offer':'Enable offer configuration'}</Button></>}
  <AlertDialog open={review} onOpenChange={v=>{if(!busy)setReview(v)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm offer change</AlertDialogTitle><AlertDialogDescription>{offer?.is_active?'Disable this offer for new checkouts?':'Make this offer eligible for new checkouts when the release is enabled?'} Already prepared payment orders are not repriced. {enabled?'This will affect new live quotes.':'The release remains OFF.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e=>{e.preventDefault();void save()}}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </CardContent></Card>;
}

import {serve} from 'https://deno.land/std@0.168.0/http/server.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {getDistributionRazorpayCredentials,createDistributionRazorpayProvider} from '../_shared/distributionRazorpay.ts';
import {createDistributionStore} from '../_shared/distributionStore.ts';
import {reconcileCapturedHold,recoverUnknownProviderOrder,type HoldPaymentLookup} from '../_shared/distributionReconciliation.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')??'';
  const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')??'',{global:{headers:{Authorization:req.headers.get('Authorization')??''}}});
  const {data:user,error:authError}=await caller.auth.getUser();
  const {data:admin,error:roleError}=await caller.rpc('is_admin_new');
  if(authError||!user.user||roleError||admin!==true)return reply({error:'Admin authorization required.'},403);
  const {hold_id}=await req.json();if(typeof hold_id!=='string'||!/^[0-9a-f-]{36}$/i.test(hold_id))return reply({error:'A valid hold is required.'},400);
  const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'');
  const {data:initialLookup,error}=await db.rpc('distribution_get_hold_payment_record',{p_hold_id:hold_id});
  if(error||!initialLookup)return reply({status:'review_required',message:'The held payment could not be read safely. Inventory remains held.'},409);
  let lookup=initialLookup;
  const credentials=await getDistributionRazorpayCredentials(db,name=>Deno.env.get(name));
  if(!credentials.keyId.startsWith('rzp_test_'))return reply({error:'This rollout supports test payments only. Live confirmation requires a separately verified rollout.',status:'review_required',resolution_required:true},403);
  if(credentials.keyId.startsWith('rzp_test')&&(Deno.env.get('ALLOW_TEST_BOOKINGS')??'true')==='false')return reply({status:'review_required',message:'Test-mode confirmations are disabled. Inventory remains held.'},403);
  const provider=createDistributionRazorpayProvider(credentials);
  if(!lookup.provider_order_id){
   const recovered=await recoverUnknownProviderOrder(lookup as HoldPaymentLookup,provider,async(holdId,order)=>{const bound=await db.rpc('distribution_reconcile_payment_order',{p_hold_id:holdId,p_order:order});if(bound.error)throw new Error('Provider order binding was not confirmed');return bound.data;});
   if(!recovered.matched)return reply({status:'review_required',message:recovered.message});
   const refreshed=await db.rpc('distribution_get_hold_payment_record',{p_hold_id:hold_id});if(refreshed.error||!refreshed.data)throw new Error('Reconciled hold not readable');lookup=refreshed.data;
  }
  const result=await reconcileCapturedHold(lookup as HoldPaymentLookup,provider,createDistributionStore(db).confirmCaptured);
  if(result.status==='confirmed'&&result.reused===false){try{await db.functions.invoke('send-booking-confirmation',{body:{booking_id:result.bookingId}});}catch{/* Confirmation remains committed; never retry inventory mutation for mail. */}}
  // This endpoint only reads the provider and confirms a verified captured payment.
  // No capture, refund, cancellation, account-setting change or release operation exists.
  return reply(result);
 }catch{return reply({status:'review_required',message:'Payment verification was not completed. Inventory remains held; retry this check or reconcile manually.'},503);}
});

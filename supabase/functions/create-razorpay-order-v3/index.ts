import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calculateBookingQuote, assertQuoteMatches, normalizeQuoteRequest, QuoteError } from '../_shared/bookingQuote.ts';
import { prepareWebsitePayment, InventoryPaymentError, type PaymentIntent } from '../_shared/distributionPaymentCoordinator.ts';
import { issueCheckoutCapability, verifyCheckoutCapability, normalizeBookingMetadata, assertResumeMatches } from '../_shared/distributionCheckout.ts';
import {classifySavedCheckout} from '../_shared/distributionResume.ts';
import { admissionIdentity } from '../_shared/distributionAdmission.ts';
import { createDistributionStore } from '../_shared/distributionStore.ts';
import { getDistributionRazorpayCredentials, createDistributionRazorpayProvider } from '../_shared/distributionRazorpay.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 let allowClose=false;
 let identity:{requestId:string;ownerScope:string}|null=null;
 const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
 const db=createClient(Deno.env.get('SUPABASE_URL')??'',secret);
 try{
  if(Number(req.headers.get('content-length')||0)>262144)return reply({error:'Request too large'},413);
  const body=await req.json();
  allowClose=body.action==='prepare';
  if((body.action==='prepare'||body.action==='resume'))identity={requestId:body.request_id,ownerScope:await verifyCheckoutCapability(body.checkout_token,body.request_id,secret)};
  if(body.action==='resume'){
   const saved=await db.rpc('distribution_resume_checkout',{p_request_id:identity!.requestId,p_owner_scope:identity!.ownerScope});
   if(saved.error||!saved.data)throw new InventoryPaymentError('CHECKOUT_NOT_FOUND','The saved checkout could not be read. Contact the hotel before starting another payment.');
   const entry=saved.data,intent=entry.intent;
   const room=await db.from('room_types').select('name').eq('id',intent.selection.roomTypeId).maybeSingle();
   const base={room_type_name:room.error?undefined:room.data?.name,request_id:body.request_id,quote_request:intent.quoteSnapshot.request,guest:intent.bookingMetadata?.guest,booking_id:entry.booking_id??undefined};
   if(entry.state==='confirmed')return reply({...base,state:entry.booking_status==='confirmed'?'confirmed':'pending',message:entry.booking_status==='confirmed'?undefined:'This saved booking needs hotel review. Do not pay again.'});
   if(!entry.provider_order_id||!entry.record)return reply({...base,state:'pending'});
   const credentials=await getDistributionRazorpayCredentials(db,name=>Deno.env.get(name));
   const provider=createDistributionRazorpayProvider(credentials);
   const order=await provider.getOrder(entry.provider_order_id);
   const r=entry.record;
   const payments=await provider.listOrderPayments(order.id);
   const status=classifySavedCheckout({...r,orderId:entry.provider_order_id},order,payments);
   return reply({...base,state:status,order:{id:order.id,amount:order.amount,currency:order.currency},key_id:credentials.keyId,is_test_mode:credentials.keyId.startsWith('rzp_test')});
  }
  const {data:state,error:stateError}=await db.rpc('distribution_checkout_state');
  if(stateError||state?.enabled!==true)throw new InventoryPaymentError('INVENTORY_NOT_ACTIVE','The new inventory checkout is not active. Refresh before starting a payment.');
  if(body.action==='session')return reply({request_id:body.request_id,checkout_token:await issueCheckoutCapability(body.request_id,secret)});
  if(body.action!=='prepare'||body.existing_booking_id)return reply({code:'INVALID_CHECKOUT_ACTION',error:'Use the website checkout for a new reservation.'},400);
  const ownerScope=identity!.ownerScope;
  const request=normalizeQuoteRequest(body.quote_request);
  const metadata=normalizeBookingMetadata(body.guest,body.booking_notes);
  if((body.currency??'INR')!=='INR')throw new QuoteError('INVALID_CURRENCY','Only INR is supported.',400);
  const store=createDistributionStore(db);
  let intent=await store.resume(body.request_id,ownerScope);
  if(intent){assertResumeMatches(intent,{request,metadata,amount:body.amount,fingerprint:body.quote_fingerprint});}
  else{
   const snapshot=await calculateBookingQuote(db,request,'website');
   assertQuoteMatches(snapshot,body.amount,body.quote_fingerprint);
   intent={requestId:body.request_id,ownerScope,quoteFingerprint:snapshot.variant.quote_fingerprint,amountPaise:Math.round(snapshot.total_amount*100),currency:'INR',selection:{roomTypeId:request.room_type_id,unitId:request.room_unit_id,checkIn:request.check_in,checkOut:request.check_out},quoteSnapshot:snapshot,bookingMetadata:metadata,admission:await admissionIdentity(req.headers,metadata,secret,ownerScope)} as PaymentIntent;
  }
  const credentials=await getDistributionRazorpayCredentials(db,name=>Deno.env.get(name));
  // This rollout is explicitly test-mode only; never create a live order or hold.
  if(credentials.keyId.startsWith('rzp_test')&&(Deno.env.get('ALLOW_TEST_BOOKINGS')??(Deno.env.get('RAZORPAY_LIVE_KEY_ID')?'false':'true'))==='false')throw new InventoryPaymentError('TEST_PAYMENTS_DISABLED','Test-mode payments are not accepted.');
  const order=await prepareWebsitePayment(store,createDistributionRazorpayProvider(credentials),intent);
  return reply({...order,key_id:credentials.keyId,is_test_mode:credentials.keyId.startsWith('rzp_test')});
 }catch(error){
  let safeToChange=false;
  if(identity&&allowClose){try{const closed=await db.rpc('distribution_close_unused_checkout',{p_request_id:identity.requestId,p_owner_scope:identity.ownerScope});safeToChange=!closed.error&&closed.data===true;}catch{/* Never infer that an uncertain request did not reserve inventory. */}}
  const known=error instanceof InventoryPaymentError||error instanceof QuoteError;
  const code=known?error.code:'CHECKOUT_PREPARATION_UNCONFIRMED';
  return reply({request_id:identity?.requestId,safe_to_change_selection:safeToChange,code,error:known?error.message:'Payment preparation could not be confirmed. Keep this checkout and contact the hotel; do not start another payment.',resolution_required:!safeToChange&&!['INVALID_REQUEST_ID','INVALID_GUEST_DETAILS','GUEST_DETAILS_REQUIRED','INVALID_CURRENCY','INVALID_QUOTE','QUOTE_CHANGED'].includes(code)},error instanceof QuoteError?error.status:known?409:503);
 }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { confirmWebsitePayment, InventoryPaymentError } from '../_shared/distributionPaymentCoordinator.ts';
import { verifyCheckoutCapability } from '../_shared/distributionCheckout.ts';
import { createDistributionStore } from '../_shared/distributionStore.ts';
import { getDistributionRazorpayCredentials, createDistributionRazorpayProvider, verifyDistributionPaymentSignature } from '../_shared/distributionRazorpay.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
  const body=await req.json();
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
  const db=createClient(Deno.env.get('SUPABASE_URL')??'',secret);
  const ownerScope=await verifyCheckoutCapability(body.checkout_token,body.request_id,secret);
  const credentials=await getDistributionRazorpayCredentials(db,name=>Deno.env.get(name));
  if(credentials.keyId.startsWith('rzp_test')&&(Deno.env.get('ALLOW_TEST_BOOKINGS')??(Deno.env.get('RAZORPAY_LIVE_KEY_ID')?'false':'true'))==='false')return reply({error:'Test-mode payments are not accepted.',resolution_required:true},403);
  // Finalization remains available when new sales are disabled. Never abandon a paid hold.
  const result=await confirmWebsitePayment(createDistributionStore(db),createDistributionRazorpayProvider(credentials),{orderId:body.razorpay_order_id,paymentId:body.razorpay_payment_id,signature:body.razorpay_signature,ownerScope},(orderId,paymentId,signature)=>verifyDistributionPaymentSignature(credentials.secret,orderId,paymentId,signature));
  if(!result.reused){try{await db.functions.invoke('send-booking-confirmation',{body:{booking_id:result.bookingId}});}catch{/* A mail retry must not duplicate a confirmed booking or debit inventory again. */}}
  return reply({success:true,booking_id:result.bookingId,room_unit_id:result.unitId,reused:result.reused,is_test_payment:credentials.keyId.startsWith('rzp_test')});
 }catch(error){return reply({success:false,code:error instanceof InventoryPaymentError?error.code:'BOOKING_CONFIRMATION_UNCONFIRMED',error:error instanceof InventoryPaymentError?error.message:'The payment and booking need reconciliation. Do not pay again.',resolution_required:true,next_action:'Keep your payment reference and contact the hotel. Do not pay again.'},409);}
});

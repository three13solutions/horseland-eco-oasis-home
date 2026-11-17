import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calculateBookingQuote, QuoteError } from '../_shared/bookingQuote.ts';
import { validPromotionDate } from '../_shared/epPromo.ts';
import { preparePromotionPreview } from '../_shared/managedPromotionPreview.ts';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok',{headers:cors});
  if (req.method !== 'POST') return Response.json({error:'POST required'},{status:405,headers:cors});
  try {
    const caller=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_ANON_KEY')??'',{global:{headers:{Authorization:req.headers.get('Authorization')??''}}});
    const {data:user,error:authError}=await caller.auth.getUser();
    const {data:admin,error:roleError}=await caller.rpc('is_admin_new');
    if(authError||!user.user||roleError||admin!==true) throw new QuoteError('ADMIN_REQUIRED','Administrator authentication is required.',403);
    const body=await req.json();
    if (body.preview_as_of != null && !validPromotionDate(body.preview_as_of)) throw new QuoteError('INVALID_PREVIEW_DATE','Select a valid preview booking date.',400);
    const previewNow=body.preview_as_of ? new Date(`${body.preview_as_of}T12:00:00+05:30`) : new Date();
    const db=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'');
    const config=await preparePromotionPreview(db,body.promotion);
    const quote=await calculateBookingQuote(db,{...body.quote_request,promo_code:config.code},'website',{promotionPreview:config,promotionPreviewNow:previewNow});
    return Response.json({quote,preview_only:true,preview_as_of:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(previewNow),activation_simulated:body.promotion.is_active!==true,
      notice:'Hypothetical price only. Release gate is ignored for preview; usage is not reserved and availability is not guaranteed. No booking or payment is created.'},{headers:cors});
  } catch(error) {
    return Response.json({code:error instanceof QuoteError?error.code:'PREVIEW_FAILED',error:error instanceof Error?error.message:'Preview failed'}, {status:error instanceof QuoteError?error.status:500,headers:cors});
  }
});

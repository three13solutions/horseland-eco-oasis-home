import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertPromotionBookingEligibility,calculateEpPromotion} from '../supabase/functions/_shared/epPromo.ts';
import {calculateBookingQuote} from '../supabase/functions/_shared/bookingQuote.ts';
import {preparePromotionPreview} from '../supabase/functions/_shared/managedPromotionPreview.ts';
const room='11111111-1111-4111-8111-111111111111',category='22222222-2222-4222-8222-222222222222';
const draft={code:'TEST20',label:'Test draft',revision:undefined,is_active:false,is_public:false,discount_kind:'percentage',discount_basis:'booking',discount_value:20,day_scope:'both',mixed_stay_mode:null,booking_from:null,booking_to:null,stay_from:null,stay_to:null,eligible_room_category_ids:null,eligible_meal_plan_codes:null,min_stay_nights:null,excluded_stay_dates:[]};
const req={room_type_id:room,check_in:'2026-11-22',check_out:'2026-11-24',adults_count:2,children_count:0,infants_count:1,meal_plan_code:'FB',cancellation_policy_code:'standard',addons:[]};
const variant={meal_plan_code:'FB',cancellation_policy_code:'standard',pricing_status:'verified',quote_fingerprint:'canonical',room_rate:5000,meal_cost:6040,total_price:11040,price_per_night:5520};
function database(saved=null) {
 const calls=[];
 class Query {constructor(table){this.table=table;calls.push(table)} select(){return this}eq(){return this}order(){return this}maybeSingle(){return this.result()}then(r,j){return this.result().then(r,j)} async result(){switch(this.table){case'website_promotions':return{data:saved};case'website_promo_rollout':return{data:{enabled:false}};case'room_types':return{data:{id:room,is_published:true,base_price:2500,category_id:category}};case'gst_tiers':return{data:[{min_amount:0,max_amount:7500,gst_percentage:5}]};default:throw Error('Unexpected table '+this.table)}}}
 return {calls,from:table=>new Query(table),rpc:async(name)=>{calls.push(name);if(name==='calculate_website_rate_variants')return{data:[variant]};throw Error('Unexpected RPC '+name)}};
}
test('room/meal restrictions require authoritative category and selected meal plan',()=>{
 const p={...draft,eligible_room_category_ids:[category],eligible_meal_plan_codes:['FB']};
 assert.doesNotThrow(()=>assertPromotionBookingEligibility(p,category,'FB'));
 assert.throws(()=>assertPromotionBookingEligibility(p,room,'FB'),/category/);
 assert.throws(()=>assertPromotionBookingEligibility(p,null,'FB'),/category/);
 assert.throws(()=>assertPromotionBookingEligibility(p,category,'RO'),/meal plan/);
 assert.doesNotThrow(()=>assertPromotionBookingEligibility(draft,null,'RO'));
});
test('minimum stay and excluded occupied nights enforce explicit mode',()=>{
 const p={...draft,revision:1,is_active:true,min_stay_nights:3};
 assert.throws(()=>calculateEpPromotion(variant,req.check_in,req.check_out,p),/minimum/);
 assert.throws(()=>calculateEpPromotion(variant,req.check_in,req.check_out,{...p,min_stay_nights:null,excluded_stay_dates:['2026-11-23']}),/explicit/);
 assert.throws(()=>calculateEpPromotion(variant,req.check_in,req.check_out,{...p,min_stay_nights:null,excluded_stay_dates:['2026-11-23'],mixed_stay_mode:'all_nights'}),/eligible/);
 assert.equal(calculateEpPromotion(variant,req.check_in,req.check_out,{...p,min_stay_nights:2,excluded_stay_dates:['2026-11-24'],mixed_stay_mode:'all_nights'}).discount_amount,1000);
});
test('nightly excluded dates discount only eligible nights when explicitly selected',()=>{
 const v={...variant,nightly_breakdown:[{date:'2026-11-22',room_only:2500},{date:'2026-11-23',room_only:2500}]};
 const p={...draft,revision:1,is_active:true,discount_kind:'fixed',discount_value:300,discount_basis:'night',excluded_stay_dates:['2026-11-23'],mixed_stay_mode:'eligible_nights'};
 assert.equal(calculateEpPromotion(v,req.check_in,req.check_out,p).discount_amount,300);
 assert.throws(()=>calculateEpPromotion(v,req.check_in,req.check_out,{...p,excluded_stay_dates:['2026-02-30']}),/Invalid/);
});
test('unsaved disabled draft previews real canonical price and tax without writes or release gate',async()=>{
 const db=database(),p=await preparePromotionPreview(db,draft);
 assert.equal(p.is_active,true);assert.equal(p.revision,1);
 const q=await calculateBookingQuote(db,{...req,promo_code:p.code},'website',{promotionPreview:p});
 assert.equal(q.promotion.discount_amount,1000);assert.equal(q.variant.meal_cost,6040);assert.equal(q.subtotal,10040);assert.equal(q.tax_amount,502);assert.equal(q.total_amount,10542);
 assert.ok(!db.calls.includes('website_promo_rollout'));
 assert.deepEqual(db.calls,['website_promotions','room_types','calculate_website_rate_variants','gst_tiers']);
});
test('public raw request cannot inject preview config or bypass release gate',async()=>{
 const db=database();await assert.rejects(calculateBookingQuote(db,{...req,promo_code:draft.code,promotionPreview:{...draft,is_active:true},internalOptions:{promotionPreview:draft}}),e=>e.code==='PROMO_UNAVAILABLE');
 assert.ok(db.calls.includes('website_promo_rollout'));
});
test('preview authoritative room category ignores a forged request category',async()=>{
 const p=await preparePromotionPreview(database(),{...draft,eligible_room_category_ids:[room]});
 await assert.rejects(calculateBookingQuote(database(),{...req,promo_code:p.code,category_id:room},'website',{promotionPreview:p}),/category/);
});
test('preview preserves immutable legacy code amounts and refuses stale revision',async()=>{
 const saved={...draft,code:'DIRECT1000',discount_kind:'legacy',revision:2,amount_per_booking:1000,amount_per_night:0};
 const p=await preparePromotionPreview(database(saved),{...saved,amount_per_booking:9000,discount_kind:'fixed',discount_value:9000});
 assert.equal(p.amount_per_booking,1000);assert.equal(p.discount_kind,'legacy');
 await assert.rejects(preparePromotionPreview(database(saved),{...saved,revision:1}),e=>e.code==='PROMOTION_CHANGED');
});
for(const change of [{discount_value:101},{discount_value:1.234},{excluded_stay_dates:['2026-02-30']},{eligible_room_category_ids:[]},{eligible_meal_plan_codes:['AP']},{min_stay_nights:0},{day_scope:'weekend',mixed_stay_mode:null},{mixed_stay_mode:'eligible_nights'},{booking_from:'2027-01-02',booking_to:'2027-01-01'}])test('invalid unsaved draft fails '+JSON.stringify(change),async()=>{await assert.rejects(preparePromotionPreview(database(),{...draft,...change}),e=>e.code==='INVALID_PROMOTION_DRAFT')});
test('admin preview endpoint is explicitly authenticated, read-only, and labels simulation',()=>{
 const s=readFileSync(new URL('../supabase/functions/admin-promotion-preview/index.ts',import.meta.url),'utf8');
 assert.match(s,/caller.auth.getUser/);assert.match(s,/admin!==true/);assert.match(s,/preview_only:true/);assert.match(s,/activation_simulated/);
 assert.doesNotMatch(s,/\.insert\(|\.update\(|\.delete\(|reserve_.*\(|create.*order/i);
});
test('admin-only as-of date previews scheduled future offer without relaxing public booking windows',async()=>{
 const p=await preparePromotionPreview(database(),{...draft,booking_from:'2099-01-01',booking_to:'2099-01-31'});
 await assert.rejects(calculateBookingQuote(database(),{...req,promo_code:p.code},'website',{promotionPreview:p}),/booking window/);
 const q=await calculateBookingQuote(database(),{...req,promo_code:p.code},'website',{promotionPreview:p,promotionPreviewNow:new Date('2099-01-15T12:00:00+05:30')});
 assert.equal(q.promotion.discount_amount,1000);
});

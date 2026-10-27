import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('new checkout exclusively invokes versioned payment endpoints',()=>{
 const payment=read('src/components/PaymentModal.tsx'),booking=read('src/pages/Booking.tsx');
 assert.match(payment,/invoke\('create-razorpay-order-v2'/);assert.match(payment,/invoke\('verify-razorpay-payment-v2'/);
 assert.match(booking,/invoke\(checkout \? 'finalize-booking-v3' : 'finalize-booking-v2'/);assert.match(booking,/rpc\('calculate_website_rate_variants'/);
 assert.doesNotMatch(booking,/rpc\('calculate_rate_variants_v2'/);
 assert.doesNotMatch(payment,/invoke\('(create-razorpay-order|verify-razorpay-payment)'/);
 assert.doesNotMatch(booking,/invoke\('finalize-booking'/);
});
test('shared server quote filters website meal visibility while manual retains v2 pricing',()=>{const quote=read('supabase/functions/_shared/bookingQuote.ts');assert.match(quote,/rpc\(mode === 'website' \? 'calculate_website_rate_variants' : 'calculate_rate_variants_v2'/);assert.match(quote,/p_booking_channel: 'direct'/);assert.match(quote,/quote_fingerprint/);assert.match(quote,/variant\.total_price/);});
test('v2 endpoint authentication matches legacy policies',()=>{const config=read('supabase/config.toml');for(const[name,jwt]of[['create-razorpay-order','true'],['verify-razorpay-payment','true'],['finalize-booking','false']])assert.ok(config.includes(`[functions.${name}-v2]\nverify_jwt = ${jwt}`))});
test('legacy finalizer remains independent of new quote snapshot requirement',()=>{assert.doesNotMatch(read('supabase/functions/finalize-booking/index.ts'),/booking_order_quotes/);assert.match(read('supabase/functions/finalize-booking-v2/index.ts'),/booking_order_quotes/)});

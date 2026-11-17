import test from 'node:test';import assert from 'node:assert/strict';
import {createDistributionStore} from '../supabase/functions/_shared/distributionStore.ts';
for(const code of ['PROMO_USAGE_LIMIT','PROMO_GUEST_LIMIT','PROMO_CHANGED','PROMO_GUEST_REQUIRED','PROMO_UNAVAILABLE'])test(`safe checkout error for ${code}`,async()=>{
 const store=createDistributionStore({rpc:async()=>({data:null,error:{code:'P0001',message:code+': internal context'}})});
 await assert.rejects(store.begin({}),e=>e.code===code&&!e.message.includes('internal context'));
});

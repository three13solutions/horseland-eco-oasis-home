import test from 'node:test';
import assert from 'node:assert/strict';
import {saveEpDraft} from '../src/lib/ep-draft-persistence.ts';
// Test double only: no backend adapter exists or is exercised.
function store() { let doc=null; const audits=[]; return {audits, async read(){return structuredClone(doc);},async compareAndSwap(id,revision,next,audit){if((doc?.revision??0)!==revision)return false; doc=structuredClone(next);audits.push(structuredClone(audit));return true;}}; }
const principal={actorId:'verified-fixture-admin',canManagePricing:true};
const rate={categoryId:'fixture-room',date:'2027-01-02',epPaise:100000,minimumEpPaise:0,mealTotalsPaise:{RO:0}};
const input={id:'fixture-draft',expectedRevision:0,reason:'Fixture review',rates:[rate]};
test('save draft includes version and atomic audit without publishing',async()=>{const s=store();const result=await saveEpDraft(s,principal,input);assert.equal(result.revision,1);assert.equal(result.status,'draft');assert.equal(s.audits[0].actorId,principal.actorId);assert.equal(s.audits[0].before,null);result.rates[0].epPaise=0;assert.equal((await s.read()).rates[0].epPaise,100000);});
test('unauthorized saves do not access store',async()=>{await assert.rejects(saveEpDraft({read(){throw Error('must not access');}}, {...principal,canManagePricing:false},input),/authorization/);});
test('stale save leaves document and audit unchanged',async()=>{const s=store();await saveEpDraft(s,principal,input);await assert.rejects(saveEpDraft(s,principal,input),/reload/);assert.equal(s.audits.length,1);});
test('racing saves cannot overwrite each other with conforming adapter',async()=>{const s=store();const results=await Promise.allSettled([saveEpDraft(s,principal,input),saveEpDraft(s,principal,input)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(s.audits.length,1);});
test('invalid rows and duplicate dates rejected before persistence',async()=>{for(const rates of [[rate,rate],[{...rate,date:'2027-02-30'}],[{...rate,epPaise:-1}],[]]){const s=store();await assert.rejects(saveEpDraft(s,principal,{...input,rates}));assert.equal(s.audits.length,0);}});
test('store failure propagates; no success returned',async()=>{await assert.rejects(saveEpDraft({read:async()=>null,compareAndSwap:async()=>{throw Error('transaction failed');}},principal,input),/transaction failed/);});
test('successful edit records complete before and after snapshots',async()=>{const s=store();await saveEpDraft(s,principal,input);await saveEpDraft(s,principal,{...input,expectedRevision:1,rates:[{...rate,epPaise:120000}]});assert.equal(s.audits[1].before.rates[0].epPaise,100000);assert.equal(s.audits[1].after.rates[0].epPaise,120000);});

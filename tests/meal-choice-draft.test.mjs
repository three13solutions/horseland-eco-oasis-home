import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMealChoicePlan,calculateMealChoices,getMealPriceImpact} from '../src/lib/meal-choice-draft.ts';
// Fixture prices are deliberately unequal; not approved hotel prices.
const meal = (id,pricePaise,mealType=id) => ({id,title:id,mealType,variant:'veg',pricePaise,isActive:true,revision:`${id}-v1`});
const catalogue = [meal('breakfast',10000),meal('lunch',25000),meal('dinner',35000),meal('tea',7000)];
const map = {code:'HB',groups:[{id:'breakfast-group',label:'Breakfast',mealIds:['breakfast']},{id:'major',label:'Lunch OR dinner',mealIds:['lunch','dinner']}]};
const guests = [{id:'a',label:'Adult 1',kind:'adult',choices:{'breakfast-group':'breakfast',major:'lunch'}},{id:'b',label:'Adult 2',kind:'adult',choices:{'breakfast-group':'breakfast',major:'dinner'}}];
const clone = value => structuredClone(value);
test('AND groups, independent OR choices and unequal actual per-person prices',()=>{
 const result=calculateMealChoices(map,catalogue,guests);
 assert.equal(result.subtotalPaise,80000);
 assert.deepEqual(result.guestBreakdown.map(g=>g.subtotalPaise),[35000,45000]);
 assert.equal(result.guestBreakdown[0].choices[1].mealId,'lunch');
 assert.equal(result.guestBreakdown[1].choices[1].mealId,'dinner');
 assert.equal(result.guestBreakdown[1].choices[1].revision,'dinner-v1');
});
test('there is no cheapest default, and a sole alternative is explicit too',()=>{
 for(const choices of [{},{major:'lunch'},{'breakfast-group':'breakfast'},{'breakfast-group':'breakfast',major:['lunch','dinner']}]) assert.throws(()=>calculateMealChoices(map,catalogue,[{...guests[0],choices}]),/choose exactly one/);
});
test('EP is zero with no meal groups or extra selections',()=>{
 assert.equal(calculateMealChoices({code:'RO',groups:[]},[],[{...guests[0],choices:{}}]).subtotalPaise,0);
 assert.throws(()=>validateMealChoicePlan({...map,code:'RO'},catalogue),/EP/);
 assert.throws(()=>calculateMealChoices({code:'RO',groups:[]},catalogue,[guests[0]]),/unknown group/);
});
test('approved policy charges adults children and infants the same full chosen meal price',()=>{
 for(const kind of ['adult','child','infant']) assert.equal(calculateMealChoices(map,catalogue,[{...guests[0],kind}]).subtotalPaise,35000);
 for(const kind of ['unknown',undefined]) assert.throws(()=>calculateMealChoices(map,catalogue,[{...guests[0],kind}]),/Unknown guest kind/);
});
test('missing, inactive and malformed catalogue items fail closed',()=>{
 assert.throws(()=>validateMealChoicePlan(map,catalogue.filter(m=>m.id!=='dinner')),/missing/);
 assert.throws(()=>validateMealChoicePlan(map,catalogue.map(m=>m.id==='lunch'?{...m,isActive:false}:m)),/inactive/);
 assert.throws(()=>validateMealChoicePlan(map,[...catalogue,catalogue[0]]),/Duplicate catalogue/);
 for(const pricePaise of [-1,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1,undefined]) assert.throws(()=>validateMealChoicePlan(map,catalogue.map(m=>({...m,pricePaise}))),/integer paise/);
 for(const revision of ['',undefined]) assert.throws(()=>validateMealChoicePlan(map,catalogue.map(m=>({...m,revision}))),/revision/);
});
test('malformed groups and repeated meal links cannot double charge',()=>{
 for(const groups of [[],[{...map.groups[0],mealIds:[]}],[map.groups[0],map.groups[0]],[{...map.groups[0],mealIds:['breakfast','breakfast']}],[map.groups[0],{id:'second',label:'Repeated breakfast',mealIds:['breakfast']}]]) assert.throws(()=>validateMealChoicePlan({...map,groups},catalogue));
 assert.throws(()=>validateMealChoicePlan({...map,code:'AP'},catalogue),/Invalid meal plan/);
});
test('unknown groups, alternatives and duplicate guests are rejected',()=>{
 assert.throws(()=>calculateMealChoices(map,catalogue,[...guests,guests[0]]),/Duplicate guest/);
 assert.throws(()=>calculateMealChoices(map,catalogue,[{...guests[0],choices:{...guests[0].choices,extra:'tea'}}]),/unknown group/);
 assert.throws(()=>calculateMealChoices(map,catalogue,[{...guests[0],choices:{...guests[0].choices,major:'tea'}}]),/choose exactly one/);
 assert.throws(()=>calculateMealChoices(map,catalogue,[{...guests[0],choices:[]}]),/choices are required/);
});
test('inputs are unchanged and calculated provenance snapshots are independent',()=>{
 const input=clone({map,catalogue,guests});const before=clone(input);
 const result=calculateMealChoices(input.map,input.catalogue,input.guests);
 assert.deepEqual(input,before);
 input.catalogue[0].pricePaise=1;input.guests[0].choices.major='dinner';
 assert.equal(result.subtotalPaise,80000);assert.equal(result.guestBreakdown[0].choices[0].pricePaise,10000);
 result.guestBreakdown[0].choices[0].title='changed';assert.equal(input.catalogue[0].title,'breakfast');
});
test('overflow guarded for guest, plan ranges and whole party',()=>{
 const expensive=catalogue.map(m=>({...m,pricePaise:Number.MAX_SAFE_INTEGER}));
 assert.throws(()=>calculateMealChoices(map,expensive,guests),/safe integer range/);
 const simple={code:'BB',groups:[map.groups[0]]};
 assert.throws(()=>calculateMealChoices(simple,expensive,guests.map(g=>({...g,choices:{'breakfast-group':'breakfast'}}))),/safe integer range/);
 assert.throws(()=>getMealPriceImpact([map],expensive,'breakfast',1),/safe integer range/);
});
test('shared edit impact identifies every linked plan and ranges, never charge',()=>{
 const cp={code:'BB',groups:[map.groups[0]]};
 const ap={code:'FB',groups:[map.groups[0],{id:'lunch-group',label:'Lunch',mealIds:['lunch']},{id:'dinner-group',label:'Dinner',mealIds:['dinner']},{id:'tea-group',label:'Tea',mealIds:['tea']}]};
 const impacts=getMealPriceImpact([cp,map,ap],catalogue,'breakfast',15000);
 assert.deepEqual(impacts.map(i=>i.planCode),['BB','HB','FB']);
 assert.deepEqual(impacts[1].oldRangePaise,{min:35000,max:45000});
 assert.deepEqual(impacts[1].newRangePaise,{min:40000,max:50000});
 assert.deepEqual(impacts[1].groups,[{groupId:'breakfast-group',label:'Breakfast'}]);
 assert.deepEqual(getMealPriceImpact([cp],catalogue,'tea',9000),[]);
 assert.equal(catalogue[0].pricePaise,10000);
});
test('changing one OR price changes only guests who selected it',()=>{
 const changed=catalogue.map(m=>m.id==='lunch'?{...m,pricePaise:30000,revision:'draft-v2'}:m);
 const before=calculateMealChoices(map,catalogue,guests);const after=calculateMealChoices(map,changed,guests);
 assert.equal(after.guestBreakdown[0].subtotalPaise-before.guestBreakdown[0].subtotalPaise,5000);
 assert.equal(after.guestBreakdown[1].subtotalPaise,before.guestBreakdown[1].subtotalPaise);
 assert.equal(after.guestBreakdown[0].choices[1].revision,'draft-v2');
});
test('impact rejects invalid money, duplicate plans and partial configuration',()=>{
 assert.throws(()=>getMealPriceImpact([map],catalogue,'missing',100),/missing/);
 assert.throws(()=>getMealPriceImpact([map],catalogue,'lunch',-1),/integer paise/);
 assert.throws(()=>getMealPriceImpact([map,map],catalogue,'lunch',100),/Duplicate plan/);
 assert.throws(()=>getMealPriceImpact([{code:'BB',groups:[]}],catalogue,'lunch',100),/Configure/);
});
test('zero is a legitimate explicit meal price, not an absent price',()=>{
 const free=catalogue.map(m=>({...m,pricePaise:0}));assert.equal(calculateMealChoices(map,free,guests).subtotalPaise,0);
});
test('bounds protect catalogue, alternatives, groups and party size',()=>{
 assert.throws(()=>validateMealChoicePlan(map,Array.from({length:5001},(_,i)=>meal(`id${i}`,0))),/5000/);
 assert.throws(()=>validateMealChoicePlan({...map,groups:Array.from({length:17},(_,i)=>({id:`g${i}`,label:'Group',mealIds:['breakfast']}))},catalogue),/16/);
 assert.throws(()=>validateMealChoicePlan({...map,groups:[{id:'g',label:'Group',mealIds:Array(101).fill('breakfast')}]},catalogue),/100 meal/);
 for(const party of [[],Array(101).fill(guests[0])])assert.throws(()=>calculateMealChoices(map,catalogue,party),/1–100 guests/);
});
test('inherited choice keys cannot satisfy a required group',()=>{
 const choices=Object.create({'breakfast-group':'breakfast',major:'lunch'});
 assert.throws(()=>calculateMealChoices(map,catalogue,[{...guests[0],choices}]),/choose exactly one/);
});

test('EP has zero meal addition for known adult, child and infant kinds without inferring paid policy',()=>{
 const party=['adult','child','infant'].map((kind,i)=>({id:`guest-${i}`,label:`Guest ${i}`,kind,choices:{}}));
 const result=calculateMealChoices({code:'RO',groups:[]},[],party);
 assert.equal(result.subtotalPaise,0);
 assert.deepEqual(result.guestBreakdown.map(g=>g.subtotalPaise),[0,0,0]);
 assert.deepEqual(result.guestBreakdown.map(g=>g.kind),['adult','child','infant']);
 for(const kind of ['unknown',undefined,null,''])assert.throws(()=>calculateMealChoices({code:'RO',groups:[]},[],[{id:'g',label:'Guest',kind,choices:{}}]),/Unknown guest kind/);
});

test('mixed-age party still chooses independently at the same full-price basis',()=>{
 const party=[guests[0],{...guests[1],kind:'child'},{...guests[0],id:'infant',label:'Infant',kind:'infant'}];
 const result=calculateMealChoices(map,catalogue,party);
 assert.equal(result.subtotalPaise,115000);
 assert.deepEqual(result.guestBreakdown.map(g=>g.subtotalPaise),[35000,45000,35000]);
});

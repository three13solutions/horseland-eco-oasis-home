import test from 'node:test';
import assert from 'node:assert/strict';
import {getConnectedMealIds,getBatchMealPriceImpact} from '../src/lib/shared-meal-impact.ts';
const catalogue=['a','b','c','d','x'].map((id,i)=>({id,title:id,mealType:'lunch',variant:'veg',pricePaise:(i+1)*100,isActive:true,revision:'fixture-v1'}));
const group=(id,mealIds)=>({id,label:id,mealIds});
const plans=[{code:'BB',groups:[group('ab',['a','b'])]},{code:'HB',groups:[group('bc',['b','c']),group('separate',['x'])]},{code:'FB',groups:[group('cd',['c','d'])]}];
test('closure is transitive across OR links but never follows AND between groups',()=>{
 assert.deepEqual(getConnectedMealIds(plans,catalogue,'a'),['a','b','c','d']);
 assert.deepEqual(getConnectedMealIds(plans,catalogue,'x'),['x']);
 assert.deepEqual(getConnectedMealIds(plans.toReversed(),catalogue,'d'),['a','b','c','d']);
});
test('OR cycle terminates and discovery does not change any price',()=>{
 const cyclic=[...plans,{code:'RO',groups:[]}];
 cyclic[2]={code:'FB',groups:[group('ca',['c','a'])]};
 const before=structuredClone({catalogue,cyclic});
 assert.deepEqual(getConnectedMealIds(cyclic,catalogue,'b'),['a','b','c']);
 assert.deepEqual({catalogue,cyclic},before);
});
test('batch range is calculated simultaneously, including which alternative is cheapest',()=>{
 const result=getBatchMealPriceImpact(plans,catalogue,[{mealId:'a',pricePaise:250},{mealId:'b',pricePaise:50},{mealId:'c',pricePaise:100}]);
 assert.deepEqual(result.map(x=>x.newRangePaise),[{min:50,max:250},{min:550,max:600},{min:100,max:400}]);
 assert.deepEqual(result.map(x=>x.oldRangePaise),[{min:100,max:200},{min:700,max:800},{min:300,max:400}]);
 assert.deepEqual(result[1].groups,[{groupId:'bc',label:'bc'}]);
});
test('explicit batch may use unequal prices and need not update the entire connected set',()=>{
 const before=structuredClone(catalogue);
 const result=getBatchMealPriceImpact(plans,catalogue,[{mealId:'a',pricePaise:500}]);
 assert.equal(result.length,1);
 assert.deepEqual(result[0].newRangePaise,{min:200,max:500});
 assert.deepEqual(catalogue,before);
});
test('duplicate changes, duplicate plan codes and invalid prices rejected',()=>{
 assert.throws(()=>getBatchMealPriceImpact(plans,catalogue,[{mealId:'a',pricePaise:1},{mealId:'a',pricePaise:2}]),/Duplicate meal price/);
 assert.throws(()=>getConnectedMealIds([plans[0],plans[0]],catalogue,'a'),/Duplicate plan/);
 for(const pricePaise of [-1,Infinity,NaN,1.5,undefined])assert.throws(()=>getBatchMealPriceImpact(plans,catalogue,[{mealId:'a',pricePaise}]),/integer paise/);
 assert.throws(()=>getBatchMealPriceImpact(plans,catalogue,[]),/explicit/);
});
test('missing inactive and partial plans block discovery and impact instead of understating dependencies',()=>{
 for(const partial of [{code:'HB',groups:[]},{code:'HB',groups:[group('empty',[])]}]){
  assert.throws(()=>getConnectedMealIds([plans[0],partial],catalogue,'a'));
  assert.throws(()=>getBatchMealPriceImpact([plans[0],partial],catalogue,[{mealId:'a',pricePaise:1}]));
 }
 assert.throws(()=>getConnectedMealIds(plans,catalogue,'missing'),/missing/);
 const inactive=catalogue.map(m=>({...m,isActive:false}));
 assert.throws(()=>getConnectedMealIds([],inactive,'a'),/inactive/);
 assert.throws(()=>getBatchMealPriceImpact([],inactive,[{mealId:'a',pricePaise:1}]),/inactive/);
});
test('unlinked active meal is a single optional candidate with no affected passed plans',()=>{
 const extra={...catalogue[0],id:'extra'};
 assert.deepEqual(getConnectedMealIds(plans,[...catalogue,extra],'extra'),['extra']);
 assert.deepEqual(getBatchMealPriceImpact(plans,[...catalogue,extra],[{mealId:'extra',pricePaise:99}]),[]);
});
test('batch range overflow rejected and explicit zero allowed',()=>{
 assert.throws(()=>getBatchMealPriceImpact(plans,catalogue,[{mealId:'b',pricePaise:Number.MAX_SAFE_INTEGER}]),/safe integer/);
 assert.deepEqual(getBatchMealPriceImpact([plans[0]],catalogue,[{mealId:'a',pricePaise:0}])[0].newRangePaise,{min:0,max:200});
});

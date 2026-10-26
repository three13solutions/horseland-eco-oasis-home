const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ts=require('typescript');
const source=fs.readFileSync(__dirname+'/../src/components/GuestSelector.tsx','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
let state=[],index=0,effects=[],previousDeps=[];
const react={useState:(v)=>{const i=index++; if(!(i in state))state[i]=v;return[state[i],v=>state[i]=v]},useEffect:(f,deps)=>{const i=index++;if(!previousDeps[i]||deps.some((d,n)=>d!==previousDeps[i][n]))effects.push(f);previousDeps[i]=deps}};
const jsx=(type,props)=>({type,props});const mod={exports:{}};
const sandbox={exports:mod.exports,require:(n)=> n==='react'?{...react,default:react}:n==='react/jsx-runtime'?{jsx,jsxs:jsx}:new Proxy({},{get:(_,k)=>k==='cn'?(...x)=>x.filter(Boolean).join(' '):k})};vm.runInNewContext(compiled,sandbox);
const Component=mod.exports.default;
function render(props){index=0;effects=[];let t=Component(props);if(effects.length){effects.forEach(f=>f());index=0;effects=[];t=Component(props)}return t}
function buttons(t,r=[]){if(!t||typeof t!=='object')return r;if(t.type==='Button')r.push(t);[].concat(t.props?.children||[]).flat().forEach(x=>buttons(x,r));return r}
let last;let props={totalGuests:2,adultsCount:2,childrenCount:0,infantsCount:0,onGuestsChange:(...a)=>last=a};
let t=render(props);assert.equal(state[0],2);assert.equal(state[1],0);assert.equal(state[2],0);
// Counter buttons: popover trigger; adult minus/plus; child minus/plus; infant minus/plus; Done.
buttons(t)[1].props.onClick();assert.deepEqual(last,[1,1,0,0]);props={...props,totalGuests:1,adultsCount:1};t=render(props);assert.equal(state[0],1);
buttons(t)[6].props.onClick();assert.deepEqual(last,[1,1,0,1]);props={...props,infantsCount:1};t=render(props);assert.equal(state[2],1);
props={...props,totalGuests:3,adultsCount:2,childrenCount:1,infantsCount:1};t=render(props);assert.deepEqual(state.slice(0,3),[2,1,1]);buttons(t)[2].props.onClick();assert.deepEqual(last,[4,3,1,1]);
// Uncontrolled legacy caller must not reset children when its total prop changes.
state=[];previousDeps=[];props={totalGuests:2,onGuestsChange:(...a)=>last=a};t=render(props);buttons(t)[4].props.onClick();assert.deepEqual(last,[3,2,1,0]);t=render({...props,totalGuests:3});assert.deepEqual(state.slice(0,3),[2,1,0]);
console.log('PASS: defaults 2; explicit 1; infant carry; child/adult preservation; Back/Forward prop sync; uncontrolled legacy compatibility');
for(const f of ['HeroSection.tsx','stay/CategoryCard.tsx','booking/AvailableRoomCard.tsx']){const s=fs.readFileSync(__dirname+'/../src/components/'+f,'utf8');assert(s.includes('infants'));}
const cc=fs.readFileSync(__dirname+'/../src/components/stay/CategoryCard.tsx','utf8');assert(cc.includes('infantsCount: infants'));assert(cc.includes('infants: infants.toString()'));
const search=fs.readFileSync(__dirname+'/../src/pages/SearchAvailability.tsx','utf8');assert(search.includes('infants={infants}'));
const booking=fs.readFileSync(__dirname+'/../src/pages/Booking.tsx','utf8');assert(booking.includes("newSearchParams.set('infants', searchInfants.toString())"));assert(booking.includes('infants={infantsCount}'));
console.log('PASS: homepage/search/room card/checkout infant propagation contracts');
const partySource=fs.readFileSync(__dirname+'/../src/lib/guestParty.ts','utf8');const partyExports={};vm.runInNewContext(ts.transpileModule(partySource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:partyExports});
for(const [query, expected] of [['',[2,0,0,2]],['guests=1',[1,0,0,1]],['adults=1',[1,0,0,1]],['guests=3&children=1',[2,1,0,3]],['guests=4&adults=2&children=1&infants=1',[2,1,1,3]],['adults=NaN&children=-1&infants=bad',[2,0,0,2]]]){const p=partyExports.readGuestParty(new URLSearchParams(query));assert.deepEqual([p.adults,p.children,p.infants,p.guests],expected)}
console.log('PASS: default2, legacy guests-only1, explicit adult1, child/infant breakdown, malformed count handling');
const detail=fs.readFileSync(__dirname+'/../src/pages/RoomDetail.tsx','utf8');assert(detail.includes('const totalGuests = adults + children;'));assert(detail.includes('infants: infants.toString()'));console.log('PASS: room detail excludes infants from occupancy but carries them for meals');

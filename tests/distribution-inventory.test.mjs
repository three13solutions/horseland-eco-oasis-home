import test from 'node:test';
import assert from 'node:assert/strict';
import { hotelToday, validDate, addDays, dateRange, parseRoomCount, makeChange, bulkChanges, validateChannel } from '../src/lib/distribution-inventory.ts';
const cell = {category_id:'standard',date:'2026-11-01',remaining:3,physical_remaining:8,version:4,configured:true};
test('Mumbai date boundaries do not use browser or server local date',()=>{
 assert.equal(hotelToday(new Date('2026-10-25T18:29:59Z')),'2026-10-25');
 assert.equal(hotelToday(new Date('2026-10-25T18:30:00Z')),'2026-10-26');
});
test('inclusive dates reject impossible dates, reversed ranges and excessive ranges',()=>{
 assert.equal(validDate('2026-02-30'),false);
 assert.equal(validDate('2026-99-99'),false);
 assert.equal(validDate(''),false);
 assert.deepEqual(dateRange('2026-10-31','2026-11-02'),['2026-10-31','2026-11-01','2026-11-02']);
 assert.equal(addDays('2026-12-31',1),'2027-01-01');
 assert.throws(()=>dateRange('2026-11-02','2026-11-01'));
 assert.throws(()=>dateRange('2026-01-01','2026-12-31'),/90 dates/);
});
test('counts are nonnegative whole remaining rooms, never additive totals',()=>{
 assert.equal(parseRoomCount('0'),0);
 for(const value of ['','-1','1.5','1e2','Infinity','NaN','999999999999999999999']) assert.throws(()=>parseRoomCount(value));
 assert.deepEqual(makeChange(cell,'5','2026-10-26'),{category_id:'standard',date:'2026-11-01',remaining:5,expected_version:4});
 assert.throws(()=>makeChange(cell,'9','2026-10-26'),/Only 8/);
 assert.throws(()=>makeChange(cell,'1','2026-11-02'),/Past dates/);
});
test('bulk changes are atomic preparation, include every night and category, and retain versions',()=>{
 const grid={enabled:true,categories:[],cells:[cell,{...cell,date:'2026-11-02'}, {...cell,category_id:'deluxe',physical_remaining:2}, {...cell,category_id:'deluxe',date:'2026-11-02',physical_remaining:2}]};
 const changes=bulkChanges(grid,['standard','deluxe'],'2026-11-01','2026-11-02','2','2026-10-26');
 assert.equal(changes.length,4); assert.ok(changes.every(c=>c.remaining===2 && c.expected_version===4));
 assert.throws(()=>bulkChanges(grid,['standard','deluxe'],'2026-11-01','2026-11-02','3','2026-10-26'),/Only 2/);
 assert.throws(()=>bulkChanges(grid,['missing'],'2026-11-01','2026-11-02','1','2026-10-26'),/missing/);
 assert.throws(()=>bulkChanges({...grid,enabled:false},['standard'],'2026-11-01','2026-11-02','0','2026-10-26'),/not activated/);
 assert.throws(()=>bulkChanges(grid,[],'2026-11-01','2026-11-02','0','2026-10-26'),/at least one/);
 assert.equal(bulkChanges(grid,['standard','standard'],'2026-11-01','2026-11-02','0','2026-10-26').length,2);
});
test('channel codes and definitions are constrained without touching pricing codes',()=>{
 validateChannel('Phone / WhatsApp','phone_whatsapp','offline');
 assert.throws(()=>validateChannel('','direct','offline'));
 assert.throws(()=>validateChannel('Phone','Phone WhatsApp','offline'));
 assert.throws(()=>validateChannel('Phone','phone','automatic_sync'));
});

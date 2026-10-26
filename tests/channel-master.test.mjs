import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { channelRuleLabel, selectableChannels, requireChannelSelection, CHANNEL_MASTER_QUERY_KEY } from '../src/lib/channelMaster.ts';
const active={id:'a',code:'arbitrary',name:'New custom source',kind:'other',is_active:true,notes:''};
const archived={id:'b',code:'retained',name:'Older source',kind:'offline',is_active:false,notes:''};
test('new arbitrary master channel appears without a hardcoded taxonomy',()=>{
 assert.deepEqual(selectableChannels([active,archived]),[active]);
 assert.equal(requireChannelSelection('a',[active,archived]),'a');
 assert.deepEqual(CHANNEL_MASTER_QUERY_KEY,['distribution-channels']);
});
test('rename preserves stable rule reference and changes only display label',()=>{
 const rule={channel_id:'a',channel_name:'legacy_token'};
 assert.equal(channelRuleLabel(rule,[active]),'New custom source');
 assert.equal(channelRuleLabel(rule,[{...active,name:'Renamed source'}]),'Renamed source');
 assert.equal(rule.channel_name,'legacy_token');
});
test('archived channel is retained only for its existing rule',()=>{
 assert.deepEqual(selectableChannels([active,archived],'b'),[active,archived]);
 assert.equal(requireChannelSelection('b',[active,archived],'b'),'b');
 assert.throws(()=>requireChannelSelection('b',[active,archived]),/Archived/);
 assert.equal(channelRuleLabel({channel_id:'b'},[archived]),'Older source (archived)');
});
test('missing legacy mapping is visible and never inferred from similar names',()=>{
 assert.equal(channelRuleLabel({channel_name:'old_source'},[active]),'old_source (mapping pending)');
 assert.equal(channelRuleLabel({channel_id:'missing',channel_name:'old_source'},[active]),'old_source (mapping pending)');
 assert.throws(()=>requireChannelSelection('',[active]),/Select a channel/);
 assert.throws(()=>requireChannelSelection('missing',[active],'missing'),/Select a channel/);
});
test('directory and pricing read the shared hook; payload uses ID not selected display name',()=>{
 const pricing=readFileSync(new URL('../src/components/admin/pricing-rules/ChannelRulesTab.tsx',import.meta.url),'utf8');
 const directory=readFileSync(new URL('../src/pages/admin/DistributionChannels.tsx',import.meta.url),'utf8');
 assert.match(pricing,/const channels = useChannelMaster\(\)/);
 assert.match(directory,/const query = useChannelMaster\(\)/);
 assert.match(directory,/queryKey: CHANNEL_MASTER_QUERY_KEY/);
 assert.match(pricing,/channel_id: channelId/);
 assert.doesNotMatch(pricing,/SelectItem value="(?:direct|booking.com|makemytrip|agoda|corporate)"/);
 assert.doesNotMatch(pricing,/channel_name: formData/);
 assert.match(pricing,/channels\.isPending \|\| channels\.isError/);
});

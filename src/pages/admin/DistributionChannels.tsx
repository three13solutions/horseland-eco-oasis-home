import { useChannelMaster } from '@/hooks/useChannelMaster';
import { CHANNEL_MASTER_QUERY_KEY } from '@/lib/channelMaster';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { validateChannel, type DistributionChannel } from '@/lib/distribution-inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Info, Pencil, Plus, Radio } from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as SupabaseClient;
const kindNames = { website: 'Website', offline: 'Offline', channel_manager: 'Channel manager', other: 'Other' };
const blank = () => ({ name: '', code: '', kind: 'offline' as DistributionChannel['kind'], notes: '', is_active: true });

export default function DistributionChannels() {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DistributionChannel | null>(null);
  const [form, setForm] = useState(blank);
  const query = useChannelMaster();
  const save = useMutation({ mutationFn: async () => {
    validateChannel(form.name, form.code, form.kind);
    const payload = { ...form, name: form.name.trim(), notes: form.notes.trim() };
    const { error } = editing ? await db.from('distribution_channels').update(payload).eq('id', editing.id).select('id').single() : await db.from('distribution_channels').insert(payload).select('id').single();
    if (error) throw error;
  }, onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: CHANNEL_MASTER_QUERY_KEY }), client.invalidateQueries({ queryKey: ['channel-rules'] })]); setOpen(false); toast.success('Channel definition saved. No integrations, room statuses or pricing were changed.'); }, onError: (error: Error) => toast.error(`Save not confirmed: ${error.message}. Refresh the directory before adding the same channel again.`) });
  const website = editing?.code === 'website';
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-heading font-bold">Channels</h1><p className="mt-1 text-muted-foreground">Define where your bookings come from.</p></div><Button asChild variant="outline"><Link to="/admin/distribution/inventory">Room Inventory</Link></Button></div>
    <Alert><Info className="h-4 w-4" /><AlertDescription>This directory defines channel names only. It does not connect, synchronise or import external bookings. Website availability is managed separately; other channels remain in your existing systems.</AlertDescription></Alert>
    {query.isError && <Alert variant="destructive"><AlertDescription>The channel directory could not be loaded. No channels have been changed. <Button variant="link" className="h-auto p-0 text-inherit" onClick={() => query.refetch()}>Retry</Button></AlertDescription></Alert>}
    <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5" />Booking channels</CardTitle><CardDescription>Stable codes keep definitions consistent. Archive unused channels rather than deleting history.</CardDescription></div><Button disabled={query.isLoading || query.isError} onClick={() => { setEditing(null); setForm(blank()); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add channel</Button></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Channel</TableHead><TableHead>Type</TableHead><TableHead>Management</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>
      {query.isLoading ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading channels…</TableCell></TableRow> : query.data?.map(channel => <TableRow key={channel.id}><TableCell><p className="font-medium">{channel.name}</p><p className="text-xs text-muted-foreground">{channel.code}</p>{channel.notes && <p className="mt-1 max-w-md text-sm text-muted-foreground">{channel.notes}</p>}</TableCell><TableCell>{kindNames[channel.kind]}</TableCell><TableCell>{channel.code === 'website' ? <Link className="text-primary underline underline-offset-4" to="/admin/distribution/inventory">Room Inventory</Link> : <><Badge variant="outline">Managed externally</Badge><p className="mt-1 text-xs text-muted-foreground">No connection configured here</p></>}</TableCell><TableCell><Badge variant={channel.is_active ? 'secondary' : 'outline'}>{channel.is_active ? 'Active definition' : 'Archived'}</Badge></TableCell><TableCell><Button variant="ghost" size="icon" aria-label={`Edit ${channel.name}`} onClick={() => { setEditing(channel); setForm({ ...channel, notes: channel.notes || '' }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button></TableCell></TableRow>)}
      {!query.isLoading && !query.isError && query.data?.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No channel definitions yet.</TableCell></TableRow>}
    </TableBody></Table></CardContent></Card>
    <p className="text-sm text-muted-foreground">This directory is the shared list used by <Link to="/admin/pricing/rules" className="text-primary underline underline-offset-4">pricing channel rules</Link>. Adding a channel makes it available for a new pricing rule; it does not create a price adjustment. Renaming keeps existing rules linked. Archiving hides it from new selections but preserves existing rules and does not stop website sales.</p>
    <Dialog open={open} onOpenChange={next => { if (!save.isPending) setOpen(next); }}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit channel' : 'Add channel'}</DialogTitle><DialogDescription>Define a booking source without creating an external integration.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
      <div><Label htmlFor="channel-name">Name</Label><Input id="channel-name" value={form.name} maxLength={80} required disabled={save.isPending} onChange={event => setForm(old => ({ ...old, name: event.target.value }))} /></div>
      <div><Label htmlFor="channel-code">Stable code</Label><Input id="channel-code" value={form.code} required disabled={!!editing || save.isPending} placeholder="phone_whatsapp" onChange={event => setForm(old => ({ ...old, code: event.target.value.toLowerCase() }))} /><p className="mt-1 text-xs text-muted-foreground">Cannot be changed after creation.</p></div>
      <div><Label htmlFor="channel-kind">Type</Label><select id="channel-kind" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.kind} disabled={!!editing || save.isPending} onChange={event => setForm(old => ({ ...old, kind: event.target.value as DistributionChannel['kind'] }))}>{Object.entries(kindNames).filter(([kind]) => kind !== 'website' || website).map(([kind, name]) => <option key={kind} value={kind}>{name}</option>)}</select></div>
      <div><Label htmlFor="channel-notes">Notes</Label><Textarea id="channel-notes" maxLength={1000} disabled={save.isPending} value={form.notes} onChange={event => setForm(old => ({ ...old, notes: event.target.value }))} /></div>
      <div className="flex items-center gap-3"><Switch id="channel-active" checked={form.is_active} disabled={website || save.isPending} onCheckedChange={checked => setForm(old => ({ ...old, is_active: checked }))} /><Label htmlFor="channel-active">Active definition</Label></div>
      {website && <p className="text-xs text-muted-foreground">The website definition stays active. Use Room Inventory to control website sales.</p>}
      <DialogFooter><Button type="button" variant="outline" disabled={save.isPending} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save channel'}</Button></DialogFooter>
    </form></DialogContent></Dialog>
  </div>;
}

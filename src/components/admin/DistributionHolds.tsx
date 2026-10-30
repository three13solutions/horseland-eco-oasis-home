import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock3, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as SupabaseClient;
type Hold = { hold_id: string; state: string; payment_state: string | null; category_name: string; room_type_name: string; unit_number: string; check_in: string; check_out: string; created_at: string; provider_order_id: string | null; review_reason: string | null };
function ageLabel(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60000));
  if (!Number.isFinite(minutes)) return 'Unknown';
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr`;
  return `${Math.floor(minutes / 1440)} days`;
}
export default function DistributionHolds() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['distribution-pending-holds'], refetchInterval: 60000, queryFn: async () => {
    const { data, error } = await db.rpc('distribution_pending_holds');
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Pending checkout information is incomplete.');
    return data as Hold[];
  } });
  const check = useMutation({ mutationFn: async (holdId: string) => {
    const { data, error } = await supabase.functions.invoke('reconcile-distribution-hold', { body: { hold_id: holdId } });
    if (error) throw error;
    if (!data || !['confirmed', 'pending', 'review_required'].includes(data.status)) throw new Error('Payment status could not be verified. The hold remains protected.');
    return data as { status: string; message: string };
  }, onSuccess: async result => {
    await Promise.all([client.invalidateQueries({ queryKey: ['distribution-pending-holds'] }), client.invalidateQueries({ queryKey: ['distribution-inventory'] })]);
    if (result.status === 'confirmed') toast.success(result.message || 'Verified payment matched; the booking is confirmed.');
    else toast.info(result.message || 'Payment is not confirmed. Inventory remains held.');
  }, onError: (error: Error) => toast.error(`Check not confirmed: ${error.message}. Inventory has not been released.`) });

  return <details open={(query.data?.length ?? 0) > 0} className="rounded-lg border bg-card p-4">
    <summary className="flex cursor-pointer items-center gap-2 font-medium"><Clock3 className="h-4 w-4" />Checkout holds <Badge variant="secondary">{query.data?.length ?? '…'}</Badge></summary>
    <div className="mt-4 space-y-4">
      <Alert><ShieldCheck className="h-4 w-4" /><AlertDescription>A payment attempt holds an eligible room and its category inventory. Closing checkout or an elapsed timer does not release it. Check payment status to finalise a verified paid checkout; unpaid or uncertain orders remain held for reconciliation.</AlertDescription></Alert>
      {query.isError ? <p className="text-sm text-destructive">Pending checkouts could not be loaded. <Button variant="link" onClick={() => query.refetch()}>Retry</Button></p> : query.isLoading ? <p className="text-sm text-muted-foreground">Loading pending checkouts…</p> : query.data?.length === 0 ? <p className="text-sm text-muted-foreground">No pending checkout holds.</p> : <Table><TableHeader><TableRow><TableHead>Room</TableHead><TableHead>Stay</TableHead><TableHead>Held for</TableHead><TableHead>Payment</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{query.data?.map(hold => <TableRow key={hold.hold_id}>
        <TableCell><p className="font-medium">{hold.category_name} · {hold.unit_number}</p><p className="text-xs text-muted-foreground">{hold.room_type_name}</p></TableCell>
        <TableCell className="whitespace-nowrap">{hold.check_in} → {hold.check_out}</TableCell>
        <TableCell>{ageLabel(hold.created_at)}</TableCell>
        <TableCell><Badge variant={hold.payment_state === 'review_required' ? 'destructive' : 'outline'}>{hold.payment_state === 'review_required' ? 'Needs review' : 'Awaiting verification'}</Badge>{!hold.provider_order_id && <p className="mt-1 max-w-xs text-xs text-muted-foreground">Provider order not yet linked. Checking searches for the exact provider receipt. Unresolved attempts remain protected.</p>}</TableCell>
        <TableCell><Button variant="outline" size="sm" disabled={check.isPending} onClick={() => check.mutate(hold.hold_id)}>{check.isPending && check.variables === hold.hold_id ? 'Checking…' : 'Check payment status'}</Button></TableCell>
      </TableRow>)}</TableBody></Table>}
    </div>
  </details>;
}

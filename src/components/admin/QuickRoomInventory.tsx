import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { hotelToday, makeChange, validDate, type InventoryCell } from '@/lib/distribution-inventory';
import { readDistributionInventory, saveDistributionInventory } from '@/lib/distributionInventoryApi';
import { readQuickInventoryRequest, persistQuickInventoryRequest, type QuickInventoryRequest } from '@/lib/inventoryQuickUpdate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function QuickRoomInventory() {
  const [date, setDate] = useState(hotelToday);
  const [category, setCategory] = useState('');
  const [count, setCount] = useState('');
  const [original, setOriginal] = useState<InventoryCell | null>(null);
  const [pending, setPending] = useState<QuickInventoryRequest | null>(null);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [storageError, setStorageError] = useState(false);
  const savingRef = useRef(false);
  const client = useQueryClient();
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.session?.user.id) { setStorageError(true); setMessage('Sign in again to update inventory.'); return; }
      try {
        const key = `distribution-quick-update:${data.session.user.id}`;
        const saved = readQuickInventoryRequest(sessionStorage, key);
        setStorageKey(key);
        if (saved) { setPending(saved); setDate(saved.change.date); setCategory(saved.change.category_id); setCount(String(saved.change.remaining)); setMessage('An earlier save needs confirmation. Retry the same update before making another change.'); }
      } catch (error) { setStorageError(true); setMessage(error instanceof Error ? error.message : 'Browser storage is unavailable. No update has been sent.'); }
    }).catch(() => { if (active) { setStorageError(true); setMessage('Your session could not be checked. Sign in again before updating inventory.'); } });
    return () => { active = false; };
  }, []);
  const query = useQuery({ queryKey: ['distribution-inventory', date, date], queryFn: () => readDistributionInventory(date, date), enabled: validDate(date), refetchOnWindowFocus: true });
  const cell = query.data?.cells.find(item => item.category_id === category && item.date === date);
  const locked = !!pending || storageError || !storageKey;
  const save = useMutation({ mutationFn: (request: QuickInventoryRequest) => saveDistributionInventory([request.change], request.id),
    onSuccess: async () => {
      try { if (storageKey) sessionStorage.removeItem(storageKey); } catch { /* Exact same ID remains safe to retry after reload. */ }
      setPending(null); setOriginal(null); setCount('');
      setMessage('Room inventory saved. Individual room statuses were not changed.');
      await client.invalidateQueries({ queryKey: ['distribution-inventory'] });
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === '40001') {
        try { if (storageKey) sessionStorage.removeItem(storageKey); } catch { setStorageError(true); }
        setPending(null); setOriginal(null); setCount('');
        setMessage('Inventory changed while you were editing. This request changed nothing. Refresh and review the latest remaining count.');
        client.invalidateQueries({ queryKey: ['distribution-inventory'] });
      } else setMessage(`Save not confirmed: ${error.message}. Keep this update unchanged and retry to check the same request.`);
    },
    onSettled: () => { savingRef.current = false; },
  });
  const submit = () => {
    if (savingRef.current || storageError || !storageKey) return;
    try {
      let request = pending;
      if (!request) {
        if (!query.data?.enabled || query.isError || !cell) throw new Error('Load an eligible category and date before updating.');
        request = { schema: 1, id: crypto.randomUUID(), change: makeChange(original || cell, count) };
        // Persist exact revision, target count and UUID before sending. Unknown
        // results lock all fields; retry/reload uses the identical server request.
        persistQuickInventoryRequest(sessionStorage, storageKey, request);
        setPending(request);
      }
      savingRef.current = true;
      setMessage('Saving…');
      save.mutate(request);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No update was sent.'); }
  };
  return <Card className="mb-6"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Room Inventory</CardTitle><CardDescription>Quickly update remaining website rooms for one category and night.</CardDescription></div><Button asChild variant="outline"><Link to="/admin/distribution/inventory">Open Room Inventory</Link></Button></div></CardHeader>
    <CardContent className="space-y-3"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
      <div><Label htmlFor="quick-inventory-category">Category</Label><select id="quick-inventory-category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={category} disabled={locked || save.isPending || query.isPending || query.isError} onChange={event => { setCategory(event.target.value); setCount(''); setOriginal(null); }}><option value="">Select category</option>{query.data?.categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div><Label htmlFor="quick-inventory-date">Night</Label><Input id="quick-inventory-date" type="date" min={hotelToday()} value={date} disabled={locked || save.isPending} onChange={event => { setDate(event.target.value); setCount(''); setOriginal(null); }} /></div>
      <div><Label htmlFor="quick-inventory-count">Rooms available</Label><Input id="quick-inventory-count" type="number" inputMode="numeric" min="0" max={cell?.physical_remaining} step="1" value={count} disabled={locked || save.isPending || !cell || !query.data?.enabled || query.isError} onChange={event => { if (!original && cell) setOriginal({ ...cell }); setCount(event.target.value); }} /></div>
      <Button className="self-end" onClick={submit} disabled={save.isPending || storageError || !storageKey || (!pending && (!count || !cell || !query.data?.enabled || query.isError))}>{save.isPending ? 'Saving…' : pending ? 'Retry same update' : 'Save count'}</Button>
    </div>
    {cell && <p className="text-sm text-muted-foreground">Currently {cell.remaining} remaining · maximum {cell.physical_remaining} eligible rooms.</p>}
    {query.isError && <p role="alert" className="text-sm text-destructive">Inventory could not be loaded. <button className="underline" onClick={() => query.refetch()}>Refresh</button></p>}
    {query.data && !query.data.enabled && <p className="text-sm text-muted-foreground">{query.data.readiness_message || 'Inventory controls are not activated yet.'}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {pending && <p className="break-all text-xs text-muted-foreground">Pending: {pending.change.date} · {pending.change.remaining} remaining · reference {pending.id}</p>}
    <p className="text-xs text-muted-foreground">0 closes website sales for this category and night. Existing bookings, room restrictions and room statuses stay unchanged. Use the full page for multiple dates.</p>
    </CardContent></Card>;
}

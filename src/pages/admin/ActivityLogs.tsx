import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, History, RotateCcw, Search } from 'lucide-react';

const db = supabase as any;
const PAGE = 50;

type Log = {
  id: string; admin_user_id: string | null; action: string; target_table: string | null;
  record_key: string | null; target_id: string | null; old_values: any; new_values: any;
  actor_email: string | null; actor_name: string | null; created_at: string;
};

export const moduleLabel = (t?: string | null) =>
  (t || 'unknown').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const ACTION_LABEL: Record<string, string> = { insert: 'Added', update: 'Updated', delete: 'Deleted' };
const actionVariant = (a: string) => (a === 'delete' ? 'destructive' : a === 'insert' ? 'default' : 'secondary') as any;
const fmt = (v: any) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v));
const IGNORED = new Set(['updated_at']);

export const diffChanges = (oldV: any, newV: any) => {
  const keys = Array.from(new Set([...Object.keys(oldV || {}), ...Object.keys(newV || {})]));
  return keys
    .filter((k) => !IGNORED.has(k) && JSON.stringify(oldV?.[k]) !== JSON.stringify(newV?.[k]))
    .map((k) => ({ field: k, before: oldV?.[k], after: newV?.[k] }));
};

const ActivityLogs = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [user, setUser] = useState('all');
  const [module, setModule] = useState('all');
  const [action, setAction] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [users, setUsers] = useState<{ id: string; label: string }[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [selected, setSelected] = useState<Log | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await db.from('admin_audit_log').select('admin_user_id, actor_name, actor_email, target_table').order('created_at', { ascending: false }).limit(1000);
      const u = new Map<string, string>(); const m = new Set<string>();
      (data || []).forEach((r: any) => {
        if (r.admin_user_id && !u.has(r.admin_user_id)) u.set(r.admin_user_id, r.actor_name || r.actor_email || 'Unknown');
        if (r.target_table) m.add(r.target_table);
      });
      setUsers(Array.from(u, ([id, label]) => ({ id, label })));
      setModules(Array.from(m).sort());
    })();
  }, []);

  useEffect(() => { setPage(0); }, [search, user, module, action, from, to]);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true); setError('');
      let q = db.from('admin_audit_log').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
      if (user !== 'all') q = q.eq('admin_user_id', user);
      if (module !== 'all') q = q.eq('target_table', module);
      if (action !== 'all') q = q.eq('action', action);
      if (from) q = q.gte('created_at', new Date(`${from}T00:00:00`).toISOString());
      if (to) q = q.lte('created_at', new Date(`${to}T23:59:59.999`).toISOString());
      const s = search.trim().replace(/[,()%]/g, ' ');
      if (s) q = q.or(`actor_name.ilike.%${s}%,actor_email.ilike.%${s}%,target_table.ilike.%${s.replace(/\s+/g, '_')}%,record_key.ilike.%${s}%,action.ilike.%${s}%`);
      const { data, count: c, error: e } = await q;
      if (e) setError('Failed to load activity logs'); else { setLogs(data || []); setCount(c || 0); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, user, module, action, from, to, page]);

  const changes = useMemo(() => (selected ? diffChanges(selected.old_values, selected.new_values) : []), [selected]);
  const reset = () => { setSearch(''); setUser('all'); setModule('all'); setAction('all'); setFrom(''); setTo(''); };
  const pages = Math.max(1, Math.ceil(count / PAGE));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <History className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Activity Logs</h1>
          <p className="text-sm text-muted-foreground">Every addition, edit and deletion made in the admin panel. Logs cannot be changed or removed.</p>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-3 lg:grid-cols-6">
          <div className="lg:col-span-2 space-y-1">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="User, module, record…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>User</Label>
            <Select value={user} onValueChange={setUser}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Module</Label>
            <Select value={module} onValueChange={setModule}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {modules.map((m) => <SelectItem key={m} value={m}>{moduleLabel(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="insert">Added</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
                <SelectItem value="delete">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>
          </div>
          <div className="space-y-1">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
          <CardDescription>{count} record{count === 1 ? '' : 's'}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <p className="text-destructive">{error}</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No activity found</TableCell></TableRow>
                ) : logs.map((l) => {
                  const n = l.action === 'update' ? diffChanges(l.old_values, l.new_values).length : 0;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap">{new Date(l.created_at).toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <div className="font-medium">{l.actor_name || 'System'}</div>
                        <div className="text-xs text-muted-foreground">{l.actor_email}</div>
                      </TableCell>
                      <TableCell><Badge variant={actionVariant(l.action)}>{ACTION_LABEL[l.action] || l.action}</Badge></TableCell>
                      <TableCell>{moduleLabel(l.target_table)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {l.action === 'update' ? `${n} field${n === 1 ? '' : 's'} changed` : l.action === 'insert' ? 'New record' : 'Record removed'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(l)} aria-label="View details"><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page + 1} of {pages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pr-8"><DialogTitle>Activity Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">User:</span> {selected.actor_name || 'System'} {selected.actor_email && `(${selected.actor_email})`}</div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(selected.created_at).toLocaleString('en-IN')}</div>
                <div><span className="text-muted-foreground">Action:</span> {ACTION_LABEL[selected.action] || selected.action}</div>
                <div><span className="text-muted-foreground">Module:</span> {moduleLabel(selected.target_table)}</div>
                <div className="col-span-2 break-all"><span className="text-muted-foreground">Record:</span> {selected.record_key || '—'}</div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Field</TableHead><TableHead>Previous value</TableHead><TableHead>Updated value</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {changes.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No field changes recorded</TableCell></TableRow>
                  ) : changes.map((c) => (
                    <TableRow key={c.field}>
                      <TableCell className="font-medium align-top">{moduleLabel(c.field)}</TableCell>
                      <TableCell className="align-top"><pre className="whitespace-pre-wrap break-all text-xs text-destructive">{fmt(c.before)}</pre></TableCell>
                      <TableCell className="align-top"><pre className="whitespace-pre-wrap break-all text-xs text-primary">{fmt(c.after)}</pre></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActivityLogs;

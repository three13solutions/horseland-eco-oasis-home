import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Code2, Pencil, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { dedupeIntegrations, extractTrackingIds, normalizeCode, Placement, PLACEMENTS, PLATFORMS, platformLabel, WebsiteIntegration } from '@/lib/websiteIntegrations';

type Draft = Omit<WebsiteIntegration, 'id' | 'updated_at'> & { id?: string; pagesText: string };
const empty: Draft = { name: '', platform: 'custom', description: '', code: '', placement: 'head', target_mode: 'global', page_paths: [], is_active: true, sort_order: 0, pagesText: '' };
const table = () => supabase.from('website_integrations' as any);

export default function WebsiteIntegrations() {
  const [items, setItems] = useState<WebsiteIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<WebsiteIntegration | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await table().select('*').order('sort_order').order('created_at');
    if (error) toast.error(`Failed to load integrations: ${error.message}`);
    setItems(((data as any) || []) as WebsiteIntegration[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const loadedIds = new Set(dedupeIntegrations(items.filter((i) => i.is_active)).map((i) => i.id));

  const findDuplicate = (d: Draft) => {
    const c = normalizeCode(d.code);
    const ids = extractTrackingIds(d.code);
    return items.find((i) => i.id !== d.id && (normalizeCode(i.code) === c || extractTrackingIds(i.code).some((x) => ids.includes(x))));
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.code.trim()) return toast.error('Name and code are required');
    const page_paths = draft.pagesText.split(/[\n,]/).map((p) => p.trim()).filter(Boolean);
    if (draft.target_mode === 'specific' && !page_paths.length) return toast.error('Add at least one page, e.g. /booking');
    const dup = findDuplicate(draft);
    if (dup) return toast.error(`This code or tracking ID is already used by "${dup.name}". Edit that one instead.`);
    setSaving(true);
    const row = { name: draft.name.trim(), platform: draft.platform, description: draft.description?.trim() || null, code: draft.code, placement: draft.placement, target_mode: draft.target_mode, page_paths, is_active: draft.is_active, sort_order: Number(draft.sort_order) || 0 };
    const { error } = draft.id ? await table().update(row).eq('id', draft.id) : await table().insert(row);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(draft.id ? 'Integration updated' : 'Integration added');
    setDraft(null);
    load();
  };

  const toggle = async (i: WebsiteIntegration, v: boolean) => {
    const { error } = await table().update({ is_active: v }).eq('id', i.id);
    if (error) return toast.error(error.message);
    toast.success(v ? 'Integration enabled' : 'Integration disabled');
    load();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await table().delete().eq('id', toDelete.id);
    if (error) toast.error(error.message); else toast.success('Integration deleted');
    setToDelete(null);
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Settings</p>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-2"><Code2 className="h-7 w-7" /> Website Integrations</h1>
          <p className="text-muted-foreground mt-1">Manage meta tags, verification codes, tracking pixels and third-party scripts.</p>
        </div>
        <Button onClick={() => setDraft({ ...empty })}><Plus className="h-4 w-4 mr-2" />Add Integration</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Active integrations load automatically on public pages (never in the admin panel). Duplicate code or tracking IDs are skipped.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading…</p> : items.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No integrations yet. Click “Add Integration” to paste your first code.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Platform</TableHead><TableHead>Placement</TableHead><TableHead>Pages</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="font-medium">{i.name}</div>
                      {i.description && <div className="text-xs text-muted-foreground">{i.description}</div>}
                      {i.is_active && !loadedIds.has(i.id) && <div className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertTriangle className="h-3 w-3" />Skipped: duplicate of another integration</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{platformLabel(i.platform)}</Badge></TableCell>
                    <TableCell className="text-sm">{PLACEMENTS.find((p) => p.value === i.placement)?.label}</TableCell>
                    <TableCell className="text-sm">{i.target_mode === 'global' ? 'All pages' : i.page_paths.join(', ')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={i.is_active} onCheckedChange={(v) => toggle(i, v)} aria-label="Active" />
                        <Badge variant={i.is_active ? 'default' : 'secondary'}>{i.is_active ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => setDraft({ ...i, description: i.description || '', pagesText: (i.page_paths || []).join('\n') })}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => setToDelete(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{draft?.id ? 'Edit Integration' : 'Add Integration'}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Meta Pixel – Main" /></div>
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={draft.platform} onValueChange={(v) => setDraft({ ...draft, platform: v, placement: draft.id ? draft.placement : (PLATFORMS.find((p) => p.value === v)?.placement as Placement) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Input value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What this code is for" /></div>
              <div className="space-y-2">
                <Label>Code (HTML meta tags / JavaScript)</Label>
                <Textarea value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} spellCheck={false} rows={12} className="font-mono text-xs bg-muted/40" placeholder={'<meta name="google-site-verification" content="..." />\n<script>...</script>'} />
              </div>
              <div className="space-y-2">
                <Label>Placement</Label>
                <RadioGroup value={draft.placement} onValueChange={(v) => setDraft({ ...draft, placement: v as Placement })} className="grid sm:grid-cols-3 gap-2">
                  {PLACEMENTS.map((p) => (
                    <label key={p.value} className="flex items-center gap-2 rounded-md border p-3 cursor-pointer text-sm"><RadioGroupItem value={p.value} />{p.label}</label>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Apply to</Label>
                <RadioGroup value={draft.target_mode} onValueChange={(v) => setDraft({ ...draft, target_mode: v as any })} className="grid sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer text-sm"><RadioGroupItem value="global" />All pages (global)</label>
                  <label className="flex items-center gap-2 rounded-md border p-3 cursor-pointer text-sm"><RadioGroupItem value="specific" />Specific pages</label>
                </RadioGroup>
                {draft.target_mode === 'specific' && (
                  <>
                    <Textarea rows={3} value={draft.pagesText} onChange={(e) => setDraft({ ...draft, pagesText: e.target.value })} className="font-mono text-xs" placeholder={'/booking\n/stay/*'} />
                    <p className="text-xs text-muted-foreground">One page per line. Use * for a page and everything under it, e.g. /stay/* covers all room pages.</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3"><Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} /><span className="text-sm">{draft.is_active ? 'Active' : 'Inactive'}</span></div>
              <p className="text-xs text-muted-foreground">Note: Google Search Console and Facebook domain verification check the page before scripts run. If verification by meta tag fails, use the platform's DNS or file verification option instead.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>This code will stop loading on the website. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

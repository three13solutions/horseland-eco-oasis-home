import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Receipt, MessageCircle, MessageSquare, Plus, Save, Trash2, Star, Clock, type LucideIcon } from 'lucide-react';

const db = supabase as any;

export type TemplateModuleKey = 'invoice' | 'receipt' | 'whatsapp' | 'sms';

type SettingField = { key: string; label: string; type: 'text' | 'switch'; placeholder?: string; help?: string };

const SAMPLE: Record<string, string> = {
  guest_name: 'Priya Sharma', guest_email: 'priya@example.com', guest_phone: '+91 98765 43210',
  booking_id: 'HL-SAMPLE123', room_type: 'Deluxe', check_in: '10 Dec 2026', check_out: '12 Dec 2026',
  nights: '2', guests: '2', meal_plan: 'ROOM ONLY', subtotal: '₹4,777.30', gst_amount: '₹573.30',
  total_amount: '₹5,350.60', amount_paid: '₹5,350.60', payment_id: 'pay_SAMPLE', payment_date: '01 Nov 2026',
  invoice_number: 'INV-261101-0001', receipt_number: 'RCPT-0001',
};

const COMMON = ['guest_name', 'guest_email', 'guest_phone', 'booking_id', 'room_type', 'check_in', 'check_out', 'nights', 'guests', 'total_amount'];

const CONFIG: Record<TemplateModuleKey, { title: string; description: string; icon: LucideIcon; html: boolean; subject: boolean; placeholders: string[]; settings: SettingField[]; charLimit?: number; comingSoon?: boolean }> = {
  invoice: {
    title: 'Invoice Templates', description: 'Layouts used for guest tax invoices', icon: FileText, html: true, subject: true,
    placeholders: ['invoice_number', ...COMMON, 'meal_plan', 'subtotal', 'gst_amount'],
    settings: [
      { key: 'prefix', label: 'Invoice Number Prefix', type: 'text', placeholder: 'INV' },
      { key: 'footer_note', label: 'Footer Note', type: 'text', placeholder: 'Thank you for staying with us.' },
      { key: 'show_logo', label: 'Show hotel logo', type: 'switch' },
      { key: 'show_gst', label: 'Show GST breakdown', type: 'switch' },
    ],
  },
  receipt: {
    title: 'Receipt Templates', description: 'Payment receipts issued to guests', icon: Receipt, html: true, subject: true,
    placeholders: ['receipt_number', ...COMMON, 'amount_paid', 'payment_id', 'payment_date'],
    settings: [
      { key: 'prefix', label: 'Receipt Number Prefix', type: 'text', placeholder: 'RCPT' },
      { key: 'footer_note', label: 'Footer Note', type: 'text', placeholder: 'This is a computer-generated receipt.' },
      { key: 'show_logo', label: 'Show hotel logo', type: 'switch' },
    ],
  },
  whatsapp: {
    title: 'WhatsApp Templates', description: 'Messages sent to guests on WhatsApp', icon: MessageCircle, html: false, subject: false,
    placeholders: [...COMMON, 'payment_id'], charLimit: 1024, comingSoon: true,
    settings: [
      { key: 'business_number', label: 'WhatsApp Business Number', type: 'text', placeholder: '+91 88791 92885' },
      { key: 'enabled', label: 'Enable WhatsApp messages', type: 'switch', help: 'Requires a WhatsApp Business provider to be connected before messages are actually sent.' },
      { key: 'send_on_booking', label: 'Send after successful booking', type: 'switch' },
    ],
  },
  sms: {
    title: 'SMS Templates', description: 'Text messages sent to guests', icon: MessageSquare, html: false, subject: false,
    placeholders: [...COMMON], charLimit: 160, comingSoon: true,
    settings: [
      { key: 'sender_id', label: 'Sender ID', type: 'text', placeholder: 'HRSLND', help: '6-character DLT-registered sender ID.' },
      { key: 'dlt_entity_id', label: 'DLT Entity ID', type: 'text', placeholder: 'Optional' },
      { key: 'enabled', label: 'Enable SMS messages', type: 'switch', help: 'Requires an SMS provider to be connected before messages are actually sent.' },
      { key: 'send_on_booking', label: 'Send after successful booking', type: 'switch' },
    ],
  },
};

const fill = (t: string) => (t || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => SAMPLE[k] ?? '');

const TemplateModule = ({ module }: { module: TemplateModuleKey }) => {
  const cfg = CONFIG[module];
  const Icon = cfg.icon;
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [activeId, setActiveId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async (selectId?: string) => {
    const [{ data: t, error }, { data: s }] = await Promise.all([
      db.from('message_templates').select('*').eq('module', module).order('created_at'),
      db.from('template_module_settings').select('*').eq('module', module).maybeSingle(),
    ]);
    if (error) toast({ title: 'Could not load templates', description: error.message, variant: 'destructive' });
    setTemplates(t ?? []);
    setSettings(s?.settings ?? {});
    setActiveId(selectId ?? t?.[0]?.id ?? '');
    setLoading(false);
  };

  useEffect(() => { setLoading(true); load(); }, [module]);

  const active = templates.find((t) => t.id === activeId);
  const updateTpl = (patch: any) => setTemplates((ts) => ts.map((t) => (t.id === activeId ? { ...t, ...patch } : t)));
  const preview = useMemo(() => (active && cfg.html ? DOMPurify.sanitize(`<div style="font-family:Arial,sans-serif;padding:24px">${fill(active.body)}</div>`) : ''), [active, cfg.html]);

  const done = (error: any, ok: string) => toast(error ? { title: 'Could not save', description: error.message, variant: 'destructive' } : { title: ok });

  const createTemplate = async () => {
    const { data, error } = await db.from('message_templates').insert({ module, name: 'New Template', subject: cfg.subject ? cfg.title.replace(' Templates', '') : null, body: '', is_default: templates.length === 0 }).select().single();
    if (error) return done(error, '');
    await load(data.id);
  };

  const saveTemplate = async () => {
    if (!active) return;
    if (!active.name?.trim()) return toast({ title: 'Template name is required', variant: 'destructive' });
    setSaving(true);
    const { error } = await db.from('message_templates').update({ name: active.name, subject: active.subject, body: active.body, is_active: active.is_active, updated_at: new Date().toISOString() }).eq('id', active.id);
    setSaving(false);
    done(error, 'Template saved');
  };

  const makeDefault = async () => {
    if (!active) return;
    await db.from('message_templates').update({ is_default: false }).eq('module', module).neq('id', active.id);
    const { error } = await db.from('message_templates').update({ is_default: true }).eq('id', active.id);
    done(error, 'Set as default');
    load(active.id);
  };

  const deleteTemplate = async () => {
    if (!active || !confirm(`Delete "${active.name}"?`)) return;
    const { error } = await db.from('message_templates').delete().eq('id', active.id);
    if (error) return done(error, '');
    toast({ title: 'Template deleted' });
    load();
  };

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await db.from('template_module_settings').upsert({ module, settings, updated_at: new Date().toISOString() });
    setSaving(false);
    done(error, 'Settings saved');
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const len = active?.body?.length ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{cfg.title}</h1>
          <p className="text-muted-foreground text-sm">{cfg.description}</p>
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {cfg.comingSoon ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <Clock className="h-10 w-10 text-muted-foreground" />
                <p className="text-lg font-medium">Coming Soon</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  {cfg.title.replace(' Templates', '')} template editing will be available in a future update. In the meantime, you can adjust settings under the Configuration tab.
                </p>
              </CardContent>
            </Card>
          ) : (
          <>

            {templates.map((t) => (
              <Button key={t.id} variant={t.id === activeId ? 'default' : 'outline'} size="sm" onClick={() => setActiveId(t.id)}>
                {t.is_default && <Star className="h-3 w-3 mr-1 fill-current" />}{t.name}
              </Button>
            ))}
            <Button size="sm" variant="secondary" onClick={createTemplate}><Plus className="h-4 w-4 mr-1" />New Template</Button>
          </div>

          {!active ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No templates yet. Create one to get started.</CardContent></Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">Edit Template</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={active.is_active ? 'default' : 'secondary'}>{active.is_active ? 'Active' : 'Inactive'}</Badge>
                    <Switch checked={active.is_active} onCheckedChange={(v) => updateTpl({ is_active: v })} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5"><Label>Template Name</Label><Input value={active.name} onChange={(e) => updateTpl({ name: e.target.value })} /></div>
                  {cfg.subject && <div className="space-y-1.5"><Label>Title</Label><Input value={active.subject ?? ''} onChange={(e) => updateTpl({ subject: e.target.value })} /></div>}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label>{cfg.html ? 'Body (HTML)' : 'Message'}</Label>
                      {cfg.charLimit && <span className={`text-xs ${len > cfg.charLimit ? 'text-destructive' : 'text-muted-foreground'}`}>{len}/{cfg.charLimit}{module === 'sms' && ` · ${Math.max(1, Math.ceil(len / 160))} SMS`}</span>}
                    </div>
                    <Textarea className={`${cfg.html ? 'font-mono text-xs min-h-[360px]' : 'min-h-[200px]'}`} value={active.body} onChange={(e) => updateTpl({ body: e.target.value })} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Available placeholders:</p>
                    <div className="flex flex-wrap gap-1">
                      {cfg.placeholders.map((p) => <code key={p} className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{${p}}}`}</code>)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={saveTemplate} disabled={saving}><Save className="h-4 w-4 mr-2" />Save Template</Button>
                    {!active.is_default && <Button variant="outline" onClick={makeDefault}><Star className="h-4 w-4 mr-2" />Set as Default</Button>}
                    <Button variant="outline" className="text-destructive" onClick={deleteTemplate}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preview</CardTitle>
                  <CardDescription>Shown with sample guest details{cfg.subject && active.subject ? ` · ${fill(active.subject)}` : ''}</CardDescription>
                </CardHeader>
                <CardContent>
                  {cfg.html ? (
                    <iframe title="Template preview" sandbox="" srcDoc={preview} className="w-full h-[600px] rounded-md border bg-background" />
                  ) : (
                    <div className="rounded-xl bg-muted p-4 min-h-[200px]">
                      <div className="max-w-[85%] rounded-lg bg-card border p-3 text-sm whitespace-pre-wrap shadow-sm">{fill(active.body) || <span className="text-muted-foreground">Empty message</span>}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          </>
          )}
        </TabsContent>


        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>{cfg.title.replace(' Templates', '')} Settings</CardTitle>
              <CardDescription>Settings that apply to all {cfg.title.toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              {cfg.settings.map((f) => f.type === 'text' ? (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input id={f.key} placeholder={f.placeholder} value={settings[f.key] ?? ''} onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })} />
                  {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
                </div>
              ) : (
                <div key={f.key} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium text-sm">{f.label}</p>
                    {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
                  </div>
                  <Switch checked={!!settings[f.key]} onCheckedChange={(v) => setSettings({ ...settings, [f.key]: v })} />
                </div>
              ))}
              <Button onClick={saveSettings} disabled={saving}><Save className="h-4 w-4 mr-2" />Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TemplateModule;

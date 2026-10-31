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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EMAIL_PLACEHOLDERS, EMAIL_TRIGGERS } from '../../../supabase/functions/_shared/guestEmail';
import { useToast } from '@/hooks/use-toast';
import { Mail, Save } from 'lucide-react';

const db = supabase as any;

const PLACEHOLDERS = EMAIL_PLACEHOLDERS;
const SAMPLE: Record<string, string> = {
  guest_name: 'Priya Sharma', guest_email: 'priya@example.com', guest_phone: '+91 98765 43210',
  booking_id: 'HL-SAMPLE123', room_type: 'Deluxe', check_in: '10 Dec 2026', check_out: '12 Dec 2026',
  nights: '2', guests: '2', meal_plan: 'ROOM ONLY', gst_amount: '₹573.30', total_amount: '₹5,350.60', payment_id: 'pay_SAMPLE',
  payment_amount: '₹5,350.60', refund_amount: '₹5,350.60', payment_order_id: 'order_SAMPLE',
};
const fill = (t: string) => t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => SAMPLE[k] ?? '');

const EmailSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: s, error: se }, { data: t, error: te }] = await Promise.all([
        db.from('email_settings').select('*').limit(1).maybeSingle(),
        db.from('email_templates').select('*').order('name'),
      ]);
      if (se || te) { setLoadError((se || te)?.message || 'Unable to load email templates'); return; }
      setSettings(s ?? { from_name: 'Horseland Hotel', from_email: '', reply_to: '', admin_notification_email: '', send_booking_confirmation: true });
      setTemplates(t ?? []);
      if (t?.[0]) setActiveId(t[0].id);
    })();
  }, []);

  const active = templates.find((t) => t.id === activeId);
  const preview = useMemo(() => (active ? DOMPurify.sanitize(fill(active.html_body), { WHOLE_DOCUMENT: true }) : ''), [active]);
  const updateTpl = (patch: any) => setTemplates((ts) => ts.map((t) => (t.id === activeId ? { ...t, ...patch } : t)));

  const saveSettings = async () => {
    setSaving(true);
    const payload = { ...settings, updated_at: new Date().toISOString() };
    const { error } = settings.id
      ? await db.from('email_settings').update(payload).eq('id', settings.id)
      : await db.from('email_settings').insert(payload);
    setSaving(false);
    toast(error ? { title: 'Could not save', description: error.message, variant: 'destructive' } : { title: 'Email settings saved' });
  };

  const saveTemplate = async () => {
    if (!active) return;
    if (!active.subject.trim() || !active.html_body.trim() || !Number.isInteger(active.offset_hours) || active.offset_hours < 0 || active.offset_hours > 8760) {
      toast({ title: 'Check template details', description: 'Subject and body are required. Timing must be a whole number from 0 to 8760 hours.', variant: 'destructive' }); return;
    }
    setSaving(true);
    const { error } = await db.from('email_templates').update({
      name: active.name, subject: active.subject, html_body: active.html_body, is_active: active.is_active,
      trigger_event: active.trigger_event, trigger_enabled: active.trigger_enabled, offset_hours: active.offset_hours, updated_at: new Date().toISOString(),
    }).eq('id', active.id);
    setSaving(false);
    toast(error ? { title: 'Could not save', description: error.message, variant: 'destructive' } : { title: 'Template saved' });
  };

  if (loadError) return <div className="p-6 text-destructive" role="alert">{loadError}</div>;
  if (!settings) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground text-sm">Sender configuration and guest email templates</p>
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Sender Configuration</CardTitle>
              <CardDescription>The sender email must belong to a domain verified in Resend, otherwise guests will not receive emails.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              {[
                ['from_name', 'Sender Name', 'Horseland Hotel'],
                ['from_email', 'Sender Email', 'bookings@yourdomain.com'],
                ['reply_to', 'Reply-To Email', 'reservations@yourdomain.com'],
                ['admin_notification_email', 'Send a copy of every booking email to', 'manager@yourdomain.com'],
              ].map(([key, label, ph]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key}>{label}</Label>
                  <Input id={key} placeholder={ph} value={settings[key] ?? ''} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
                </div>
              ))}
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium text-sm">Send booking confirmation emails</p>
                  <p className="text-xs text-muted-foreground">Automatically email guests after successful payment</p>
                </div>
                <Switch checked={settings.send_booking_confirmation} onCheckedChange={(v) => setSettings({ ...settings, send_booking_confirmation: v })} />
              </div>
              <Button onClick={saveSettings} disabled={saving}><Save className="h-4 w-4 mr-2" />Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="max-w-xl space-y-1.5">
            <Label htmlFor="email-category">Email Category</Label>
            <Select value={activeId} onValueChange={setActiveId}>
              <SelectTrigger id="email-category"><SelectValue placeholder="Select email category" /></SelectTrigger>
              <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {active && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">Edit Template</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={active.is_active ? 'default' : 'secondary'}>{active.is_active ? 'Enabled' : 'Disabled'}</Badge>
                    <Switch aria-label="Enable email template" checked={active.is_active} onCheckedChange={(v) => updateTpl({ is_active: v })} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5"><Label>Template Name</Label><Input value={active.name} onChange={(e) => updateTpl({ name: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Subject</Label><Input value={active.subject} onChange={(e) => updateTpl({ subject: e.target.value })} /></div>
                  <fieldset className="space-y-3 border-t pt-4">
                    <legend className="font-medium text-sm">Automatic Sending</legend>
                    <div className="flex items-center justify-between gap-3"><Label htmlFor="automatic-email">Send automatically</Label><Switch id="automatic-email" checked={active.trigger_enabled} onCheckedChange={v => updateTpl({ trigger_enabled: v })} /></div>
                    <div className="space-y-1.5"><Label htmlFor="email-event">When</Label>
                      <Select value={active.trigger_event} onValueChange={v => updateTpl({ trigger_event: v })} disabled={!active.trigger_enabled}>
                        <SelectTrigger id="email-event"><SelectValue /></SelectTrigger><SelectContent>{EMAIL_TRIGGERS.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label htmlFor="email-offset">{active.trigger_event.startsWith('before_') ? 'Hours before date' : active.trigger_event === 'after_check_out' ? 'Hours after date' : 'Delay after event (hours)'}</Label>
                      <Input id="email-offset" type="number" min={0} max={8760} step={1} disabled={!active.trigger_enabled} value={active.offset_hours} onChange={e => updateTpl({ offset_hours: Number(e.target.value) })} />
                    </div>
                    <p className="text-xs text-muted-foreground">Date reminders use midnight, India time. Scheduled emails are checked hourly. Failed emails retry up to three attempts.</p>
                  </fieldset>
                  <div className="space-y-1.5">
                    <Label>Email Body (HTML)</Label>
                    <Textarea className="font-mono text-xs min-h-[360px]" value={active.html_body} onChange={(e) => updateTpl({ html_body: e.target.value })} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Available placeholders:</p>
                    <div className="flex flex-wrap gap-1">
                      {PLACEHOLDERS.map((p) => <code key={p} className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{${p}}}`}</code>)}
                    </div>
                  </div>
                  <Button onClick={saveTemplate} disabled={saving}><Save className="h-4 w-4 mr-2" />Save Template</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preview</CardTitle>
                  <CardDescription>Subject: {fill(active.subject)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <iframe title="Email preview" sandbox="" srcDoc={preview} className="w-full h-[720px] rounded-md border bg-background" />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailSettings;

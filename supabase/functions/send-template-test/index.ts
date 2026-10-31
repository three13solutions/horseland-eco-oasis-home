import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { renderEmailTest, validateEmailTest } from '../_shared/guestEmailTest.ts';

serve(async (req) => {
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return respond({});
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return respond({ error: 'Email service is not configured' }, 503);
  const authorization = req.headers.get('Authorization') || '';
  if (!/^Bearer\s+\S+$/i.test(authorization)) return respond({ error: 'Sign in to send a test email' }, 401);
  try {
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await caller.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
    if (authError || !user) return respond({ error: 'Sign in to send a test email' }, 401);
    const { data: admin, error: roleError } = await caller.rpc('is_admin_new');
    if (roleError || admin !== true) return respond({ error: 'Administrator access required' }, 403);
    let input: unknown;
    try { input = await req.json(); } catch { return respond({ error: 'Invalid test email details' }, 400); }
    if (!validateEmailTest(input)) return respond({ error: 'A valid recipient, template, subject and email body are required' }, 400);
    const { data: template, error: templateError } = await caller.from('email_templates').select('id').eq('id', input.template_id).maybeSingle();
    if (templateError || !template) return respond({ error: 'Template not found' }, 404);
    const { data: settings, error: settingsError } = await caller.from('email_settings').select('from_name,from_email,reply_to').limit(1).maybeSingle();
    if (settingsError) return respond({ error: 'Could not read sender settings' }, 500);
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) return respond({ error: 'Resend is not configured' }, 503);
    const content = renderEmailTest(input.subject, input.html_body);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${settings?.from_name || 'Horseland Hotel'} <${settings?.from_email || 'onboarding@resend.dev'}>`,
        to: [input.to], ...(settings?.reply_to ? { reply_to: settings.reply_to } : {}), ...content }),
    });
    if (!response.ok) {
      const details = await response.text();
      console.error(`Resend test email failed [${response.status}]: ${details}`);
      return respond({ error: 'Resend rejected the test email', status: response.status, details }, response.status);
    }
    const result = await response.json();
    return respond({ success: true, provider_id: result.id });
  } catch (error) {
    console.error('Template test email failed:', error instanceof Error ? error.message : 'Unknown error');
    return respond({ error: 'Could not send test email. Please try again.' }, 500);
  }
});
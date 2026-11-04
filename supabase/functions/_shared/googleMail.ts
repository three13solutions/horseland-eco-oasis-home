export function encodeBase64(value: string): string {
  return btoa(Array.from(new TextEncoder().encode(value), byte => String.fromCharCode(byte)).join(''));
}

const safeHeader = (value: string) => {
  if (/[\r\n]/.test(value)) throw new Error('Invalid email header');
  return value;
};
const header = (value: string) => `=?UTF-8?B?${encodeBase64(safeHeader(value))}?=`;
const address = (value: string) => {
  if (!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value)) throw new Error('Invalid email address');
  return value;
};

export function createGoogleEmail(input: { from: string; name: string; to: string; subject: string; html: string; replyTo?: string; bcc?: string; eventId?: string }): string {
  const lines = [`From: ${header(input.name)} <${address(input.from)}>`, `To: ${address(input.to)}`, `Subject: ${header(input.subject)}`];
  if (input.replyTo) lines.push(`Reply-To: ${address(input.replyTo)}`);
  if (input.bcc) lines.push(`Bcc: ${address(input.bcc)}`);
  if (input.eventId) lines.push(`Message-ID: <horseland-${safeHeader(input.eventId)}@${input.from.split('@')[1]}>`);
  lines.push('MIME-Version: 1.0', 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', encodeBase64(input.html).match(/.{1,76}/g)?.join('\r\n') || '');
  return encodeBase64(lines.join('\r\n')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export class GoogleMailError extends Error {
  constructor(public status: number, public details: string) { super(`Google email failed [${status}]: ${details}`); }
}

export async function sendGoogleEmail(input: { name: string; to: string; subject: string; html: string; replyTo?: string; bcc?: string; eventId?: string }) {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  const connectionKey = Deno.env.get('GOOGLE_MAIL_API_KEY');
  if (!apiKey || !connectionKey) throw new GoogleMailError(503, 'Google Workspace email is not configured');
  const base = 'https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me';
  const headers = { Authorization: `Bearer ${apiKey}`, 'X-Connection-Api-Key': connectionKey, 'Content-Type': 'application/json' };
  const request = async (path: string, options?: RequestInit) => {
    const response = await fetch(`${base}${path}`, { ...options, headers });
    if (!response.ok) {
      const details = await response.text();
      console.error(`Google email failed [${response.status}]: ${details}`);
      throw new GoogleMailError(response.status, details);
    }
    return response.json();
  };
  const profile = await request('/profile');
  if (input.eventId) {
    const query = `in:sent rfc822msgid:horseland-${input.eventId}@${profile.emailAddress.split('@')[1]}`;
    const existing = await request(`/messages?maxResults=1&q=${encodeURIComponent(query)}`);
    if (existing.messages?.[0]?.id) return { id: existing.messages[0].id, from: profile.emailAddress };
  }
  const result = await request('/messages/send', { method: 'POST', body: JSON.stringify({ raw: createGoogleEmail({ ...input, from: profile.emailAddress }) }) });
  if (!result.id) throw new GoogleMailError(502, 'Google returned no message ID');
  return { id: result.id, from: profile.emailAddress };
}
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';

const LOGO = '/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png';
const esc = (v: unknown) => DOMPurify.sanitize(String(v ?? ''), { ALLOWED_TAGS: [] });
const inr = (n: unknown) => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
// Temporary live-test promo. Remove with the HLTEST1 code.
const PROMO_CODE = 'HLTEST1';

export async function buildInvoiceHtml(invoiceId: string): Promise<string> {
  const { data: inv, error } = await supabase
    .from('invoices')
    .select('*, bookings(*, room_types(name, room_categories(name)), room_units(unit_number)), payments(*)')
    .eq('id', invoiceId)
    .single();
  if (error || !inv) throw error ?? new Error('Invoice not found');
  const b: any = (inv as any).bookings ?? {};
  const pays: any[] = (inv as any).payments ?? [];
  const quote: any = b.rate_breakdown?.validated_quote ?? {};
  const fullTotal = Number(quote.total_amount ?? inv.total_amount);
  const charged = Number(inv.total_amount);
  const discount = Math.max(0, +(fullTotal - charged).toFixed(2));
  const nights = b.check_in && b.check_out ? Math.round((+new Date(b.check_out) - +new Date(b.check_in)) / 86400000) : 0;
  const subtotal = Number(quote.subtotal ?? inv.subtotal_amount);
  const tax = Number(quote.tax_amount ?? inv.gst_amount);
  const taxRate = quote.tax_rate ? `${Math.round(quote.tax_rate * 100)}%` : '';
  const paid = pays.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0) || Number(inv.paid_amount);

  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(inv.invoice_number)}</title>
<style>
@page{size:A4;margin:14mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Georgia,'Times New Roman',serif;color:#2b2420;margin:0;padding:24px;font-size:13px}
.wrap{max-width:780px;margin:auto}.head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #6b4a2b;padding-bottom:14px}
.brand{display:flex;gap:12px;align-items:center}.brand img{height:64px}.brand h1{margin:0;font-size:22px;color:#6b4a2b}.brand p{margin:2px 0 0;font-size:11px;color:#7a6a5c}
.title{text-align:right}.title h2{margin:0;font-size:26px;letter-spacing:2px;color:#6b4a2b}.title p{margin:2px 0}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:18px 0}.box{border:1px solid #e3d8cc;border-radius:6px;padding:12px}
.box h3{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8a7360}.box p{margin:3px 0}
table{width:100%;border-collapse:collapse;margin-top:6px}th{background:#f3ece4;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
th,td{padding:8px 10px;border-bottom:1px solid #eadfd3}td.r,th.r{text-align:right}.tot td{border:none;padding:4px 10px}.grand td{font-size:15px;font-weight:bold;border-top:2px solid #6b4a2b}
.promo{color:#1f7a3a}.badge{display:inline-block;padding:2px 8px;border-radius:10px;background:#e3f3e7;color:#1f7a3a;font-size:11px;font-weight:bold}
.foot{margin-top:28px;font-size:11px;color:#7a6a5c;text-align:center;border-top:1px solid #e3d8cc;padding-top:10px}
.bar{text-align:center;margin-bottom:16px}.bar button{padding:8px 18px;font-size:14px;cursor:pointer}@media print{.bar{display:none}}
</style></head><body><div class="wrap">
<div class="bar"><button onclick="window.print()">Download / Print PDF</button></div>
<div class="head"><div class="brand"><img src="${location.origin}${LOGO}" alt="Horseland Hotel"><div><h1>Horseland Hotel &amp; Mountain Spa</h1><p>Vitthalrao Kotwal Road, Matheran, Maharashtra 410102, India</p><p>+91 88791 92885 · GSTIN: 27AAACH5543C1ZX</p></div></div>
<div class="title"><h2>INVOICE</h2><p><b>${esc(inv.invoice_number)}</b></p><p>Date: ${date(inv.invoice_date ?? inv.created_at)}</p><p><span class="badge">${esc(String(inv.status).toUpperCase())}</span></p></div></div>
<div class="grid">
<div class="box"><h3>Billed To</h3><p><b>${esc(b.guest_name)}</b></p><p>${esc(b.guest_email)}</p><p>${esc(b.guest_phone)}</p></div>
<div class="box"><h3>Booking Details</h3><p>Booking ID: <b>${esc(b.booking_id)}</b></p><p>Check-in: ${date(b.check_in)} · Check-out: ${date(b.check_out)}</p><p>Nights: ${nights} · Guests: ${esc(b.guests_count)}</p></div>
</div>
<table><thead><tr><th>Description</th><th>Room Category</th><th class="r">Nights</th><th class="r">Amount</th></tr></thead><tbody>
<tr><td>${esc(b.room_types?.name ?? 'Accommodation')}${b.room_units?.unit_number ? ` – Room ${esc(b.room_units.unit_number)}` : ''}<br><small>${esc(quote.variant?.meal_plan_name ?? b.meal_plan_code ?? '')}${quote.variant?.cancellation_policy_name ? ' · ' + esc(quote.variant.cancellation_policy_name) : ''}</small></td>
<td>${esc(b.room_types?.room_categories?.name ?? '—')}</td><td class="r">${nights}</td><td class="r">${inr(subtotal)}</td></tr>
</tbody></table>
<table class="tot"><tbody>
<tr><td class="r" style="width:75%">Subtotal</td><td class="r">${inr(subtotal)}</td></tr>
<tr><td class="r">GST ${taxRate}</td><td class="r">${inr(tax)}</td></tr>
<tr><td class="r">Total</td><td class="r">${inr(subtotal + tax)}</td></tr>
${discount > 0 ? `<tr class="promo"><td class="r">Promo code applied: <b>${PROMO_CODE}</b></td><td class="r">− ${inr(discount)}</td></tr>` : ''}
<tr class="grand"><td class="r">Amount Payable</td><td class="r">${inr(charged)}</td></tr>
<tr><td class="r">Amount Paid</td><td class="r">${inr(paid)}</td></tr>
<tr><td class="r">Balance Due</td><td class="r">${inr(Math.max(0, charged - paid))}</td></tr>
</tbody></table>
<div class="box" style="margin-top:16px"><h3>Payment Information</h3>
${pays.length ? pays.map(p => `<p>${esc(String(p.payment_method).toUpperCase())} · ${inr(p.amount)} · ${esc(p.status)} · ${date(p.payment_date ?? p.created_at)}<br>Payment ID: ${esc(p.razorpay_payment_id ?? p.transaction_reference)} · Order ID: ${esc(p.razorpay_order_id)}</p>`).join('') : '<p>No payments recorded.</p>'}
</div>
<div class="foot">Thank you for choosing Horseland Hotel &amp; Mountain Spa. This is a computer-generated invoice.</div>
</div></body></html>`;
}

/** Opens the invoice in a new tab; call synchronously from a click so popups aren't blocked. */
export function openInvoice(invoiceId: string, print = false) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write('<p style="font-family:sans-serif;padding:24px">Preparing invoice…</p>');
  buildInvoiceHtml(invoiceId).then(html => {
    w.document.open(); w.document.write(html); w.document.close();
    if (print) w.onload = () => setTimeout(() => w.print(), 300);
  }).catch(e => { w.document.body.innerHTML = `<p style="font-family:sans-serif;padding:24px">Could not load invoice: ${esc(e?.message)}</p>`; });
}

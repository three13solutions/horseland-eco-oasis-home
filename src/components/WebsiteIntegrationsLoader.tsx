import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { appliesTo, dedupeIntegrations, extractTrackingIds, normalizeCode, WebsiteIntegration } from '@/lib/websiteIntegrations';

const ATTR = 'data-website-integration';

/** True if the tracking ID already runs from a script we didn't add (e.g. index.html). */
const idAlreadyOnPage = (ids: string[]) =>
  ids.some((id) => {
    const raw = id.startsWith('fb:') ? id.slice(3) : id;
    return Array.from(document.querySelectorAll(`script:not([${ATTR}])`)).some(
      (s) => (s.textContent || '').includes(raw) || (s.getAttribute('src') || '').includes(raw),
    );
  });

function inject(i: WebsiteIntegration) {
  const key = `${i.id}:${i.updated_at || ''}`;
  if (document.querySelector(`[${ATTR}="${CSS.escape(key)}"]`)) return;
  if (idAlreadyOnPage(extractTrackingIds(i.code))) return;
  const tpl = document.createElement('template');
  tpl.innerHTML = i.code;
  const nodes: Node[] = [];
  tpl.content.childNodes.forEach((n) => {
    if (n.nodeType === Node.COMMENT_NODE || (n.nodeType === Node.TEXT_NODE && !n.textContent?.trim())) return;
    if (n instanceof HTMLScriptElement) {
      const src = n.getAttribute('src');
      if (src && document.querySelector(`script[src="${CSS.escape(src)}"]`)) return;
      const s = document.createElement('script');
      Array.from(n.attributes).forEach((a) => s.setAttribute(a.name, a.value));
      s.text = n.text;
      nodes.push(s);
    } else if (n instanceof HTMLMetaElement) {
      const k = n.getAttribute('name') ? 'name' : n.getAttribute('property') ? 'property' : null;
      if (k && document.querySelector(`meta[${k}="${CSS.escape(n.getAttribute(k)!)}"][content="${CSS.escape(n.content)}"]`)) return;
      nodes.push(n.cloneNode(true));
    } else {
      nodes.push(document.importNode(n, true));
    }
  });
  nodes.forEach((n) => {
    if (n instanceof Element) n.setAttribute(ATTR, key);
    if (i.placement === 'head') document.head.appendChild(n);
    else if (i.placement === 'body_start') document.body.insertBefore(n, document.body.firstChild);
    else document.body.appendChild(n);
  });
}

export default function WebsiteIntegrationsLoader() {
  const { pathname } = useLocation();
  const [items, setItems] = useState<WebsiteIntegration[] | null>(null);

  useEffect(() => {
    supabase
      .from('website_integrations' as any)
      .select('id,name,platform,description,code,placement,target_mode,page_paths,is_active,sort_order,updated_at')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at')
      .then(({ data, error }) => {
        if (error) console.warn('Website integrations not loaded:', error.message);
        setItems(dedupeIntegrations(((data as any) || []) as WebsiteIntegration[]));
      });
  }, []);

  useEffect(() => {
    if (!items) return;
    const wanted = items.filter((i) => appliesTo(i, pathname));
    const keep = new Set(wanted.map((i) => `${i.id}:${i.updated_at || ''}`));
    // Remove page-specific snippets that don't belong on this page.
    document.querySelectorAll(`[${ATTR}]`).forEach((el) => {
      if (!keep.has(el.getAttribute(ATTR)!)) el.remove();
    });
    const seen = new Set<string>();
    wanted.forEach((i) => {
      const c = normalizeCode(i.code);
      if (seen.has(c)) return;
      seen.add(c);
      try { inject(i); } catch (e) { console.warn(`Integration "${i.name}" failed to load`, e); }
    });
  }, [items, pathname]);

  return null;
}

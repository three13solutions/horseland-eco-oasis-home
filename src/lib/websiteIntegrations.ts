export type Placement = 'head' | 'body_start' | 'body_end';
export interface WebsiteIntegration {
  id: string;
  name: string;
  platform: string;
  description: string | null;
  code: string;
  placement: Placement;
  target_mode: 'global' | 'specific';
  page_paths: string[];
  is_active: boolean;
  sort_order: number;
  updated_at?: string;
}

export const PLATFORMS: { value: string; label: string; placement: Placement }[] = [
  { value: 'meta_pixel', label: 'Meta Pixel', placement: 'head' },
  { value: 'google_analytics', label: 'Google Analytics', placement: 'head' },
  { value: 'google_tag_manager', label: 'Google Tag Manager', placement: 'head' },
  { value: 'google_search_console', label: 'Google Search Console', placement: 'head' },
  { value: 'facebook_domain_verification', label: 'Facebook Domain Verification', placement: 'head' },
  { value: 'custom', label: 'Custom Script / Meta Tag', placement: 'head' },
];
export const PLACEMENTS: { value: Placement; label: string }[] = [
  { value: 'head', label: 'Inside <head>' },
  { value: 'body_start', label: 'After opening <body>' },
  { value: 'body_end', label: 'Before closing </body>' },
];
export const platformLabel = (v: string) => PLATFORMS.find((p) => p.value === v)?.label || v;

const normalizePath = (p: string) => {
  const t = p.trim().split(/[?#]/)[0];
  if (!t) return '';
  const s = t.startsWith('/') ? t : `/${t}`;
  return s.length > 1 ? s.replace(/\/+$/, '') : s;
};

/** "/stay" matches exactly; "/stay/*" matches /stay and everything under it. */
export function matchesPath(pathname: string, patterns: string[]): boolean {
  const path = normalizePath(pathname) || '/';
  return patterns.some((raw) => {
    const pat = raw.trim();
    if (!pat) return false;
    if (pat.endsWith('*')) {
      const base = normalizePath(pat.slice(0, -1));
      return !base || base === '/' || path === base || path.startsWith(`${base}/`);
    }
    return normalizePath(pat) === path;
  });
}

export function appliesTo(i: WebsiteIntegration, pathname: string): boolean {
  if (!i.is_active || !i.code.trim()) return false;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return false;
  return i.target_mode === 'global' || matchesPath(pathname, i.page_paths || []);
}

export const normalizeCode = (code: string) => code.replace(/\s+/g, ' ').trim();

/** Tracking IDs used to stop the same pixel/tag being loaded twice. */
export function extractTrackingIds(code: string): string[] {
  const ids = new Set<string>();
  for (const m of code.matchAll(/fbq\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/g)) ids.add(`fb:${m[1]}`);
  for (const m of code.matchAll(/\b(G-[A-Z0-9]{4,}|GTM-[A-Z0-9]{4,}|UA-\d+-\d+|AW-\d+)\b/g)) ids.add(m[1]);
  return [...ids];
}

/** Keeps the first integration for identical code or a repeated tracking ID. */
export function dedupeIntegrations(list: WebsiteIntegration[]): WebsiteIntegration[] {
  const codes = new Set<string>();
  const ids = new Set<string>();
  return list.filter((i) => {
    const c = normalizeCode(i.code);
    const t = extractTrackingIds(i.code);
    if (codes.has(c) || t.some((x) => ids.has(x))) return false;
    codes.add(c);
    t.forEach((x) => ids.add(x));
    return true;
  });
}

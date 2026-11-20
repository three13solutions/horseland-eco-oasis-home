import { describe, it, expect } from 'vitest';
import { matchesPath, appliesTo, dedupeIntegrations, WebsiteIntegration } from './websiteIntegrations';

const base: WebsiteIntegration = { id: '1', name: 'a', platform: 'custom', description: null, code: '<meta name="x" content="1">', placement: 'head', target_mode: 'global', page_paths: [], is_active: true, sort_order: 0 };

describe('website integrations', () => {
  it('matches exact and wildcard pages', () => {
    expect(matchesPath('/stay', ['/stay'])).toBe(true);
    expect(matchesPath('/stay/deluxe', ['/stay'])).toBe(false);
    expect(matchesPath('/stay/deluxe', ['/stay/*'])).toBe(true);
  });
  it('never loads on admin pages or when inactive', () => {
    expect(appliesTo(base, '/admin/settings')).toBe(false);
    expect(appliesTo({ ...base, is_active: false }, '/')).toBe(false);
    expect(appliesTo(base, '/')).toBe(true);
  });
  it('only loads specific-page integrations on chosen pages', () => {
    const s = { ...base, target_mode: 'specific' as const, page_paths: ['/booking'] };
    expect(appliesTo(s, '/booking')).toBe(true);
    expect(appliesTo(s, '/')).toBe(false);
  });
  it('drops duplicate code and repeated pixel IDs', () => {
    const px = (id: string) => ({ ...base, id, code: `<script>fbq('init', '123');fbq('track','PageView')</script>${id}` });
    expect(dedupeIntegrations([base, { ...base, id: '2' }, px('3'), px('4')]).map((i) => i.id)).toEqual(['1', '3']);
  });
});

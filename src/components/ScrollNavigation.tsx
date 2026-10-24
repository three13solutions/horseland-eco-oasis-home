import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import ScrollArrows from './ScrollArrows';

interface ScrollTarget {
  id: number;
  element: HTMLElement;
  portal: HTMLElement;
  axis: 'x' | 'y';
  left: number;
  top: number;
  previousDisabled: boolean;
  nextDisabled: boolean;
  page: boolean;
}

// Only explicitly marked admin media galleries receive navigation controls.
export default function ScrollNavigation() {
  const [targets, setTargets] = useState<ScrollTarget[]>([]);
  const { pathname } = useLocation();

  useEffect(() => {
    setTargets([]);
    if (!pathname.startsWith('/admin/')) return;
    const ids = new WeakMap<HTMLElement, number>();
    let nextId = 0;
    let frame = 0;
    let timer = 0;
    let candidates: HTMLElement[] = [];
    let signature = '';
    const resizeObserver = new ResizeObserver(() => schedule());
    const measure = () => {
      frame = 0;
      const result: ScrollTarget[] = [];
      const dialogs = [...document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]')].filter(el => el.getClientRects().length > 0);
      const modal = dialogs[dialogs.length - 1];
      const root = null;
      const list = candidates;
      for (const element of list) {
        const page = element === root;
        if (!element.isConnected || element.closest('[data-scroll-arrows]') || (!page && !element.getClientRects().length)) continue;
        if (modal && (page || !modal.contains(element))) continue;
        const style = getComputedStyle(element);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        const vertical = (page || /auto|scroll/.test(style.overflowY)) && element.scrollHeight > element.clientHeight + 2;
        const horizontal = !page && /auto|scroll/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 2;
        if (!vertical && !horizontal) continue;
        const rect = page ? { top: 0, left: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight } : element.getBoundingClientRect();
        const top = Math.max(0, rect.top);
        const bottom = Math.min(innerHeight, rect.bottom);
        const right = Math.min(innerWidth, rect.right);
        if (bottom - top < 52 || right - Math.max(0, rect.left) < 100) continue;
        // Avoid controls for content clipped by a scrolling ancestor.
        let ancestor = element.parentElement;
        let visible = true;
        while (!page && ancestor && ancestor !== document.body) {
          const ancestorStyle = getComputedStyle(ancestor);
          if (/auto|scroll|hidden/.test(ancestorStyle.overflowY)) {
            const bounds = ancestor.getBoundingClientRect();
            if (bottom > bounds.bottom + 2 || bottom < bounds.top + 52) { visible = false; break; }
          }
          ancestor = ancestor.parentElement;
        }
        if (!visible) continue;
        const axis = vertical ? 'y' : 'x';
        const offset = axis === 'y' ? element.scrollTop : Math.abs(element.scrollLeft);
        const maximum = axis === 'y' ? element.scrollHeight - element.clientHeight : element.scrollWidth - element.clientWidth;
        let id = ids.get(element);
        if (id === undefined) { id = ++nextId; ids.set(element, id); }
        const portal = element.closest<HTMLElement>('[role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper]') || document.body;
        // Fixed coordinates are local when a dialog has a transform.
        const local = portal !== document.body && getComputedStyle(portal).transform !== 'none' ? portal.getBoundingClientRect() : { left: 0, top: 0 };
        result.push({ id, element, portal, axis, page, left: Math.round((page ? 12 : Math.max(rect.left + 4, right - 100)) - local.left), top: Math.round(bottom - 56 - local.top), previousDisabled: offset <= 2, nextDisabled: offset >= maximum - 2 });
        if (horizontal && vertical) {
          result.push({ id: -id, element, portal, axis: 'x', page, left: Math.round(Math.max(rect.left + 4, right - 196) - local.left), top: Math.round(bottom - 56 - local.top), previousDisabled: Math.abs(element.scrollLeft) <= 2, nextDisabled: Math.abs(element.scrollLeft) >= element.scrollWidth - element.clientWidth - 2 });
        }
      }
      const key = result.map(({ id, left, top, previousDisabled, nextDisabled }) => `${id}:${left}:${top}:${previousDisabled}:${nextDisabled}`).join('|');
      if (key !== signature) { signature = key; setTargets(result); }
    };
    function schedule() { if (!frame) frame = requestAnimationFrame(measure); }
    const discover = () => {
      timer = 0;
      resizeObserver.disconnect();
      candidates = [...document.querySelectorAll<HTMLElement>('[data-admin-media-gallery], [data-admin-media-gallery] [data-radix-scroll-area-viewport]')].filter(element => {
        if (element.closest('[data-scroll-arrows]') || element === document.body || element === document.documentElement) return false;
        const style = getComputedStyle(element);
        return /auto|scroll/.test(style.overflowY);
      });
      candidates.forEach(element => resizeObserver.observe(element));
      resizeObserver.observe(document.body);
      schedule();
    };
    const mutations = new MutationObserver(records => {
      if (records.every(record => record.target instanceof Element && record.target.closest('[data-scroll-arrows]'))) return;
      if (!timer) timer = window.setTimeout(discover, 100);
    });
    mutations.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open'] });
    document.addEventListener('scroll', schedule, true);
    document.addEventListener('load', schedule, true);
    window.addEventListener('resize', schedule);
    discover();
    return () => {
      mutations.disconnect(); resizeObserver.disconnect();
      cancelAnimationFrame(frame); clearTimeout(timer);
      document.removeEventListener('scroll', schedule, true);
      document.removeEventListener('load', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [pathname]);

  const scroll = (target: ScrollTarget, direction: number) => {
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    const distance = Math.max(100, (target.axis === 'y' ? target.element.clientHeight : target.element.clientWidth) * 0.75);
    const rtl = target.axis === 'x' && getComputedStyle(target.element).direction === 'rtl' ? -1 : 1;
    target.element.scrollBy({ [target.axis === 'y' ? 'top' : 'left']: distance * direction * rtl, behavior });
  };

  return <>{targets.map(target => createPortal(
    <div key={target.id} data-scroll-arrows className={`fixed pointer-events-none ${target.page ? 'z-40' : 'z-[60]'}`} style={{ left: target.left, top: target.top }}>
      <ScrollArrows label="media gallery" previousDisabled={target.previousDisabled} nextDisabled={target.nextDisabled} onPrevious={() => scroll(target, -1)} onNext={() => scroll(target, 1)} />
    </div>, target.portal, String(target.id)
  ))}</>;
}
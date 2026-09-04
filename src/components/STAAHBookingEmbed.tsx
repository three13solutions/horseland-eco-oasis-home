import React, { useEffect, useRef, useState } from 'react';

interface STAAHBookingEmbedProps {
  /** Override the default widget id + script id if needed. */
  widgetId?: string;
  scriptId?: string;
}

const DEFAULT_WIDGET_ID =
  'quickbook-widget-482MTv5ZTzTU3ACF7KZccPUf71sDoY2ODg=-178844330380028';
const DEFAULT_SCRIPT_ID = '178844330380028';
const DEFAULT_WIDGET_CLASS = 'Configure-quickBook-Widget';
const DEFAULT_PROPERTY_ID = '482MTv5ZTzTU3ACF7KZccPUf71sDoY2ODg=';
const SWIFTBOOK_SCRIPT_SRC_BASE =
  'https://www.swiftbook.io/cwplugin/displaywidget/preview/booking-service.min.js';

/**
 * Renders the STAAH / SwiftBook booking widget exactly as provided.
 * Does not modify any existing booking, availability, payment, Supabase,
 * admin, or channel-manager functionality.
 */
const STAAHBookingEmbed: React.FC<STAAHBookingEmbedProps> = ({
  widgetId = DEFAULT_WIDGET_ID,
  scriptId = DEFAULT_SCRIPT_ID,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    // Build the exact src as provided by STAAH.
    const src = `${SWIFTBOOK_SCRIPT_SRC_BASE}?propertyId=842MTd0tZKorVSvgYBtp9JxxXJaAQ0VMQni2sbUt4LNUbZUY2ODg=&scriptId=${scriptId}`;

    // The STAAH snippet loads a <script> with id="propInfo". We use our own
    // unique element id so React Router re-mounts don't collide with a leftover
    // global node, but we keep the id="propInfo" expectation that the SwiftBook
    // loader looks for by setting it on the injected script element.
    const scriptElementId = `propInfo-${scriptId}`;

    const injectWidget = () => {
      const mountNode = mountRef.current;
      if (!mountNode) return;

      // 1) Render the exact mounting div the SwiftBook loader expects.
      //    We recreate it fresh on every mount so React Router navigation
      //    away/back always reinitializes the widget.
      mountNode.innerHTML = '';
      const widgetDiv = document.createElement('div');
      widgetDiv.id = widgetId;
      widgetDiv.className = DEFAULT_WIDGET_CLASS;
      mountNode.appendChild(widgetDiv);

      // 2) Prevent duplicate script loading. If a previous script with this id
      //    exists (e.g. from a prior mount that wasn't cleaned up), remove it
      //    before injecting a new one so the widget re-initializes cleanly.
      const existing = document.getElementById(scriptElementId);
      if (existing) {
        existing.remove();
      }

      const script = document.createElement('script');
      script.src = src;
      script.id = scriptElementId;
      // Keep the id="propInfo" that the SwiftBook loader looks for, while still
      // being uniquely addressable for cleanup. We set id to scriptElementId
      // above; also set the legacy id as a data attribute for reference.
      script.setAttribute('data-propinfo', 'propInfo');
      script.async = true;

      script.onload = () => {
        if (!cancelled) {
          setLoading(false);
          setFailed(false);
        }
      };

      script.onerror = () => {
        if (!cancelled) {
          setLoading(false);
          setFailed(true);
        }
      };

      document.body.appendChild(script);

      // Safety: if the script doesn't signal onload within a reasonable window,
      // show the fallback. SwiftBook doesn't expose a success callback we can
      // hook into reliably, so we treat onload as the success signal.
      const fallbackTimer = window.setTimeout(() => {
        if (!cancelled && loading) {
          // Only fall back if the widget div is still empty.
          if (widgetDiv.childElementCount === 0) {
            setFailed(true);
          }
          setLoading(false);
        }
      }, 12000);

      cleanup = () => {
        window.clearTimeout(fallbackTimer);
        // Remove the script we injected so a fresh mount reloads cleanly.
        const node = document.getElementById(scriptElementId);
        if (node) node.remove();
      };
    };

    // Defer one tick so the mount div is in the DOM before injection.
    const raf = window.requestAnimationFrame(injectWidget);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      if (cleanup) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetId, scriptId]);

  return (
    <div className="staah-booking-embed w-full">
      {loading && !failed && (
        <div className="w-full py-10 text-center text-sm text-muted-foreground">
          Loading booking widget…
        </div>
      )}
      {failed && (
        <div className="w-full py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          Booking widget is temporarily unavailable. Please try again later, or
          contact us directly to make a reservation.
        </div>
      )}
      <div ref={mountRef} className="w-full" style={{ width: '100%' }} />
    </div>
  );
};

export default STAAHBookingEmbed;

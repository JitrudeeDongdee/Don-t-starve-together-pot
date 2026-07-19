import { useEffect } from 'react';
import { canonicalFor, type RouteMeta } from './routes';

function setMeta(selector: string, attr: 'content' | 'href', value: string) {
  const el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (el) el.setAttribute(attr, value);
}

/**
 * Keeps title / description / canonical / OG in step with the active route.
 *
 * index.html ships the values for "/" so a crawler that never runs JS still
 * gets sensible tags; this updates them on navigation. Once routes are
 * prerendered each page will carry its own tags in the HTML itself.
 */
export function useDocumentMeta(route: RouteMeta) {
  useEffect(() => {
    const canonical = canonicalFor(route.path);
    document.title = route.title;
    setMeta('meta[name="description"]', 'content', route.description);
    setMeta('link[rel="canonical"]', 'href', canonical);
    setMeta('meta[property="og:title"]', 'content', route.title);
    setMeta('meta[property="og:description"]', 'content', route.description);
    setMeta('meta[property="og:url"]', 'content', canonical);
    setMeta('meta[name="twitter:title"]', 'content', route.title);
    setMeta('meta[name="twitter:description"]', 'content', route.description);
  }, [route]);
}

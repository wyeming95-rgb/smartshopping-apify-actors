// Rakuten's store list comes from its public merchant sitemap; each store's rate from the <head> of its page.

import { sitemapStores } from './core/directory-run.js';

export { filterStores } from './core/directory-run.js';
export const SITEMAP_URL = 'https://www.rakuten.com/merchant_sitemap.xml';

/** Store pages listed in the sitemap, one per slug, in sitemap order. */
export const storeUrls = (xml) => sitemapStores(xml, slugOf);

/** "nike" for https://www.rakuten.com/shop/nike or https://www.rakuten.com/nike.htm; null for non-store pages. */
export function slugOf(url) {
    let path;
    try {
        const u = new URL(url);
        if (!/(^|\.)rakuten\.com$/.test(u.hostname)) return null;
        path = u.pathname.replace(/\/+$/, '');
    } catch {
        return null;
    }
    return path.match(/^\/shop\/([a-z0-9][a-z0-9._-]*)$/i)?.[1].toLowerCase()
        ?? path.match(/^\/([a-z0-9][a-z0-9_-]*)\.htm$/i)?.[1].toLowerCase()
        ?? null;
}

/** Rakuten's numeric store ID, from the app deep link in the page head. */
export const storeIdOf = (html) => html.match(/<meta[^>]+deeplink_path["'][^>]*content=["'][^"']*store\/(\d+)/i)?.[1] ?? null;

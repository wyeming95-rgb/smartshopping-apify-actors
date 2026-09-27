// Rakuten's store list comes from its public merchant sitemap; each store's rate from the <head> of its page.

export const SITEMAP_URL = 'https://www.rakuten.com/merchant_sitemap.xml';

/** Store pages listed in the sitemap, one per slug, in sitemap order. */
export function storeUrls(xml) {
    const seen = new Set();
    const out = [];
    for (const [, loc] of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
        const url = loc.replace(/&amp;/g, '&');
        const slug = slugOf(url);
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        out.push({ slug, url });
    }
    return out;
}

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

/** Keeps stores whose slug contains any keyword (case- and punctuation-insensitive); all stores without keywords. */
export function filterStores(stores, keywords = []) {
    const keys = keywords.map((k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean);
    if (!keys.length) return stores;
    return stores.filter((s) => {
        const slug = s.slug.replace(/[^a-z0-9]/g, '');
        return keys.some((k) => slug.includes(k));
    });
}

/** Rakuten's numeric store ID, from the app deep link in the page head. */
export const storeIdOf = (html) => html.match(/<meta[^>]+deeplink_path["'][^>]*content=["'][^"']*store\/(\d+)/i)?.[1] ?? null;

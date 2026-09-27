// TopCashback's store list comes from each country site's public sitemap. Every store page there has a
// matching /<store>/reviews/ page, which tells store pages apart from help, blog and category pages.
import { sitemapStores } from './core/directory-run.js';

export { filterStores } from './core/directory-run.js';

export const SITES = {
    US: { portalId: 'topcashback-us', base: 'https://www.topcashback.com', currency: 'USD' },
    UK: { portalId: 'topcashback-uk', base: 'https://www.topcashback.co.uk', currency: 'GBP' },
    AU: { portalId: 'topcashback-au', base: 'https://www.topcashback.com.au', currency: 'AUD' },
};

// Top-level pages that are not stores, for sitemaps without review pages.
const NOT_STORES = new Set(['help', 'blog', 'terms', 'privacy', 'about', 'join', 'login', 'logon', 'error', 'offers', 'trending',
    'category', 'categories', 'cookie-policy', 'acceptable-use-policy', 'press-center', 'do-not-share', 'rakuten-comparison',
    'refer-a-friend', 'contact', 'contact-us', 'faq', 'search', 'sitemap', 'account', 'my-account', 'earnings', 'accessibility']);

const pathOf = (url, base) => {
    try {
        const u = new URL(url);
        return u.host === new URL(base).host ? u.pathname : null;
    } catch {
        return null;
    }
};

/** Store pages in a TopCashback sitemap, in sitemap order. */
export function storeUrls(xml, base) {
    const reviewed = new Set();
    for (const [, loc] of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
        const slug = pathOf(loc, base)?.match(/^\/([a-z0-9][a-z0-9-]*)\/reviews\/?$/i)?.[1];
        if (slug) reviewed.add(slug.toLowerCase());
    }
    return sitemapStores(xml, (url) => {
        const slug = pathOf(url, base)?.match(/^\/([a-z0-9][a-z0-9-]*)\/?$/i)?.[1]?.toLowerCase();
        if (!slug) return null;
        if (reviewed.size) return reviewed.has(slug) ? slug : null;
        return NOT_STORES.has(slug) ? null : slug;
    }).map((s) => ({ ...s, url: `${base}/${s.slug}/` }));
}

/** Store pages are titled "<Store> Offers, Cash Back, ..." (US) or "<Store> Offers ..." / "<Store> Cashback ..." (UK, AU). */
export const looksLikeStorePage = (html) => /<title[^>]*>[^<]*\b(?:Offers|Cash ?back)\b/i.test(html) || html.includes('merch-primary-slice');

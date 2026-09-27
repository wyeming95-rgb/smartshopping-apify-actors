// TopCashback's store list comes from each country site's public sitemap: store pages are its top-level
// pages (/nike/), minus known site pages. Anything else that slips through is dropped after fetching, because
// store pages have a recognisable title (see looksLikeStorePage), and costs the user nothing.
import { sitemapStores } from './core/directory-run.js';

export { filterStores } from './core/directory-run.js';

export const SITES = {
    US: { portalId: 'topcashback-us', base: 'https://www.topcashback.com', currency: 'USD' },
    UK: { portalId: 'topcashback-uk', base: 'https://www.topcashback.co.uk', currency: 'GBP' },
    AU: { portalId: 'topcashback-au', base: 'https://www.topcashback.com.au', currency: 'AUD' },
};

// Top-level site pages that are not stores.
const NOT_STORES = new Set(['help', 'blog', 'terms', 'privacy', 'about', 'join', 'login', 'logon', 'error', 'offers', 'trending',
    'category', 'categories', 'cookie-policy', 'acceptable-use-policy', 'press-center', 'do-not-share', 'rakuten-comparison',
    'refer-a-friend', 'refer-and-earn', 'contact', 'contact-us', 'faq', 'search', 'sitemap', 'account', 'my-account', 'earnings',
    'accessibility', 'top-gift-cards', 'browser-extension', 'labs', 'sell-your-phone', 'app', 'guides', 'guides-intro', 'compare',
    'dyn', 'security', 'careers', 'jobs', 'reviews', 'giftcards', 'gift-cards', 'mobile-app', 'tcb-plus', 'plus', 'vouchers']);

const pathOf = (url, base) => {
    try {
        const u = new URL(url);
        return u.host === new URL(base).host ? u.pathname : null;
    } catch {
        return null;
    }
};

/** Candidate store pages in a TopCashback sitemap, in sitemap order. */
export function storeUrls(xml, base) {
    return sitemapStores(xml, (url) => {
        const slug = pathOf(url, base)?.match(/^\/([a-z0-9][a-z0-9-]*)\/?$/i)?.[1]?.toLowerCase();
        return slug && !NOT_STORES.has(slug) ? slug : null;
    }).map((s) => ({ ...s, url: `${base}/${s.slug}/` }));
}

/** Store pages are titled "<Store> Offers, Cash Back, ..." (US) or "<Store> Offers" / "<Store> Cashback Offers" (UK, AU). */
export const looksLikeStorePage = (html) => /<title[^>]*>(?!\s*TopCashback)[^<]*\bOffers\b/i.test(html) || html.includes('merch-primary-slice');

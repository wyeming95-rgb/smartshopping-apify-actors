// Preloaded via --import: serves fixture store pages instead of the live portals.
import { RAKUTEN_MACYS, TCB_UK_CURRYS, TCB_US_NIKE } from './pages.js';

const GENERIC_RAKUTEN = '<head><meta property="og:title" content="Coupons, Promo Codes &amp; Cash Back | Rakuten"/></head>';
const PAGES = {
    'https://www.rakuten.com/macys.com': { finalUrl: 'https://www.rakuten.com/shop/macys', html: RAKUTEN_MACYS },
    'https://www.rakuten.com/nike.com': { finalUrl: 'https://www.rakuten.com/shop/nike', html: GENERIC_RAKUTEN },
    'https://www.topcashback.com/nike/': { html: TCB_US_NIKE },
    'https://www.topcashback.co.uk/currys/': { html: TCB_UK_CURRYS },
    'https://www.topcashback.co.uk/nike/': { status: 503, html: '' },
};

globalThis.__cashbackFetchPage = async (url) => {
    if (process.env.MOCK_ALL_DOWN) return { url, finalUrl: url, status: 503, html: '' };
    const page = PAGES[url];
    if (!page) return { url, finalUrl: url, status: 404, html: '<title>Page not found | Error</title>' };
    return { url, finalUrl: page.finalUrl ?? url, status: page.status ?? 200, html: page.html };
};

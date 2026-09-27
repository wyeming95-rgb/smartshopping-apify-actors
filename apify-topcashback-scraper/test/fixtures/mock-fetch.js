// Preloaded via --import: serves small TopCashback sitemaps and store pages instead of the live sites.
const sitemap = (base, paths) => `<?xml version="1.0"?><urlset>${paths.map((p) => `<url><loc>${base}${p}</loc></url>`).join('')}</urlset>`;
const US = 'https://www.topcashback.com';
const UK = 'https://www.topcashback.co.uk';
const AU = 'https://www.topcashback.com.au';

const PAGES = {
    [`${US}/sitemap.xml`]: sitemap(US, ['/', '/help/', '/category/fashion/', '/nike/', '/walmart/', '/help/reviews/x/', '/nike/reviews/', '/gone/', '/broken/', '/top-gift-cards/', '/blank-page/']),
    // US store pages: the rate is only in the store's main block, after banners advertising other stores.
    [`${US}/nike/`]: '<title>Nike Offers, Cash Back, Discounts &amp; Coupons</title><meta name="description" content="Nike Cash Back discounts can be earned"><div class="nav-bar-premium-tenancy__rate">Up to 15% Cash Back</div><div class="merch-primary-slice"><span>6% Cash Back</span></div>',
    [`${US}/walmart/`]: '<title>Walmart Offers, Cash Back, Discounts &amp; Coupons</title><div class="merch-primary-slice"><span>Up to 4% Cash Back</span></div>',
    [`${US}/gone/`]: { status: 404, html: '<title>Page Not Found - TopCashback</title>' },
    [`${US}/broken/`]: { status: 503, html: '' },
    // A site page not in the known list: fetched, recognised as not a store, never saved.
    [`${US}/blank-page/`]: '<title>TopCashback: Highest Cash Back Guaranteed</title>',
    [`${UK}/sitemap.xml`]: sitemap(UK, ['/asos/', '/asos/reviews/', '/currys/', '/currys/reviews/', '/terms/']),
    [`${UK}/asos/`]: '<title>ASOS Offers</title><meta name="description" content="Get up to 7% cashback at ASOS.">',
    [`${UK}/currys/`]: '<title>Currys Cashback Offers</title><meta name="description" content="Earn £20 cashback on laptops.">',
    [`${AU}/sitemap.xml`]: sitemap(AU, ['/help/', '/the-iconic/', '/cookie-policy/', '/about/who-we-are/', '/about-blank/']),
    [`${AU}/the-iconic/`]: '<title>THE ICONIC Offers</title><meta name="description" content="Earn 5% cashback at THE ICONIC.">',
    [`${AU}/about-blank/`]: '<title>TopCashback Australia | Page</title>',
};

globalThis.__cashbackFetchPage = async (url) => {
    if (process.env.MOCK_SITEMAPS_DOWN && url.endsWith('sitemap.xml')) return { url, finalUrl: url, status: 503, html: '' };
    const page = PAGES[url];
    if (page === undefined) return { url, finalUrl: url, status: 404, html: '<title>TopCashback | Error</title>' };
    return typeof page === 'string' ? { url, finalUrl: url, status: 200, html: page } : { url, finalUrl: url, ...page };
};

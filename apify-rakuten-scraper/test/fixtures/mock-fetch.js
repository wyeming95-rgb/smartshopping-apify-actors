// Preloaded via --import: serves a small Rakuten sitemap and store pages instead of the live site.
const store = (slug, og, id) => ({
    finalUrl: `https://www.rakuten.com/shop/${slug}`,
    html: `<html><head><meta name="branch:deeplink:$deeplink_path" content="us/store/${id}"/><meta property="og:title" content="${og}"/></head><body>${'x'.repeat(50)}</body></html>`,
});

const PAGES = {
    'https://www.rakuten.com/merchant_sitemap.xml': {
        html: `<?xml version="1.0"?><urlset>${['shop/nike', 'shop/sephora', 'shop/gone', 'shop/bestbuy', 'shop/nike/', 'shop/hotels', 'shop/amazon', 'blog/post', 'shop/broken']
            .map((p) => `<url><loc>https://www.rakuten.com/${p}</loc></url>`).join('')}</urlset>`,
    },
    'https://www.rakuten.com/shop/nike': store('nike', 'Nike 10% Cash Back + Coupons', 9528),
    'https://www.rakuten.com/shop/sephora': store('sephora', 'Sephora Up to 8% Cash Back + Coupons', 4548),
    // Stores that left Rakuten fall back to the generic page.
    'https://www.rakuten.com/shop/gone': { html: '<head><meta property="og:title" content="Coupons, Promo Codes &amp; Cash Back | Rakuten"/></head>' },
    'https://www.rakuten.com/shop/bestbuy': store('bestbuy', 'Best Buy 1% Cash Back + Coupons', 5246),
    'https://www.rakuten.com/shop/hotels': store('hotels', 'Hotels.com $25 Cash Back + Coupons', 1234),
    'https://www.rakuten.com/shop/amazon': store('amazon', 'Amazon No Cash Back + Coupons', 11),
    'https://www.rakuten.com/shop/broken': { status: 503, html: '' },
};

globalThis.__cashbackFetchPage = async (url) => {
    if (process.env.MOCK_SITEMAP_DOWN && url.endsWith('merchant_sitemap.xml')) return { url, finalUrl: url, status: 403, html: '' };
    const page = PAGES[url];
    if (!page) return { url, finalUrl: url, status: 404, html: '' };
    return { url, finalUrl: page.finalUrl ?? url, status: page.status ?? 200, html: page.html };
};

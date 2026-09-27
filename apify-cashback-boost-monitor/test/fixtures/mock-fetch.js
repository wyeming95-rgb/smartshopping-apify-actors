// Preloaded via --import: serves portal pages whose rates depend on MOCK_DAY, to simulate runs on different days.
const day = Number(process.env.MOCK_DAY ?? 1);
const rakuten = (store, og) => ({ finalUrl: `https://www.rakuten.com/shop/${store}`, html: `<meta property="og:title" content="${og}"/><body>${og}</body>` });

// Rakuten flags its own boosts: "8% Cash Back was 2%".
const sephoraBoost = {
    finalUrl: 'https://www.rakuten.com/shop/sephora',
    html: '<meta property="og:title" content="Sephora 8% Cash Back + Coupons"/><body><span>8% Cash Back</span> <span>was 2%</span></body>',
};

const PAGES = {
    1: {
        'https://www.rakuten.com/nike.com': rakuten('nike', 'Nike 2% Cash Back + Coupons'),
        'https://www.rakuten.com/asos.com': rakuten('asos', 'ASOS 5% Cash Back + Coupons'),
        'https://www.rakuten.com/sephora.com': sephoraBoost,
        'https://www.topcashback.co.uk/asos/': { html: '<title>ASOS Offers</title><meta name="description" content="get up to 6% cashback.">' },
    },
    2: {
        'https://www.rakuten.com/nike.com': rakuten('nike', 'Nike 10% Cash Back + Coupons'), // boosted
        'https://www.rakuten.com/asos.com': rakuten('asos', 'ASOS 3% Cash Back + Coupons'), // cut
        'https://www.rakuten.com/sephora.com': sephoraBoost, // same boost as day 1: not reported again
        'https://www.topcashback.co.uk/asos/': { status: 503, html: '' }, // outage: not a removal
        'https://www.topcashback.co.uk/nike/': { html: '<title>Nike Offers</title><meta name="description" content="get 4% cashback.">' }, // newly listed
    },
};

globalThis.__cashbackFetchPage = async (url) => {
    const page = PAGES[day][url];
    if (!page) return { url, finalUrl: url, status: 404, html: '' };
    return { url, finalUrl: page.finalUrl ?? url, status: page.status ?? 200, html: page.html };
};

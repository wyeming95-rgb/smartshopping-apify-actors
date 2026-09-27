// Apify account setup for the SmartShopping Data Actors, run from GitHub Actions.
//   node scripts/apify-setup.mjs whoami  -> which Apify account the token belongs to, and its Actors
//   node scripts/apify-setup.mjs test    -> run each Actor once on real data and print its results
//   node scripts/apify-setup.mjs configure -> title/description, Store SEO, run defaults, pay-per-event pricing
//   node scripts/apify-setup.mjs publish -> make the Actors public on Apify Store
// Actors without a `listing` (such as the internal probe) are never configured or published.
// Set ONLY=<name>[,<name>...] to limit a stage to some Actors.
// Needs APIFY_TOKEN in the environment. Never prints the token.
const API = 'https://api.apify.com/v2';
const token = process.env.APIFY_TOKEN;
if (!token) throw new Error('APIFY_TOKEN is not set');
const EXPECTED_ACCOUNT = 'smartshopping';

const ACTORS = [
    {
        name: 'cashback-rate-comparison',
        testInput: { merchants: ['Nike', 'ASOS', 'Amazon', 'Walmart', 'Best Buy', 'THE ICONIC', 'Marks & Spencer', 'Sephora'], includeNotListed: true },
        printAllItems: true,
        maxItemChars: 600,
        listing: {
            title: 'Cashback Rate Comparison — Rakuten, TopCashback & more',
            description: 'Compare cashback rates for any store across Rakuten, TopCashback, BeFrugal, Capital One Shopping, Mr. Rebates and ShopBack in the US, UK and Australia. Best rate per store per country. Pay per rate found.',
            seoTitle: 'Cashback Rate Scraper & API | Rakuten, TopCashback',
            seoDescription: 'Compare cashback rates for any store on Rakuten, TopCashback, BeFrugal, ShopBack and more, across the US, UK and Australia.',
            categories: ['ECOMMERCE', 'AI', 'DEVELOPER_TOOLS'],
        },
        event: { name: 'cashback-rate', title: 'Cashback rate', description: 'One cashback rate found for a store on a portal.', priceUsd: 0.003 },
    },
    {
        name: 'cashback-boost-monitor',
        // Two runs on the same watchlist: a baseline, then a comparison (usually few or no changes minutes apart).
        testInput: [
            { merchants: ['Nike', 'ASOS', 'Walmart', 'Best Buy', 'Sephora', 'THE ICONIC'], watchlistName: 'setup-test' },
            { merchants: ['Nike', 'ASOS', 'Walmart', 'Best Buy', 'Sephora', 'THE ICONIC'], watchlistName: 'setup-test' },
        ],
        allowEmpty: true,
        printAllItems: true,
        maxItemChars: 700,
        listing: {
            title: 'Cashback Boost Monitor — Rate Change Alerts',
            description: 'Get alerted when cashback rates change for your stores on Rakuten, TopCashback, BeFrugal, Capital One Shopping, Mr. Rebates and ShopBack (US, UK, AU): boosts, cuts and new listings. Schedule it; pay only per change.',
            seoTitle: 'Cashback Rate Change Alerts | Rakuten & TopCashback',
            seoDescription: 'Scheduled alerts when cashback rates change on Rakuten, TopCashback, ShopBack and more: boosts, cuts and new stores. US, UK, AU.',
            categories: ['ECOMMERCE', 'AI', 'DEVELOPER_TOOLS'],
        },
        event: { name: 'rate-change', title: 'Rate change', description: 'One cashback rate change reported for a store on a portal.', priceUsd: 0.01 },
    },
    {
        name: 'rakuten-cashback-scraper',
        testInput: { maxStores: 60 },
        maxItemChars: 400,
        listing: {
            title: 'Rakuten Cashback Scraper — All Store Rates',
            description: 'Scrape cash back rates for every store on Rakuten (US): store name, rate, % or fixed amount, store ID and link. Filter by keyword or minimum rate. Pay per store.',
            seoTitle: 'Rakuten Cash Back Rates Scraper & API | All Stores',
            seoDescription: 'Scrape current cash back rates for all 4,000+ Rakuten (US) stores: rate, % or fixed, store ID and link. Export JSON, CSV or Excel.',
            categories: ['ECOMMERCE', 'AI', 'DEVELOPER_TOOLS'],
        },
        event: { name: 'store-rate', title: 'Store rate', description: 'One Rakuten store with its current cash back rate.', priceUsd: 0.002 },
    },
    {
        name: 'topcashback-scraper',
        testInput: { maxStores: 25 },
        timeoutSecs: 7200, // a full US run checks ~9,800 pages
        maxItemChars: 400,
        listing: {
            title: 'TopCashback Scraper — All Store Rates (US, UK, AU)',
            description: 'Scrape cashback rates for every store on TopCashback in the US, UK and Australia: store, rate, % or fixed amount, currency and link. Filter by keyword or minimum rate. Pay per store.',
            seoTitle: 'TopCashback Scraper & API | All Store Rates US UK AU',
            seoDescription: 'Scrape current cashback rates for every TopCashback store in the US, UK and Australia: rate, % or fixed, currency and link.',
            categories: ['ECOMMERCE', 'AI', 'DEVELOPER_TOOLS'],
        },
        event: { name: 'store-rate', title: 'Store rate', description: 'One TopCashback store with its current cashback rate.', priceUsd: 0.002 },
    },
    {
        name: 'cashback-portal-probe',
        testInput: {},
        printAllItems: true,
        maxItemChars: 9000,
    },
].filter((a) => !process.env.ONLY || process.env.ONLY.split(',').map((n) => n.trim()).includes(a.name));
if (!ACTORS.length) throw new Error(`ONLY=${process.env.ONLY} matches no Actor`);

async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    if (!res.ok) {
        const err = new Error(`${method} ${path} -> ${res.status}: ${json?.error?.message ?? text.slice(0, 300)}`);
        err.status = res.status;
        throw err;
    }
    return json?.data ?? json ?? text;
}

async function actorId(name) {
    const { items } = await api('/acts?my=1&limit=1000');
    const act = items.find((a) => a.name === name);
    if (!act) throw new Error(`Actor ${name} not found on this account; deploy it first`);
    return act.id;
}

async function whoami() {
    const me = await api('/users/me');
    console.log(`Token belongs to: ${me.username} (type: ${me.isOrganization ? 'organization' : me.type ?? 'user'}), plan: ${me.plan?.id ?? 'unknown'}`);
    if (me.username !== EXPECTED_ACCOUNT) {
        console.log(`❌ Expected the ${EXPECTED_ACCOUNT} organization. Replace the APIFY_TOKEN secret with a token created while switched into ${EXPECTED_ACCOUNT}.`);
        process.exitCode = 1;
    } else {
        console.log(`✅ Token is for ${EXPECTED_ACCOUNT}`);
    }
    const { items } = await api('/acts?my=1&limit=1000');
    console.log(`Actors on this account: ${items.map((a) => `${a.name} (${a.id})`).join(', ') || 'none yet'}`);
}

async function test() {
    let failures = 0;
    for (const a of ACTORS.flatMap((x) => [x.testInput].flat().map((testInput) => ({ ...x, testInput })))) {
        console.log(`\n=== ${a.name} ${JSON.stringify(a.testInput)} ===`);
        const id = await actorId(a.name);
        const run = await api(`/acts/${id}/runs?waitForFinish=60&memory=1024&timeout=900`, { method: 'POST', body: a.testInput });
        let r = run;
        while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(r.status)) {
            r = await api(`/actor-runs/${run.id}?waitForFinish=60`);
        }
        const secs = Math.round((new Date(r.finishedAt) - new Date(r.startedAt)) / 1000);
        console.log(`status=${r.status} duration=${secs}s usageUsd=${r.usageTotalUsd?.toFixed?.(4)}`);
        const items = await api(`/datasets/${r.defaultDatasetId}/items?clean=1&limit=1000`);
        console.log(`items=${items.length}`);
        for (const it of a.printAllItems ? items : items.slice(0, 4)) console.log('  ', JSON.stringify(it).slice(0, a.maxItemChars ?? 1500));
        const log = await api(`/logs/${r.id}`);
        const interesting = String(log).split('\n').filter((l) => /WARN|ERROR|Error|failed|Done:/.test(l));
        console.log('--- log highlights ---\n' + interesting.slice(-40).join('\n'));
        // Some Actors (e.g. the boost monitor) legitimately return nothing when nothing changed.
        if (r.status !== 'SUCCEEDED' || (items.length === 0 && !a.allowEmpty)) failures++;
        try {
            const summary = await api(`/key-value-stores/${r.defaultKeyValueStoreId}/records/SUMMARY`);
            console.log('SUMMARY', JSON.stringify(summary).slice(0, 1500));
        } catch { /* no summary record */ }
    }
    console.log(`\n${failures ? `❌ ${failures} Actor run(s) failed or returned nothing` : '✅ all Actors returned data'}`);
    if (failures) process.exitCode = 1;
}

async function configure() {
    for (const a of ACTORS.filter((x) => x.listing)) {
        if (a.listing.seoTitle.length > 60) throw new Error(`${a.name}: seoTitle is ${a.listing.seoTitle.length} chars; Apify allows 60`);
        console.log(`\n=== ${a.name} ===`);
        const id = await actorId(a.name);
        const live = await api(`/acts/${id}`);
        const updates = {
            'title, description, categories, SEO, run defaults': {
                ...a.listing,
                defaultRunOptions: { build: 'latest', memoryMbytes: 512, timeoutSecs: a.timeoutSecs ?? 3600 },
            },
        };
        // Re-submitting pricing on a public Actor can register as a price change, so only send it when it differs.
        const livePrice = (live.pricingInfos ?? []).at(-1)?.pricingPerEvent?.actorChargeEvents?.[a.event.name]?.eventPriceUsd;
        if (livePrice === a.event.priceUsd) {
            console.log(`= pricing already ${a.event.name} $${livePrice}, unchanged`);
        } else {
            updates['pay-per-event pricing'] = {
                pricingInfos: [{
                    pricingModel: 'PAY_PER_EVENT',
                    pricingPerEvent: { actorChargeEvents: { [a.event.name]: { eventTitle: a.event.title, eventDescription: a.event.description, eventPriceUsd: a.event.priceUsd } } },
                }],
            };
        }
        for (const [label, body] of Object.entries(updates)) {
            try {
                await api(`/acts/${id}`, { method: 'PUT', body });
                console.log(`✅ ${label}`);
            } catch (e) {
                console.log(`❌ ${label}: ${e.message}`);
                process.exitCode = 1;
            }
        }
        const act = await api(`/acts/${id}`);
        console.log(JSON.stringify({
            title: act.title,
            categories: act.categories,
            seoTitle: act.seoTitle,
            hasPicture: Boolean(act.pictureUrl),
            pricing: (act.pricingInfos ?? []).map((p) => ({ model: p.pricingModel, events: p.pricingPerEvent?.actorChargeEvents })),
        }, null, 2));
    }
}

async function publish() {
    for (const a of ACTORS.filter((x) => x.listing)) {
        try {
            await api(`/acts/${await actorId(a.name)}`, { method: 'PUT', body: { isPublic: true } });
            console.log(`✅ ${a.name} public: https://apify.com/${EXPECTED_ACCOUNT}/${a.name}`);
        } catch (e) {
            console.log(`❌ ${a.name}: ${e.message}`);
            process.exitCode = 1;
        }
    }
}

const stage = process.argv[2];
const stages = { whoami, test, configure, publish };
if (!stages[stage]) throw new Error(`Usage: apify-setup.mjs <${Object.keys(stages).join('|')}>`);
await stages[stage]();

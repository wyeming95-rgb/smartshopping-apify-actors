import { Actor, log } from 'apify';
import { isFetchFailure, keepRow, scrapeDirectory } from './core/directory-run.js';
import { fetchPage } from './core/http.js';
import { PORTALS } from './core/portals.js';
import { SITES, filterStores, looksLikeStorePage, storeUrls } from './directory.js';

// Pay-per-event name; must match the event configured in the Actor's monetization settings.
const RESULT_EVENT = 'store-rate';

await Actor.init();

const {
    countries = ['US', 'UK', 'AU'],
    maxStores = 100,
    storeKeywords = [],
    includeNoCashback = false,
    minRatePercent = 0,
} = (await Actor.getInput()) ?? {};

const chosen = [...new Set(countries.map((c) => String(c).toUpperCase()))].filter((c) => SITES[c]);
if (!chosen.length) throw new Error('Choose at least one country: US, UK or AU.');

// Build one queue across countries: each country's matching stores, capped at maxStores per country.
const queue = [];
const perCountry = {};
for (const country of chosen) {
    const site = SITES[country];
    const sitemap = await fetchPage(`${site.base}/sitemap.xml`);
    const all = sitemap.status === 200 ? storeUrls(sitemap.html, site.base) : [];
    const matching = filterStores(all, storeKeywords);
    const picked = maxStores > 0 ? matching.slice(0, maxStores) : matching;
    perCountry[country] = { storesInSitemap: all.length, storesMatching: matching.length, checking: picked.length };
    if (!all.length) log.warning(`TopCashback ${country}: store list unavailable (HTTP ${sitemap.status}${sitemap.error ? `: ${sitemap.error}` : ''})`);
    else log.info(`TopCashback ${country}: ${all.length} stores, ${matching.length} match, checking ${picked.length}`);
    queue.push(...picked.map((s) => ({ ...s, country })));
}
if (!Object.values(perCountry).some((c) => c.storesInSitemap)) throw new Error('TopCashback\'s store lists are unavailable right now. Try again later.');

async function checkStore({ slug, url, country }) {
    const site = SITES[country];
    const page = await fetchPage(url);
    if (isFetchFailure(page)) {
        log.warning(`${country} ${slug}: ${page.error ?? `HTTP ${page.status}`}`);
        return { status: 'error' };
    }
    const result = PORTALS.find((p) => p.id === site.portalId).parse(page);
    if (!result.listed || !looksLikeStorePage(page.html)) return { status: 'not-listed' };
    const rate = result.rate;
    return {
        store: result.merchantName,
        slug,
        country,
        status: rate ? 'ok' : 'rate-not-found',
        rateText: rate?.rateText ?? null,
        rateType: rate?.rateType ?? null,
        rateValue: rate?.rateValue ?? null,
        currency: rate?.currency ?? site.currency,
        isUpTo: rate?.isUpTo ?? null,
        url: page.finalUrl ?? url,
        checkedAt: new Date().toISOString(),
    };
}

// Requests are throttled per host, so interleaving countries lets the three sites be fetched side by side.
const interleaved = [];
const byCountry = chosen.map((c) => queue.filter((s) => s.country === c));
for (let i = 0; byCountry.some((q) => i < q.length); i++) for (const q of byCountry) if (i < q.length) interleaved.push(q[i]);

const summary = await scrapeDirectory({
    stores: interleaved,
    check: checkStore,
    keep: keepRow({ minRatePercent, includeNoCashback }),
    event: RESULT_EVENT,
    concurrency: 4 * chosen.length,
});
await Actor.setValue('SUMMARY', { countries: perCountry, ...summary });
log.info(`Done: ${summary.saved} stores saved (${summary.withCashback} with cash back, ${summary.notListed} not store pages or gone, ${summary.errors} errors).`);
await Actor.exit();

import { Actor, log } from 'apify';
import { fetchPage, fetchPageHead } from './core/http.js';
import { PORTALS } from './core/portals.js';
import { SITEMAP_URL, filterStores, storeIdOf, storeUrls } from './directory.js';

// Pay-per-event name; must match the event configured in the Actor's monetization settings.
const RESULT_EVENT = 'store-rate';
const CONCURRENCY = 4; // requests still go out at most one per 400 ms (see core/http.js)
const rakuten = PORTALS.find((p) => p.id === 'rakuten-us');

await Actor.init();

const {
    maxStores = 100,
    storeKeywords = [],
    includeNoCashback = false,
    minRatePercent = 0,
} = (await Actor.getInput()) ?? {};

const sitemap = await fetchPage(SITEMAP_URL);
const all = sitemap.status === 200 ? storeUrls(sitemap.html) : [];
if (!all.length) throw new Error(`Rakuten's store list is unavailable right now (HTTP ${sitemap.status}${sitemap.error ? `: ${sitemap.error}` : ''}). Try again later.`);
const matching = filterStores(all, storeKeywords);
const queue = maxStores > 0 ? matching.slice(0, maxStores) : matching;
log.info(`${all.length} stores in Rakuten's sitemap, ${matching.length} match, checking ${queue.length}`);

const chargingManager = Actor.getChargingManager();
const counts = { checked: 0, withCashback: 0, noCashback: 0, notListed: 0, rateNotFound: 0, errors: 0, pushed: 0 };
const top = [];
let stopped = false;

async function checkStore({ slug, url }) {
    const page = await fetchPageHead(url);
    counts.checked++;
    if (page.status === 0 || page.status === 403 || page.status === 429 || page.status >= 500) {
        counts.errors++;
        log.warning(`${slug}: ${page.error ?? `HTTP ${page.status}`}`);
        return null;
    }
    const result = rakuten.parse(page);
    if (!result.listed) {
        counts.notListed++;
        return null;
    }
    const rate = result.rate;
    if (result.noCashback) counts.noCashback++;
    else if (rate) counts.withCashback++;
    else counts.rateNotFound++;
    return {
        store: result.merchantName,
        slug,
        storeId: storeIdOf(page.html),
        status: result.noCashback ? 'no-cashback' : rate ? 'ok' : 'rate-not-found',
        rateText: rate?.rateText ?? null,
        rateType: rate?.rateType ?? null,
        rateValue: rate?.rateValue ?? null,
        currency: rate?.currency ?? null,
        isUpTo: rate?.isUpTo ?? null,
        url: page.finalUrl ?? url,
        checkedAt: new Date().toISOString(),
    };
}

const wanted = (row) => row && (row.status === 'ok'
    ? !(minRatePercent > 0 && row.rateType === 'percent' && row.rateValue < minRatePercent)
    : includeNoCashback);

// Pushes go one at a time so the cost limit is checked before every charge, even with parallel fetches.
let pushing = Promise.resolve();
const save = (row) => {
    pushing = pushing.then(async () => {
        if (stopped) return;
        const { eventChargeLimitReached } = await Actor.pushData(row, RESULT_EVENT);
        counts.pushed++;
        if (row.rateType === 'percent') top.push(row);
        if (eventChargeLimitReached || chargingManager.calculateMaxEventChargeCountWithinLimit(RESULT_EVENT) <= 0) {
            log.info('Maximum cost per run reached — stopping early.');
            stopped = true;
        }
    });
    return pushing;
};

let next = 0;
async function worker() {
    while (!stopped && next < queue.length) {
        const row = await checkStore(queue[next++]);
        if (wanted(row)) await save(row);
    }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

await Actor.setValue('SUMMARY', {
    storesInSitemap: all.length,
    storesMatching: matching.length,
    ...counts,
    stoppedAtCostLimit: stopped,
    topPercentRates: top.sort((a, b) => b.rateValue - a.rateValue).slice(0, 15).map((r) => `${r.store}: ${r.rateText}`),
});
log.info(`Done: ${counts.pushed} stores saved (${counts.withCashback} with cash back, ${counts.notListed} no longer listed, ${counts.errors} errors).`);
await Actor.exit();

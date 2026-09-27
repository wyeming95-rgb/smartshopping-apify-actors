import { Actor, log } from 'apify';
import { isFetchFailure, keepRow, scrapeDirectory } from './core/directory-run.js';
import { fetchPage, fetchPageHead } from './core/http.js';
import { PORTALS } from './core/portals.js';
import { SITEMAP_URL, filterStores, storeIdOf, storeUrls } from './directory.js';

// Pay-per-event name; must match the event configured in the Actor's monetization settings.
const RESULT_EVENT = 'store-rate';
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

async function checkStore({ slug, url }) {
    // Store pages are ~2 MB, but the rate is in the og:title in <head>.
    const page = await fetchPageHead(url);
    if (isFetchFailure(page)) {
        log.warning(`${slug}: ${page.error ?? `HTTP ${page.status}`}`);
        return { status: 'error' };
    }
    const result = rakuten.parse(page);
    if (!result.listed) return { status: 'not-listed' };
    const rate = result.rate;
    return {
        store: result.merchantName,
        slug,
        storeId: storeIdOf(page.html),
        status: result.noCashback ? 'no-cashback' : rate ? 'ok' : 'rate-not-found',
        rateText: rate?.rateText ?? null,
        rateType: rate?.rateType ?? null,
        rateValue: rate?.rateValue ?? null,
        currency: rate?.currency ?? 'USD',
        isUpTo: rate?.isUpTo ?? null,
        url: page.finalUrl ?? url,
        checkedAt: new Date().toISOString(),
    };
}

const summary = await scrapeDirectory({ stores: queue, check: checkStore, keep: keepRow({ minRatePercent, includeNoCashback }), event: RESULT_EVENT });
await Actor.setValue('SUMMARY', { storesInSitemap: all.length, storesMatching: matching.length, ...summary });
log.info(`Done: ${summary.saved} stores saved (${summary.withCashback} with cash back, ${summary.notListed} no longer listed, ${summary.errors} errors).`);
await Actor.exit();

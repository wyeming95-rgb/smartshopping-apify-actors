// Runs a store-directory scrape for the portal scraper Actors: checks stores in parallel (requests are still
// throttled per host in http.js), saves the wanted rows with a pay-per-event charge one at a time so the cost
// limit is checked before every charge, and stops cleanly when the limit is reached.
import { Actor, log } from 'apify';

const COUNTERS = { ok: 'withCashback', 'no-cashback': 'noCashback', 'rate-not-found': 'rateNotFound', 'not-listed': 'notListed', error: 'errors' };

/**
 * @param {object[]} stores                      what to check, in order
 * @param {(store) => Promise<object>} check     returns a row with `status`: ok | no-cashback | rate-not-found | not-listed | error
 * @param {(row) => boolean} keep                which rows to save (not-listed and error rows are never saved)
 * @param {string} event                         pay-per-event name charged per saved row
 */
export async function scrapeDirectory({ stores, check, keep, event, concurrency = 4 }) {
    const chargingManager = Actor.getChargingManager();
    const counts = { checked: 0, withCashback: 0, noCashback: 0, rateNotFound: 0, notListed: 0, errors: 0, saved: 0 };
    const saved = [];
    let stopped = false;

    let pushing = Promise.resolve();
    const save = (row) => {
        pushing = pushing.then(async () => {
            if (stopped) return;
            const { eventChargeLimitReached } = await Actor.pushData(row, event);
            counts.saved++;
            saved.push(row);
            if (eventChargeLimitReached || chargingManager.calculateMaxEventChargeCountWithinLimit(event) <= 0) {
                log.info('Maximum cost per run reached — stopping early.');
                stopped = true;
            }
        });
        return pushing;
    };

    let next = 0;
    const worker = async () => {
        while (!stopped && next < stores.length) {
            const row = await check(stores[next++]);
            counts.checked++;
            counts[COUNTERS[row.status]]++;
            if (row.status !== 'not-listed' && row.status !== 'error' && keep(row)) await save(row);
        }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));

    return {
        ...counts,
        stoppedAtCostLimit: stopped,
        topPercentRates: saved.filter((r) => r.rateType === 'percent').sort((a, b) => b.rateValue - a.rateValue).slice(0, 15)
            .map((r) => `${r.store}${r.country ? ` (${r.country})` : ''}: ${r.rateText}`),
    };
}

/** Default row filter: stores paying cash back, at least `minRatePercent` for percentage rates; others only on request. */
export const keepRow = ({ minRatePercent = 0, includeNoCashback = false }) => (row) => (row.status === 'ok'
    ? !(minRatePercent > 0 && row.rateType === 'percent' && row.rateValue < minRatePercent)
    : includeNoCashback);

/** Keeps stores whose slug contains any keyword (case- and punctuation-insensitive); all stores without keywords. */
export function filterStores(stores, keywords = []) {
    const keys = keywords.map((k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean);
    if (!keys.length) return stores;
    return stores.filter((s) => {
        const slug = s.slug.replace(/[^a-z0-9]/g, '');
        return keys.some((k) => slug.includes(k));
    });
}

/** Store pages from a sitemap: <loc> URLs that `slugOf` recognises, one per slug, in sitemap order. */
export function sitemapStores(xml, slugOf) {
    const seen = new Set();
    const out = [];
    for (const [, loc] of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
        const url = loc.replace(/&amp;/g, '&');
        const slug = slugOf(url);
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        out.push({ slug, url });
    }
    return out;
}

/** True for fetch results that say nothing about the store (network errors, blocks, outages). */
export const isFetchFailure = (page) => page.status === 0 || page.status === 403 || page.status === 429 || page.status >= 500;

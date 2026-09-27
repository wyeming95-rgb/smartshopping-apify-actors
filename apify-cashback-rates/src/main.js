import { Actor, log } from 'apify';
import { fetchPage } from './http.js';
import { PORTALS } from './portals.js';
import { clean } from './rates.js';

// Pay-per-event name; must match the event configured in the Actor's monetization settings.
const RESULT_EVENT = 'cashback-rate';

await Actor.init();

const {
    merchants = [],
    countries = ['US', 'UK', 'AU'],
    portals: portalFilter = [],
    includeNotListed = false,
} = (await Actor.getInput()) ?? {};

const wantedCountries = new Set(countries.map((c) => c.toUpperCase()));
const portals = PORTALS.filter((p) => wantedCountries.has(p.country) && (!portalFilter.length || portalFilter.includes(p.id)));
// Deduplicate case-insensitively, keeping the first spelling.
const seen = new Set();
const names = merchants.map((m) => String(m).trim()).filter((m) => m && !seen.has(m.toLowerCase()) && seen.add(m.toLowerCase()));
if (!names.length) throw new Error('Add at least one merchant, e.g. "Nike" or "asos.com".');
log.info(`Checking ${names.length} merchants on ${portals.length} portals: ${portals.map((p) => p.id).join(', ')}`);

const chargingManager = Actor.getChargingManager();
const norm = (s) => clean(s).toLowerCase().replace(/^www\./, '').replace(/\.(com|co\.uk|com\.au)$/, '').replace(/[^a-z0-9]/g, '');

// Directory-based portals load their store list once per run.
const directories = new Map();
async function directoryFor(portal) {
    if (!directories.has(portal.id)) {
        directories.set(portal.id, fetchPage(portal.directoryUrl).then((page) => {
            const stores = page.status === 200 ? portal.parseDirectory(page.html) : new Map();
            log.info(`${portal.id}: ${stores.size} stores in directory`);
            return [...stores.values()];
        }));
    }
    return directories.get(portal.id);
}

async function check(portal, merchant) {
    const base = { merchant, portal: portal.id, portalName: portal.name, country: portal.country };
    if (portal.parseDirectory) {
        const stores = await directoryFor(portal);
        const key = norm(merchant);
        const hit = stores.find((s) => norm(s.name) === key) ?? stores.find((s) => norm(s.name).startsWith(key) && key.length >= 4);
        return hit ? { ...base, listed: true, merchantName: hit.name, rate: hit.rate, url: hit.url } : { ...base, listed: false, url: portal.directoryUrl };
    }
    let lastUrl = null;
    for (const url of portal.candidates(merchant)) {
        const page = await fetchPage(url);
        lastUrl = url;
        if (page.error) log.warning(`${portal.id} ${url}: ${page.error}`);
        const result = portal.parse(page);
        if (result.listed) return { ...base, ...result, url: page.finalUrl ?? url };
    }
    return { ...base, listed: false, url: lastUrl };
}

const toRow = (r) => ({
    merchant: r.merchant,
    matchedName: r.merchantName ?? null,
    portal: r.portal,
    portalName: r.portalName,
    country: r.country,
    listed: r.listed,
    status: !r.listed ? 'not-listed' : r.paused ? 'paused' : r.noCashback ? 'no-cashback' : r.rate ? 'ok' : 'rate-not-found',
    rateText: r.rate?.rateText ?? null,
    rateType: r.rate?.rateType ?? null,
    rateValue: r.rate?.rateValue ?? null,
    currency: r.rate?.currency ?? null,
    isUpTo: r.rate?.isUpTo ?? null,
    previousRateText: r.previousRate?.rateText ?? null,
    url: r.url,
    checkedAt: new Date().toISOString(),
});

const best = {};
let charged = 0;
let limitReached = false;

for (const merchant of names) {
    if (limitReached) break;
    const results = await Promise.all(portals.map((p) => check(p, merchant).catch((err) => {
        log.warning(`${p.id} failed for ${merchant}: ${err.message}`);
        return { merchant, portal: p.id, portalName: p.name, country: p.country, listed: false, url: null };
    })));
    for (const row of results.map(toRow)) {
        if (limitReached) break;
        if (row.status === 'ok') {
            const { eventChargeLimitReached } = await Actor.pushData(row, RESULT_EVENT);
            charged++;
            const slot = ((best[merchant] ??= {})[row.country] ??= null);
            // Percentages are compared with percentages; a fixed amount only wins if no percentage is offered.
            const better = !slot || (row.rateType === slot.rateType ? row.rateValue > slot.rateValue : row.rateType === 'percent');
            if (better) best[merchant][row.country] = { portal: row.portal, portalName: row.portalName, rateText: row.rateText, rateType: row.rateType, rateValue: row.rateValue, currency: row.currency, url: row.url };
            if (eventChargeLimitReached || chargingManager.calculateMaxEventChargeCountWithinLimit(RESULT_EVENT) <= 0) {
                log.info('Maximum cost per run reached — stopping early.');
                limitReached = true;
            }
        } else if (includeNotListed || row.listed) {
            await Actor.pushData(row); // not charged: not listed, paused, or no rate shown
        }
    }
    log.info(`${merchant}: ${results.filter((r) => r.listed && r.rate).length}/${portals.length} portals with a rate`);
}

await Actor.setValue('SUMMARY', { merchants: names.length, portals: portals.map((p) => p.id), ratesFound: charged, bestRate: best });
log.info(`Done: ${charged} cashback rates for ${names.length} merchants.`);
await Actor.exit();

// Looks a merchant up on one portal: builds candidate store URLs (or matches the portal's
// store directory), fetches them and returns the parsed result. Shared by all cashback Actors.
import { fetchPage } from './http.js';
import { PORTALS } from './portals.js';
import { clean } from './rates.js';

/** Portals in the given countries, optionally limited to specific portal IDs. */
export function selectPortals(countries = ['US', 'UK', 'AU'], only = []) {
    const wanted = new Set(countries.map((c) => c.toUpperCase()));
    return PORTALS.filter((p) => wanted.has(p.country) && (!only.length || only.includes(p.id)));
}

/** Trimmed merchant names, deduplicated case-insensitively (first spelling wins). */
export function uniqueNames(merchants = []) {
    const seen = new Set();
    return merchants.map((m) => String(m).trim()).filter((m) => m && !seen.has(m.toLowerCase()) && seen.add(m.toLowerCase()));
}

const norm = (s) => clean(s).toLowerCase().replace(/^www\./, '').replace(/\.(com|co\.uk|com\.au)$/, '').replace(/[^a-z0-9]/g, '');

export function createChecker(log) {
    // Directory-based portals load their store list once per run.
    const directories = new Map();
    function directoryFor(portal) {
        if (!directories.has(portal.id)) {
            directories.set(portal.id, fetchPage(portal.directoryUrl).then((page) => {
                const stores = page.status === 200 ? portal.parseDirectory(page.html) : new Map();
                log.info(`${portal.id}: ${stores.size} stores in directory`);
                return { stores: [...stores.values()], error: stores.size ? null : `directory unavailable (HTTP ${page.status})` };
            }));
        }
        return directories.get(portal.id);
    }

    return async function check(portal, merchant) {
        const base = { merchant, portal: portal.id, portalName: portal.name, country: portal.country };
        try {
            if (portal.parseDirectory) {
                const { stores, error } = await directoryFor(portal);
                if (error) return { ...base, listed: false, url: portal.directoryUrl, error };
                const key = norm(merchant);
                const hit = stores.find((s) => norm(s.name) === key) ?? stores.find((s) => norm(s.name).startsWith(key) && key.length >= 4);
                return hit ? { ...base, listed: true, merchantName: hit.name, rate: hit.rate, url: hit.url } : { ...base, listed: false, url: portal.directoryUrl };
            }
            let lastUrl = null;
            let failure = null;
            for (const url of portal.candidates(merchant)) {
                const page = await fetchPage(url);
                lastUrl = url;
                if (page.error) log.warning(`${portal.id} ${url}: ${page.error}`);
                // Network errors, blocks and server errors say nothing about whether the store is listed.
                if (page.status === 0 || page.status === 403 || page.status === 429 || page.status >= 500) {
                    failure = page.error ?? `HTTP ${page.status}`;
                    continue;
                }
                const result = portal.parse(page);
                if (result.listed) return { ...base, ...result, url: page.finalUrl ?? url };
            }
            return { ...base, listed: false, url: lastUrl, ...(failure ? { error: failure } : {}) };
        } catch (err) {
            log.warning(`${portal.id} failed for ${merchant}: ${err.message}`);
            return { ...base, listed: false, url: null, error: err.message };
        }
    };
}

/** Flat output row for one merchant on one portal. */
export const toRow = (r) => ({
    merchant: r.merchant,
    matchedName: r.merchantName ?? null,
    portal: r.portal,
    portalName: r.portalName,
    country: r.country,
    listed: r.listed,
    status: r.error && !r.listed ? 'error' : !r.listed ? 'not-listed' : r.paused ? 'paused' : r.noCashback ? 'no-cashback' : r.rate ? 'ok' : 'rate-not-found',
    rateText: r.rate?.rateText ?? null,
    rateType: r.rate?.rateType ?? null,
    rateValue: r.rate?.rateValue ?? null,
    currency: r.rate?.currency ?? null,
    isUpTo: r.rate?.isUpTo ?? null,
    previousRateText: r.previousRate?.rateText ?? null,
    previousRateValue: r.previousRate?.rateValue ?? null,
    url: r.url,
    checkedAt: new Date().toISOString(),
});

import { Actor, log } from 'apify';
import { uniqueNames } from './core/checker.js';
import { isFetchFailure } from './core/directory-run.js';
import { fetchPage } from './core/http.js';
import { PORTALS } from './core/portals.js';
import { classify, hashOf, rakutenOffers, topCashbackOffers } from './offers.js';
import { POPULAR_STORES } from './stores.js';

// Pay-per-event name; must match the event configured in the Actor's monetization settings.
const RESULT_EVENT = 'offer';
const STATE_STORE = 'black-friday-tracker-state';
const MAX_REMEMBERED = 20000; // offer IDs remembered per state name for onlyNew
const SOURCES = {
    'rakuten-us': rakutenOffers,
    'topcashback-us': topCashbackOffers,
    'topcashback-uk': topCashbackOffers,
    'topcashback-au': topCashbackOffers,
};

await Actor.init();

const {
    stores = [],
    countries = ['US', 'UK', 'AU'],
    onlyBlackFriday = false,
    onlyWithCode = false,
    minDiscountPercent = 0,
    keywords = [],
    onlyNew = false,
    stateName = 'default',
} = (await Actor.getInput()) ?? {};

const wanted = new Set(countries.map((c) => String(c).toUpperCase()));
const portals = PORTALS.filter((p) => SOURCES[p.id] && wanted.has(p.country));
if (!portals.length) throw new Error('Choose at least one country: US, UK or AU.');

// Without a store list, each country gets its own list of big retailers.
const jobs = [];
for (const portal of portals) {
    const names = uniqueNames(stores.length ? stores : POPULAR_STORES[portal.country]);
    for (const store of names) jobs.push({ store, portal });
}
log.info(`Checking ${jobs.length} store pages on ${portals.map((p) => p.id).join(', ')}`);

const words = keywords.map((k) => String(k).trim().toLowerCase()).filter(Boolean);
const keepOffer = (o) => (!onlyBlackFriday || o.isBlackFriday || o.isCyberMonday)
    && (!onlyWithCode || o.code)
    && (!(minDiscountPercent > 0) || (o.maxDiscountPercent ?? 0) >= minDiscountPercent)
    && (!words.length || words.some((w) => `${o.title} ${o.description ?? ''}`.toLowerCase().includes(w)));

const pathOf = (u) => {
    try { return new URL(u).pathname.replace(/\/+$/, ''); } catch { return ''; }
};

/** The store's page on the portal and its offers, or { status } when it is not listed or unreachable. */
async function checkStore({ store, portal }) {
    let failure = null;
    for (const url of portal.candidates(store)) {
        const page = await fetchPage(url);
        if (isFetchFailure(page)) {
            failure = page.error ?? `HTTP ${page.status}`;
            continue;
        }
        const result = portal.parse(page);
        if (!result.listed) continue;
        const storeId = page.html.match(/<meta[^>]+deeplink_path["'][^>]*content=["'][^"']*store\/(\d+)/i)?.[1] ?? null;
        const storeUrl = page.finalUrl ?? url;
        const slug = pathOf(storeUrl).split('/').pop().toLowerCase();
        const offers = SOURCES[portal.id](page.html, storeId).map((o) => {
            const row = {
                id: `${portal.id}:${slug}:${o.offerId ?? hashOf(`${o.title}|${o.code ?? ''}`)}`,
                store: result.merchantName ?? store,
                portal: portal.id,
                portalName: portal.name,
                country: portal.country,
                title: o.title,
                description: o.description,
                ...classify(o),
                badge: o.badge,
                cashback: o.cashback,
                previousCashback: o.previousCashback,
                storeCashback: result.rate?.rateText ?? null,
                offerUrl: o.offerUrl ?? storeUrl,
                storeUrl,
                scrapedAt: new Date().toISOString(),
            };
            return row;
        });
        return { status: 'ok', offers };
    }
    if (failure) log.warning(`${portal.id} ${store}: ${failure}`);
    return { status: failure ? 'error' : 'not-listed', offers: [] };
}

// onlyNew: offers returned by earlier runs with the same state name are skipped.
const kv = onlyNew ? await Actor.openKeyValueStore(STATE_STORE) : null;
const stateKey = `seen-${String(stateName).toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 200) || 'default'}`;
const seenBefore = new Set(onlyNew ? (await kv.getValue(stateKey)) ?? [] : []);

const chargingManager = Actor.getChargingManager();
const counts = { storePages: jobs.length, listed: 0, notListed: 0, errors: 0, offersFound: 0, blackFridayOffers: 0, alreadySeen: 0, saved: 0 };
const pushed = [];
const seenThisRun = new Set();
let stopped = false;

// Rows are saved one at a time so the cost limit is checked before every charge.
let pushing = Promise.resolve();
const save = (row) => {
    pushing = pushing.then(async () => {
        if (stopped) return;
        const { eventChargeLimitReached } = await Actor.pushData(row, RESULT_EVENT);
        pushed.push(row);
        counts.saved++;
        if (eventChargeLimitReached || chargingManager.calculateMaxEventChargeCountWithinLimit(RESULT_EVENT) <= 0) {
            log.info('Maximum cost per run reached — stopping early.');
            stopped = true;
        }
    });
    return pushing;
};

let next = 0;
const worker = async () => {
    while (!stopped && next < jobs.length) {
        const { status, offers } = await checkStore(jobs[next++]);
        counts[{ ok: 'listed', 'not-listed': 'notListed', error: 'errors' }[status]]++;
        for (const offer of offers) {
            if (seenThisRun.has(offer.id)) continue;
            seenThisRun.add(offer.id);
            counts.offersFound++;
            if (offer.isBlackFriday || offer.isCyberMonday) counts.blackFridayOffers++;
            if (seenBefore.has(offer.id)) {
                counts.alreadySeen++;
                continue;
            }
            if (keepOffer(offer)) await save(offer);
        }
    }
};
await Promise.all(Array.from({ length: Math.min(8, 2 * portals.length) }, worker));
await pushing;

if (onlyNew) {
    // Remember only what was actually returned, so offers cut off by the cost limit come back next run.
    await kv.setValue(stateKey, [...pushed.map((o) => o.id), ...seenBefore].slice(0, MAX_REMEMBERED));
}

const byEvent = {};
for (const o of pushed) if (o.saleEvent) byEvent[o.saleEvent] = (byEvent[o.saleEvent] ?? 0) + 1;
await Actor.setValue('SUMMARY', {
    ...counts,
    savedByEvent: byEvent,
    stoppedAtCostLimit: stopped,
    biggestDiscounts: pushed.filter((o) => o.maxDiscountPercent).sort((a, b) => b.maxDiscountPercent - a.maxDiscountPercent).slice(0, 15)
        .map((o) => `${o.store} (${o.country}): ${o.title}${o.code ? ` [${o.code}]` : ''}`),
});
if (!counts.listed && counts.errors) throw new Error('No store page could be read right now. Try again later.');
log.info(`Done: ${counts.saved} offers saved from ${counts.listed} store pages (${counts.offersFound} offers found, ${counts.blackFridayOffers} Black Friday or Cyber Monday).`);
await Actor.exit();

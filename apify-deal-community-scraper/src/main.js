import { Actor, log } from 'apify';
import { fetchPage } from './core/http.js';
import { FEEDS, items } from './feeds.js';

// Pay-per-event name; must match the event configured in the Actor's monetization settings.
const RESULT_EVENT = 'deal';
const STATE_STORE = 'deal-community-scraper-state';
const MAX_REMEMBERED = 5000; // deal IDs remembered per state name for onlyNew

await Actor.init();

const {
    sources = Object.keys(FEEDS),
    keywords = [],
    excludeKeywords = [],
    minScore = null,
    maxPrice = null,
    onlyCashback = false,
    onlyNew = false,
    stateName = 'default',
} = (await Actor.getInput()) ?? {};

const chosen = sources.filter((s) => FEEDS[s]);
if (!chosen.length) throw new Error(`Choose at least one source: ${Object.keys(FEEDS).join(', ')}.`);

const words = (list) => list.map((k) => String(k).trim().toLowerCase()).filter(Boolean);
const include = words(keywords);
const exclude = words(excludeKeywords);
const matches = (deal) => {
    const haystack = `${deal.title} ${deal.description ?? ''} ${deal.store ?? ''} ${deal.category ?? ''}`.toLowerCase();
    return (!include.length || include.some((k) => haystack.includes(k)))
        && !exclude.some((k) => haystack.includes(k))
        && (minScore === null || (deal.score !== null && deal.score >= minScore))
        && (maxPrice === null || (deal.price !== null && deal.price <= maxPrice))
        && (!onlyCashback || deal.mentionsCashback);
};

const perSource = {};
const deals = [];
const seenThisRun = new Set();
for (const source of chosen) {
    const feed = FEEDS[source];
    const page = await fetchPage(feed.url);
    const blocks = page.status === 200 ? items(page.html) : [];
    if (!blocks.length) log.warning(`${source}: feed unavailable (HTTP ${page.status}${page.error ? `: ${page.error}` : ''})`);
    let parsed = 0;
    for (const block of blocks) {
        const deal = { source, ...feed.parse(block, feed), scrapedAt: new Date().toISOString() };
        parsed++;
        // hotukdeals' hot and new feeds can list the same deal.
        if (seenThisRun.has(deal.id)) continue;
        seenThisRun.add(deal.id);
        deals.push(deal);
    }
    perSource[source] = { inFeed: parsed, ok: page.status === 200 };
}
if (!Object.values(perSource).some((s) => s.inFeed)) throw new Error('No deal feed could be read right now. Try again later.');

// With onlyNew, deals returned by earlier runs with the same state name are skipped.
const store = onlyNew ? await Actor.openKeyValueStore(STATE_STORE) : null;
const stateKey = `seen-${String(stateName).toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 200) || 'default'}`;
const seenBefore = new Set(onlyNew ? (await store.getValue(stateKey)) ?? [] : []);

const wanted = deals.filter((d) => !seenBefore.has(d.id) && matches(d));
const chargingManager = Actor.getChargingManager();
const pushed = [];
for (const deal of wanted) {
    const { eventChargeLimitReached } = await Actor.pushData(deal, RESULT_EVENT);
    pushed.push(deal);
    if (eventChargeLimitReached || chargingManager.calculateMaxEventChargeCountWithinLimit(RESULT_EVENT) <= 0) {
        log.info('Maximum cost per run reached — stopping early.');
        break;
    }
}

if (onlyNew) {
    // Remember only what was actually returned, so deals cut off by the cost limit come back next run.
    const remembered = [...pushed.map((d) => d.id), ...seenBefore].slice(0, MAX_REMEMBERED);
    await store.setValue(stateKey, remembered);
}

await Actor.setValue('SUMMARY', {
    sources: perSource,
    dealsInFeeds: deals.length,
    matchingFilters: deals.filter(matches).length,
    alreadySeen: onlyNew ? deals.filter((d) => seenBefore.has(d.id)).length : undefined,
    saved: pushed.length,
    mentioningCashback: pushed.filter((d) => d.mentionsCashback).length,
});
log.info(`Done: ${pushed.length} deals saved from ${chosen.length} feeds (${deals.length} in the feeds).`);
await Actor.exit();

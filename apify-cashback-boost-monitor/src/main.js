import { Actor, log } from 'apify';
import { detectChanges, stateKey } from './changes.js';
import { createChecker, selectPortals, toRow, uniqueNames } from './core/checker.js';

// Pay-per-event name; must match the event configured in the Actor's monetization settings.
const RESULT_EVENT = 'rate-change';
const STATE_STORE = 'cashback-boost-monitor-state';

await Actor.init();

const {
    merchants = [],
    countries = ['US', 'UK', 'AU'],
    portals: portalFilter = [],
    watchlistName = 'default',
    changeTypes = ['increase', 'portal-boost', 'new', 'decrease', 'removed', 'changed'],
    minChangePoints = 0,
} = (await Actor.getInput()) ?? {};

const portals = selectPortals(countries, portalFilter);
const names = uniqueNames(merchants);
if (!names.length) throw new Error('Add at least one store to watch, e.g. "Nike" or "asos.com".');

// The previous run's rates live in a named key-value store in the user's own account, one record per watchlist.
const store = await Actor.openKeyValueStore(STATE_STORE);
const stateRecord = `watchlist-${String(watchlistName).toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 200) || 'default'}`;
const state = (await store.getValue(stateRecord)) ?? { createdAt: new Date().toISOString(), runs: 0, rates: {} };
const firstRun = state.runs === 0;
log.info(`Watchlist "${watchlistName}": ${names.length} stores on ${portals.length} portals${firstRun ? ' (first run: saving a baseline)' : `, run #${state.runs + 1}`}`);

const check = createChecker(log);
const rows = [];
for (const merchant of names) {
    rows.push(...(await Promise.all(portals.map((p) => check(p, merchant)))).map(toRow));
}

const { changes, next } = detectChanges(state.rates, rows, { firstRun });
const wanted = new Set(changeTypes);
const reportable = changes.filter((c) => wanted.has(c.changeType)
    && (c.changePoints === null || Math.abs(c.changePoints) >= minChangePoints));

const chargingManager = Actor.getChargingManager();
let pushed = 0;
for (const change of reportable) {
    const { eventChargeLimitReached } = await Actor.pushData(change, RESULT_EVENT);
    pushed++;
    if (eventChargeLimitReached || chargingManager.calculateMaxEventChargeCountWithinLimit(RESULT_EVENT) <= 0) {
        log.info('Maximum cost per run reached — stopping early.');
        break;
    }
}

// Changes cut off by the cost limit keep their old baseline, so the next run reports them again.
for (const change of reportable.slice(pushed)) {
    const key = stateKey(change);
    if (state.rates[key]) next[key] = state.rates[key];
    else delete next[key];
}
await store.setValue(stateRecord, { ...state, runs: state.runs + 1, lastRunAt: new Date().toISOString(), rates: next });

const count = (type) => reportable.filter((c) => c.changeType === type).length;
await Actor.setValue('SUMMARY', {
    watchlist: watchlistName,
    firstRun,
    storesChecked: names.length,
    portals: portals.map((p) => p.id),
    ratesFound: rows.filter((r) => r.status === 'ok').length,
    changesReported: pushed,
    byType: Object.fromEntries([...wanted].map((t) => [t, count(t)])),
    note: firstRun ? 'First run for this watchlist: current rates saved as the baseline. Only boosts the portals flag themselves ("was X%") are reported now; schedule the Actor to catch every change from the next run on.' : undefined,
});
log.info(`Done: ${pushed} changes (${rows.filter((r) => r.status === 'ok').length} rates checked).`);
await Actor.exit();

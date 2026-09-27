import { Actor, log } from 'apify';
import { createChecker, selectPortals, toRow, uniqueNames } from './core/checker.js';

// Pay-per-event name; must match the event configured in the Actor's monetization settings.
const RESULT_EVENT = 'cashback-rate';

await Actor.init();

const {
    merchants = [],
    countries = ['US', 'UK', 'AU'],
    portals: portalFilter = [],
    includeNotListed = false,
} = (await Actor.getInput()) ?? {};

const portals = selectPortals(countries, portalFilter);
const names = uniqueNames(merchants);
if (!names.length) throw new Error('Add at least one merchant, e.g. "Nike" or "asos.com".');
log.info(`Checking ${names.length} merchants on ${portals.length} portals: ${portals.map((p) => p.id).join(', ')}`);

const chargingManager = Actor.getChargingManager();
const check = createChecker(log);

const best = {};
let charged = 0;
let limitReached = false;

for (const merchant of names) {
    if (limitReached) break;
    const results = await Promise.all(portals.map((p) => check(p, merchant)));
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

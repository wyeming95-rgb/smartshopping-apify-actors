import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

function runActor(input, env = {}) {
    const storage = mkdtempSync(join(tmpdir(), 'actor-'));
    mkdirSync(join(storage, 'key_value_stores/default'), { recursive: true });
    writeFileSync(join(storage, 'key_value_stores/default/INPUT.json'), JSON.stringify(input));
    execFileSync(process.execPath, ['--import', './test/fixtures/mock-fetch.js', 'src/main.js'], {
        cwd: root,
        env: { ...process.env, APIFY_LOCAL_STORAGE_DIR: storage, CRAWLEE_STORAGE_DIR: storage, APIFY_LOG_LEVEL: 'ERROR', ...env },
        stdio: 'pipe',
    });
    const dsDir = join(storage, 'datasets/default');
    const items = readdirSync(dsDir).filter((f) => /^\d+\.json$/.test(f)).sort()
        .map((f) => JSON.parse(readFileSync(join(dsDir, f), 'utf8')));
    const summary = JSON.parse(readFileSync(join(storage, 'key_value_stores/default/SUMMARY.json'), 'utf8'));
    return { items, summary };
}

test('rates for each merchant across portals, with the best rate per country', () => {
    const { items, summary } = runActor({ merchants: ['Nike', 'ASOS', 'nike'] });
    const got = (m) => items.filter((i) => i.merchant === m).map((i) => `${i.portal}:${i.status}:${i.rateText ?? '-'}`).sort();
    assert.deepEqual(got('Nike'), [
        'befrugal-us:ok:10.0%', 'capitalone-shopping-us:ok:2%', 'mrrebates-us:ok:Up to 7%', 'rakuten-us:ok:8%',
        'shopback-au:paused:-', 'topcashback-au:ok:up to 6%', 'topcashback-us:ok:up to 6%',
    ]);
    assert.deepEqual(got('ASOS'), ['shopback-au:ok:< 5.5%', 'topcashback-uk:ok:up to 6%']);
    assert.equal(items.find((i) => i.portal === 'rakuten-us').previousRateText, '2%');
    assert.equal(summary.merchants, 2); // "nike" is a duplicate of "Nike"
    assert.deepEqual(summary.bestRate.Nike.US, { portal: 'befrugal-us', portalName: 'BeFrugal', rateText: '10.0%', rateType: 'percent', rateValue: 10, currency: null, url: 'https://www.befrugal.com/store/nike/' });
    assert.equal(summary.bestRate.Nike.AU.portal, 'topcashback-au');
    assert.equal(summary.bestRate.ASOS.UK.portal, 'topcashback-uk');
    assert.equal(summary.ratesFound, 8);
});

test('country and portal filters; not-listed rows on request', () => {
    const uk = runActor({ merchants: ['ASOS'], countries: ['UK'] }).items;
    assert.deepEqual(uk.map((i) => i.portal), ['topcashback-uk']);
    const one = runActor({ merchants: ['Nike'], portals: ['rakuten-us'] }).items;
    assert.deepEqual(one.map((i) => i.portal), ['rakuten-us']);
    const all = runActor({ merchants: ['ASOS'], includeNotListed: true }).items;
    assert.equal(all.length, 8);
    assert.equal(all.filter((i) => i.status === 'not-listed').length, 6);
});

test('pay-per-event: stops at the max total charge', () => {
    // Locally the SDK prices unknown events at $1, so a $1 cap allows exactly 1 charged result.
    const { items } = runActor({ merchants: ['Nike', 'ASOS'] }, { ACTOR_TEST_PAY_PER_EVENT: 'true', ACTOR_MAX_TOTAL_CHARGE_USD: '1' });
    assert.equal(items.filter((i) => i.status === 'ok').length, 1);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

function runActor(input, env = {}) {
    const storage = mkdtempSync(join(tmpdir(), 'tcb-'));
    mkdirSync(join(storage, 'key_value_stores/default'), { recursive: true });
    writeFileSync(join(storage, 'key_value_stores/default/INPUT.json'), JSON.stringify(input));
    const proc = spawnSync(process.execPath, ['--import', './test/fixtures/mock-fetch.js', 'src/main.js'], {
        cwd: root,
        env: { ...process.env, APIFY_LOCAL_STORAGE_DIR: storage, CRAWLEE_STORAGE_DIR: storage, APIFY_LOG_LEVEL: 'ERROR', ...env },
        encoding: 'utf8',
    });
    const dsDir = join(storage, 'datasets/default');
    const items = existsSync(dsDir) ? readdirSync(dsDir).filter((f) => /^\d+\.json$/.test(f)).sort().map((f) => JSON.parse(readFileSync(join(dsDir, f), 'utf8'))) : [];
    const summaryFile = join(storage, 'key_value_stores/default/SUMMARY.json');
    return { status: proc.status, stderr: proc.stderr, items, summary: existsSync(summaryFile) ? JSON.parse(readFileSync(summaryFile, 'utf8')) : null };
}

const rows = (items) => items.map((i) => `${i.country}:${i.store}:${i.rateText}:${i.currency}`).sort();

test('scrapes every store in all three countries', () => {
    const { status, items, summary } = runActor({ maxStores: 0 });
    assert.equal(status, 0);
    assert.deepEqual(rows(items), [
        'AU:THE ICONIC:5%:AUD',
        'UK:ASOS:up to 7%:GBP',
        'UK:Currys:£20:GBP',
        'US:Nike:6%:USD', // the store's own rate, not the 15% banner for another store
        'US:Walmart:Up to 4%:USD',
    ]);
    assert.deepEqual(summary.countries.US, { storesInSitemap: 5, storesMatching: 5, checking: 5 });
    assert.deepEqual([summary.checked, summary.withCashback, summary.notListed, summary.errors], [9, 5, 3, 1]);
});

test('countries, keywords, minimum rate and per-country limit', () => {
    assert.deepEqual(rows(runActor({ countries: ['uk'], maxStores: 0 }).items), ['UK:ASOS:up to 7%:GBP', 'UK:Currys:£20:GBP']);
    assert.deepEqual(rows(runActor({ maxStores: 0, storeKeywords: ['nike', 'iconic'] }).items), ['AU:THE ICONIC:5%:AUD', 'US:Nike:6%:USD']);
    assert.deepEqual(rows(runActor({ maxStores: 0, minRatePercent: 5.5 }).items), ['UK:ASOS:up to 7%:GBP', 'UK:Currys:£20:GBP', 'US:Nike:6%:USD']);
    const limited = runActor({ maxStores: 1 });
    assert.deepEqual(Object.values(limited.summary.countries).map((c) => c.checking), [1, 1, 1]);
});

test('pay-per-event: stops at the cost limit', () => {
    const { items, summary } = runActor({ maxStores: 0 }, { ACTOR_TEST_PAY_PER_EVENT: 'true', ACTOR_MAX_TOTAL_CHARGE_USD: '1' });
    assert.equal(items.length, 1);
    assert.equal(summary.stoppedAtCostLimit, true);
});

test('fails clearly when no store list can be loaded, and rejects unknown countries', () => {
    const down = runActor({}, { MOCK_SITEMAPS_DOWN: '1', APIFY_LOG_LEVEL: 'INFO' });
    assert.notEqual(down.status, 0);
    assert.match(down.stderr, /store lists are unavailable/);
    const bad = runActor({ countries: ['FR'] }, { APIFY_LOG_LEVEL: 'INFO' });
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /Choose at least one country/);
});

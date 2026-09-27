import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

function runActor(input, env = {}) {
    const storage = mkdtempSync(join(tmpdir(), 'rakuten-'));
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

const byStore = (items) => Object.fromEntries(items.map((i) => [i.store, i]));

test('checks every store in the sitemap and saves the ones paying cash back', () => {
    const { status, items, summary } = runActor({ maxStores: 0 });
    assert.equal(status, 0);
    const rows = byStore(items);
    assert.deepEqual(Object.keys(rows).sort(), ['100% Pure', 'Best Buy', 'Hotels.com', 'Nike', 'Sephora']);
    assert.deepEqual([rows.Nike.rateText, rows.Nike.rateValue, rows.Nike.rateType, rows.Nike.storeId, rows.Nike.url], ['10%', 10, 'percent', '9528', 'https://www.rakuten.com/shop/nike']);
    assert.equal(rows.Sephora.isUpTo, true);
    assert.deepEqual([rows['Hotels.com'].rateType, rows['Hotels.com'].rateValue, rows['Hotels.com'].currency], ['fixed', 25, 'USD']);
    assert.equal(rows['100% Pure'].rateValue, 2.5);
    assert.equal(summary.storesInSitemap, 8); // duplicate nike/ and the blog post are not stores
    assert.deepEqual([summary.checked, summary.withCashback, summary.noCashback, summary.notListed, summary.errors], [8, 5, 1, 1, 1]);
    assert.equal(summary.topPercentRates[0], 'Nike: 10%');
});

test('keywords, minimum rate, store limit and no-cash-back rows', () => {
    assert.deepEqual(runActor({ storeKeywords: ['nike', 'Best Buy'] }).items.map((i) => i.store).sort(), ['Best Buy', 'Nike']);
    assert.deepEqual(runActor({ maxStores: 0, minRatePercent: 5 }).items.map((i) => i.store).sort(), ['Hotels.com', 'Nike', 'Sephora']); // 100% Pure pays 2.5%
    assert.equal(runActor({ maxStores: 2 }).summary.checked, 2);
    const all = byStore(runActor({ maxStores: 0, includeNoCashback: true }).items);
    assert.equal(all.Amazon.status, 'no-cashback');
    assert.equal(all.Amazon.rateText, null);
});

test('pay-per-event: stops at the cost limit', () => {
    const { items, summary } = runActor({ maxStores: 0 }, { ACTOR_TEST_PAY_PER_EVENT: 'true', ACTOR_MAX_TOTAL_CHARGE_USD: '1' });
    assert.equal(items.length, 1);
    assert.equal(summary.stoppedAtCostLimit, true);
});

test('fails clearly when the store list is unavailable', () => {
    const { status, stderr, items } = runActor({}, { MOCK_SITEMAP_DOWN: '1', APIFY_LOG_LEVEL: 'INFO' });
    assert.notEqual(status, 0);
    assert.match(stderr, /store list is unavailable/);
    assert.equal(items.length, 0);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

/** Runs the Actor; runs that share `storage` share the named state store, like scheduled runs on Apify. */
function runActor(storage, input, env = {}) {
    for (const dir of ['datasets/default', 'key_value_stores/default']) rmSync(join(storage, dir), { recursive: true, force: true });
    mkdirSync(join(storage, 'key_value_stores/default'), { recursive: true });
    writeFileSync(join(storage, 'key_value_stores/default/INPUT.json'), JSON.stringify(input));
    execFileSync(process.execPath, ['--import', './test/fixtures/mock-fetch.js', 'src/main.js'], {
        cwd: root,
        env: { ...process.env, APIFY_LOCAL_STORAGE_DIR: storage, CRAWLEE_STORAGE_DIR: storage, APIFY_LOG_LEVEL: 'ERROR', ...env },
        stdio: 'pipe',
    });
    const dsDir = join(storage, 'datasets/default');
    const items = existsSync(dsDir) ? readdirSync(dsDir).filter((f) => /^\d+\.json$/.test(f)).sort().map((f) => JSON.parse(readFileSync(join(dsDir, f), 'utf8'))) : [];
    const summary = JSON.parse(readFileSync(join(storage, 'key_value_stores/default/SUMMARY.json'), 'utf8'));
    return { items, summary };
}

const input = { merchants: ['Nike', 'ASOS', 'Sephora'], portals: ['rakuten-us', 'topcashback-uk'] };

test('day 1 saves a baseline; day 2 reports boosts, cuts and new listings, not outages', () => {
    const storage = mkdtempSync(join(tmpdir(), 'monitor-'));
    const day1 = runActor(storage, input, { MOCK_DAY: '1' });
    assert.equal(day1.summary.firstRun, true);
    assert.deepEqual(day1.items.map((i) => [i.merchant, i.changeType, i.oldRateText, i.newRateText]), [['Sephora', 'portal-boost', '2%', '8%']]);

    const day2 = runActor(storage, input, { MOCK_DAY: '2' });
    assert.equal(day2.summary.firstRun, false);
    assert.deepEqual(day2.items.map((i) => `${i.merchant}@${i.portal}:${i.changeType}:${i.oldRateText ?? '-'}->${i.newRateText ?? '-'}`), [
        'Nike@rakuten-us:increase:2%->10%',
        'Nike@topcashback-uk:new:-->4%',
        'ASOS@rakuten-us:decrease:5%->3%',
    ]); // TopCashback UK's 503 for ASOS is not a removal; Sephora's boost was already reported
    assert.equal(day2.summary.byType.increase, 1);

    // Day 3 with day 2's rates: nothing changed.
    assert.equal(runActor(storage, input, { MOCK_DAY: '2' }).items.length, 0);
});

test('watchlists are separate, and change types and minimum change filter the output', () => {
    const storage = mkdtempSync(join(tmpdir(), 'monitor-'));
    runActor(storage, { ...input, watchlistName: 'a' }, { MOCK_DAY: '1' });
    const other = runActor(storage, { ...input, watchlistName: 'b' }, { MOCK_DAY: '2' });
    assert.equal(other.summary.firstRun, true); // watchlist "b" has its own baseline
    const filtered = runActor(storage, { ...input, watchlistName: 'a', changeTypes: ['increase', 'decrease'], minChangePoints: 3 }, { MOCK_DAY: '2' });
    assert.deepEqual(filtered.items.map((i) => `${i.merchant}:${i.changeType}`), ['Nike:increase']); // ASOS -2 is under 3 points
});

test('pay-per-event: changes cut off by the cost limit are reported on the next run', () => {
    const storage = mkdtempSync(join(tmpdir(), 'monitor-'));
    runActor(storage, input, { MOCK_DAY: '1' });
    const capped = runActor(storage, input, { MOCK_DAY: '2', ACTOR_TEST_PAY_PER_EVENT: 'true', ACTOR_MAX_TOTAL_CHARGE_USD: '1' });
    assert.equal(capped.items.length, 1);
    const rest = runActor(storage, input, { MOCK_DAY: '2' });
    assert.deepEqual(rest.items.map((i) => i.changeType).sort(), ['decrease', 'new']);
});

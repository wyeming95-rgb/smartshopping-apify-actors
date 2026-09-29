import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

function runActor(input, env = {}, storage = mkdtempSync(join(tmpdir(), 'bf-'))) {
    mkdirSync(join(storage, 'key_value_stores/default'), { recursive: true });
    writeFileSync(join(storage, 'key_value_stores/default/INPUT.json'), JSON.stringify(input));
    const proc = spawnSync(process.execPath, ['--import', './test/fixtures/mock-fetch.js', 'src/main.js'], {
        cwd: root,
        env: { ...process.env, APIFY_LOCAL_STORAGE_DIR: storage, CRAWLEE_STORAGE_DIR: storage, CRAWLEE_PURGE_ON_START: '0', APIFY_LOG_LEVEL: 'ERROR', ...env },
        encoding: 'utf8',
    });
    const dsDir = join(storage, 'datasets/default');
    const items = existsSync(dsDir) ? readdirSync(dsDir).filter((f) => /^\d+\.json$/.test(f)).sort().map((f) => JSON.parse(readFileSync(join(dsDir, f), 'utf8'))) : [];
    const summaryFile = join(storage, 'key_value_stores/default/SUMMARY.json');
    return { status: proc.status, stderr: proc.stderr, items, storage, summary: existsSync(summaryFile) ? JSON.parse(readFileSync(summaryFile, 'utf8')) : null };
}

const STORES = ["Macy's", 'Nike', 'Currys'];

test('offers from every portal the stores are listed on', () => {
    const { status, stderr, items, summary } = runActor({ stores: STORES });
    assert.equal(status, 0, stderr);
    assert.deepEqual(items.map((i) => `${i.portal} ${i.store}: ${i.title}`).sort(), [
        "rakuten-us Macy's: Black Friday Sale: Take an extra 15-30% off.",
        "rakuten-us Macy's: Free shipping on orders $25+.",
        "rakuten-us Macy's: Shop Best of the Season's top deals.",
        'topcashback-uk Currys: 10% off small appliances',
        'topcashback-uk Currys: Black Friday: Save up to £500 on TVs',
        'topcashback-us Nike: Activewear Styles Up to 40% off!',
        'topcashback-us Nike: Cyber Monday: up to 50% off select styles',
    ]);
    const bf = items.find((i) => i.title.startsWith('Black Friday Sale'));
    assert.deepEqual([bf.id, bf.code, bf.offerType, bf.maxDiscountPercent, bf.isBlackFriday, bf.saleEvent, bf.storeCashback, bf.country, bf.storeUrl],
        ['rakuten-us:macys:14632230', 'BEST', 'code', 30, true, 'Black Friday', '6%', 'US', 'https://www.rakuten.com/shop/macys']);
    const nike = items.find((i) => i.portal === 'topcashback-us' && i.isCyberMonday);
    assert.deepEqual([nike.storeCashback, nike.cashback, nike.badge, nike.offerUrl], ['Up to 8%', '8% Cash Back', 'Ends 12/1/2026', 'https://www.topcashback.com/nike/']);
    assert.match(nike.id, /^topcashback-us:nike:[a-z0-9]+$/);
    assert.deepEqual([summary.storePages, summary.listed, summary.errors, summary.offersFound, summary.blackFridayOffers, summary.saved], [12, 3, 1, 7, 3, 7]);
    assert.equal(summary.savedByEvent['Black Friday'], 2);
});

test('filters: Black Friday only, codes only, minimum discount, keywords, countries', () => {
    const titles = (input) => runActor({ stores: STORES, ...input }).items.map((i) => i.title).sort();
    assert.deepEqual(titles({ onlyBlackFriday: true }), ['Black Friday Sale: Take an extra 15-30% off.', 'Black Friday: Save up to £500 on TVs', 'Cyber Monday: up to 50% off select styles']);
    assert.deepEqual(titles({ onlyWithCode: true, countries: ['UK'] }), ['10% off small appliances']);
    assert.deepEqual(titles({ minDiscountPercent: 40 }), ['Activewear Styles Up to 40% off!', 'Cyber Monday: up to 50% off select styles']);
    assert.deepEqual(titles({ keywords: ['TVs'] }), ['Black Friday: Save up to £500 on TVs']);
});

test('only new offers across runs', () => {
    const first = runActor({ stores: STORES, onlyNew: true, stateName: 'bf' });
    assert.equal(first.items.length, 7);
    const second = runActor({ stores: STORES, onlyNew: true, stateName: 'bf' }, {}, first.storage);
    assert.equal(second.summary.saved, 0);
    assert.equal(second.summary.alreadySeen, 7);
});

test('pay-per-event: stops at the cost limit', () => {
    const { items, summary } = runActor({ stores: STORES }, { ACTOR_TEST_PAY_PER_EVENT: 'true', ACTOR_MAX_TOTAL_CHARGE_USD: '1' });
    assert.equal(items.length, 1);
    assert.equal(summary.stoppedAtCostLimit, true);
});

test('default store lists and a clear error when the portals are down', () => {
    assert.equal(runActor({ countries: ['AU'] }).summary.storePages, 10);
    const { status, stderr } = runActor({ stores: STORES }, { MOCK_ALL_DOWN: '1', APIFY_LOG_LEVEL: 'INFO' });
    assert.notEqual(status, 0);
    assert.match(stderr, /No store page could be read/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

/** Runs the Actor; runs that share `storage` share the named state store, like scheduled runs on Apify. */
function runActor(input, env = {}, storage = mkdtempSync(join(tmpdir(), 'deals-'))) {
    for (const dir of ['datasets/default', 'key_value_stores/default']) rmSync(join(storage, dir), { recursive: true, force: true });
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
    return { status: proc.status, stderr: proc.stderr, items, summary: existsSync(summaryFile) ? JSON.parse(readFileSync(summaryFile, 'utf8')) : null, storage };
}

const byId = (items) => Object.fromEntries(items.map((i) => [i.id, i]));

test('reads all four feeds into one deal format', () => {
    const { status, items, summary } = runActor({});
    assert.equal(status, 0);
    assert.equal(items.length, 7); // the R.E.M. deal is in both hotukdeals feeds but saved once
    const d = byId(items);

    const soda = d['slickdeals:20058996'];
    assert.deepEqual([soda.site, soda.country, soda.price, soda.currency, soda.store, soda.score, soda.scoreType], ['Slickdeals', 'US', 15.1, 'USD', 'amazon.com', 22, 'thumbs']);
    assert.equal(soda.url, 'https://slickdeals.net/f/20058996-sns-a-w-root-beer');
    assert.equal(soda.postedAt, '2026-09-27T10:08:08.000Z');
    assert.equal(d['slickdeals:20049453'].mentionsCashback, true);

    const flight = d['hotukdeals:4989796'];
    assert.deepEqual([flight.title, flight.score, flight.scoreType, flight.store, flight.price, flight.category], ['London to Hong Kong Round Trip - China Eastern', 113, 'temperature', 'Skyscanner', 321, 'Travel']);
    assert.equal(d['hotukdeals:4989747'].source, 'hotukdeals-hot');
    assert.equal(d['hotukdeals:4990001'].mentionsCashback, true);

    const mower = d['ozbargain:976620'];
    assert.deepEqual([mower.store, mower.price, mower.score, mower.scoreType, mower.comments, mower.dealUrl, mower.category], ['Bunnings Warehouse (In-Store)', 229, 42, 'votes', 12, 'https://www.bunnings.com.au/ozito-mower', 'Home & Garden']);
    assert.equal(d['ozbargain:976621'].price, 1797);

    assert.equal(summary.sources['hotukdeals-new'].inFeed, 2);
    assert.equal(summary.mentioningCashback, 2);
});

test('filters: sources, keywords, exclusions, score, price, cashback', () => {
    assert.deepEqual(runActor({ sources: ['ozbargain-new'] }).items.map((i) => i.id), ['ozbargain:976620', 'ozbargain:976621']);
    assert.deepEqual(runActor({ keywords: ['vinyl', 'MOWER'] }).items.map((i) => i.id).sort(), ['hotukdeals:4989747', 'ozbargain:976620']);
    assert.equal(runActor({ keywords: ['vinyl'], excludeKeywords: ['r.e.m'] }).items.length, 0);
    assert.deepEqual(runActor({ minScore: 40 }).items.map((i) => i.id).sort(), ['hotukdeals:4989747', 'hotukdeals:4989796', 'ozbargain:976620']);
    assert.deepEqual(runActor({ maxPrice: 20 }).items.map((i) => i.id).sort(), ['hotukdeals:4989747', 'slickdeals:20058996']);
    assert.deepEqual(runActor({ onlyCashback: true }).items.map((i) => i.id).sort(), ['hotukdeals:4990001', 'slickdeals:20049453']);
});

test('onlyNew skips deals returned by earlier runs with the same state name', () => {
    const first = runActor({ onlyNew: true, sources: ['ozbargain-new'] });
    assert.equal(first.items.length, 2);
    assert.equal(runActor({ onlyNew: true, sources: ['ozbargain-new'] }, {}, first.storage).items.length, 0);
    assert.equal(runActor({ onlyNew: true, sources: ['ozbargain-new'], stateName: 'other' }, {}, first.storage).items.length, 2);
});

test('pay-per-event: deals cut off by the cost limit come back on the next onlyNew run', () => {
    const capped = runActor({ onlyNew: true }, { ACTOR_TEST_PAY_PER_EVENT: 'true', ACTOR_MAX_TOTAL_CHARGE_USD: '1' });
    assert.equal(capped.items.length, 1);
    assert.equal(runActor({ onlyNew: true }, {}, capped.storage).items.length, 6);
});

test('fails clearly when no feed can be read, and rejects unknown sources', () => {
    const down = runActor({}, { MOCK_FEEDS_DOWN: '1', APIFY_LOG_LEVEL: 'INFO' });
    assert.notEqual(down.status, 0);
    assert.match(down.stderr, /No deal feed could be read/);
    const bad = runActor({ sources: ['reddit'] }, { APIFY_LOG_LEVEL: 'INFO' });
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /Choose at least one source/);
});

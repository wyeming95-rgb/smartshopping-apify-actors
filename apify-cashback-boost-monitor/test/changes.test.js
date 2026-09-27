import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectChanges, snapshot, stateKey } from '../src/changes.js';

const row = (portal, merchant, status, rateValue, extra = {}) => ({
    merchant, matchedName: merchant, portal, portalName: portal, country: 'US', status,
    rateText: rateValue === null ? null : `${rateValue}%`, rateType: rateValue === null ? null : 'percent', rateValue,
    currency: null, isUpTo: false, previousRateText: null, previousRateValue: null, url: 'u', checkedAt: 't2', ...extra,
});
const prevOf = (...rows) => Object.fromEntries(rows.map((r) => [stateKey(r), snapshot({ ...r, checkedAt: 't1' })]));

test('rate moves are reported at once; new and removed need two runs in a row', () => {
    const previous = prevOf(row('a', 'Nike', 'ok', 2), row('a', 'ASOS', 'ok', 5), row('a', 'Gap', 'ok', 4), row('a', 'Zara', 'not-listed', null));
    const day2 = detectChanges(previous, [
        row('a', 'Nike', 'ok', 10), row('a', 'ASOS', 'ok', 3), row('a', 'Gap', 'no-cashback', null), row('a', 'Zara', 'ok', 7), row('a', 'Uniqlo', 'ok', 1),
    ], { firstRun: false });
    assert.deepEqual(day2.changes.map((c) => [c.merchant, c.changeType, c.oldRateValue, c.newRateValue, c.changePoints]), [
        ['Nike', 'increase', 2, 10, 8],
        ['ASOS', 'decrease', 5, 3, -2],
    ]); // Gap and Zara are pending; Uniqlo is a first sighting (baseline)
    assert.equal(day2.changes[0].previousCheckAt, 't1');
    assert.equal(day2.next['a|nike'].rateValue, 10);
    assert.deepEqual(day2.next['a|gap'].pending, { active: false, runs: 1 });
    assert.equal(day2.next['a|gap'].rateValue, 4); // still remembered as 4% until confirmed

    const day3 = detectChanges(day2.next, [row('a', 'Gap', 'not-listed', null), row('a', 'Zara', 'ok', 7)], { firstRun: false });
    assert.deepEqual(day3.changes.map((c) => [c.merchant, c.changeType, c.oldRateText, c.newRateText]), [
        ['Gap', 'removed', '4%', null],
        ['Zara', 'new', null, '7%'],
    ]);
});

test('a one-run blip does not report anything', () => {
    const previous = prevOf(row('a', 'Nike', 'ok', 2), row('a', 'ASOS', 'not-listed', null));
    const blip = detectChanges(previous, [row('a', 'Nike', 'not-listed', null), row('a', 'ASOS', 'ok', 1)], { firstRun: false });
    assert.equal(blip.changes.length, 0);
    const back = detectChanges(blip.next, [row('a', 'Nike', 'ok', 2), row('a', 'ASOS', 'not-listed', null)], { firstRun: false });
    assert.equal(back.changes.length, 0);
    assert.equal(back.next['a|nike'].pending, null);
});

test('first run is a baseline: only portal-flagged boosts are reported', () => {
    const { changes, next } = detectChanges({}, [
        row('a', 'Nike', 'ok', 2),
        row('a', 'Sephora', 'ok', 8, { previousRateText: '2%', previousRateValue: 2 }),
    ], { firstRun: true });
    assert.deepEqual(changes.map((c) => [c.merchant, c.changeType, c.oldRateText, c.newRateText, c.changePoints]), [['Sephora', 'portal-boost', '2%', '8%', 6]]);
    assert.equal(next['a|sephora'].reportedBoost, '2%->8%');
    // The same boost next run is not reported again; a new boost is.
    assert.equal(detectChanges(next, [row('a', 'Sephora', 'ok', 8, { previousRateText: '2%', previousRateValue: 2 })], { firstRun: false }).changes.length, 0);
    assert.equal(detectChanges(next, [row('a', 'Sephora', 'ok', 12, { previousRateText: '2%', previousRateValue: 2 })], { firstRun: false }).changes[0].changeType, 'increase');
});

test('errors keep the last known rate; unchanged rates report nothing; type changes are flagged', () => {
    const previous = prevOf(row('a', 'Nike', 'ok', 2), row('a', 'ASOS', 'ok', 5));
    const { changes, next } = detectChanges(previous, [row('a', 'Nike', 'error', null), row('a', 'ASOS', 'ok', 5)], { firstRun: false });
    assert.deepEqual(changes, []);
    assert.equal(next['a|nike'].rateValue, 2);
    const fixed = detectChanges(previous, [row('a', 'ASOS', 'ok', 20, { rateType: 'fixed', rateText: '$20', currency: 'USD' })], { firstRun: false });
    assert.deepEqual([fixed.changes[0].changeType, fixed.changes[0].changePoints], ['changed', null]);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { domainOf, findCashbackRate, parseRate, slugify, baseName } from '../src/core/rates.js';

test('parseRate handles percent, fixed amounts, "up to" and "<"', () => {
    assert.deepEqual(parseRate('Up to 8% Cash Back'), { rateText: 'Up to 8%', rateType: 'percent', rateValue: 8, currency: null, isUpTo: true });
    assert.deepEqual(parseRate('< 5.5% Cashback'), { rateText: '< 5.5%', rateType: 'percent', rateValue: 5.5, currency: null, isUpTo: true });
    assert.deepEqual(parseRate('£25 cashback'), { rateText: '£25', rateType: 'fixed', rateValue: 25, currency: 'GBP', isUpTo: false });
    assert.deepEqual(parseRate('A$20'), { rateText: 'A$20', rateType: 'fixed', rateValue: 20, currency: 'AUD', isUpTo: false });
    assert.equal(parseRate('$175', 'USD').currency, 'USD');
    assert.equal(parseRate('no rate here'), null);
});

test('findCashbackRate needs a cashback word and copes with "up to up to"', () => {
    assert.equal(findCashbackRate('Save money at ASOS &amp; get up to up to 6% cashback.').rateText, 'up to 6%');
    assert.equal(findCashbackRate('Up to 40% Off New Markdowns'), null);
    assert.equal(findCashbackRate('Nike 10.0% Cash Back + 28 Coupons').rateValue, 10);
});

test('slugs and domains', () => {
    assert.equal(slugify("Marks & Spencer"), 'marks-and-spencer');
    assert.equal(slugify("Macy's"), 'macys');
    assert.equal(slugify('THE ICONIC'), 'the-iconic');
    assert.equal(domainOf('Nike'), 'nike.com');
    assert.equal(domainOf('Best Buy'), 'bestbuy.com');
    assert.equal(domainOf('https://www.asos.com/us'), 'asos.com');
    assert.equal(baseName('nike.com'), 'nike');
});

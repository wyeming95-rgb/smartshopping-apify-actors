import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PORTALS } from '../src/portals.js';
import { PAGES } from './fixtures/pages.js';

const portal = (id) => PORTALS.find((p) => p.id === id);
const page = (url) => ({ url, finalUrl: PAGES[url].finalUrl ?? url, status: PAGES[url].status ?? 200, html: PAGES[url].html });

test('Rakuten: rate from og:title, previous rate from the page, redirects to home are not listed', () => {
    const r = portal('rakuten-us').parse(page('https://www.rakuten.com/nike.com'));
    assert.equal(r.listed, true);
    assert.equal(r.merchantName, 'Nike');
    assert.equal(r.rate.rateValue, 8);
    assert.equal(r.previousRate.rateText, '2%');
    assert.equal(portal('rakuten-us').parse(page('https://www.rakuten.com/asos.com')).listed, false);
    assert.deepEqual(portal('rakuten-us').candidates('Nike'), ['https://www.rakuten.com/nike.com', 'https://www.rakuten.com/shop/nike']);
});

test('TopCashback: rate from the meta description, not the featured-brands banner', () => {
    const us = portal('topcashback-us').parse(page('https://www.topcashback.com/nike/'));
    assert.deepEqual([us.listed, us.merchantName, us.rate.rateText, us.rate.isUpTo], [true, 'Nike', 'up to 6%', true]);
    const uk = portal('topcashback-uk').parse(page('https://www.topcashback.co.uk/asos/'));
    assert.deepEqual([uk.merchantName, uk.rate.rateValue], ['ASOS', 6]);
    const au = portal('topcashback-au').parse(page('https://www.topcashback.com.au/nike/'));
    assert.equal(au.merchantName, 'Nike');
    assert.equal(portal('topcashback-uk').parse(page('https://www.topcashback.co.uk/nike/')).listed, false);
    assert.deepEqual(portal('topcashback-uk').candidates('Marks & Spencer'), ['https://www.topcashback.co.uk/marks-and-spencer/', 'https://www.topcashback.co.uk/marksandspencer/']);
});

test('BeFrugal, Capital One Shopping and ShopBack', () => {
    const bf = portal('befrugal-us').parse(page('https://www.befrugal.com/store/nike/'));
    assert.deepEqual([bf.merchantName, bf.rate.rateValue], ['Nike', 10]);
    assert.equal(portal('befrugal-us').parse(page('https://www.befrugal.com/store/asos/')).listed, false);
    const c1 = portal('capitalone-shopping-us').parse(page('https://capitaloneshopping.com/s/nike.com/coupon'));
    assert.deepEqual([c1.merchantName, c1.rate.rateText], ['Nike', '2%']);
    assert.equal(portal('capitalone-shopping-us').parse(page('https://capitaloneshopping.com/s/asos.com/coupon')).listed, false);
    const sb = portal('shopback-au').parse(page('https://www.shopback.com.au/asos'));
    assert.deepEqual([sb.merchantName, sb.rate.rateText, sb.rate.isUpTo], ['ASOS', '< 5.5%', true]);
    const paused = portal('shopback-au').parse(page('https://www.shopback.com.au/nike'));
    assert.deepEqual([paused.listed, paused.paused, paused.rate], [true, true, null]);
});

test('Mr. Rebates: store list with rates from the A-Z directory', () => {
    const stores = portal('mrrebates-us').parseDirectory(PAGES['https://www.mrrebates.com/merchants/all_merchants.asp'].html);
    assert.equal(stores.size, 3);
    assert.deepEqual(stores.get('nike'), { name: 'Nike', url: 'https://www.mrrebates.com/merchant.asp?id=5501', rate: { rateText: 'Up to 7%', rateType: 'percent', rateValue: 7, currency: null, isUpTo: true } });
    assert.equal(stores.get('best buy').rate.rateValue, 1);
});

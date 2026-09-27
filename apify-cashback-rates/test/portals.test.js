import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PORTALS } from '../src/core/portals.js';
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

test('TopCashback: rate from the meta description (UK/AU) or the store block (US), never the banners', () => {
    const us = portal('topcashback-us').parse(page('https://www.topcashback.com/nike/'));
    assert.deepEqual([us.listed, us.merchantName, us.rate.rateText, us.rate.isUpTo], [true, 'Nike', '11%', false]);
    const amazon = portal('topcashback-us').parse(page('https://www.topcashback.com/amazon/'));
    assert.equal(amazon.rate.rateText, 'Up to 3%'); // not the $450 card promo above it
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
    assert.deepEqual(stores.get('aarp').rate, { rateText: '$10.00', rateType: 'fixed', rateValue: 10, currency: 'USD', isUpTo: false });
    assert.equal(stores.get('puma').rate.rateValue, 5);
});

test('regressions from the first live run', () => {
    // Rakuten: "No Cash Back" stores, and unknown stores that land on the generic page.
    const walmart = portal('rakuten-us').parse(page('https://www.rakuten.com/walmart.com'));
    assert.deepEqual([walmart.listed, walmart.noCashback, walmart.merchantName], [true, true, 'Walmart']);
    assert.equal(portal('rakuten-us').parse(page('https://www.rakuten.com/theiconic.com')).listed, false);
    // TopCashback UK redirects Best Buy to Currys: not the store that was asked for.
    assert.equal(portal('topcashback-uk').parse(page('https://www.topcashback.co.uk/best-buy/')).listed, false);
    // Capital One Shopping: zero rewards, and a store name containing "&".
    const ms = portal('capitalone-shopping-us').parse(page('https://capitaloneshopping.com/s/marksandspencer.com/coupon'));
    assert.deepEqual([ms.listed, ms.noCashback, ms.merchantName], [true, true, 'Marks & Spencer']);
});


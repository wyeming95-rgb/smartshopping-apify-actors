import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, codeInText, maxDiscountPercent, rakutenOffers, saleEventOf, topCashbackOffers } from '../src/offers.js';
import { RAKUTEN_MACYS, TCB_UK_CURRYS, TCB_US_NIKE } from './fixtures/pages.js';

test('Rakuten: offer tiles for the page store, once each', () => {
    const offers = rakutenOffers(RAKUTEN_MACYS, '8333');
    assert.deepEqual(offers.map((o) => o.offerId), ['14632232', '14632230', '14632240']);
    assert.deepEqual(offers[0], {
        offerId: '14632232',
        title: "Shop Best of the Season's top deals.",
        description: null,
        code: 'BEST',
        badge: 'ENDS TOMORROW',
        cashback: '6% Cash Back',
        previousCashback: '2%',
        offerUrl: 'https://www.rakuten.com/macys_8333-xfas?special=14632232&sourceName=Web-Desktop',
    });
    assert.equal(offers[1].description, 'Exclusions apply. Online only.');
    assert.equal(offers[1].badge, null);
    assert.equal(offers[2].title, 'Free shipping on orders $25+.');
    assert.equal(rakutenOffers(RAKUTEN_MACYS).length, 4); // without the store ID, other stores' tiles are kept
    assert.deepEqual(rakutenOffers('<html>no data</html>'), []);
    assert.deepEqual(rakutenOffers('<script id="__NEXT_DATA__">{broken</script>'), []);
});

test('TopCashback: merch-offer blocks with rate, description, code and expiry', () => {
    const nike = topCashbackOffers(TCB_US_NIKE);
    assert.deepEqual(nike.map((o) => [o.title, o.cashback]), [['Activewear Styles Up to 40% off!', '11% Cash Back'], ['Cyber Monday: up to 50% off select styles', '8% Cash Back']]);
    assert.equal(nike[1].badge, 'Ends 12/1/2026');
    assert.equal(nike[0].code, null);
    const currys = topCashbackOffers(TCB_UK_CURRYS);
    assert.equal(currys.length, 2); // the repeated code offer counts once
    assert.equal(currys[0].badge, 'Expires 30th November');
    assert.equal(currys[1].code, 'SMALL10');
});

test('discounts, sale events and offer types', () => {
    assert.equal(maxDiscountPercent('Take an extra 15-30% off.'), 30);
    assert.equal(maxDiscountPercent('Up to 40% off! Plus 10% off'), 40);
    assert.equal(maxDiscountPercent('Save 20% sitewide'), 20);
    assert.equal(maxDiscountPercent('$20 off $100'), null);
    assert.equal(maxDiscountPercent('100% Pure sale'), null);
    assert.equal(saleEventOf('Early Black Friday deals'), 'Black Friday');
    assert.equal(saleEventOf('Cyber Week savings'), 'Cyber Monday');
    assert.equal(saleEventOf('Boxing Day sale'), 'Boxing Day');
    assert.equal(saleEventOf('New arrivals'), null);
    assert.deepEqual(classify({ title: 'Black Friday: extra 25% off', code: 'BF25' }),
        { code: 'BF25', offerType: 'code', maxDiscountPercent: 25, freeShipping: false, saleEvent: 'Black Friday', isBlackFriday: true, isCyberMonday: false });
    assert.equal(classify({ title: 'Free shipping on orders $25+.' }).offerType, 'free-shipping');
    assert.equal(classify({ title: 'Free shipping on orders $25+.' }).freeShipping, true);
    assert.equal(classify({ title: 'Up to 40% off activewear' }).offerType, 'sale');
    assert.equal(classify({ title: 'Earn 6% cash back on everything' }).offerType, 'cashback');
});

test('input schema: every field has a description (Apify rejects the build otherwise)', async () => {
    const { readFileSync } = await import('node:fs');
    const schema = JSON.parse(readFileSync(new URL('../.actor/input_schema.json', import.meta.url), 'utf8'));
    assert.deepEqual(Object.entries(schema.properties).filter(([, v]) => !v.description).map(([k]) => k), []);
});

test('codes quoted in the offer text', () => {
    assert.equal(codeInText('40-50% off Engagement Rings with code "BEST".'), 'BEST');
    assert.equal(codeInText('Use code SAVE20 at checkout'), 'SAVE20');
    assert.equal(codeInText('Promo code: XMAS-25!'), 'XMAS-25');
    assert.equal(codeInText('No code required'), null);
    assert.equal(codeInText('Enter the code at checkout'), null);
    const o = classify({ title: '60% off Pillows with code “HOME”', description: null, code: null });
    assert.deepEqual([o.code, o.offerType], ['HOME', 'code']);
    assert.equal(classify({ title: 'Selected Printers.', description: 'Deals exclude refurbished items.' }).offerType, 'cashback');
});

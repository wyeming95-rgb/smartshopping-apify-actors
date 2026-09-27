import { test } from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeStorePage, storeUrls } from '../src/directory.js';

const US = 'https://www.topcashback.com';
const xml = (paths, base = US) => paths.map((p) => `<url><loc>${base}${p}</loc></url>`).join('');

test('stores are the top-level pages that have a reviews page', () => {
    const stores = storeUrls(xml(['/help/', '/nike/', '/nike/reviews/', '/category/x/', '/walmart', '/walmart/reviews/', '/nike/']), US);
    assert.deepEqual(stores, [{ slug: 'nike', url: `${US}/nike/` }, { slug: 'walmart', url: `${US}/walmart/` }]);
});

test('without review pages, top-level pages minus known non-store pages', () => {
    const AU = 'https://www.topcashback.com.au';
    assert.deepEqual(storeUrls(xml(['/help/', '/the-iconic/', '/cookie-policy/', '/about/who-we-are/'], AU), AU).map((s) => s.slug), ['the-iconic']);
});

test('pages on other hosts are ignored', () => {
    assert.deepEqual(storeUrls(xml(['/nike/', '/nike/reviews/'], 'https://www.topcashback.co.uk'), US), []);
});

test('looksLikeStorePage', () => {
    assert.equal(looksLikeStorePage('<title>Nike Offers, Cash Back, Discounts</title>'), true);
    assert.equal(looksLikeStorePage('<title>Currys Cashback Offers</title>'), true);
    assert.equal(looksLikeStorePage('<title>TopCashback | Help</title>'), false);
});

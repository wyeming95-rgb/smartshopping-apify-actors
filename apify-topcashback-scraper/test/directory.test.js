import { test } from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeStorePage, storeUrls } from '../src/directory.js';

const US = 'https://www.topcashback.com';
const xml = (paths, base = US) => paths.map((p) => `<url><loc>${base}${p}</loc></url>`).join('');

test('stores are top-level pages minus known site pages', () => {
    const stores = storeUrls(xml(['/help/', '/nike/', '/nike/reviews/', '/category/x/', '/target', '/trending/', '/nike/', '/about/who-we-are/']), US);
    assert.deepEqual(stores, [{ slug: 'nike', url: `${US}/nike/` }, { slug: 'target', url: `${US}/target/` }]);
});

test('pages on other hosts are ignored', () => {
    assert.deepEqual(storeUrls(xml(['/nike/', '/nike/reviews/'], 'https://www.topcashback.co.uk'), US), []);
});

test('looksLikeStorePage', () => {
    assert.equal(looksLikeStorePage('<title>Nike Offers, Cash Back, Discounts</title>'), true);
    assert.equal(looksLikeStorePage('<title>Currys Cashback Offers</title>'), true);
    assert.equal(looksLikeStorePage('<title>TopCashback | Help</title>'), false);
    assert.equal(looksLikeStorePage('<title>TopCashback: Highest Cash Back Guaranteed</title>'), false);
    assert.equal(looksLikeStorePage('<title>TopCashback Offers of the Week</title>'), false);
});

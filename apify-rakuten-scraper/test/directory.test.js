import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterStores, slugOf, storeIdOf, storeUrls } from '../src/directory.js';

test('slugOf accepts store pages only', () => {
    assert.equal(slugOf('https://www.rakuten.com/shop/Nike'), 'nike');
    assert.equal(slugOf('https://www.rakuten.com/shop/nike/'), 'nike');
    assert.equal(slugOf('https://www.rakuten.com/macys.htm'), 'macys');
    assert.equal(slugOf('https://www.rakuten.com/shop/nike/search/shoes'), null);
    assert.equal(slugOf('https://www.rakuten.com/blog/post'), null);
    assert.equal(slugOf('https://www.example.com/shop/nike'), null);
    assert.equal(slugOf('not a url'), null);
});

test('storeUrls dedupes slugs and keeps sitemap order', () => {
    const xml = '<urlset><url><loc>https://www.rakuten.com/shop/b</loc></url><url><loc> https://www.rakuten.com/shop/a </loc></url><url><loc>https://www.rakuten.com/shop/b/</loc></url><url><loc>https://www.rakuten.com/help</loc></url></urlset>';
    assert.deepEqual(storeUrls(xml).map((s) => s.slug), ['b', 'a']);
});

test('filterStores matches keywords ignoring case and punctuation', () => {
    const stores = ['nike', 'hotels-com', 'bestbuy', 'sephora'].map((slug) => ({ slug }));
    assert.deepEqual(filterStores(stores, ['Hotels.com', 'best buy']).map((s) => s.slug), ['hotels-com', 'bestbuy']);
    assert.equal(filterStores(stores, []).length, 4);
    assert.equal(filterStores(stores, ['  ']).length, 4);
});

test('storeIdOf reads the app deep link', () => {
    assert.equal(storeIdOf('<meta name="branch:deeplink:$deeplink_path" content="us/store/9528"/>'), '9528');
    assert.equal(storeIdOf('<meta name="description" content="x"/>'), null);
});

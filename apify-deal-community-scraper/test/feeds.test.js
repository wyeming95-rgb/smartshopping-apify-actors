import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attrs, items, priceOf, tag } from '../src/feeds.js';

test('priceOf reads the first price in a title', () => {
    assert.equal(priceOf('A&W Root Beer 3 for $15.10 w/ S&S'), 15.1);
    assert.equal(priceOf('iPhone 17 Pro $1,797 (Save $200)'), 1797);
    assert.equal(priceOf('£19.83'), 19.83);
    assert.equal(priceOf('Charger A$29 delivered'), 29);
    assert.equal(priceOf('Digital Games: Astrea (PC) Free & More'), 0);
    assert.equal(priceOf('Hallmark Clearance Up to 50% Off + Free S&H on $30+'), 30);
    assert.equal(priceOf('20% off Subway via Uber Eats'), null);
});

test('tag unwraps CDATA and decodes entities; attrs reads attributes', () => {
    const block = '<title><![CDATA[A & B]]></title><category>Home &amp; Garden</category><pepper:merchant name="M&amp;S" price="£5"/>';
    assert.equal(tag(block, 'title'), 'A & B');
    assert.equal(tag(block, 'category'), 'Home & Garden');
    assert.equal(tag(block, 'missing'), null);
    assert.deepEqual(attrs(block, 'pepper:merchant'), { name: 'M&S', price: '£5' });
    assert.equal(items('<rss><item>a</item><item attr="1">b</item></rss>').length, 2);
});

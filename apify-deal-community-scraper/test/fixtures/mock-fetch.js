// Preloaded via --import: serves feed snapshots modelled on the live Slickdeals, hotukdeals and OzBargain feeds.
const rss = (items) => `<?xml version="1.0"?><rss version="2.0"><channel><title>feed</title>${items.join('')}</channel></rss>`;

const slickdeals = rss([
    `<item><title><![CDATA[12-Pk 12-Oz A&W Zero Sugar Root Beer Soda 3 for $15.10 w/ S&S]]></title>
      <link>https://slickdeals.net/f/20058996-sns-a-w-root-beer?utm_source=rss&amp;utm_content=fp&amp;utm_medium=RSS2</link>
      <description><![CDATA[Amazon [amazon.com] has *12-Pack A&W* 3 for $19.38]]></description>
      <content:encoded><![CDATA[<div><img src="https://static.slickdealscdn.com/a/21706131.thumb" alt="x"></div><br /><div>Thumb Score: +22 </div><div><a href="https://slickdeals.net/click?sdfib=1&amp;lno=1&amp;trd=Amazon" data-product-exitWebsite="amazon.com">Amazon</a></div>]]></content:encoded>
      <pubDate>Sun, 27 Sep 2026 10:08:08 +0000</pubDate></item>`,
    `<item><title><![CDATA[Anker 140W 4-Port Laptop Charger $56 + Free S&H + 10% Rakuten Cash Back]]></title>
      <link>https://slickdeals.net/f/20049453-anker-charger?utm_source=rss</link>
      <description><![CDATA[Best Buy has it]]></description>
      <content:encoded><![CDATA[<div>Thumb Score: +5 </div><a data-product-exitWebsite="bestbuy.com">Best Buy</a>]]></content:encoded>
      <pubDate>Sun, 27 Sep 2026 09:00:00 +0000</pubDate></item>`,
]);

const hukdItem = (id, title, merchant, price, category) => `<item><category><![CDATA[${category}]]></category><pepper:merchant name="${merchant}" price="${price}"/><media:content medium="image" url="https://images.hotukdeals.com/${id}.jpg"/><title><![CDATA[${title}]]></title><description><![CDATA[<strong>${price} - ${merchant}</strong><br /><p>Great deal.</p>]]></description><link>https://www.hotukdeals.com/deals/some-deal-${id}</link><pubDate>Sun, 27 Sep 2026 12:41:48 +0100</pubDate><guid>https://www.hotukdeals.com/deals/some-deal-${id}</guid></item>`;
const hukdHot = rss([
    hukdItem(4989796, '113° - London to Hong Kong Round Trip - China Eastern', 'Skyscanner', '£321', 'Travel'),
    hukdItem(4989747, '102° - R.E.M. - Automatic For The People - Vinyl', 'Amazon', '£19.83', 'Culture &amp; Leisure'),
]);
const hukdNew = rss([
    hukdItem(4989747, 'R.E.M. - Automatic For The People - Vinyl', 'Amazon', '£19.83', 'Culture &amp; Leisure'), // also in hot
    hukdItem(4990001, 'Vodafone Full Fibre £23pm + £120 TopCashback', 'Vodafone', '£23', 'Broadband'),
]);

const ozbargain = rss([
    `<item>
 <title>Ozito PXC 36V Brushless Lawn Mower Kit $229 @ Bunnings Warehouse (In-Store)</title>
 <link>https://www.ozbargain.com.au/node/976620</link>
 <description><![CDATA[<div><img src="https://files.ozbargain.com.au/n/20/976620l.jpg"/></div><p>Cheap mower …</p>]]></description>
 <category domain="https://www.ozbargain.com.au/cat/home-garden">Home &amp; Garden</category>
 <ozb:meta comment-count="12" link="https://www.ozbargain.com.au/goto/976620" click-count="900" votes-pos="45" votes-neg="3" url="https://www.bunnings.com.au/ozito-mower" image="https://files.ozbargain.com.au/n/20/976620l.jpg" />
 <pubDate>Sun, 27 Sep 2026 20:54:26 +1000</pubDate>
</item>`,
    `<item>
 <title>Apple iPhone 17 Pro 256GB $1,797 (Save $200) + Shipping @ Harvey Norman</title>
 <link>https://www.ozbargain.com.au/node/976621</link>
 <description><![CDATA[<p>iPhone deal</p>]]></description>
 <category domain="https://www.ozbargain.com.au/cat/mobile">Mobile</category>
 <ozb:meta comment-count="2" votes-pos="3" votes-neg="1" url="https://www.harveynorman.com.au/iphone" />
 <pubDate>Sun, 27 Sep 2026 19:00:00 +1000</pubDate>
</item>`,
]);

const PAGES = {
    'https://feeds.feedburner.com/SlickdealsnetFP': slickdeals,
    'https://www.hotukdeals.com/rss/hot': hukdHot,
    'https://www.hotukdeals.com/rss/new': hukdNew,
    'https://www.ozbargain.com.au/deals/feed': ozbargain,
};

globalThis.__cashbackFetchPage = async (url) => {
    if (process.env.MOCK_FEEDS_DOWN) return { url, finalUrl: url, status: 503, html: '' };
    const html = PAGES[url];
    return html ? { url, finalUrl: url, status: 200, html } : { url, finalUrl: url, status: 404, html: '' };
};

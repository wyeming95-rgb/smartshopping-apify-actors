// Deal community RSS feeds and how to read each one into a common deal row.
import { clean, decode } from './core/rates.js';

export const FEEDS = {
    'slickdeals-frontpage': {
        site: 'Slickdeals', country: 'US', currency: 'USD',
        // Slickdeals' official FeedBurner mirror of its frontpage feed (its own RSS search URL is closed to crawlers).
        url: 'https://feeds.feedburner.com/SlickdealsnetFP',
        parse: slickdeals,
    },
    'hotukdeals-hot': { site: 'hotukdeals', country: 'UK', currency: 'GBP', url: 'https://www.hotukdeals.com/rss/hot', parse: hotukdeals },
    'hotukdeals-new': { site: 'hotukdeals', country: 'UK', currency: 'GBP', url: 'https://www.hotukdeals.com/rss/new', parse: hotukdeals },
    'ozbargain-new': { site: 'OzBargain', country: 'AU', currency: 'AUD', url: 'https://www.ozbargain.com.au/deals/feed', parse: ozbargain },
};

/** Raw <item> blocks of an RSS feed. */
export const items = (xml) => [...String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);

/** Text of the first <tag>, with CDATA unwrapped and entities decoded (not whitespace-collapsed). */
export function tag(block, name) {
    const m = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
    if (!m) return null;
    const raw = m[1].trim();
    const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
    return cdata ? cdata[1] : decode(raw);
}

/** Attributes of the first <tag ... /> as an object. */
export function attrs(block, name) {
    const m = block.match(new RegExp(`<${name}\\b([^>]*)/?>`, 'i'));
    if (!m) return {};
    return Object.fromEntries([...m[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, k, v]) => [k, decode(v)]));
}

const text = (html) => clean(String(html ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '));
const truncate = (s, n = 500) => (s && s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const date = (s) => {
    const d = s ? new Date(s) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
};

/** First price in a title: "$15.10", "£9.74", "A$29", "$1,797". "Free" counts as 0. */
export function priceOf(title) {
    const m = String(title).match(/(?:A\$|AU\$|[$£€])\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/);
    if (m) return Number(`${m[1].replace(/,/g, '')}.${m[2] ?? '0'}`);
    return /\bfree\b/i.test(title) && !/free (?:s&h|shipping|delivery|c&c)/i.test(title) ? 0 : null;
}

/** Deals that mention cash back or cashback-portal offers. */
export const mentionsCashback = (...parts) => /cash\s?back|topcashback|rakuten|quidco|shopback|cashrewards/i.test(parts.join(' '));

function base(feed, block) {
    const title = clean(tag(block, 'title'));
    const description = text(tag(block, 'description'));
    return {
        site: feed.site,
        country: feed.country,
        title,
        url: clean(tag(block, 'link'))?.replace(/\?utm_[^#]*$/, '') || null,
        postedAt: date(tag(block, 'pubDate')),
        description: truncate(description),
        currency: feed.currency,
        mentionsCashback: mentionsCashback(title, description),
    };
}

function slickdeals(block, feed) {
    const row = base(feed, block);
    const content = tag(block, 'content:encoded') ?? '';
    const score = content.match(/Thumb Score:\s*([+-]?\d+)/i)?.[1];
    return {
        ...row,
        id: `slickdeals:${row.url?.match(/\/f\/(\d+)/)?.[1] ?? row.url}`,
        price: priceOf(row.title),
        store: decode(content.match(/data-product-exitWebsite="([^"]+)"/i)?.[1] ?? content.match(/[?&;]trd=([^&"]+)/)?.[1] ?? '') || null,
        score: score === undefined ? null : Number(score),
        scoreType: 'thumbs',
        category: null,
        dealUrl: null,
        imageUrl: content.match(/<img[^>]+src="([^"]+)"/i)?.[1] ?? null,
        comments: null,
    };
}

function hotukdeals(block, feed) {
    const row = base(feed, block);
    const merchant = attrs(block, 'pepper:merchant');
    // Titles start with the deal's temperature: "113° - Reid Osprey Elite 2024 Bike".
    const temp = row.title.match(/^(-?\d+)°\s*-\s*/);
    const title = temp ? row.title.slice(temp[0].length) : row.title;
    return {
        ...row,
        title,
        id: `hotukdeals:${row.url?.match(/-(\d+)$/)?.[1] ?? row.url}`,
        price: merchant.price ? priceOf(merchant.price) : priceOf(title),
        store: merchant.name || null,
        score: temp ? Number(temp[1]) : null,
        scoreType: temp ? 'temperature' : null,
        category: clean(tag(block, 'category')) || null,
        dealUrl: null,
        imageUrl: attrs(block, 'media:content').url ?? null,
        comments: null,
    };
}

function ozbargain(block, feed) {
    const row = base(feed, block);
    const meta = attrs(block, 'ozb:meta');
    const up = Number(meta['votes-pos'] ?? NaN);
    const down = Number(meta['votes-neg'] ?? NaN);
    return {
        ...row,
        id: `ozbargain:${row.url?.match(/\/node\/(\d+)/)?.[1] ?? row.url}`,
        price: priceOf(row.title),
        store: row.title.match(/@\s*([^@]+?)\s*$/)?.[1] ?? null,
        score: Number.isNaN(up) ? null : up - (Number.isNaN(down) ? 0 : down),
        scoreType: Number.isNaN(up) ? null : 'votes',
        category: clean(tag(block, 'category')) || null,
        dealUrl: meta.url || null,
        imageUrl: meta.image || null,
        comments: meta['comment-count'] === undefined ? null : Number(meta['comment-count']),
    };
}

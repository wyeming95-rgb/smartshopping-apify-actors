// One adapter per cashback portal. Each builds candidate store-page URLs for a merchant and
// parses a fetched page into { listed, merchantName, rate, previousRate }.
// Rates come from page titles and meta tags where possible: they carry the headline rate and
// change far less often than the page layout.
import { baseName, clean, domainOf, findCashbackRate, meta, parseRate, slugify, title } from './rates.js';

const pathOf = (u) => {
    try { return new URL(u).pathname.replace(/\/+$/, '').toLowerCase(); } catch { return ''; }
};
const visibleText = (html) => clean(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
const notListed = { listed: false };

/** Merchant name from the text before the rate, e.g. "Nike 8% Cash Back + Coupons" -> "Nike". */
const nameBeforeRate = (s) => clean(s).split(/\s*(?:\||-|:)?\s*(?:up to\s*|<\s*)?(?:\d+(?:\.\d+)?\s?%|[$£]\s?\d)/i)[0].trim() || null;

const rakuten = {
    id: 'rakuten-us', name: 'Rakuten', country: 'US', currency: 'USD',
    candidates: (m) => [`https://www.rakuten.com/${domainOf(m)}`, `https://www.rakuten.com/shop/${slugify(baseName(m))}`],
    parse({ html, finalUrl, status }) {
        if (status !== 200 || !/\/shop\//.test(pathOf(finalUrl))) return notListed;
        const og = meta(html, 'og:title') ?? '';
        const rate = findCashbackRate(og, 'USD');
        if (!rate) return { listed: true, merchantName: nameBeforeRate(og), rate: null };
        const was = visibleText(html).match(new RegExp(`${rate.rateText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*cash\\s?back\\s*was\\s*((?:up to\\s*)?[\\d.]+%|\\$[\\d.]+)`, 'i'));
        return { listed: true, merchantName: nameBeforeRate(og), rate, previousRate: was ? parseRate(was[1], 'USD') : null };
    },
};

function topCashback(id, country, base, currency) {
    return {
        id, name: 'TopCashback', country, currency,
        candidates: (m) => {
            const slug = slugify(baseName(m));
            return [...new Set([`${base}/${slug}/`, `${base}/${slug.replace(/-/g, '')}/`])];
        },
        parse({ html, finalUrl, status }) {
            if (status !== 200 || /\|\s*Error/i.test(title(html) ?? '')) return notListed;
            if (!/^\/[^/]+$/.test(pathOf(finalUrl))) return notListed; // redirected away from a store page
            const merchantName = (title(html) ?? '').split(/\s+(?:Offers|Cashback Offers|Cash Back Offers)\b/i)[0].trim() || null;
            return { listed: true, merchantName, rate: findCashbackRate(meta(html, 'description') ?? '', currency) };
        },
    };
}

const befrugal = {
    id: 'befrugal-us', name: 'BeFrugal', country: 'US', currency: 'USD',
    candidates: (m) => {
        const slug = slugify(baseName(m));
        return [...new Set([`https://www.befrugal.com/store/${slug.replace(/-/g, '')}/`, `https://www.befrugal.com/store/${slug}/`])];
    },
    parse({ html, finalUrl, status }) {
        if (status !== 200 || !/^\/store\/[^/]+$/.test(pathOf(finalUrl))) return notListed;
        const t = title(html) ?? '';
        return { listed: true, merchantName: nameBeforeRate(t), rate: findCashbackRate(t, 'USD') };
    },
};

const capitalOneShopping = {
    id: 'capitalone-shopping-us', name: 'Capital One Shopping', country: 'US', currency: 'USD',
    candidates: (m) => [`https://capitaloneshopping.com/s/${domainOf(m)}/coupon`],
    parse({ html, status }) {
        if (status !== 200) return notListed;
        const reward = clean(html).match(/Get (up to )?(\d+(?:\.\d+)?%|\$\s?\d+(?:\.\d+)?) back on purchases when you shop (?:on|at) ([^.<"\\]+)/i);
        if (!reward) return notListed; // store page exists but the store has no rewards
        return { listed: true, merchantName: reward[3].trim(), rate: parseRate(`${reward[1] ?? ''}${reward[2]}`, 'USD') };
    },
};

const mrRebates = {
    id: 'mrrebates-us', name: 'Mr. Rebates', country: 'US', currency: 'USD',
    directoryUrl: 'https://www.mrrebates.com/merchants/all_merchants.asp',
    /** Store list: name -> { url, rate } parsed from the A-Z merchants page. */
    parseDirectory(html) {
        const stores = new Map();
        const links = [...html.matchAll(/<a[^>]+href="(\/merchant\.asp\?id=\d+)"[^>]*>([\s\S]*?)<\/a>/gi)];
        links.forEach((m, i) => {
            const name = clean(m[2].replace(/<[^>]+>/g, ' '));
            if (!name || stores.has(name.toLowerCase())) return;
            // The rate sits between this store's link and the next one.
            const end = links[i + 1]?.index ?? m.index + m[0].length + 400;
            const after = clean(html.slice(m.index + m[0].length, Math.min(end, m.index + m[0].length + 400)).replace(/<[^>]+>/g, ' '));
            stores.set(name.toLowerCase(), { name, url: `https://www.mrrebates.com${m[1]}`, rate: findCashbackRate(after, 'USD') });
        });
        return stores;
    },
};

const shopBack = {
    id: 'shopback-au', name: 'ShopBack', country: 'AU', currency: 'AUD',
    candidates: (m) => [`https://www.shopback.com.au/${slugify(baseName(m))}`],
    parse({ html, finalUrl, status, url }) {
        if (status !== 200 || pathOf(finalUrl) !== pathOf(url)) return notListed;
        const t = title(html) ?? '';
        const merchantName = t.split('|')[0].trim() || null;
        if (/temporarily unavailable/i.test(t)) return { listed: true, merchantName, rate: null, paused: true };
        return { listed: true, merchantName, rate: findCashbackRate(t, 'AUD') };
    },
};

export const PORTALS = [
    rakuten,
    topCashback('topcashback-us', 'US', 'https://www.topcashback.com', 'USD'),
    befrugal,
    capitalOneShopping,
    mrRebates,
    topCashback('topcashback-uk', 'UK', 'https://www.topcashback.co.uk', 'GBP'),
    topCashback('topcashback-au', 'AU', 'https://www.topcashback.com.au', 'AUD'),
    shopBack,
];

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
        // Unknown stores fall back to Rakuten's generic "Coupons, Promo Codes & Cash Back | Rakuten" page.
        if (!og || /\|\s*Rakuten\s*$/i.test(og) || /^Coupons, Promo Codes/i.test(og)) return notListed;
        if (/\bNo Cash Back\b/i.test(og)) return { listed: true, merchantName: og.split(/\s+No Cash Back/i)[0].trim(), rate: null, noCashback: true };
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
        parse({ html, url, finalUrl, status }) {
            if (status !== 200 || /\|\s*Error/i.test(title(html) ?? '')) return notListed;
            // Some stores redirect to another one (Best Buy -> Currys on the UK site): only the requested page counts.
            if (pathOf(finalUrl) !== pathOf(url)) return notListed;
            const merchantName = (title(html) ?? '').split(/\s+(?:Offers|Cashback Offers|Cash Back Offers)\b/i)[0].trim() || null;
            // UK and AU state the rate in the meta description; the US site only shows it in the store's
            // main block, which comes after the navigation banners that advertise other stores' rates.
            // The block can also advertise card or device promos ("$450 cash back"), so a percentage wins over
            // an earlier fixed amount; a fixed amount is used only when the store has no percentage rate.
            const main = html.indexOf('merch-primary-slice');
            const block = main === -1 ? '' : visibleText(html.slice(main, main + 30_000));
            const blockPercent = block.match(/(?:up to\s*)?\d+(?:\.\d+)?\s?%\s*(?:cash\s?back|cashback)/i)?.[0];
            const rate = findCashbackRate(meta(html, 'description') ?? '', currency)
                ?? (blockPercent ? findCashbackRate(blockPercent, currency) : findCashbackRate(block, currency));
            return { listed: true, merchantName, rate };
        },
    };
}

const befrugal = {
    id: 'befrugal-us', name: 'BeFrugal', country: 'US', currency: 'USD',
    candidates: (m) => {
        const slug = slugify(baseName(m));
        return [...new Set([`https://www.befrugal.com/store/${slug.replace(/-/g, '')}/`, `https://www.befrugal.com/store/${slug}/`])];
    },
    parse({ html, url, finalUrl, status }) {
        if (status !== 200 || pathOf(finalUrl) !== pathOf(url)) return notListed;
        const t = title(html) ?? '';
        return { listed: true, merchantName: nameBeforeRate(t), rate: findCashbackRate(t, 'USD') };
    },
};

const capitalOneShopping = {
    id: 'capitalone-shopping-us', name: 'Capital One Shopping', country: 'US', currency: 'USD',
    candidates: (m) => [`https://capitaloneshopping.com/s/${domainOf(m)}/coupon`],
    parse({ html, status }) {
        if (status !== 200) return notListed;
        // The rewards headline, e.g. "Get 2% back on purchases when you shop on Nike."
        const headline = clean(html.match(/data-testid="coupon-content-title"[^>]*>([^<]+)</i)?.[1] ?? '');
        const reward = headline.match(/Get (up to )?(\d+(?:\.\d+)?%|\$\s?\d+(?:\.\d+)?) back on purchases when you shop (?:on|at) (.+?)\.?$/i);
        if (!reward) return notListed; // store page exists but the store has no rewards
        const rate = parseRate(`${reward[1] ?? ''}${reward[2]}`, 'USD');
        if (!rate?.rateValue) return { listed: true, merchantName: reward[3].trim(), rate: null, noCashback: true };
        return { listed: true, merchantName: reward[3].trim(), rate };
    },
};

const mrRebates = {
    id: 'mrrebates-us', name: 'Mr. Rebates', country: 'US', currency: 'USD',
    directoryUrl: 'https://www.mrrebates.com/merchants/all_merchants.asp',
    /**
     * Store list: name -> { url, rate } parsed from the A-Z merchants page, where each row is
     * <a href="/click/nw.asp?merchant_id=N" class="StoreName">Name</a> ... <div class="... CashBackSmaller">3% Cash Back</div>.
     */
    parseDirectory(html) {
        const stores = new Map();
        const rows = [...html.matchAll(/<a[^>]+merchant_id=(\d+)[^>]*class="StoreName"[^>]*>([\s\S]*?)<\/a>/gi)];
        rows.forEach((m, i) => {
            const name = clean(m[2].replace(/<[^>]+>/g, ' '));
            if (!name || stores.has(name.toLowerCase())) return;
            const rowHtml = html.slice(m.index + m[0].length, rows[i + 1]?.index ?? m.index + m[0].length + 1500);
            const cell = rowHtml.match(/class="[^"]*CashBackSmaller[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '';
            stores.set(name.toLowerCase(), { name, url: `https://www.mrrebates.com/merchant.asp?id=${m[1]}`, rate: findCashbackRate(clean(cell.replace(/<[^>]+>/g, ' ')), 'USD') });
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

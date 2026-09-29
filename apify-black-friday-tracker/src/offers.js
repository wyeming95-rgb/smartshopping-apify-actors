// Offers listed on cashback portal store pages: coupon codes, sales and promos, with the cashback on top.
// Rakuten (US) embeds each offer tile as JSON in __NEXT_DATA__; TopCashback (US, UK, AU) renders
// <div class="merch-offer ..."> blocks with a title, an optional description and the cashback rate.
import { clean } from './core/rates.js';

const text = (html) => clean(String(html ?? '').replace(/<[^>]+>/g, ' '));

// Sale events, most specific first: an offer gets the first one it mentions.
const EVENTS = [
    ['Black Friday', /black\s*friday/i],
    ['Cyber Monday', /cyber\s*(?:monday|week)/i],
    ['Singles Day', /singles'?\s*day|11\.11/i],
    ['Click Frenzy', /click\s*frenzy/i],
    ['Boxing Day', /boxing\s*day/i],
    ['Prime Day', /prime\s*(?:big\s*deal\s*)?days?/i],
    ['Labor Day', /labou?r\s*day/i],
    ['Memorial Day', /memorial\s*day/i],
    ['Presidents Day', /presidents'?\s*day/i],
    ['Christmas', /christmas|holiday\s+sale/i],
    ['New Year', /new\s*year/i],
    ['End of Season', /end\s*of\s*season|\bEOSS\b/i],
    ['Clearance', /clearance/i],
];

/** Sale event named in the text ("Black Friday", "Cyber Monday", ...) or null. */
export const saleEventOf = (s) => EVENTS.find(([, re]) => re.test(s))?.[0] ?? null;

/** Largest percentage off mentioned: "Up to 40% off" -> 40, "extra 15-30% off" -> 30, "Save 20%" -> 20. */
export function maxDiscountPercent(s) {
    let best = null;
    const re = /(\d{1,2}(?:\.\d+)?)\s*%?\s*(?:-|–|to)\s*(\d{1,2}(?:\.\d+)?)\s*%\s*off|(\d{1,2}(?:\.\d+)?)\s*%\s*off|(?:save|take|get)\s+(?:up\s+to\s+|an\s+extra\s+|extra\s+)?(\d{1,2}(?:\.\d+)?)\s*%/gi;
    for (const m of s.matchAll(re)) {
        const n = Number(m[2] ?? m[3] ?? m[4]);
        if (n > 0 && n < 100 && (best === null || n > best)) best = n;
    }
    return best;
}

/** A code quoted in the offer text: 'with code "BEST"', 'use code SAVE20', 'Promo code: XMAS25'. */
export function codeInText(s) {
    const m = String(s ?? '').match(/\b(?:promo|coupon|voucher|discount)?\s*code\s*:?\s*["“'‘]?([A-Za-z0-9]*[A-Z0-9][A-Za-z0-9-]{2,19})["”'’]?(?=[\s.,;!)]|$)/i);
    const code = m?.[1];
    // Codes are shouted: "BEST", "SAVE20". Skip ordinary words ("code required", "code at checkout").
    return code && code === code.toUpperCase() && /[A-Z]/.test(code) ? code : null;
}

/** Fields derived from an offer's wording, shared by both portals. */
export function classify({ title, description, code }) {
    const all = `${title} ${description ?? ''}`;
    code = code || codeInText(all);
    const discount = maxDiscountPercent(all);
    const freeShipping = /free\s+(?:standard\s+|next[- ]day\s+|2-day\s+)?(?:shipping|delivery)/i.test(all);
    const event = saleEventOf(all);
    return {
        code: code || null,
        // Sale words count in the title only; descriptions are mostly terms and conditions.
        offerType: code ? 'code' : discount !== null || /\bsale\b|\boff\b|\bdeals?\b|\bsave\b/i.test(title) ? 'sale' : freeShipping ? 'free-shipping' : 'cashback',
        maxDiscountPercent: discount,
        freeShipping,
        saleEvent: event,
        isBlackFriday: /black\s*friday/i.test(all),
        isCyberMonday: /cyber\s*(?:monday|week)/i.test(all),
    };
}

/** Walks parsed JSON and calls `visit` on every object. */
function walk(node, visit) {
    if (Array.isArray(node)) {
        for (const n of node) walk(n, visit);
    } else if (node && typeof node === 'object') {
        visit(node);
        for (const v of Object.values(node)) walk(v, visit);
    }
}

/**
 * Offer tiles on a Rakuten store page. Tiles carry `itemData` (texts, code, badge, rewards) and a payload with the
 * tile's store ID; tiles advertising other stores are skipped when the page's store ID is known.
 */
export function rakutenOffers(html, storeId = null) {
    const json = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
    if (!json) return [];
    let data;
    try {
        data = JSON.parse(json);
    } catch {
        return [];
    }
    const offers = new Map();
    walk(data, (node) => {
        const d = node.itemData;
        if (!d || typeof d !== 'object') return;
        const title = clean(d.coupon_modal_deal_text ?? d.tagline_text ?? '');
        if (!title || !d.id) return;
        const tileStore = node.payloads?.[0]?.payload?.store_id ?? d.image_imageurl?.match(/\/store\/(\d+)\//)?.[1];
        if (storeId && tileStore && String(tileStore) !== String(storeId)) return;
        if (offers.has(String(d.id))) return;
        offers.set(String(d.id), {
            offerId: String(d.id),
            title,
            description: clean(d.coupon_modal_restriction ?? '') || null,
            code: clean(d.coupon_modal_code ?? '') || null,
            badge: clean(d.primarytag_text ?? '') || null,
            cashback: clean(d.currentreward_rewardtext ?? '') || null,
            previousCashback: clean(d.previousreward_rewardtext ?? '').replace(/^was\s+/i, '') || null,
            offerUrl: d.cta_ctaurl ?? null,
        });
    });
    return [...offers.values()];
}

const classText = (block, cls) => {
    const m = block.match(new RegExp(`class=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>([\\s\\S]*?)</(?:p|span|div|h\\d|a)>`, 'i'));
    return m ? text(m[1]) || null : null;
};

const EXPIRY = /\b(?:expires?|ends?|valid\s+(?:until|till|through)|until)\s*:?\s*((?:today|tomorrow|soon)|\d{1,2}[/.]\d{1,2}[/.]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Z][a-z]{2,8}(?:\s+\d{4})?|[A-Z][a-z]{2,8}\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i;

/** Offer blocks on a TopCashback store page (any country). */
export function topCashbackOffers(html) {
    const starts = [...html.matchAll(/<div[^>]+class=["']merch-offer\s[^"']*["']/gi)].map((m) => m.index);
    const offers = [];
    const seen = new Set();
    starts.forEach((start, i) => {
        const block = html.slice(start, Math.min(starts[i + 1] ?? Infinity, start + 6000));
        const title = classText(block, 'merch-offer__custom-deal-title') ?? classText(block, 'merch-offer__title');
        if (!title) return;
        const description = classText(block, 'merch-offer__desc');
        const code = classText(block, 'merch-offer__code') ?? clean(block.match(/data-(?:voucher-)?code=["']([^"']+)["']/i)?.[1] ?? '') ?? null;
        const key = `${title}|${description ?? ''}|${code ?? ''}`;
        if (seen.has(key)) return;
        seen.add(key);
        const visible = text(block.replace(/<svg[\s\S]*?<\/svg>/gi, ' '));
        offers.push({
            offerId: null,
            title,
            description,
            code: code || null,
            badge: visible.match(EXPIRY)?.[0] ?? null,
            cashback: classText(block, 'merch-offer__rate'),
            previousCashback: classText(block, 'merch-offer__(?:was-rate|previous-rate)'),
            offerUrl: null,
        });
    });
    return offers;
}

/** Short stable hash for offers without an ID of their own. */
export function hashOf(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
}

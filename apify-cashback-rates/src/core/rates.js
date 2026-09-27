// Parsing helpers shared by the portal adapters.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export const decode = (s) => String(s ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

export const clean = (s) => decode(s).replace(/\s+/g, ' ').trim();

/** Content of <meta property|name="..."> (attribute order independent). */
export function meta(html, key) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, 'i');
    const tag = html.match(re)?.[0];
    return tag ? clean(tag.match(/content=["']([^"']*)["']/i)?.[1] ?? '') : null;
}

export const title = (html) => clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '') || null;

export const slugify = (name) => String(name).trim().toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const hostPart = (name) => name.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/?#].*$/, '');

/** "nike.com" and "https://www.nike.com/us" -> "nike.com"; a plain name such as "Nike" -> "nike.com". */
export const domainOf = (name) => {
    const host = hostPart(name);
    return /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(host) ? host : `${slugify(name).replace(/-/g, '')}.com`;
};

/** Merchant name without a domain suffix, for slugs: "nike.com" -> "nike", "Marks & Spencer" unchanged. */
export const baseName = (name) => {
    const host = hostPart(name);
    return /\.[a-z]{2,}$/.test(host) ? host.replace(/\.(com|co\.uk|com\.au|net|org|co)$/i, '') : name.trim();
};

const RATE_RE = /(up to\s*|<\s*)?(\d+(?:\.\d+)?)\s?%|(up to\s*|<\s*)?(A\$|AU\$|\$|£)\s?(\d+(?:\.\d+)?)/i;

/**
 * Parse a rate phrase such as "Up to 8% Cash Back", "< 5.5% Cashback" or "£25 cashback".
 * @returns {{rateText, rateType: 'percent'|'fixed', rateValue: number, currency: string|null, isUpTo: boolean} | null}
 */
export function parseRate(text, defaultCurrency = null) {
    const m = clean(text).match(RATE_RE);
    if (!m) return null;
    if (m[2] !== undefined) {
        return { rateText: m[0].trim(), rateType: 'percent', rateValue: Number(m[2]), currency: null, isUpTo: Boolean(m[1]) };
    }
    const symbol = m[4];
    const currency = symbol === '£' ? 'GBP' : /A/.test(symbol) ? 'AUD' : defaultCurrency ?? 'USD';
    return { rateText: m[0].trim(), rateType: 'fixed', rateValue: Number(m[5]), currency, isUpTo: Boolean(m[3]) };
}

/** First rate phrase that is followed by a cashback word, e.g. "8% Cash Back" inside a longer sentence. */
export function findCashbackRate(text, defaultCurrency) {
    const hit = clean(text).match(/(?:up to\s*(?:up to\s*)?|<\s*)?(?:\d+(?:\.\d+)?\s?%|(?:A\$|AU\$|\$|£)\s?\d+(?:\.\d+)?)\s*(?:cash\s?back|cashback|back|rewards?)/i);
    return hit ? parseRate(hit[0], defaultCurrency) : null;
}

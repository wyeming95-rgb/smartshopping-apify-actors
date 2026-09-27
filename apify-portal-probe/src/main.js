// Development-only probe: fetch cashback portal pages from Apify and report whether they load,
// whether a bot wall is in the way, and where the cashback rates live (visible HTML, embedded
// Next.js data or JSON-LD), with samples of the surrounding markup for writing parsers.
import { Actor, log } from 'apify';
import { gotScraping } from 'got-scraping';

await Actor.init();

const DEFAULT_TARGETS = [
    { portal: 'rakuten-all', url: 'https://www.rakuten.com/stores/all', around: 'Sephora', linkPattern: '^/shop/[a-z0-9-]+$|rakuten\\.com/shop/' },
    { portal: 'rakuten-all-page2', url: 'https://www.rakuten.com/stores/all?page=2', linkPattern: '^/shop/' },
    { portal: 'topcashback-us-az', url: 'https://www.topcashback.com/a-z/', linkPattern: '^/[a-z0-9-]+/$|/a-z/' },
    { portal: 'topcashback-uk-az', url: 'https://www.topcashback.co.uk/a-z/', linkPattern: '/a-z/' },
    { portal: 'shopback-au-all', url: 'https://www.shopback.com.au/all-stores', around: 'THE ICONIC', linkPattern: 'all-stores|^/[a-z0-9-]+$' },
]

const BOT_WALLS = [
    ['cloudflare-challenge', /cf-chl|challenge-platform|Just a moment\.\.\.|cf_chl_opt/i],
    ['perimeterx', /px-captcha|_pxAppId|perimeterx/i],
    ['datadome', /captcha-delivery\.com|datadome/i],
    ['akamai', /Access Denied[\s\S]{0,200}Reference #/i],
];
const RATE_RE = /(?:up to\s*)?\d+(?:\.\d+)?\s?%\s*(?:cash\s?back|cashback|rewards?|back)|(?:[$£]|A\$)\s?\d+(?:\.\d+)?\s*(?:cash\s?back|cashback)/gi;

const { targets = DEFAULT_TARGETS, useProxy = false } = (await Actor.getInput()) ?? {};

const proxyConfiguration = useProxy ? await Actor.createProxyConfiguration().catch(() => null) : null;

/** Primitive values in a JSON tree whose key or value looks cashback-related, as "path = value". */
function jsonHits(obj, limit = 30) {
    const out = [];
    const walk = (node, path) => {
        if (out.length >= limit || node === null || node === undefined) return;
        if (typeof node !== 'object') {
            const key = path.split('.').pop();
            if (/cash|reward|rebate|rate|commission|percent|payout/i.test(key) || (typeof node === 'string' && /cash ?back|% back/i.test(node) && node.length < 120)) {
                out.push(`${path} = ${JSON.stringify(node).slice(0, 100)}`);
            }
            return;
        }
        for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    };
    walk(obj, '');
    return out;
}

function analyze(html, target) {
    const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const report = {
        title: (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim().slice(0, 100),
        bytes: html.length,
        botWalls: BOT_WALLS.filter(([, re]) => re.test(html)).map(([n]) => n),
    };
    const next = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
    if (next) {
        try {
            const data = JSON.parse(next);
            report.nextDataTopKeys = Object.keys(data.props?.pageProps ?? {}).slice(0, 25);
            report.nextDataBytes = next.length;
            const d = data.props?.pageProps?.d;
            if (d && typeof d === 'object') report.nextDataD = Object.fromEntries(Object.entries(d).slice(0, 15).map(([k, v]) => [k, Array.isArray(v) ? `array(${v.length}) ${JSON.stringify(v[0]).slice(0, 300)}` : typeof v === 'object' && v ? `keys: ${Object.keys(v).slice(0, 12).join(',')}` : String(v).slice(0, 80)]));
            report.nextDataHits = jsonHits(data.props?.pageProps ?? data);
        } catch (err) {
            report.nextDataError = err.message;
        }
    }
    report.jsonLd = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].slice(0, 6).map((m) => {
        try {
            const d = JSON.parse(m[1]);
            const first = Array.isArray(d) ? d[0] : d;
            return `${first?.['@type']}: ${jsonHits(d, 6).join(' | ') || JSON.stringify(d).slice(0, 160)}`;
        } catch { return 'unparseable'; }
    });
    // Raw markup around the first rate mentions, so class names and structure are visible.
    report.htmlAroundRates = [...html.matchAll(RATE_RE)].slice(0, 4).map((m) => html.slice(Math.max(0, m.index - 350), m.index + 120).replace(/\s+/g, ' '));
    report.textRates = [...text.matchAll(RATE_RE)].slice(0, 8).map((m) => m[0]);
    report.metaDescription = (html.match(/<meta[^>]+name=["']description["'][^>]*>/i)?.[0] ?? '').slice(0, 400);
    report.ogTitle = (html.match(/<meta[^>]+property=["']og:title["'][^>]*>/i)?.[0] ?? '').slice(0, 300);
    if (target.around) {
        // Raw markup around the first few mentions of a marker string (merchant name, test id, ...).
        const idx = [];
        for (let i = html.indexOf(target.around); i !== -1 && idx.length < 5; i = html.indexOf(target.around, i + 400)) idx.push(i);
        report.htmlAroundMarker = idx.map((i) => html.slice(Math.max(0, i - 100), i + 1500).replace(/\s+/g, ' '));
    }
    if (target.linkPattern) {
        const re = new RegExp(target.linkPattern, 'i');
        report.sampleLinks = [...new Set([...html.matchAll(/href="([^"#?]+)"/gi)].map((m) => m[1]).filter((h) => re.test(h)))].slice(0, 20);
    }
    return report;
}

for (const target of targets) {
    const started = Date.now();
    const row = { portal: target.portal, url: target.url };
    try {
        const res = await gotScraping({
            url: target.url,
            proxyUrl: proxyConfiguration ? await proxyConfiguration.newUrl() : undefined,
            timeout: { request: 30_000 },
            throwHttpErrors: false,
        });
        Object.assign(row, { status: res.statusCode, finalUrl: res.url, ms: Date.now() - started, ...analyze(String(res.body), target) });
    } catch (err) {
        Object.assign(row, { error: err.message.slice(0, 200), ms: Date.now() - started });
    }
    log.info(`${target.portal} ${row.status ?? 'ERR'} ${row.bytes ?? ''}B`);
    await Actor.pushData(row);
}

await Actor.exit();

// Development-only probe: for each cashback portal, fetch one public merchant page and report
// whether it loads, whether a bot wall is in the way, and where the cashback rate appears.
import { Actor, log } from 'apify';
import { gotScraping } from 'got-scraping';

await Actor.init();

const { merchant = 'nike', portals: only = [], useProxy = true } = (await Actor.getInput()) ?? {};

const PORTALS = [
    { id: 'rakuten-us', country: 'US', urls: [`https://www.rakuten.com/${merchant}.com`] },
    { id: 'topcashback-us', country: 'US', urls: [`https://www.topcashback.com/${merchant}/`] },
    { id: 'befrugal-us', country: 'US', urls: [`https://www.befrugal.com/store/${merchant}/`] },
    { id: 'swagbucks-us', country: 'US', urls: [`https://www.swagbucks.com/shop/${merchant}-coupons`] },
    { id: 'capitalone-shopping-us', country: 'US', urls: [`https://capitaloneshopping.com/s/${merchant}.com/coupon`] },
    { id: 'mrrebates-us', country: 'US', urls: ['https://www.mrrebates.com/'] },
    { id: 'topcashback-uk', country: 'UK', urls: [`https://www.topcashback.co.uk/${merchant}/`] },
    { id: 'quidco-uk', country: 'UK', urls: [`https://www.quidco.com/${merchant}/`] },
    { id: 'cashrewards-au', country: 'AU', urls: [`https://www.cashrewards.com.au/store/${merchant}`] },
    { id: 'shopback-au', country: 'AU', urls: [`https://www.shopback.com.au/${merchant}`] },
    { id: 'topcashback-au', country: 'AU', urls: [`https://www.topcashback.com.au/${merchant}/`] },
].filter((p) => !only.length || only.includes(p.id));

const BOT_WALLS = [
    ['cloudflare-challenge', /cf-chl|challenge-platform|Just a moment\.\.\.|cf_chl_opt/i],
    ['perimeterx', /px-captcha|_pxAppId|perimeterx/i],
    ['datadome', /datadome|dd\.js|captcha-delivery\.com/i],
    ['akamai', /Access Denied[\s\S]{0,200}Reference #|_abck|akam\//i],
    ['incapsula', /incap_ses|_Incapsula_Resource/i],
    ['generic-captcha', /recaptcha|hcaptcha|g-recaptcha/i],
];

let proxyConfiguration = null;
if (useProxy) {
    try {
        proxyConfiguration = await Actor.createProxyConfiguration();
    } catch (err) {
        log.warning(`Apify Proxy not available on this plan: ${err.message}`);
    }
}

const summarize = (html) => {
    const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const rateHits = [...text.matchAll(/.{0,60}(?:\d+(?:\.\d+)?\s?%|[$£]\s?\d+(?:\.\d+)?)\s?(?:cash\s?back|cashback|back|rewards?)?.{0,40}/gi)]
        .map((m) => m[0].trim()).filter((s) => /cash|back|reward|%/i.test(s)).slice(0, 4);
    const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
    const rateInScripts = scripts.filter((s) => /cash\s?back|cashback|rebate/i.test(s) && /\d+(\.\d+)?\s?%|"rate"|"cashback/i.test(s)).length;
    return {
        title: (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim().slice(0, 100),
        bytes: html.length,
        visibleTextChars: text.length,
        botWalls: BOT_WALLS.filter(([, re]) => re.test(html)).map(([n]) => n),
        hasNextData: /id="__NEXT_DATA__"/.test(html),
        hasNuxt: /window\.__NUXT__|id="__NUXT_DATA__"/.test(html),
        hasApolloOrRedux: /__APOLLO_STATE__|__PRELOADED_STATE__|__INITIAL_STATE__/.test(html),
        jsonLdBlocks: (html.match(/application\/ld\+json/g) ?? []).length,
        scriptsMentioningRates: rateInScripts,
        rateSnippetsInText: rateHits,
    };
};

for (const portal of PORTALS) {
    for (const url of portal.urls) {
        for (const mode of proxyConfiguration ? ['direct', 'proxy'] : ['direct']) {
            const started = Date.now();
            const row = { portal: portal.id, country: portal.country, url, mode };
            try {
                const res = await gotScraping({
                    url,
                    proxyUrl: mode === 'proxy' ? await proxyConfiguration.newUrl() : undefined,
                    timeout: { request: 30_000 },
                    throwHttpErrors: false,
                    followRedirect: true,
                });
                Object.assign(row, { status: res.statusCode, finalUrl: res.url, ms: Date.now() - started, ...summarize(String(res.body)) });
                await Actor.setValue(`${portal.id}-${mode}`.replace(/[^a-zA-Z0-9-]/g, '-'), String(res.body).slice(0, 2_000_000), { contentType: 'text/html' });
            } catch (err) {
                Object.assign(row, { error: err.message.slice(0, 200), ms: Date.now() - started });
            }
            log.info(`${portal.id} [${mode}] ${row.status ?? 'ERR'} ${row.bytes ?? ''}B walls=${(row.botWalls ?? []).join(',') || '-'}`);
            await Actor.pushData(row);
        }
    }
}

await Actor.exit();

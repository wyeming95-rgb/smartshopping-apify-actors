import { gotScraping } from 'got-scraping';

const MIN_INTERVAL_MS = 400; // per portal host, to stay polite
const lastHit = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET a page with browser-like headers. Returns { url, finalUrl, status, html }; never throws on HTTP errors. */
async function realFetchPage(url) {
    const host = new URL(url).host;
    const wait = (lastHit.get(host) ?? 0) + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastHit.set(host, Date.now());
    for (let attempt = 0; ; attempt++) {
        try {
            const res = await gotScraping({ url, timeout: { request: 30_000 }, throwHttpErrors: false, followRedirect: true });
            if ((res.statusCode === 429 || res.statusCode >= 500) && attempt < 2) {
                await sleep(2000 * (attempt + 1));
                continue;
            }
            return { url, finalUrl: res.url, status: res.statusCode, html: String(res.body) };
        } catch (err) {
            if (attempt >= 2) return { url, finalUrl: url, status: 0, html: '', error: err.message };
            await sleep(2000 * (attempt + 1));
        }
    }
}

// Tests preload a module that sets globalThis.__cashbackFetchPage to serve fixture pages.
export const fetchPage = (url) => (globalThis.__cashbackFetchPage ?? realFetchPage)(url);

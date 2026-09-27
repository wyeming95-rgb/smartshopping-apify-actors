import { StringDecoder } from 'node:string_decoder';
import { gotScraping } from 'got-scraping';

const MIN_INTERVAL_MS = 400; // per portal host, to stay polite
const lastHit = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function throttle(url) {
    const host = new URL(url).host;
    // Reserve the slot before sleeping so concurrent callers queue up behind each other.
    const slot = Math.max(Date.now(), (lastHit.get(host) ?? 0) + MIN_INTERVAL_MS);
    lastHit.set(host, slot);
    if (slot > Date.now()) await sleep(slot - Date.now());
}

/** Retries network errors, 429s and 5xx twice; `once` returns { finalUrl, status, html } or throws. */
async function withRetries(url, once) {
    await throttle(url);
    for (let attempt = 0; ; attempt++) {
        try {
            const res = await once();
            if ((res.status === 429 || res.status >= 500) && attempt < 2) {
                await sleep(2000 * (attempt + 1));
                continue;
            }
            return { url, ...res };
        } catch (err) {
            if (attempt >= 2) return { url, finalUrl: url, status: 0, html: '', error: err.message };
            await sleep(2000 * (attempt + 1));
        }
    }
}

const OPTIONS = { timeout: { request: 30_000 }, throwHttpErrors: false, followRedirect: true };

/** GET a page with browser-like headers. Returns { url, finalUrl, status, html }; never throws on HTTP errors. */
const realFetchPage = (url) => withRetries(url, async () => {
    const res = await gotScraping({ url, ...OPTIONS });
    return { finalUrl: res.url, status: res.statusCode, html: String(res.body) };
});

/** Like fetchPage, but stops downloading at </head>: enough for title and meta tags on multi-megabyte pages. */
const realFetchHead = (url) => withRetries(url, () => new Promise((resolve, reject) => {
    const stream = gotScraping.stream({ url, ...OPTIONS });
    const decoder = new StringDecoder('utf8');
    let html = '';
    let response = null;
    let settled = false;
    const done = () => {
        if (settled) return;
        settled = true;
        stream.destroy();
        const end = html.search(/<\/head>/i);
        resolve({ finalUrl: response?.url ?? url, status: response?.statusCode ?? 0, html: end === -1 ? html : html.slice(0, end + 7) });
    };
    stream.on('response', (res) => { response = res; });
    stream.on('data', (chunk) => {
        html += decoder.write(chunk);
        if (/<\/head>/i.test(html.slice(-chunk.length - 7)) || html.length > 2_000_000) done();
    });
    stream.on('end', done);
    stream.on('error', (err) => {
        if (settled) return;
        settled = true;
        reject(err);
    });
}));

// Tests preload a module that sets globalThis.__cashbackFetchPage to serve fixture pages.
export const fetchPage = (url) => (globalThis.__cashbackFetchPage ?? realFetchPage)(url);
export const fetchPageHead = async (url) => {
    if (!globalThis.__cashbackFetchPage) return realFetchHead(url);
    const page = await globalThis.__cashbackFetchPage(url);
    const end = page.html.search(/<\/head>/i);
    return end === -1 ? page : { ...page, html: page.html.slice(0, end + 7) };
};

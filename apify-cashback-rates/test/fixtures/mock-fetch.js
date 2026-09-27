// Preloaded via --import in the end-to-end test: serves fixture pages instead of hitting the portals.
import { PAGES } from './pages.js';

globalThis.__cashbackFetchPage = async (url) => {
    const page = PAGES[url];
    if (!page) return { url, finalUrl: url, status: 404, html: '' };
    return { url, finalUrl: page.finalUrl ?? url, status: page.status ?? 200, html: page.html };
};

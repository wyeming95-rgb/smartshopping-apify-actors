// Copies shared/cashback-core/*.js into src/core/ of every Actor that uses it (Apify builds each Actor
// from its own folder, so the shared code has to live inside it). Run after editing shared/cashback-core.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const core = join(root, 'shared/cashback-core');
export const CORE_USERS = ['apify-cashback-rates', 'apify-cashback-boost-monitor', 'apify-rakuten-scraper'];

for (const actor of CORE_USERS) {
    if (!existsSync(join(root, actor))) continue;
    const dest = join(root, actor, 'src/core');
    mkdirSync(dest, { recursive: true });
    for (const f of readdirSync(core).filter((n) => n.endsWith('.js'))) copyFileSync(join(core, f), join(dest, f));
    console.log(`synced cashback-core -> ${actor}/src/core`);
}

// Posts hot community deals and cashback boosts to a Telegram channel, using our own Apify Actors.
// Run from GitHub Actions on a schedule:
//   node scripts/telegram-channel.mjs deals    -> new hot deals from Slickdeals, hotukdeals and OzBargain
//   node scripts/telegram-channel.mjs boosts   -> cashback rate increases on a watchlist of popular stores
// Needs APIFY_TOKEN. Posts only when TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set; otherwise it is a dry run
// that prints the messages it would send. Never prints the tokens.
const API = 'https://api.apify.com/v2';
const apifyToken = process.env.APIFY_TOKEN;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const dryRun = !botToken || !chatId;
// Dry runs keep their own "already posted" memory, so previewing never swallows deals the real channel should get.
// (v2: the first live run failed to post after marking its deals as seen, so live memory starts fresh.)
const statePrefix = dryRun ? 'telegram-dryrun' : 'telegram-v2';

// Community score a deal needs before we post it, per site (the scales differ: thumbs, temperature °, votes).
const DEAL_FEEDS = [
    { source: 'slickdeals-frontpage', minScore: 25 },
    { source: 'hotukdeals-hot', minScore: 100 },
    { source: 'ozbargain-new', minScore: 25 },
];
const MAX_DEALS_PER_RUN = 8;

// Popular stores watched for cashback boosts, checked in every country each portal covers.
const WATCHLIST = [
    'Amazon', 'Walmart', 'Target', 'Best Buy', 'Nike', 'adidas', 'Sephora', 'Ulta Beauty', "Macy's", 'Home Depot',
    "Lowe's", 'Expedia', 'Booking.com', 'Hotels.com', 'eBay', 'Apple', 'Samsung', 'Dell', 'Lenovo', 'HP',
    'ASOS', 'Currys', 'Argos', 'John Lewis', 'Boots', 'Marks & Spencer', 'THE ICONIC', 'JB Hi-Fi', 'Myer', 'David Jones',
];
const MIN_BOOST_POINTS = 2;

const FLAGS = { US: '🇺🇸', UK: '🇬🇧', AU: '🇦🇺' };
const SYMBOL = { USD: '$', GBP: '£', AUD: 'A$' };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FOOTER = '<i>Data: <a href="https://apify.com/Smart-Shopping-Data">SmartShopping Data</a></i>';

// Actor IDs never change, unlike the account's username.
const ACTOR_IDS = { 'deal-community-scraper': '7e7KW09J9d6LPGucb', 'cashback-boost-monitor': 'G8TC7sUTmxwNak3Nz' };

async function runActor(actor, input, timeoutSecs = 240) {
    const res = await fetch(`${API}/acts/${ACTOR_IDS[actor]}/run-sync-get-dataset-items?timeout=${timeoutSecs}&memory=1024`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apifyToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${actor} -> HTTP ${res.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text);
}

async function telegram(method, body) {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) throw new Error(`Telegram ${method} -> HTTP ${res.status}: ${json.description ?? 'no description'}`);
    return json.result;
}

/**
 * Checks the bot can post to the channel before any Actor runs. The Actors remember what they returned, so a run
 * that fetched deals and then failed to post them would lose those deals for good.
 */
async function checkCanPost() {
    const me = await telegram('getMe', {});
    let member;
    try {
        member = await telegram('getChatMember', { chat_id: chatId, user_id: me.id });
    } catch (err) {
        throw new Error(`Cannot see the channel ${chatId} as @${me.username}: ${err.message}. Check TELEGRAM_CHAT_ID and that the bot is an admin of the channel.`);
    }
    const canPost = member.status === 'creator' || (member.status === 'administrator' && member.can_post_messages !== false);
    if (!canPost) throw new Error(`@${me.username} is "${member.status}" in ${chatId}, not an admin allowed to post. Add it as an admin with "Post messages".`);
    console.log(`@${me.username} can post to ${chatId}.`);
}

async function send(html) {
    if (dryRun) {
        console.log(`--- would post ---\n${html}\n`);
        return;
    }
    await telegram('sendMessage', { chat_id: chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: false });
    await new Promise((r) => setTimeout(r, 1500)); // stay well under Telegram's per-channel rate limit
}

export function dealMessage(d) {
    const score = d.scoreType === 'temperature' ? `${d.score}°` : d.scoreType === 'votes' ? `+${d.score} votes` : `+${d.score} 👍`;
    const price = d.price === 0 ? 'FREE' : d.price !== null && d.price !== undefined ? `${SYMBOL[d.currency] ?? ''}${d.price}` : null;
    return [
        `🔥 ${FLAGS[d.country] ?? ''} <b>${esc(d.title)}</b>`,
        [price && `💰 ${esc(price)}`, d.store && `🏬 ${esc(d.store)}`, `📈 ${esc(score)} on ${esc(d.site)}`].filter(Boolean).join('  ·  '),
        d.mentionsCashback ? '💸 Stacks with cashback' : null,
        `<a href="${esc(d.url)}">View deal</a>`,
        FOOTER,
    ].filter(Boolean).join('\n');
}

export function boostMessage(c) {
    const was = c.oldRateText ? `${esc(c.oldRateText)} → ` : '';
    return [
        `⚡ ${FLAGS[c.country] ?? ''} <b>${esc(c.merchant)}</b> cashback ${c.changeType === 'new' ? 'now available' : 'boosted'} on ${esc(c.portalName)}`,
        `${was}<b>${esc(c.newRateText)}</b>${c.changePoints ? ` (+${c.changePoints} pts)` : ''}`,
        `<a href="${esc(c.url)}">Open ${esc(c.portalName)}</a>`,
        FOOTER,
    ].join('\n');
}

async function deals() {
    const found = [];
    for (const { source, minScore } of DEAL_FEEDS) {
        // onlyNew with a per-feed state name: each deal is posted once, the first time it is hot enough.
        const items = await runActor('deal-community-scraper', { sources: [source], minScore, onlyNew: true, stateName: `${statePrefix}-${source}` });
        console.log(`${source}: ${items.length} new hot deals`);
        found.push(...items);
    }
    // Hottest first, relative to each site's threshold, capped so the channel is never flooded.
    const threshold = Object.fromEntries(DEAL_FEEDS.map((f) => [f.source, f.minScore]));
    found.sort((a, b) => b.score / threshold[b.source] - a.score / threshold[a.source]);
    for (const d of found.slice(0, MAX_DEALS_PER_RUN)) await send(dealMessage(d));
    console.log(`posted ${Math.min(found.length, MAX_DEALS_PER_RUN)} deals${dryRun ? ' (dry run)' : ''}`);
}

async function boosts() {
    const changes = await runActor('cashback-boost-monitor', {
        merchants: WATCHLIST,
        watchlistName: `${statePrefix}-channel`,
        changeTypes: ['increase', 'portal-boost', 'new'],
        minChangePoints: MIN_BOOST_POINTS,
    }, 900);
    // A store newly offering cashback is only worth a post when it comes with a percentage rate.
    const posts = changes.filter((c) => c.changeType !== 'new' || c.rateType === 'percent');
    for (const c of posts) await send(boostMessage(c));
    console.log(`posted ${posts.length} cashback changes${dryRun ? ' (dry run)' : ''}`);
}

const modes = { deals, boosts };
const mode = process.argv[2];
if (import.meta.url === `file://${process.argv[1]}`) {
    if (!apifyToken) throw new Error('APIFY_TOKEN is not set');
    if (!modes[mode]) throw new Error(`Usage: telegram-channel.mjs <${Object.keys(modes).join('|')}>`);
    if (dryRun) console.log('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set: dry run, nothing is posted.\n');
    else await checkCanPost();
    await modes[mode]();
}

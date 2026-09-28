// Posts hot community deals and cashback boosts to two Telegram channels, using our own Apify Actors.
// Run from GitHub Actions on a schedule:
//   node scripts/telegram-channel.mjs deals    -> new hot deals from Slickdeals, hotukdeals and OzBargain
//                                                 to TELEGRAM_CHAT_ID (the deals channel)
//   node scripts/telegram-channel.mjs boosts   -> one daily digest of cashback increases on popular stores
//                                                 to TELEGRAM_CASHBACK_CHAT_ID (the cashback channel)
//   node scripts/telegram-channel.mjs check    -> which chats the secrets point to and which the bot is in
// With the REDDIT_* secrets set, deals and boosts are also posted as one daily thread each in our own subreddit.
// Needs APIFY_TOKEN. With neither Telegram nor Reddit configured it is a dry run that prints instead of posting.
// Never prints the tokens.
const API = 'https://api.apify.com/v2';
const apifyToken = process.env.APIFY_TOKEN;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
// Accept a channel handle with or without the leading @ (numeric chat IDs are used as they are).
const normalizeChat = (v) => {
    const raw = (v ?? '').trim();
    return raw && !/^-?\d+$/.test(raw) && !raw.startsWith('@') ? `@${raw}` : raw;
};
const CHATS = {
    deals: { secret: 'TELEGRAM_CHAT_ID', id: normalizeChat(process.env.TELEGRAM_CHAT_ID) },
    boosts: { secret: 'TELEGRAM_CASHBACK_CHAT_ID', id: normalizeChat(process.env.TELEGRAM_CASHBACK_CHAT_ID) },
};
const mode = process.argv[2];
// Our own subreddit: a "script" app on the bot account (reddit.com/prefs/apps), posting one daily thread per mode.
const REDDIT = {
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET,
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
    subreddit: (process.env.REDDIT_SUBREDDIT ?? '').trim().replace(/^\/?r\//i, ''),
};
const redditOn = Boolean(REDDIT.clientId && REDDIT.clientSecret && REDDIT.username && REDDIT.password && REDDIT.subreddit);
const telegramOn = Boolean(botToken && CHATS[mode]?.id);
const dryRun = !telegramOn && !redditOn;
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
// Each post ends with a call to action for the Apify Actor behind it: the channels are the shop window for the Actors.
const STORE = 'https://apify.com/Smart-Shopping-Data';
const DEALS_FOOTER = `🔔 <i>Alerts for your own keywords:</i> <a href="${STORE}/deal-community-scraper">Deal Scraper</a>`;
const CASHBACK_FOOTER = `🔔 <i>Track your own stores:</i> <a href="${STORE}/cashback-boost-monitor">Cashback Boost Monitor</a>`;

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
async function checkCanPost({ id: chatId, secret }) {
    const me = await telegram('getMe', {});
    let member;
    try {
        member = await telegram('getChatMember', { chat_id: chatId, user_id: me.id });
    } catch (err) {
        // Telegram answers "member list is inaccessible" when the bot can see the channel but is not one of its admins.
        const hint = /member list is inaccessible/i.test(err.message)
            ? `@${me.username} is not an admin of ${chatId}. In Telegram: channel → Edit → Administrators → Add Admin → ${me.username}, with "Post messages" on.`
            : `Check that ${secret} is the channel's @handle and that @${me.username} is one of its admins.`;
        throw new Error(`Cannot post to the channel yet (${err.message}). ${hint}`);
    }
    const canPost = member.status === 'creator' || (member.status === 'administrator' && member.can_post_messages !== false);
    if (!canPost) throw new Error(`@${me.username} is "${member.status}" in ${chatId}, not an admin allowed to post. Add it as an admin with "Post messages".`);
    console.log(`@${me.username} can post to ${chatId}.`);
}

async function send(chatId, html) {
    if (dryRun) {
        console.log(`--- would post ---\n${html}\n`);
        return;
    }
    if (!telegramOn) return; // Reddit only for this mode
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
        DEALS_FOOTER,
    ].filter(Boolean).join('\n');
}

/** One line of the daily digest: "🇺🇸 Nike on Rakuten: 2% → 10% (+8)". */
export function boostLine(c) {
    const was = c.oldRateText ? `${esc(c.oldRateText)} → ` : '🆕 ';
    return `${FLAGS[c.country] ?? ''} <a href="${esc(c.url)}"><b>${esc(c.merchant)}</b></a> on ${esc(c.portalName)}: ${was}<b>${esc(c.newRateText)}</b>${c.changePoints ? ` (+${c.changePoints})` : ''}`;
}

/** The daily cashback digest, biggest boosts first, split into several messages only if Telegram's size limit needs it. */
export function boostDigest(changes, date = new Date()) {
    const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    const sorted = [...changes].sort((a, b) => (b.changePoints ?? 0) - (a.changePoints ?? 0));
    const header = `⚡ <b>Cashback boosts · ${day}</b>`;
    const messages = [];
    let lines = [];
    const flush = () => {
        if (lines.length) messages.push([messages.length ? `${header} (cont.)` : header, '', ...lines, '', CASHBACK_FOOTER].join('\n'));
        lines = [];
    };
    for (const line of sorted.map(boostLine)) {
        if ([header, ...lines, line, CASHBACK_FOOTER].join('\n').length > 3800) flush();
        lines.push(line);
    }
    flush();
    return messages;
}

// ---- Reddit (our own subreddit only) ----
let redditToken = null;
const redditAgent = () => `smartshopping-poster/1.0 (by u/${REDDIT.username})`;

/** Logs in before any Actor runs, for the same reason as checkCanPost: a failed post must not lose the day's items. */
async function redditLogin() {
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${REDDIT.clientId}:${REDDIT.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': redditAgent(),
        },
        body: new URLSearchParams({ grant_type: 'password', username: REDDIT.username, password: REDDIT.password }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.access_token) throw new Error(`Reddit login failed (HTTP ${res.status}: ${json.error ?? 'no token'}). Check the REDDIT_* secrets; the app must be a "script" app owned by REDDIT_USERNAME.`);
    redditToken = json.access_token;
    console.log(`Logged in to Reddit as u/${REDDIT.username}, posting to r/${REDDIT.subreddit}.`);
}

async function redditPost(title, text) {
    if (!redditOn) return;
    const res = await fetch('https://oauth.reddit.com/api/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${redditToken}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': redditAgent() },
        body: new URLSearchParams({ sr: REDDIT.subreddit, kind: 'self', title: title.slice(0, 300), text, api_type: 'json', resubmit: 'true' }),
    });
    const json = await res.json().catch(() => ({}));
    const errors = json?.json?.errors ?? [];
    if (!res.ok || errors.length) throw new Error(`Reddit post failed (HTTP ${res.status}): ${JSON.stringify(errors).slice(0, 300)}`);
    console.log(`Posted to Reddit: ${json.json?.data?.url ?? title}`);
}

const md = (s) => String(s ?? '').replace(/[[\]]/g, (c) => (c === '[' ? '(' : ')')).replace(/\s+/g, ' ').trim();
const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const telegramLink = (m) => (CHATS[m].id?.startsWith('@') ? `https://t.me/${CHATS[m].id.slice(1)}` : null);

export function redditDeals(list) {
    const lines = list.map((d) => {
        const score = d.scoreType === 'temperature' ? `${d.score}°` : d.scoreType === 'votes' ? `+${d.score} votes` : `+${d.score} 👍`;
        const price = d.price === 0 ? 'FREE' : d.price !== null && d.price !== undefined ? `${SYMBOL[d.currency] ?? ''}${d.price}` : null;
        return `- ${FLAGS[d.country] ?? ''} **[${md(d.title)}](${d.url})**  \n  ${[price, d.store && `at ${md(d.store)}`, `${score} on ${d.site}`].filter(Boolean).join(' · ')}`;
    });
    const tg = telegramLink('deals');
    return [
        'The day\'s hottest community-voted deals from Slickdeals (US), hotukdeals (UK) and OzBargain (AU).', '',
        ...lines, '', '---',
        `🔔 Alerts for your own keywords: [Deal Scraper](${STORE}/deal-community-scraper)${tg ? ` · Also on Telegram: ${tg}` : ''}`,
    ].join('\n');
}

export function redditBoosts(list) {
    const lines = [...list].sort((a, b) => (b.changePoints ?? 0) - (a.changePoints ?? 0)).map((c) =>
        `- ${FLAGS[c.country] ?? ''} **[${md(c.merchant)}](${c.url})** on ${c.portalName}: ${c.oldRateText ? `${md(c.oldRateText)} → ` : '🆕 '}**${md(c.newRateText)}**${c.changePoints ? ` (+${c.changePoints})` : ''}`);
    const tg = telegramLink('boosts');
    return [
        'Cashback rate increases today on Rakuten, TopCashback, BeFrugal, Capital One Shopping, Mr. Rebates and ShopBack, for 30 popular stores in the US, UK and Australia.', '',
        ...lines, '', '---',
        `🔔 Track your own stores: [Cashback Boost Monitor](${STORE}/cashback-boost-monitor)${tg ? ` · Also on Telegram: ${tg}` : ''}`,
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
    const top = found.slice(0, MAX_DEALS_PER_RUN);
    for (const d of top) await send(CHATS.deals.id, dealMessage(d));
    if (top.length) await redditPost(`🔥 Hot deals · ${today()} (US, UK, AU)`, redditDeals(top));
    console.log(`posted ${top.length} deals${dryRun ? ' (dry run)' : ''}`);
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
    for (const message of boostDigest(posts)) await send(CHATS.boosts.id, message);
    if (posts.length) await redditPost(`⚡ Cashback boosts · ${today()}`, redditBoosts(posts));
    console.log(`posted a digest of ${posts.length} cashback changes${dryRun ? ' (dry run)' : ''}`);
}

/** Diagnoses the Telegram setup: which chat each secret points to, and which chats the bot has been added to. */
async function check() {
    if (redditOn) await redditLogin();
    else console.log('Reddit: not configured (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD, REDDIT_SUBREDDIT).');
    if (!botToken) {
        console.log('Telegram: TELEGRAM_BOT_TOKEN not set.');
        return;
    }
    const me = await telegram('getMe', {});
    console.log(`Bot: @${me.username}`);
    for (const { secret, id: chatId } of Object.values(CHATS)) {
        if (!chatId) {
            console.log(`${secret}: not set`);
            continue;
        }
        const shown = chatId.startsWith('@') ? chatId : `${chatId.slice(0, 5)}… (${chatId.length} characters)`;
        try {
            const chat = await telegram('getChat', { chat_id: chatId });
            console.log(`${secret} (${shown}) points to: "${chat.title}" (${chat.type}${chat.username ? `, @${chat.username}` : ', private'}, id ${chat.id})`);
        } catch (err) {
            console.log(`${secret} (${shown}) does not resolve to a chat the bot can see: ${err.message}`);
        }
    }
    // Telegram keeps the last 24 hours of updates, including "bot was added to / promoted in a chat" events.
    const updates = await telegram('getUpdates', { allowed_updates: ['my_chat_member', 'channel_post'], limit: 100 });
    const chats = new Map();
    for (const u of updates) {
        const ev = u.my_chat_member ?? u.channel_post;
        if (ev?.chat) chats.set(ev.chat.id, { chat: ev.chat, status: u.my_chat_member?.new_chat_member?.status ?? chats.get(ev.chat.id)?.status ?? 'seen' });
    }
    if (!chats.size) console.log('No recent "added to chat" events. Remove the bot from the channel admins and add it again, then rerun this check.');
    for (const { chat, status } of chats.values()) {
        console.log(`Bot is ${status} in "${chat.title}" (${chat.type}) -> chat ID ${chat.username ? `@${chat.username}` : chat.id}`);
    }
}

const modes = { deals, boosts, check };
if (import.meta.url === `file://${process.argv[1]}`) {
    if (!apifyToken) throw new Error('APIFY_TOKEN is not set');
    if (!modes[mode]) throw new Error(`Usage: telegram-channel.mjs <${Object.keys(modes).join('|')}>`);
    if (mode !== 'check') {
        if (botToken && !telegramOn && !redditOn) {
            // Deals and cashback go to separate channels; without this one's secret there is nowhere to post.
            console.log(`${CHATS[mode].secret} is not set, so there is no channel for ${mode} yet. Skipping.`);
            process.exit(0);
        }
        if (dryRun) console.log('Neither Telegram nor Reddit is configured: dry run, nothing is posted.\n');
        // Check every destination before any Actor runs, so a setup problem never swallows the day's items.
        if (telegramOn) await checkCanPost(CHATS[mode]);
        else if (botToken) console.log(`${CHATS[mode].secret} is not set: Telegram skipped for ${mode}.`);
        if (redditOn) await redditLogin();
    }
    await modes[mode]();
}

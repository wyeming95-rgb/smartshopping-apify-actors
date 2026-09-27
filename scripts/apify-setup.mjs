// Apify account setup for the SmartShopping Data Actors, run from GitHub Actions.
//   node scripts/apify-setup.mjs whoami  -> which Apify account the token belongs to, and its Actors
//   node scripts/apify-setup.mjs test    -> run each Actor once on real data and print its results
// Set ONLY=<name>[,<name>...] to limit a stage to some Actors.
// Needs APIFY_TOKEN in the environment. Never prints the token.
const API = 'https://api.apify.com/v2';
const token = process.env.APIFY_TOKEN;
if (!token) throw new Error('APIFY_TOKEN is not set');
const EXPECTED_ACCOUNT = 'smartshopping';

const ACTORS = [
    {
        name: 'cashback-rate-comparison',
        testInput: { merchants: ['Nike', 'ASOS', 'Amazon', 'Walmart', 'Best Buy', 'THE ICONIC', 'Marks & Spencer', 'Sephora'], includeNotListed: true },
        printAllItems: true,
        maxItemChars: 600,
    },
    {
        name: 'cashback-portal-probe',
        testInput: {},
        printAllItems: true,
        maxItemChars: 6000,
    },
].filter((a) => !process.env.ONLY || process.env.ONLY.split(',').map((n) => n.trim()).includes(a.name));
if (!ACTORS.length) throw new Error(`ONLY=${process.env.ONLY} matches no Actor`);

async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    if (!res.ok) {
        const err = new Error(`${method} ${path} -> ${res.status}: ${json?.error?.message ?? text.slice(0, 300)}`);
        err.status = res.status;
        throw err;
    }
    return json?.data ?? json ?? text;
}

async function actorId(name) {
    const { items } = await api('/acts?my=1&limit=1000');
    const act = items.find((a) => a.name === name);
    if (!act) throw new Error(`Actor ${name} not found on this account; deploy it first`);
    return act.id;
}

async function whoami() {
    const me = await api('/users/me');
    console.log(`Token belongs to: ${me.username} (type: ${me.isOrganization ? 'organization' : me.type ?? 'user'}), plan: ${me.plan?.id ?? 'unknown'}`);
    if (me.username !== EXPECTED_ACCOUNT) {
        console.log(`❌ Expected the ${EXPECTED_ACCOUNT} organization. Replace the APIFY_TOKEN secret with a token created while switched into ${EXPECTED_ACCOUNT}.`);
        process.exitCode = 1;
    } else {
        console.log(`✅ Token is for ${EXPECTED_ACCOUNT}`);
    }
    const { items } = await api('/acts?my=1&limit=1000');
    console.log(`Actors on this account: ${items.map((a) => `${a.name} (${a.id})`).join(', ') || 'none yet'}`);
}

async function test() {
    let failures = 0;
    for (const a of ACTORS.flatMap((x) => [x.testInput].flat().map((testInput) => ({ ...x, testInput })))) {
        console.log(`\n=== ${a.name} ${JSON.stringify(a.testInput)} ===`);
        const id = await actorId(a.name);
        const run = await api(`/acts/${id}/runs?waitForFinish=60&memory=1024&timeout=900`, { method: 'POST', body: a.testInput });
        let r = run;
        while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(r.status)) {
            r = await api(`/actor-runs/${run.id}?waitForFinish=60`);
        }
        const secs = Math.round((new Date(r.finishedAt) - new Date(r.startedAt)) / 1000);
        console.log(`status=${r.status} duration=${secs}s usageUsd=${r.usageTotalUsd?.toFixed?.(4)}`);
        const items = await api(`/datasets/${r.defaultDatasetId}/items?clean=1&limit=1000`);
        console.log(`items=${items.length}`);
        for (const it of a.printAllItems ? items : items.slice(0, 4)) console.log('  ', JSON.stringify(it).slice(0, a.maxItemChars ?? 1500));
        const log = await api(`/logs/${r.id}`);
        const interesting = String(log).split('\n').filter((l) => /WARN|ERROR|Error|failed|Done:/.test(l));
        console.log('--- log highlights ---\n' + interesting.slice(-40).join('\n'));
        if (r.status !== 'SUCCEEDED' || items.length === 0) failures++;
    }
    console.log(`\n${failures ? `❌ ${failures} Actor run(s) failed or returned nothing` : '✅ all Actors returned data'}`);
    if (failures) process.exitCode = 1;
}

const stage = process.argv[2];
const stages = { whoami, test };
if (!stages[stage]) throw new Error(`Usage: apify-setup.mjs <${Object.keys(stages).join('|')}>`);
await stages[stage]();

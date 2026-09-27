import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

// src/core is a copy of shared/cashback-core (run `node scripts/sync-core.mjs` after editing it).
const shared = new URL('../../shared/cashback-core/', import.meta.url);
const local = new URL('../src/core/', import.meta.url);

test('src/core matches shared/cashback-core', { skip: !existsSync(shared) && 'shared core not in this checkout' }, () => {
    const files = readdirSync(shared).filter((f) => f.endsWith('.js')).sort();
    assert.deepEqual(readdirSync(local).filter((f) => f.endsWith('.js')).sort(), files);
    for (const f of files) assert.equal(readFileSync(new URL(f, local), 'utf8'), readFileSync(new URL(f, shared), 'utf8'), `${f} is out of sync; run node scripts/sync-core.mjs`);
});

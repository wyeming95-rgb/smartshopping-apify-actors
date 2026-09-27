# cashback-core

Portal adapters and rate parsing shared by the cashback Actors. This folder is the source of truth.

Each Actor that uses it keeps a copy in `src/core/`, because Apify builds each Actor from its own folder. After changing anything here, run:

```bash
node scripts/sync-core.mjs
```

Each Actor's `core-sync.test.js` fails if its copy has drifted from this folder.

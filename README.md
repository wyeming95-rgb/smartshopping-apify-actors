# SmartShopping Data — Apify Actors

Apify Actors published under the **smartshopping** Apify account: cashback portal rates across the US, UK and Australia.

Kept separate from the SmartMoney trading Actors (`smartmoney-apify-actors`): its own Apify account, its own `APIFY_TOKEN` secret and its own workflows.

| Folder | Actor | Status |
|---|---|---|
| `apify-cashback-rates/` | Cashback Rate Comparison | Rates for any store across US, UK and AU portals, with the best rate per country. Charge event: `cashback-rate`. |
| `apify-cashback-boost-monitor/` | Cashback Boost Monitor | Scheduled alerts on cashback rate changes (boosts, cuts, new stores) per watchlist. Charge event: `rate-change`. |
| `apify-rakuten-scraper/` | Rakuten Cashback Scraper | Every Rakuten (US) store with its current rate, from Rakuten's store sitemap. Charge event: `store-rate`. |
| `apify-portal-probe/` | Cashback portal probe (internal) | Development only: checks which portals can be fetched from Apify and where the rates live. Never published. |

## Shared code

`shared/cashback-core/` holds the portal adapters used by the cashback Actors. Each Actor keeps a copy in `src/core/` (Apify builds each Actor from its own folder); run `node scripts/sync-core.mjs` after editing the shared folder. Each Actor's `core-sync.test.js` fails if its copy drifts.

## Workflows

- **deploy apify actors** (`.github/workflows/deploy-apify.yml`): on every push to `main` that touches an `apify-*/` folder, tests each Actor and pushes it to Apify. The first push creates the Actor.
- **apify setup** (`.github/workflows/apify-setup.yml`, `scripts/apify-setup.mjs`):
  - `whoami` checks that the token belongs to `smartshopping`
  - `test` runs each Actor on real data and prints the results

Both need the `APIFY_TOKEN` repository secret, from the `smartshopping` Apify account.

## Portals in scope

| Country | Portals |
|---|---|
| US | Rakuten, TopCashback, BeFrugal, Swagbucks, Capital One Shopping, Mr. Rebates |
| UK | TopCashback, Quidco |
| Australia | Cashrewards, ShopBack, TopCashback |

Only public pages are read; no logins.

# SmartShopping Data — Apify Actors

Apify Actors published under the **smartshopping-data** Apify organization: cashback portal rates across the US, UK and Australia.

Kept separate from the SmartMoney trading Actors (`smartmoney-apify-actors`): its own Apify organization, its own `APIFY_TOKEN` secret and its own workflows.

| Folder | Actor | Status |
|---|---|---|
| `apify-portal-probe/` | Cashback portal probe (internal) | Development only: checks which portals can be fetched from Apify and where the rates live. Never published. |

## Workflows

- **deploy apify actors** (`.github/workflows/deploy-apify.yml`): on every push to `main` that touches an `apify-*/` folder, tests each Actor and pushes it to Apify. The first push creates the Actor.
- **apify setup** (`.github/workflows/apify-setup.yml`, `scripts/apify-setup.mjs`):
  - `whoami` checks that the token belongs to `smartshopping-data`
  - `test` runs each Actor on real data and prints the results

Both need the `APIFY_TOKEN` repository secret, created while switched into the `smartshopping-data` organization in Apify Console.

## Portals in scope

| Country | Portals |
|---|---|
| US | Rakuten, TopCashback, BeFrugal, Swagbucks, Capital One Shopping, Mr. Rebates |
| UK | TopCashback, Quidco |
| Australia | Cashrewards, ShopBack, TopCashback |

Only public pages are read; no logins.

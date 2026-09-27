# Cashback Boost Monitor — Rate Change Alerts

**Get told the moment a cashback rate changes for the stores you care about: "Nike on Rakuten: 2% → 10%", "Walmart now on TopCashback", "ASOS cut from 5% to 3%".**

Cashback portals boost rates for a day or two at a time, often without much notice. This Actor watches your list of stores on Rakuten, TopCashback, BeFrugal, Capital One Shopping, Mr. Rebates and ShopBack across the US, UK and Australia. Each run returns **only what changed since the last run**. Put it on a schedule and connect it to email, Slack, Telegram, Discord or a webhook, and you have a cashback alert feed.

| Country | Portals |
|---|---|
| 🇺🇸 US | Rakuten, TopCashback, BeFrugal, Capital One Shopping, Mr. Rebates |
| 🇬🇧 UK | TopCashback |
| 🇦🇺 Australia | TopCashback, ShopBack |

## What you can do with it

- 🔔 **Personal alerts:** know when your favourite stores are boosted before you buy.
- 📣 **Deal channels and newsletters:** a steady feed of "cashback boost" posts for Telegram, Discord, X or email.
- 📊 **Market tracking:** see how often each portal boosts and cuts rates for a set of stores.
- 🤖 **Automations:** trigger a Zapier or Make scenario whenever a store crosses a rate you care about.

## How it works

1. **First run:** saves the current rate for every store and portal as a baseline. Boosts the portal flags itself (Rakuten's "10% Cash Back, was 2%") are reported straight away.
2. **Every later run:** compares with the previous run and returns one row per change.
3. **Schedule it:** hourly or daily in Apify Console (Schedules). Keep the same store list and watchlist name.

Rates are remembered in a key-value store named `cashback-boost-monitor-state` in your own Apify account, one record per watchlist.

## Change types

| `changeType` | Meaning |
|---|---|
| `increase` | Rate went up since the last run |
| `portal-boost` | The portal itself shows a boost ("was 2%"), reported once per boost |
| `new` | The store started offering cashback on this portal |
| `decrease` | Rate went down |
| `removed` | The store stopped offering cashback on this portal |
| `changed` | Switched between a percentage and a fixed amount |

Rate increases and decreases are reported on the first run that sees them. A store **appearing** (`new`) or **disappearing** (`removed`) is reported once it has been seen on **two runs in a row**, because portals occasionally serve a page without the cashback block and a single odd reading would otherwise be a false alarm. Temporary errors (timeouts, blocks, outages) are never reported as changes; the last known rate is kept until the portal can be read again.

## Input

```json
{
  "merchants": ["Nike", "ASOS", "Walmart", "Best Buy", "Sephora"],
  "countries": ["US", "UK", "AU"],
  "watchlistName": "default",
  "changeTypes": ["increase", "portal-boost", "new"],
  "minChangePoints": 2
}
```

| Field | What it does | Default |
|---|---|---|
| `merchants` | Stores to watch (names or domains) | required |
| `countries` | `US`, `UK`, `AU` | all three |
| `portals` | Limit to specific portals | all |
| `watchlistName` | Separate memory per watchlist, so several schedules don't interfere | `default` |
| `changeTypes` | Which kinds of change to report | all |
| `minChangePoints` | Ignore changes smaller than this many percentage points | `0` |

## Output

One row per change:

```json
{
  "merchant": "Nike",
  "portal": "rakuten-us",
  "portalName": "Rakuten",
  "country": "US",
  "changeType": "increase",
  "oldRateText": "2%",
  "newRateText": "10%",
  "oldRateValue": 2,
  "newRateValue": 10,
  "changePoints": 8,
  "rateType": "percent",
  "isUpTo": false,
  "previousCheckAt": "2026-09-26T09:00:00.000Z",
  "checkedAt": "2026-09-27T09:00:00.000Z",
  "url": "https://www.rakuten.com/shop/nike"
}
```

The `SUMMARY` record counts the changes by type.

## Pricing

Pay per change: you are only charged for changes reported. Runs where nothing changed cost nothing beyond Apify's small platform usage. If a run hits your maximum cost, the changes it could not report are reported on the next run.

## Related Actors

- [Cashback Rate Comparison](https://apify.com/smartshopping/cashback-rate-comparison): the best cashback for any store across Rakuten, TopCashback, BeFrugal, Capital One Shopping, Mr. Rebates and ShopBack (US, UK, AU).
- [Rakuten Cashback Scraper](https://apify.com/smartshopping/rakuten-cashback-scraper): every Rakuten (US) store with its current rate.
- [TopCashback Scraper](https://apify.com/smartshopping/topcashback-scraper): every TopCashback store in the US, UK and Australia with its current rate.
- [Deal Scraper](https://apify.com/smartshopping/deal-community-scraper): the latest Slickdeals, hotukdeals and OzBargain deals, with keyword alerts.

## Support

Found a bug or need a portal added? Open an issue on the **Issues** tab.

*Rates are read from each portal's public pages and change often. Check the portal before buying.*

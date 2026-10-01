# Rakuten Cashback Scraper — All Store Rates

**Get the current cash back rate for every store on Rakuten (US) as a clean dataset: store name, rate, percentage or fixed amount, Rakuten store ID and link.**

Rakuten lists over 4,000 stores, and rates change daily. This Actor reads Rakuten's public store directory and returns one row per store, so you don't have to click through store pages or keep a spreadsheet up to date.

## What you can do with it

- 📊 **Rate tables and comparison sites:** refresh a full Rakuten rate table daily or hourly.
- 🔍 **Find the best offers:** filter by keyword ("hotel", "beauty") or minimum rate, and sort by cash back.
- 📈 **Track Rakuten over time:** schedule it and keep each run's dataset to see how rates move.
- 🤖 **Feed your own tools:** export JSON, CSV or Excel, or call it from the API, Zapier, Make or n8n.

## Input

```json
{
  "maxStores": 0,
  "storeKeywords": [],
  "minRatePercent": 5,
  "includeNoCashback": false
}
```

| Field | What it does | Default |
|---|---|---|
| `maxStores` | How many stores to check, in directory order. `0` checks every store (about 4,200, roughly 35 minutes) | `100` |
| `storeKeywords` | Only stores whose name contains one of these words | all stores |
| `minRatePercent` | Only stores paying at least this percentage (fixed-amount offers are always kept) | `0` |
| `includeNoCashback` | Also return stores listed on Rakuten that pay no cash back right now | `false` |

## Output

One row per store:

```json
{
  "store": "Nike",
  "slug": "nike",
  "storeId": "9528",
  "status": "ok",
  "rateText": "10%",
  "rateType": "percent",
  "rateValue": 10,
  "currency": "USD",
  "isUpTo": false,
  "url": "https://www.rakuten.com/shop/nike",
  "checkedAt": "2026-09-27T12:00:00.000Z"
}
```

- `rateType` is `percent` (for example 10% back) or `fixed` (for example $25 back).
- `isUpTo` is `true` when Rakuten says "Up to X%": the rate depends on the product or category.
- `status` is `ok`, or with `includeNoCashback` also `no-cashback` or `rate-not-found`.

The run's `SUMMARY` record counts the stores checked and lists the highest percentage rates found.

## Pricing

Pay per store: you are only charged for store rows saved to the dataset. Stores that have left Rakuten, or that pay no cash back (unless you ask for them), cost nothing. Set a maximum cost per run in Apify Console and the Actor stops cleanly when it is reached.

## How it works

The store list comes from Rakuten's public sitemap. For each store, the Actor reads only the top of the store page, where Rakuten states the current rate. That keeps runs fast and light. Requests are spaced out to be gentle on Rakuten's site.

## Related Actors

- [Cashback Rate Comparison](https://apify.com/Smart-Shopping-Data/cashback-rate-comparison): the best cashback for any store across Rakuten, TopCashback, BeFrugal, Capital One Shopping, Mr. Rebates and ShopBack (US, UK, AU).
- [Cashback Boost Monitor](https://apify.com/Smart-Shopping-Data/cashback-boost-monitor): alerts when cashback rates for your stores go up, go down or appear.
- [TopCashback Scraper](https://apify.com/Smart-Shopping-Data/topcashback-scraper): every TopCashback store in the US, UK and Australia with its current rate.
- [Deal Scraper](https://apify.com/Smart-Shopping-Data/deal-community-scraper): the latest Slickdeals, hotukdeals and OzBargain deals, with keyword alerts.
- [Black Friday & Store Sales Tracker](https://apify.com/Smart-Shopping-Data/black-friday-sales-tracker): sales, coupon codes and Black Friday offers for any store (US, UK, AU), with the cashback on top.

## Support

Found a bug or a store with the wrong rate? Open an issue on the **Issues** tab.

*Rates are read from Rakuten's public pages and change often. Check Rakuten before buying. Not affiliated with Rakuten.*

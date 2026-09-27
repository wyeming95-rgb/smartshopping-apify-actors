# TopCashback Scraper — All Store Rates (US, UK, AU)

**Get the current cashback rate for every store on TopCashback in the United States, the United Kingdom and Australia as one clean dataset: store, rate, percentage or fixed amount, currency and link.**

TopCashback lists thousands of stores in each country, and rates change daily. This Actor reads TopCashback's public store directories and returns one row per store, so you don't have to click through store pages or keep a spreadsheet up to date.

| Country | Site |
|---|---|
| 🇺🇸 US | topcashback.com |
| 🇬🇧 UK | topcashback.co.uk |
| 🇦🇺 Australia | topcashback.com.au |

## What you can do with it

- 📊 **Rate tables and comparison sites:** refresh full TopCashback rate tables for one country or all three.
- 🔍 **Find the best offers:** filter by keyword ("hotel", "asos") or minimum rate, and sort by cashback.
- 🌍 **Compare countries:** see how the same brand pays in the US, UK and Australia.
- 🤖 **Feed your own tools:** export JSON, CSV or Excel, or call it from the API, Zapier, Make or n8n.

## Input

```json
{
  "countries": ["US", "UK", "AU"],
  "maxStores": 0,
  "storeKeywords": [],
  "minRatePercent": 5,
  "includeNoCashback": false
}
```

| Field | What it does | Default |
|---|---|---|
| `countries` | Which TopCashback sites to scrape: `US`, `UK`, `AU` | all three |
| `maxStores` | How many stores to check **per country**, in directory order. `0` checks every store (a full US run checks about 9,800 pages and takes about 75 minutes) | `100` |
| `storeKeywords` | Only stores whose name contains one of these words | all stores |
| `minRatePercent` | Only stores paying at least this percentage (fixed-amount offers are always kept) | `0` |
| `includeNoCashback` | Also return store pages where no rate could be read | `false` |

## Output

One row per store and country:

```json
{
  "store": "ASOS",
  "slug": "asos",
  "country": "UK",
  "status": "ok",
  "rateText": "up to 7%",
  "rateType": "percent",
  "rateValue": 7,
  "currency": "GBP",
  "isUpTo": true,
  "url": "https://www.topcashback.co.uk/asos/",
  "checkedAt": "2026-09-27T12:00:00.000Z"
}
```

- `rateType` is `percent` (for example 7% back) or `fixed` (for example £20 back).
- `isUpTo` is `true` when the rate is "up to": it depends on the product or category.

The run's `SUMMARY` record counts the stores in each country's directory and lists the highest percentage rates found.

## Pricing

Pay per store: you are only charged for store rows saved to the dataset. Pages that are not stores, or stores that have left TopCashback, cost nothing. Set a maximum cost per run in Apify Console and the Actor stops cleanly when it is reached.

## How it works

The store list comes from each TopCashback site's public sitemap. The Actor then reads each store page and takes the store's own headline rate, ignoring the banners that advertise other stores. Requests are spaced out to be gentle on TopCashback's sites.

## Related Actors

- [Cashback Rate Comparison](https://apify.com/smartshopping/cashback-rate-comparison): the best cashback for any store across Rakuten, TopCashback, BeFrugal, Capital One Shopping, Mr. Rebates and ShopBack (US, UK, AU).
- [Cashback Boost Monitor](https://apify.com/smartshopping/cashback-boost-monitor): alerts when cashback rates for your stores go up, go down or appear.
- [Rakuten Cashback Scraper](https://apify.com/smartshopping/rakuten-cashback-scraper): every Rakuten (US) store with its current rate.
- [Deal Scraper](https://apify.com/smartshopping/deal-community-scraper): the latest Slickdeals, hotukdeals and OzBargain deals, with keyword alerts.

## Support

Found a bug or a store with the wrong rate? Open an issue on the **Issues** tab.

*Rates are read from TopCashback's public pages and change often. Check TopCashback before buying. Not affiliated with TopCashback.*

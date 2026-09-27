---
title: "How to get Rakuten and TopCashback cashback rates as an API (without writing a scraper)"
tags: [api, python, webscraping, ecommerce]
canonical_actor: https://apify.com/Smart-Shopping-Data/rakuten-cashback-scraper
---

# How to get Rakuten and TopCashback cashback rates as an API (without writing a scraper)

Cashback portals like Rakuten and TopCashback list thousands of stores, and their rates change every day: Nike at 2% on Monday can be 10% by Wednesday. If you run a comparison site, a deals newsletter or just a spreadsheet of where to shop, you need those rates as data, not as web pages.

Neither portal has a public API for this. This post shows how to get every store's current rate as clean JSON in a few lines of Python, using two ready-made Apify Actors.

## What you get

One row per store:

```json
{
  "store": "Nike",
  "rateText": "10%",
  "rateType": "percent",
  "rateValue": 10,
  "isUpTo": false,
  "currency": "USD",
  "url": "https://www.rakuten.com/shop/nike",
  "checkedAt": "2026-09-27T12:00:00.000Z"
}
```

`rateType` tells you whether it's a percentage or a fixed amount ("$25 back"), and `isUpTo` flags "up to X%" offers that depend on the category.

- **[Rakuten Cashback Scraper](https://apify.com/Smart-Shopping-Data/rakuten-cashback-scraper):** every Rakuten (US) store, over 4,000 of them.
- **[TopCashback Scraper](https://apify.com/Smart-Shopping-Data/topcashback-scraper):** every TopCashback store in the US, UK and Australia.

## Step 1: get an Apify token

Sign up at [apify.com](https://apify.com) (the free plan includes monthly credit), then copy your API token from **Settings → API & Integrations**.

## Step 2: run it from Python

```bash
pip install apify-client
```

```python
from apify_client import ApifyClient

client = ApifyClient("YOUR_APIFY_TOKEN")

# Rakuten stores paying at least 5%; maxStores=0 checks the whole directory.
run = client.actor("Smart-Shopping-Data/rakuten-cashback-scraper").call(
    run_input={"maxStores": 0, "minRatePercent": 5}
)

rates = list(client.dataset(run["defaultDatasetId"]).iterate_items())
for r in sorted(rates, key=lambda r: r["rateValue"] or 0, reverse=True)[:10]:
    print(f'{r["store"]:<30} {r["rateText"]}')
```

The same works for TopCashback. Pick the countries you want:

```python
run = client.actor("Smart-Shopping-Data/topcashback-scraper").call(
    run_input={"countries": ["UK"], "storeKeywords": ["asos", "currys", "argos"]}
)
```

## Step 3: keep it fresh

Rates move daily, so schedule the Actor in Apify Console (**Schedules → Create**) and read the latest dataset from your app, or export straight to CSV, Excel or Google Sheets.

A few tips:

- **Filter early.** `storeKeywords` and `minRatePercent` keep runs short and cheap when you only care about some stores.
- **Full runs take a while.** The whole Rakuten directory takes about 35 minutes; the full TopCashback US directory about 75.
- **Pricing is per store returned** ($0.002), so a run for 50 stores costs about 10 cents.

## Comparing portals

If you want the best rate for a store across portals rather than a full directory, the [Cashback Rate Comparison](https://apify.com/Smart-Shopping-Data/cashback-rate-comparison) Actor checks Rakuten, TopCashback, BeFrugal, Capital One Shopping, Mr. Rebates and ShopBack in one run and returns the best rate per country.

---

*Rates come from the portals' public pages and change often. Always check the portal before you buy.*

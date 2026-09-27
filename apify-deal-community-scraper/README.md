# Deal Scraper — Slickdeals, hotukdeals & OzBargain

**The latest community-voted deals from the US, UK and Australia in one clean format: title, price, store, community score, category and link. Filter by keyword, score or price, or get only new deals since the last run for alerts.**

Slickdeals, hotukdeals and OzBargain are where deal hunters post and vote on bargains. Each site has its own format. This Actor reads their public deal feeds and returns every deal in the same shape, ready for alerts, dashboards or a newsletter.

| Feed | Country | Score |
|---|---|---|
| `slickdeals-frontpage` — Slickdeals frontpage | 🇺🇸 US | thumbs up |
| `hotukdeals-hot` — hotukdeals hottest | 🇬🇧 UK | temperature (°) |
| `hotukdeals-new` — hotukdeals newest | 🇬🇧 UK | — |
| `ozbargain-new` — OzBargain newest | 🇦🇺 AU | net votes |

## What you can do with it

- 🔔 **Deal alerts:** schedule it every 15 minutes with **Only new deals** and a keyword list ("lego", "rtx", "dyson"), then send results to email, Slack, Telegram or Discord.
- 📰 **Deal channels and newsletters:** a steady, de-duplicated feed of hot deals across three countries.
- 💸 **Cashback stacking:** **Only deals mentioning cashback** finds deals that stack with TopCashback, Rakuten, Quidco, ShopBack or Cashrewards.
- 📊 **Market research:** track which stores and categories get the most community deals.

## Input

```json
{
  "sources": ["slickdeals-frontpage", "hotukdeals-hot", "ozbargain-new"],
  "keywords": ["laptop", "lego"],
  "minScore": 50,
  "onlyNew": true,
  "stateName": "tech-alerts"
}
```

| Field | What it does | Default |
|---|---|---|
| `sources` | Which feeds to read | all four |
| `keywords` | Only deals mentioning one of these words (title, description, store or category) | all deals |
| `excludeKeywords` | Skip deals mentioning any of these words | none |
| `minScore` | Minimum thumbs, temperature or net votes | none |
| `maxPrice` | Maximum price in the deal's currency | none |
| `onlyCashback` | Only deals that mention cash back or a cashback site | `false` |
| `onlyNew` | Skip deals already returned by earlier runs (for scheduled alerts) | `false` |
| `stateName` | Separate memory for each schedule when using `onlyNew` | `default` |

## Output

One row per deal:

```json
{
  "id": "ozbargain:976620",
  "source": "ozbargain-new",
  "site": "OzBargain",
  "country": "AU",
  "title": "Ozito PXC 36V Brushless Lawn Mower Kit $229 @ Bunnings Warehouse (In-Store)",
  "price": 229,
  "currency": "AUD",
  "store": "Bunnings Warehouse (In-Store)",
  "score": 42,
  "scoreType": "votes",
  "comments": 12,
  "category": "Home & Garden",
  "mentionsCashback": false,
  "url": "https://www.ozbargain.com.au/node/976620",
  "dealUrl": "https://www.bunnings.com.au/ozito-mower",
  "imageUrl": "https://files.ozbargain.com.au/n/20/976620l.jpg",
  "postedAt": "2026-09-27T10:54:26.000Z",
  "description": "Cheap mower …",
  "scrapedAt": "2026-09-27T11:00:00.000Z"
}
```

- `price` is the first price in the deal (hotukdeals states it separately). `0` means free; `null` means no single price (for example "20% off").
- `url` is the discussion page on the community site. `dealUrl` is the retailer link where the feed provides it (OzBargain).
- Each feed lists the latest 25–30 deals. Schedule the Actor with **Only new deals** to collect everything over time.

## Pricing

Pay per deal: you are only charged for deals saved to the dataset. With **Only new deals**, runs where nothing new was posted cost nothing beyond Apify's small platform usage.

## Notes

- The Slickdeals feed is Slickdeals' official FeedBurner feed, which can lag the website by up to an hour or two.
- Feeds are read once per run. Nothing is posted, voted on or logged into.

## Related Actors

- [Cashback Rate Comparison](https://apify.com/smartshopping/cashback-rate-comparison): the best cashback rate for a store across Rakuten, TopCashback, ShopBack and more.
- [Cashback Boost Monitor](https://apify.com/smartshopping/cashback-boost-monitor): alerts when cashback rates for your stores change.

## Support

Missing a deal site or a field? Open an issue on the **Issues** tab.

*Not affiliated with Slickdeals, hotukdeals or OzBargain. Deals and prices change quickly; check the deal page before buying.*

# Cashback Rate Comparison — Rakuten, TopCashback, ShopBack & more

**Find which cashback site pays the most for any store, in the US, UK and Australia, in one run.**

Give it a list of stores (Nike, ASOS, Amazon, walmart.com…). It checks each one on the main cashback portals in each country and returns the current cashback rate on every portal that carries it, plus the **best rate per store per country**.

| Country | Portals |
|---|---|
| 🇺🇸 US | Rakuten, TopCashback, BeFrugal, Capital One Shopping, Mr. Rebates |
| 🇬🇧 UK | TopCashback |
| 🇦🇺 Australia | TopCashback, ShopBack |

## What you can do with it

- 💸 **Pay less:** see which portal pays the most before you buy.
- 📈 **Track rate changes:** schedule it daily and catch boosts such as "8% cash back, was 2%".
- 🧾 **Comparison sites and newsletters:** feed a cashback comparison table or a weekly "best cashback deals" post.
- 🤖 **AI shopping agents:** "Where do I get the most cashback at Nike?" as one tool call.

## Input

```json
{ "merchants": ["Nike", "ASOS", "Amazon"], "countries": ["US", "UK", "AU"] }
```

| Field | What it does | Default |
|---|---|---|
| `merchants` | Store names or domains | required |
| `countries` | `US`, `UK`, `AU` | all three |
| `portals` | Limit to specific portals | all |
| `includeNotListed` | Also return free rows for portals that don't carry the store | `false` |

## Output

One row per store per portal that carries it:

```json
{
  "merchant": "Nike",
  "matchedName": "Nike",
  "portal": "rakuten-us",
  "portalName": "Rakuten",
  "country": "US",
  "status": "ok",
  "rateText": "8%",
  "rateType": "percent",
  "rateValue": 8,
  "currency": null,
  "isUpTo": false,
  "previousRateText": "2%",
  "url": "https://www.rakuten.com/shop/nike",
  "checkedAt": "2026-09-27T09:00:00.000Z"
}
```

- `rateType` is `percent` or `fixed`. Fixed amounts carry a `currency` (USD, GBP, AUD).
- `isUpTo` marks "up to X%" rates, which vary by product category.
- `status` is `ok`, `paused` (the portal lists the store but cashback is temporarily unavailable), `rate-not-found` or `not-listed`.

The `SUMMARY` record in the key-value store holds the best rate for each store in each country.

## Pricing

Pay per result: you are charged only for rates found. Portals that don't carry a store, or show no rate, are free.

## Notes

- Rates are read from each portal's public store pages; no logins.
- Rates change often, sometimes daily, so check `checkedAt`.
- Store names are matched to each portal's store page by name. If a store isn't found, try its domain (e.g. `marksandspencer.com`).

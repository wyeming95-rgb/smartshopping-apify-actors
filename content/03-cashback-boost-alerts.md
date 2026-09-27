---
title: "Never miss a cashback boost: automatic alerts when Rakuten or TopCashback raise rates"
tags: [automation, cashback, personalfinance, nocode]
canonical_actor: https://apify.com/Smart-Shopping-Data/cashback-boost-monitor
---

# Never miss a cashback boost: automatic alerts when Rakuten or TopCashback raise rates

Cashback portals run short boosts all the time: Sephora from 2% to 8% on Rakuten, Nike at 10% for a weekend, a laptop brand at triple its usual rate. If you're about to buy something big, timing your purchase to a boost is free money. The hard part is noticing.

The [Cashback Boost Monitor](https://apify.com/Smart-Shopping-Data/cashback-boost-monitor) Actor watches your stores across six portals and tells you only what changed.

## How it works

1. You give it a list of stores: `["Nike", "Best Buy", "Sephora", "ASOS"]`.
2. **First run:** it saves every store's current rate on Rakuten, TopCashback, BeFrugal, Capital One Shopping, Mr. Rebates and ShopBack (US, UK and Australia) as a baseline.
3. **Every later run:** it returns one row per change, for example:

```json
{
  "merchant": "Nike",
  "portalName": "Rakuten",
  "country": "US",
  "changeType": "increase",
  "oldRateText": "2%",
  "newRateText": "10%",
  "changePoints": 8
}
```

It also reports boosts the portal flags itself ("10% Cash Back, was 2%") right away, even on the first run. Temporary site errors are never reported as changes, and new or removed listings are only reported once they've been seen twice in a row, so alerts don't cry wolf.

## Set it up in 5 minutes

1. Open the [Cashback Boost Monitor](https://apify.com/Smart-Shopping-Data/cashback-boost-monitor) and enter your stores.
2. Set **Changes to report** to `increase` and `portal-boost` if you only care about good news, and **Minimum change** to 2 points to skip tiny moves.
3. Save as a task and schedule it every 6 hours.
4. Connect the output: Apify's Slack or email integration, a webhook, or our n8n template [`cashback-boosts-to-telegram.json`](https://github.com/wyeming95-rgb/smartshopping-apify-actors/blob/main/integrations/n8n/cashback-boosts-to-telegram.json) for Telegram.

Keep the same store list and watchlist name between runs. That's how it knows what "before" was.

## Ideas

- **Big purchase coming up?** Put that one store on a watchlist and buy when it's boosted.
- **Run a deals channel or newsletter?** Boost alerts make great posts: "Nike cashback on Rakuten just went from 2% to 10%."
- **Track the market.** Keep the results to see how often each portal boosts which stores.

## Cost

$0.01 per change reported. Runs where nothing changed cost nothing beyond Apify's small platform usage.

---

*Rates come from the portals' public pages and change often. Check the portal before you buy.*

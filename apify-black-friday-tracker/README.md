# Black Friday & Store Sales Tracker — Coupons + Cashback

**Track the sales, coupon codes and Black Friday offers for any store in the US, UK and Australia, with the cashback you get on top. One row per offer: offer text, code, % off, sale event, expiry badge, cashback and link.**

Rakuten and TopCashback keep a page for each store listing its current offers: sitewide sales, coupon codes, free shipping and seasonal events. This Actor reads those pages for your stores and returns every offer in one format. Ask for Black Friday offers only, or schedule it with **Only new offers** to get alerts when a store launches a sale.

| Country | Offers from |
|---|---|
| 🇺🇸 US | Rakuten, TopCashback |
| 🇬🇧 UK | TopCashback |
| 🇦🇺 Australia | TopCashback |

## What you can do with it

- 🛍️ **Black Friday tracking:** follow when your stores' Black Friday and Cyber Monday offers go live, with codes and discounts.
- 🔔 **Sale alerts:** schedule it hourly with **Only new offers** and send new sales to email, Slack, Telegram or Discord.
- 💸 **Stack savings:** each offer shows the cashback rate, so you see the code and the cashback together.
- 📊 **Competitor and promo research:** see how often retailers run sales, how deep the discounts go and which events they use.

## Input

```json
{
  "stores": ["Macy's", "Nike", "Currys", "THE ICONIC"],
  "countries": ["US", "UK", "AU"],
  "onlyBlackFriday": true,
  "minDiscountPercent": 20,
  "onlyNew": true,
  "stateName": "bf-alerts"
}
```

| Field | What it does | Default |
|---|---|---|
| `stores` | Store names or websites. Empty checks a built-in list of big retailers in each country (20 US, 15 UK, 10 AU) | built-in list |
| `countries` | `US`, `UK`, `AU` | all three |
| `onlyBlackFriday` | Only offers mentioning Black Friday, Cyber Monday or Cyber Week | `false` |
| `onlyWithCode` | Only offers with a coupon code | `false` |
| `minDiscountPercent` | Only offers mentioning at least this % off | `0` |
| `keywords` | Only offers mentioning one of these words ("tv", "laptop") | all offers |
| `onlyNew` | Skip offers already returned by earlier runs (for alerts) | `false` |
| `stateName` | Separate memory for each schedule when using `onlyNew` | `default` |

## Output

One row per offer:

```json
{
  "id": "rakuten-us:macys:14632230",
  "store": "Macy's",
  "portal": "rakuten-us",
  "portalName": "Rakuten",
  "country": "US",
  "title": "Black Friday Sale: Take an extra 15-30% off.",
  "description": "Exclusions apply. Online only.",
  "code": "BEST",
  "offerType": "code",
  "maxDiscountPercent": 30,
  "freeShipping": false,
  "saleEvent": "Black Friday",
  "isBlackFriday": true,
  "isCyberMonday": false,
  "badge": "ENDS TOMORROW",
  "cashback": "6% Cash Back",
  "previousCashback": "2%",
  "storeCashback": "6%",
  "offerUrl": "https://www.rakuten.com/macys_8333-xfas?special=14632230",
  "storeUrl": "https://www.rakuten.com/shop/macys",
  "scrapedAt": "2026-11-20T12:00:00.000Z"
}
```

- `offerType` is `code`, `sale`, `free-shipping` or `cashback` (a cashback offer with no discount).
- `maxDiscountPercent` is the largest "% off" in the offer ("extra 15-30% off" gives 30); `null` when the offer names no percentage.
- `saleEvent` names the event the offer mentions: Black Friday, Cyber Monday, Singles Day, Click Frenzy, Boxing Day, Prime Day, Labor Day, Memorial Day, Presidents Day, Christmas, New Year, End of Season or Clearance.
- `badge` is the portal's label, such as "ENDS TOMORROW", or the expiry stated in the offer ("Expires 30th November").
- `cashback` is the cashback for this offer; `storeCashback` is the store's headline rate on that portal.
- The same store on two portals gives two sets of offers, since each portal lists its own.

The run's `SUMMARY` record counts the store pages and offers, the offers per sale event, and lists the biggest discounts found.

## Pricing

Pay per offer: you are only charged for offers saved to the dataset. Filters are applied first, and with **Only new offers**, runs where nothing changed cost nothing beyond Apify's small platform usage.

## Notes

- Offers are what the portal lists on its public store page. Some codes on TopCashback are only shown to signed-in members; those offers are returned without the code.
- Store names are matched to portal pages by name or website; if a store is missing, try its website (`currys.co.uk`) or the name as the portal spells it.
- Requests are spaced out to be gentle on the portals' sites.

## Related Actors

- [Cashback Rate Comparison](https://apify.com/Smart-Shopping-Data/cashback-rate-comparison): the best cashback for any store across Rakuten, TopCashback, BeFrugal, Capital One Shopping, Mr. Rebates and ShopBack (US, UK, AU).
- [Cashback Boost Monitor](https://apify.com/Smart-Shopping-Data/cashback-boost-monitor): alerts when cashback rates for your stores go up, go down or appear.
- [Rakuten Cashback Scraper](https://apify.com/Smart-Shopping-Data/rakuten-cashback-scraper): every Rakuten (US) store with its current rate.
- [TopCashback Scraper](https://apify.com/Smart-Shopping-Data/topcashback-scraper): every TopCashback store in the US, UK and Australia with its current rate.
- [Deal Scraper](https://apify.com/Smart-Shopping-Data/deal-community-scraper): the latest Slickdeals, hotukdeals and OzBargain deals, with keyword alerts.

## Support

Missing a store, a country or a field? Open an issue on the **Issues** tab.

*Offers are read from Rakuten's and TopCashback's public pages and change often. Check the store before buying. Not affiliated with Rakuten, TopCashback or the stores listed.*

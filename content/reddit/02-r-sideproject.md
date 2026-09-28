# r/SideProject: showcase post

**Where:** r/SideProject (self-promotion is the point of the sub). You can cross-post a week later to r/indiehackers and the Indie Hackers site.
**When:** Weekday, 13:00–16:00 UTC.
**Attach:** a screenshot of one Telegram digest message, and a screenshot of an Actor's output table in Apify.

---

**Title:** I built free Telegram channels for cashback boosts and hot deals (US/UK/AU), powered by my own scrapers

**Body:**

Cashback portals (Rakuten, TopCashback…) boost rates for a day or two: Nike from 2% to 10%, Expedia from 3% to 9%. If you're about to buy something big, that's free money, but nobody refreshes portal pages every day.

So I built:

- ⚡ **Cashback channel:** one message a day with the biggest cashback increases across Rakuten, TopCashback, BeFrugal, Capital One Shopping, Mr. Rebates and ShopBack, for 30 popular stores in the US, UK and Australia. → t.me/YOUR_CASHBACK_CHANNEL
- 🔥 **Deals channel:** the day's hottest community-voted deals from Slickdeals, hotukdeals and OzBargain, max 8 a day. → t.me/smartshoppingdeals5

Both are free, no sign-up, no ads.

**Under the hood:** it's a set of scrapers I publish as Apify Actors. Developers can run them for their own stores or keywords and pay per result (fractions of a cent). The Telegram channels run the same Actors once a day from GitHub Actions.

- [Cashback Boost Monitor](https://apify.com/Smart-Shopping-Data/cashback-boost-monitor): rate-change alerts for any stores
- [Deal Scraper](https://apify.com/Smart-Shopping-Data/deal-community-scraper): Slickdeals/hotukdeals/OzBargain in one format, with keyword alerts
- [Cashback Rate Comparison](https://apify.com/Smart-Shopping-Data/cashback-rate-comparison): best rate for a store across 6 portals

Things I'd love feedback on: which stores to add to the watchlist, and whether a daily digest is the right cadence or you'd want instant alerts.

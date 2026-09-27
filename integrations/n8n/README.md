# n8n templates

Ready-made [n8n](https://n8n.io) workflows for the SmartShopping Data Apify Actors. Import one in n8n (**Workflows → Import from file**), follow the setup note inside it, and switch it on.

| Template | What it does | Actor |
|---|---|---|
| [`deal-alerts-to-slack.json`](deal-alerts-to-slack.json) | Every 30 minutes, posts new Slickdeals, hotukdeals and OzBargain deals matching your keywords to Slack | [Deal Scraper](https://apify.com/Smart-Shopping-Data/deal-community-scraper) |
| [`cashback-boosts-to-telegram.json`](cashback-boosts-to-telegram.json) | Every 6 hours, sends a Telegram message when cashback for your stores goes up on Rakuten, TopCashback, ShopBack and more | [Cashback Boost Monitor](https://apify.com/Smart-Shopping-Data/cashback-boost-monitor) |
| [`rakuten-rates-to-google-sheets.json`](rakuten-rates-to-google-sheets.json) | Every morning, appends Rakuten cashback rates for your stores to a Google Sheet, building a rate history | [Rakuten Cashback Scraper](https://apify.com/Smart-Shopping-Data/rakuten-cashback-scraper) |

## Apify credential

All three call the Actor through Apify's API with an **HTTP Header Auth** credential:

- **Name:** `Authorization`
- **Value:** `Bearer <your Apify API token>` (Apify Console → Settings → API & Integrations)

The Actors are pay-per-result, so runs are charged to your own Apify account at each Actor's listed price. New Apify accounts include free monthly credit.

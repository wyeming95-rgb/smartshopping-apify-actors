---
title: "Slickdeals, hotukdeals and OzBargain alerts in Slack or Telegram, with no code"
tags: [nocode, automation, n8n, deals]
canonical_actor: https://apify.com/Smart-Shopping-Data/deal-community-scraper
---

# Slickdeals, hotukdeals and OzBargain alerts in Slack or Telegram, with no code

The best bargains are gone in hours, and the people who catch them are the ones watching Slickdeals, hotukdeals or OzBargain all day. You can get the same edge without refreshing a tab: a message in Slack or Telegram the moment a deal you care about starts trending.

This guide sets it up in about ten minutes with no code, using the [Deal Scraper](https://apify.com/Smart-Shopping-Data/deal-community-scraper) Apify Actor.

## What the Actor does

It reads the public deal feeds of three communities and returns every deal in the same format:

| Site | Country | Score |
|---|---|---|
| Slickdeals frontpage | 🇺🇸 US | thumbs up |
| hotukdeals hottest and newest | 🇬🇧 UK | temperature (°) |
| OzBargain newest | 🇦🇺 AU | votes |

Each deal comes with title, price, store, community score, category and links. Two options make it an alert system:

- **`keywords`**: only deals that mention "lego", "rtx 5070", "dyson", or whatever you're hunting.
- **`onlyNew`**: the Actor remembers what it already returned, so each run gives you only new deals and every deal reaches you once.

## Option A: Apify's built-in integrations (fastest)

1. Open the [Deal Scraper](https://apify.com/Smart-Shopping-Data/deal-community-scraper) and click **Try for free**.
2. Set your keywords and a minimum score (for example 50° on hotukdeals), and turn on **Only new deals since the last run**.
3. Save it as a task, then under **Schedules** run it every 30 minutes.
4. Under the task's **Integrations** tab, connect **Slack** (or email or a webhook) to send the results of each run.

## Option B: n8n (more control over the message)

We publish a ready-made n8n workflow: [`deal-alerts-to-slack.json`](https://github.com/wyeming95-rgb/smartshopping-apify-actors/blob/main/integrations/n8n/deal-alerts-to-slack.json).

1. In n8n, **Workflows → Import from file**.
2. Add an *HTTP Header Auth* credential: name `Authorization`, value `Bearer YOUR_APIFY_TOKEN`.
3. Edit the keywords in the **Get new deals** node, connect Slack, pick a channel and activate.

Swap the Slack node for Telegram, Discord or email if you prefer. The deal data is the same.

## Good starting filters

| Goal | Settings |
|---|---|
| Only the hottest UK deals | `sources: ["hotukdeals-hot"]`, `minScore: 500` |
| Tech in all three countries | `keywords: ["laptop", "ssd", "monitor", "gpu"]`, `minScore: 20` |
| Deals that stack with cashback | `onlyCashback: true` |
| Nothing over $50 | `maxPrice: 50` |

## Cost

$0.001 per deal returned. With `onlyNew` and a keyword list, most runs return a handful of deals or none, so an alert that runs every 30 minutes typically costs cents per month.

---

*Not affiliated with Slickdeals, hotukdeals or OzBargain. Prices change quickly; check the deal before buying.*

# r/webscraping: lessons post

**Where:** r/webscraping. Read the sidebar first. If self-promotion is only allowed in a weekly or monthly thread, post it there, or post without the links and add them only if someone asks in the comments.
**Flair:** "Getting started" / "Scaling up" / whatever fits. Not "Hiring".
**When:** Tuesday–Thursday, around 14:00–16:00 UTC (US morning, UK afternoon).

---

**Title:** Scraping ~20,000 cashback store pages across 3 portals: what the sitemaps, robots.txt and page sizes taught me

**Body:**

I built scrapers for cashback rates on Rakuten, TopCashback (US/UK/AU) and a few others. Some things surprised me, so here's a write-up in case it saves someone time.

**1. The "all stores" page wasn't all stores.** Rakuten's `/stores/all` only renders ~26 featured tiles server-side; the rest loads client-side. Their `sitemap-index.xml` (listed in robots.txt) points to a `merchant_sitemap.xml` with 4,258 store URLs. Always check robots.txt for sitemaps before reverse-engineering a JS feed.

**2. 2 MB pages, but the data is in the first 30 KB.** Each Rakuten store page is ~2 MB of Next.js payload, but the rate is right there in `og:title` ("Nike 10% Cash Back + Coupons"). Streaming the response and aborting at `</head>` cut transfer by ~98% and made a full 4,000-store run feasible (~35 min at a polite 2.5 req/s).

**3. My clever filter was wrong.** On TopCashback, every store seemed to have a `/store/reviews/` page, so I used "has a reviews page" to separate stores from help/blog pages. The live run found 1,210 US stores. The site claims 7,000+. Turns out only 1,213 of ~9,800 top-level pages have reviews (Target doesn't). Now: take all top-level sitemap URLs minus a small denylist, and drop non-store pages after fetching by their `<title>` pattern.

**4. Respect the signals you find.** ShopBack's robots.txt has `Crawl-delay: 100`, which makes a full directory crawl pointless, so I didn't build one. Slickdeals disallows their RSS search URL for crawlers but publishes the same frontpage feed via FeedBurner, so I used that.

**5. Change detection needs debouncing.** For rate-change alerts, a single odd page (portal serves a page without the cashback block) looked like "store removed". New/removed transitions now need to be seen on 2 consecutive runs; rate increases and decreases are reported immediately.

**6. Promo banners lie.** TopCashback US store pages show nav banners advertising *other* stores' rates before the store's own block, and sometimes a "$450 cash back" device promo. Take the first percentage inside the store's main block, and only fall back to a fixed amount if there's no percentage.

Happy to answer questions about any of it. If you just want the data, I published these as Apify Actors ([Rakuten](https://apify.com/Smart-Shopping-Data/rakuten-cashback-scraper), [TopCashback](https://apify.com/Smart-Shopping-Data/topcashback-scraper)).

---

**Replies to prepare for:**
- *"Is this legal/allowed?"* Only public pages, no logins, robots.txt respected, requests throttled (400 ms per host). Rate data isn't personal data.
- *"Why not Playwright?"* Everything needed is in server-rendered HTML or feeds. Plain HTTP is about 10× cheaper and faster.
- *"Open source?"* Your call. The Actors are public on Apify; the repo is private.

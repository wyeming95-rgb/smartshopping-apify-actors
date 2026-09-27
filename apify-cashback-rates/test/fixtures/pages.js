// Minimal versions of real portal pages, based on markup captured by the portal probe.
export const PAGES = {
    'https://www.rakuten.com/nike.com': {
        finalUrl: 'https://www.rakuten.com/shop/nike',
        html: `<html><head><title>Nike Coupons, Promo Codes &amp; 8% Cash Back - September 2026 | Rakuten</title>
<meta property="og:title" content="Nike 8% Cash Back + Coupons"/></head>
<body><div>Nike</div><span>8% Cash Back</span><span>was 2%</span></body></html>`,
    },
    'https://www.rakuten.com/asos.com': { finalUrl: 'https://www.rakuten.com/', html: '<title>Rakuten: Shop. Get Cash Back. Repeat.</title>' },
    'https://www.rakuten.com/shop/asos': { status: 404, html: 'not found' },
    'https://www.rakuten.com/walmart.com': {
        finalUrl: 'https://www.rakuten.com/shop/walmart',
        html: '<meta property="og:title" content="Walmart No Cash Back + Coupons"/>',
    },
    'https://www.rakuten.com/theiconic.com': {
        finalUrl: 'https://www.rakuten.com/shop/the-iconic',
        html: '<meta property="og:title" content="Coupons, Promo Codes &amp; Cash Back | Rakuten"/>',
    },
    'https://www.topcashback.co.uk/best-buy/': { finalUrl: 'https://www.topcashback.co.uk/currys/', html: '<title>Currys Offers</title><meta name="description" content="get up to 15% cashback">' },
    'https://www.topcashback.com/nike/': {
        // US store pages: no rate in the meta description; banners for other stores come first.
        html: `<meta name="description" content="Nike Cash Back discounts can be earned just by clicking through to Nike and then shopping exactly as you would normally on its website.">
<title> Nike Offers, Cash Back, Discounts &amp; Coupons </title>
<div class="nav-bar-premium-tenancy__offer"><p class="nav-bar-premium-tenancy__rate">Up to 15% Cash Back</p></div>
<div class="merch-primary-slice "><div class="merch-logged-out"><div class="merch-logged-out__section-wrap">
<span class="merch-cashback">11% Cash Back</span></div></div></div>`,
    },
    'https://www.topcashback.com/asos/': { status: 404, html: '<title>TopCashback | Error</title>' },
    'https://www.topcashback.co.uk/asos/': {
        html: `<title>ASOS Offers, Discounts &amp; Cashback Deals</title>
<meta name="description" content="Save money at ASOS &amp; get up to up to 6% cashback. Simply click through to ASOS and shop as normal.">`,
    },
    'https://www.topcashback.co.uk/nike/': { status: 404, html: '<title>TopCashback | Error</title>' },
    'https://www.topcashback.com.au/nike/': {
        html: `<title>Nike Cashback Offers &amp; Discounts</title>
<meta name="description" content="Save money at Nike and get up to up to 6% cashback. Simply click through to Nike and shop as normal - simple.">`,
    },
    'https://www.topcashback.com.au/asos/': { status: 404, html: '<title>TopCashback | Error</title>' },
    'https://www.befrugal.com/store/nike/': {
        html: '<title>Nike 10.0% Cash Back &#x2B; 28  Coupons, Promo Codes &amp; Deals</title><li><a href="/store/underarmour/">Under Armour</a> <span>10% Cash Back</span></li>',
    },
    'https://www.befrugal.com/store/asos/': { finalUrl: 'https://www.befrugal.com/stores/', html: '<title>All Stores</title>' },
    'https://capitaloneshopping.com/s/nike.com/coupon': {
        html: `<title>Nike Promo Codes &amp; Coupons for September 2026</title><span data-testid="coupon-deal-amount">2%<br/></span> Rewards
<p data-testid="coupon-content-title">Get 2% back on purchases when you shop on Nike.</p>`,
    },
    'https://capitaloneshopping.com/s/asos.com/coupon': { html: '<title>ASOS Promo Codes</title><p>94 coupon codes</p>' },
    'https://capitaloneshopping.com/s/marksandspencer.com/coupon': {
        html: `<script>{"rewardTitle":"Get $0 back on purchases when you shop on Marks \\u0026 Spencer."}</script>
<p data-testid="coupon-content-title" class="x">Get $0 back on purchases when you shop on Marks &amp; Spencer.</p>`,
    },
    'https://www.mrrebates.com/merchants/all_merchants.asp': {
        // Row markup as captured from the live A-Z page.
        html: `<div class="row Odd"><div class="columns small-7 medium-3 large-3"><a href="/click/nw.asp?merchant_id=12231" target="_blank" class="StoreName">PUMA</a></div>
<div class="columns medium-3 large-3 show-for-medium"><a href="/merchant.asp?id=12231" class="SmallCoupons">1 Coupon</a></div>
<div class="columns small-5 medium-3 large-3 CashBackSmaller">5% Cash Back </div>
<div class="columns medium-3 large-2 show-for-medium"><a class="button ShopNowBtnSmall" href="/click/nw.asp?merchant_id=12231">Shop Now</a></div></div>
<div class="row"><div class="columns small-7 medium-3 large-3"><a href="/click/nw.asp?merchant_id=5501" target="_blank" class="StoreName">Nike</a></div>
<div class="columns medium-3 large-3 show-for-medium"><a href="/merchant.asp?id=5501" class="SmallCoupons">0 Coupons</a></div>
<div class="columns small-5 medium-3 large-3 CashBackSmaller">Up to 7% Cash Back </div></div>
<div class="row Odd"><div class="columns small-7 medium-3 large-3"><a href="/click/nw.asp?merchant_id=12140" target="_blank" class="StoreName">AARP</a></div>
<div class="columns small-5 medium-3 large-3 CashBackSmaller">$10.00 Cash Back </div></div>`,
    },
    'https://www.shopback.com.au/nike': {
        html: '<title>Nike | Temporarily unavailable Cashback, Discount Codes &amp; Vouchers</title>',
    },
    'https://www.shopback.com.au/asos': {
        html: '<title>ASOS | &lt; 5.5% Cashback, Discount Codes &amp; Vouchers</title>',
    },
};

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
    'https://www.topcashback.com/nike/': {
        html: `<title>Nike Offers, Cash Back, Discounts &amp; Coupons</title>
<meta name="description" content="Save money at Nike &amp; get up to up to 6% cash back. Simply click through to Nike and shop as normal.">
<p class="nav-bar-premium-tenancy__rate">Up to 15% Cash Back</p>`,
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
    'https://www.mrrebates.com/merchants/all_merchants.asp': {
        html: `<table><tr><td><a href="/merchant.asp?id=12231">PUMA</a></td><td><span class="CashBackSmall">5% Cash Back</span></td></tr>
<tr><td><a href="/merchant.asp?id=5501">Nike</a></td><td><span class="CashBackSmall">Up to 7% Cash Back</span></td></tr>
<tr><td><a href="/merchant.asp?id=9736">Best Buy</a></td><td>1% Cash Back</td></tr></table>`,
    },
    'https://www.shopback.com.au/nike': {
        html: '<title>Nike | Temporarily unavailable Cashback, Discount Codes &amp; Vouchers</title>',
    },
    'https://www.shopback.com.au/asos': {
        html: '<title>ASOS | &lt; 5.5% Cashback, Discount Codes &amp; Vouchers</title>',
    },
};

// Store pages modelled on live Rakuten and TopCashback markup (September 2026).
const tile = (storeId, id, data) => ({
    __typename: 'DesignSystemItemEdge',
    node: {
        __typename: 'DesignSystemItem',
        itemData: { id: String(id), image_imageurl: `https://static.rakuten.com/img/store/${storeId}/logo.png`, ...data },
        payloads: [{ payload: { coupon_id: id, store_id: storeId, reward_type: 'Percentage' } }],
    },
});

export const rakutenPage = (name, storeId, og, tiles) => `<html><head><meta name="branch:deeplink:$deeplink_path" content="us/store/${storeId}"/>`
    + `<meta property="og:title" content="${og}"/></head><body><div>page</div>`
    + `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { feed: { items: { edges: tiles } } } } })}</script></body></html>`;

export const RAKUTEN_MACYS = rakutenPage('macys', 8333, 'Macy&#x27;s 6% Cash Back + Coupons', [
    tile(8333, 14632232, {
        aria_label: "Macy's, Shop Best of the Season's top deals.",
        coupon_modal_code: 'BEST',
        coupon_modal_deal_text: "Shop Best of the Season's top deals.",
        cta_buttontext: 'Get Code',
        cta_ctaurl: 'https://www.rakuten.com/macys_8333-xfas?special=14632232&sourceName=Web-Desktop',
        currentreward_rewardtext: '6% Cash Back',
        previousreward_rewardtext: 'was 2%',
        primarytag_text: 'ENDS TOMORROW',
        tagline_text: "Shop Best of the Season's top deals.",
    }),
    // The same tile repeated further down the page.
    tile(8333, 14632232, { coupon_modal_deal_text: "Shop Best of the Season's top deals.", coupon_modal_code: 'BEST' }),
    tile(8333, 14632230, {
        coupon_modal_code: 'BEST',
        coupon_modal_deal_text: 'Black Friday Sale: Take an extra 15-30% off.',
        coupon_modal_restriction: 'Exclusions apply. Online only.',
        cta_ctaurl: 'https://www.rakuten.com/macys_8333-xfas?special=14632230',
        currentreward_rewardtext: '6% Cash Back',
        primarytag_text: '',
    }),
    tile(8333, 14632240, {
        tagline_text: 'Free shipping on orders $25+.',
        cta_ctaurl: 'https://www.rakuten.com/macys_8333-xfas?special=14632240',
        currentreward_rewardtext: '6% Cash Back',
    }),
    // A tile advertising another store.
    tile(4548, 999, { coupon_modal_deal_text: 'Sephora: 20% off everything', coupon_modal_code: 'SAVE20' }),
]);

const tcbOffer = ({ title, desc = '', rate, extra = '' }) => '<div class="merch-offer merch-offer--voucher "><a href="/nologin/?PageRequested=/x/" onclick="ReturnLightbox()">'
    + '<div class="merch-offer__text-img-section merch-offer__text-img-section--deal"><div class="merch-offer__text-wrap">'
    + `<p class="merch-offer__title">${title}</p>${desc ? `<p class="merch-offer__desc">${desc}</p>` : ''}${extra}</div></div> `
    + `<div class="merch-offer__rate-section"><span class="merch-offer__rate">${rate}</span></div> `
    + '<div class="merch-offer__tag-wrap"><svg class="merch-offer__tag" viewbox="0 0 13 14"><path d="M29.482,2V1.436"></path></svg></div></a></div> ';

export const tcbPage = (title, description, headline, offers) => `<html><head><title>${title}</title><meta name="description" content="${description}"></head><body>`
    + '<div class="nav-bar-premium-tenancy__offer"><p class="nav-bar-premium-tenancy__rate">Up to 15% Cash Back</p><p class="nav-bar-premium-tenancy__desc">Other store 50% off</p></div>'
    + `<div class="merch-primary-slice"><span>${headline}</span></div><div class="deal-voucher-holder"><div class="merch-offers" id="deals">${offers.map(tcbOffer).join('')}</div></div></body></html>`;

export const TCB_US_NIKE = tcbPage('Nike Offers, Cash Back, Discounts &amp; Coupons', 'Nike Cash Back discounts can be earned just by clicking through to Nike.', 'Up to 8% Cash Back', [
    { title: 'Activewear Styles Up to 40% off!', rate: '11% Cash Back' },
    { title: 'Cyber Monday: up to 50% off select styles', desc: 'Plus an extra 25% off sale items. Ends 12/1/2026', rate: '8% Cash Back' },
]);

export const TCB_UK_CURRYS = tcbPage('Currys Offers, Discounts &amp; Cashback Deals', 'Save money at Currys &amp; get up to 15% cashback. Simply click through to Currys.', 'Up to 15% Cashback', [
    { title: 'Black Friday: Save up to £500 on TVs', desc: 'Selected lines. Expires 30th November', rate: 'Up to 15% Cashback' },
    { title: '10% off small appliances', rate: 'Up to 15% Cashback', extra: '<span class="merch-offer__code">SMALL10</span>' },
    { title: '10% off small appliances', rate: 'Up to 15% Cashback', extra: '<span class="merch-offer__code">SMALL10</span>' },
]);

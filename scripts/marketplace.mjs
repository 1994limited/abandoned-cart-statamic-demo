// The Marketplace listing images, from the screenshots (run screenshots.mjs
// first): a cover, five screens and "everything", each 1600×900 and @2x,
// written to the addon's docs/marketplace.
//
//   npm run marketplace
//
// ADDON  the addon's folder (default ../../abandoned-cart-statamic)
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';

const shots = new URL('./screenshots/', import.meta.url).pathname;
const addon = process.env.ADDON || new URL('../../abandoned-cart-statamic', import.meta.url).pathname;
const out = `${addon}/docs/marketplace`;
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const blue = '#1E3B5A';
const mark = readFileSync(`${addon}/resources/brand/mark-colour.svg`, 'utf8').replace(/width="512" height="512"/, 'width="40" height="40"');

// A screenshot (2560 wide, @2x), cropped to x, y, w, h and shown `width`
// CSS pixels wide. Crops are measured on a 2000-wide preview of it.
const preview = 2560 / 2000;

function shot(file, crop, width) {
    const [x, y, w, h] = crop.map((n) => n * preview);
    const scale = width / w;
    const src = `file://${shots}${file}`;

    return `<div class="crop" style="width:${width}px;height:${Math.round(h * scale)}px">
        <img src="${src}" style="width:${Math.round(2560 * scale)}px;left:${-Math.round(x * scale)}px;top:${-Math.round(y * scale)}px">
    </div>`;
}

const page = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Gloock&family=Public+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
    * { box-sizing: border-box; }
    body { margin: 0; width: 1600px; height: 900px; overflow: hidden; background: #F2EDE3; color: #1d1d1f; font-family: 'Public Sans', sans-serif; position: relative; }
    .brand { position: absolute; left: 80px; top: 56px; display: flex; align-items: center; gap: 14px; font: 40px/1 Gloock, serif; color: ${blue}; }
    .for { position: absolute; font-size: 22px; font-weight: 500; color: #57534e; }
    .num { font: italic 30px Gloock, serif; color: ${blue}; margin: 0 0 14px; }
    h1 { font: 64px/1.02 Gloock, serif; letter-spacing: -0.02em; margin: 0 0 26px; }
    .lede { font-size: 23px; line-height: 1.45; color: #57534e; margin: 0; }
    .copy { position: absolute; left: 80px; top: 300px; width: 440px; }
    .crop { position: relative; overflow: hidden; }
    .crop img { position: absolute; max-width: none; }
    .device { position: absolute; border: 7px solid #1d1d1f; border-radius: 14px; overflow: hidden; background: #fff; box-shadow: 0 30px 60px rgba(40, 30, 20, .18); }
    .bleed { border-right: 0; border-bottom: 0; border-radius: 14px 0 0 0; }
</style></head><body>${body}</body></html>`;

const brand = `<div class="brand">${mark}<span>Abandoned Cart</span></div>`;

function screen(num, title, lede, device) {
    return page(`${brand}
        <div class="copy"><p class="num">${num}</p><h1>${title}</h1><p class="lede">${lede}</p></div>
        <div class="for" style="left:80px;bottom:56px">For Statamic and Cargo</div>
        ${device}`);
}

const frames = {
    'cover-1600x900': page(`${brand}
        <div class="for" style="right:80px;top:68px">For Statamic and Cargo</div>
        <h1 style="position:absolute;left:80px;top:170px;font-size:96px;line-height:1">Left behind.<br>Reminded.<br><span style="color:${blue}">Back in<br>the basket.</span></h1>
        <p class="lede" style="position:absolute;left:80px;top:640px;width:500px">Reminder emails for Cargo, with a link that brings the shopper’s basket back. And what they recovered.</p>
        <div class="device" style="left:700px;top:150px">${shot('email.png', [544, 20, 912, 960], 560)}</div>
        <div class="device" style="left:1090px;top:420px">${shot('basket-page.png', [596, 272, 808, 802], 440)}</div>`),

    '01-consent': screen('01', 'Ask first', 'One tag adds the box to your checkout. Opt-in, or UK soft opt-in. Each basket keeps the wording the shopper saw.',
        `<div class="device" style="left:640px;top:170px">${shot('checkout.png', [100, 20, 1420, 1000], 820)}</div>`),

    '02-reminders': screen('02', 'Up to three reminders', 'An hour, a day, three days after the basket was left: you choose. With a one-off discount code, if you like.',
        `<div class="device" style="left:700px;top:110px">${shot('email.png', [544, 20, 912, 1060], 600)}</div>`),

    '03-basket-back': screen('03', 'One click, basket’s back', 'The link shows the basket at today’s prices. A button brings it back, without what’s sold out, and with the code.',
        `<div class="device" style="left:700px;top:150px">${shot('basket-page.png', [596, 272, 808, 802], 640)}</div>`),

    '04-whats-left': screen('04', 'See what was left', 'Store → Abandoned Carts: baskets left, emailed, brought back and recovered, the revenue, and why one wasn’t emailed.',
        `<div class="device bleed" style="left:600px;top:150px">${shot('cp-index.png', [340, 110, 1660, 1610], 1000)}</div>`),

    '05-every-click': screen('05', 'Every reminder, every click', 'Each basket: what was in it, what the shopper agreed to, each reminder and its code, and the order it became.',
        `<div class="device bleed" style="left:600px;top:150px">${shot('cp-show.png', [340, 90, 1660, 1570], 1000)}</div>`),
};

const icon = (path) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="${blue}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
const features = [
    ['M9 12l2 2 4-4M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7z', 'Consent built in', 'Opt-in or UK soft opt-in, one tag. The wording agreed to is kept.'],
    ['M4 6h16M4 12h16M4 18h10', 'Up to three reminders', 'Hours after the basket last changed. Never the same one twice.'],
    ['M3 12a9 9 0 1 0 3-6.7M3 4v5h5', 'The basket comes back', 'Today’s prices, sold-out items out, the code added.'],
    ['M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4', 'Discount codes', 'Yours, or a one-off: once, for that shopper, until the link expires.'],
    ['M12 3v3M12 18v3M5 12H2M22 12h-3M7 7l-2-2M19 19l-2-2M17 7l2-2M5 19l2-2', 'Stops when it should', 'An order, an empty basket, an unsubscribe: no more reminders.'],
    ['M4 4h16v16H4zM4 9h16M9 20V9', 'Recovery at a glance', 'Left, emailed, clicked, recovered and the revenue. A dashboard widget.'],
    ['M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', 'Privacy', 'Addresses removed after 90 days. Forget one with a command.'],
    ['M4 4h16v12H5l-1 4zM8 9h8M8 12h5', 'One-click unsubscribe', 'In the email, and in the headers mail apps use. No tracking pixel.'],
    ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18', 'Multisite', 'Emails in the language of the site, the basket back on that site.'],
];

frames['06-everything'] = page(`${brand}
    <div class="for" style="right:80px;top:68px">For Statamic and Cargo</div>
    <h1 style="position:absolute;left:80px;top:128px;font-size:60px">Everything in Abandoned Cart</h1>
    <div style="position:absolute;left:80px;top:236px;width:1440px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
        ${features.map(([path, title, text]) => `<div style="background:#fff;border:1px solid #e4ddd0;border-radius:14px;padding:26px 28px;height:156px">
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px"><span style="display:grid;place-items:center;width:40px;height:40px;border-radius:9px;background:#E6EDF4">${icon(`<path d="${path}"/>`)}</span><span style="font:30px Gloock,serif;color:${blue}">${title}</span></div>
            <div style="font-size:19px;line-height:1.4;color:#57534e">${text}</div></div>`).join('')}
    </div>
    <div style="position:absolute;left:80px;bottom:52px;display:flex;gap:36px;font-size:19px;font-weight:500">
        <span>Test mode and test emails</span><span>Wording, logo and colour in the Control Panel</span><span>Events and a PHP API</span><span style="color:#57534e">Statamic 6.35+ · Cargo 1.15+ · PHP 8.3+</span>
    </div>`);

const browser = await chromium.launch({ executablePath: chrome });

for (const [name, html] of Object.entries(frames)) {
    const file = `${shots}${name}.html`;
    writeFileSync(file, html);

    for (const [scale, suffix] of [[1, ''], [2, '-2x']]) {
        const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: scale });
        const tab = await context.newPage();
        await tab.goto(`file://${file}`);
        await tab.evaluate(() => document.fonts.ready);
        await tab.waitForTimeout(400);
        await tab.screenshot({ path: `${out}/${name}${suffix}.png` });
        await context.close();
    }
}

await browser.close();
console.log(`Listing images in ${out}`);

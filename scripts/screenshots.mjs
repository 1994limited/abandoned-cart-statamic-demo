// Screenshots of Dog-ear Books, as used in Abandoned Cart's docs and
// Marketplace listing. Run against a freshly seeded demo, from the demo's
// folder (it reads reminder links with php artisan):
//
//   php artisan demo:users && php artisan demo:carts --fresh
//   cd scripts && npm install && npm run screenshots
//
// DEMO_URL     the demo's address (default https://abandoned-cart-statamic-demo.test)
// SCREENSHOTS  where to write them (default ./screenshots)
// CHROME       a Chrome or Chromium to drive (default: Google Chrome on macOS)
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const base = (process.env.DEMO_URL || 'https://abandoned-cart-statamic-demo.test').replace(/\/$/, '');
const out = process.env.SCREENSHOTS || new URL('./screenshots', import.meta.url).pathname;
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const demo = new URL('..', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

// PHP run in the demo, for things only the server knows (signed links).
const php = (code) => execFileSync('php', ['artisan', 'tinker', '--execute', code], { cwd: demo }).toString().trim();

const latestReminder = (email) => `NineteenNinetyFour\\AbandonedCart\\Models\\Basket::where("email", "${email}")->first()->reminders()->latest("sent_at")->first()`;

// Local demos often use a self-signed certificate (Herd, Valet).
const browser = await chromium.launch({ args: ['--ignore-certificate-errors'], executablePath: chrome });
const desktop = { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2, colorScheme: 'light' };

async function settle(page) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
}

// The Control Panel, signed in as the demo admin.
const cp = await browser.newContext(desktop);
const admin = await cp.newPage();
await admin.goto(`${base}/cp/auth/login`);
await settle(admin);
await admin.locator('input[type=text], input[type=email]').first().fill('admin@example.com');
await admin.locator('input[type=password]').fill('password');
await admin.locator('button[type=submit]').first().click();
await admin.waitForURL((url) => !url.pathname.includes('/auth/'), { timeout: 15000 }).catch(async (e) => {
    await admin.screenshot({ path: `${out}/login-failed.png` });
    throw e;
});

// Statamic's trial-mode licensing alert covers the page: snooze it.
async function quiet(page) {
    await settle(page);
    const snooze = page.getByRole('button', { name: 'Snooze' });
    if (await snooze.isVisible().catch(() => false)) {
        await snooze.click();
        await settle(page);
    }
}

await admin.goto(`${base}/cp/abandoned-carts`);
await quiet(admin);
await admin.screenshot({ path: `${out}/cp-index.png` });

const gus = php('echo NineteenNinetyFour\\AbandonedCart\\Models\\Basket::where("email", "gus@example.com")->value("id");');
await admin.goto(`${base}/cp/abandoned-carts/${gus}`);
await quiet(admin);
await admin.screenshot({ path: `${out}/cp-show.png` });

await admin.goto(`${base}/cp/dashboard`);
await quiet(admin);
await admin.screenshot({ path: `${out}/cp-dashboard.png` });

await admin.goto(`${base}/cp/addons/abandoned-cart-statamic/settings`);
await quiet(admin);
await admin.screenshot({ path: `${out}/cp-settings.png` });

// The shop: a basket, and the consent box at the checkout.
const shop = await browser.newContext(desktop);
const page = await shop.newPage();

await page.goto(`${base}/products/the-salt-orchard`);
await page.click('[data-buy]');
await page.waitForURL(/\/cart$/);
await settle(page);
await page.screenshot({ path: `${out}/cart.png` });

await page.goto(`${base}/checkout`);
await settle(page);
await page.fill('input[name=first_name]', 'Sam');
await page.fill('input[name=last_name]', 'Reader');
await page.fill('input[name=email]', 'sam@example.com');
await page.check('[data-abandoned-cart-consent]');
await settle(page);
await page.screenshot({ path: `${out}/checkout.png` });

// The reminder email: Eli's third, with a one-off code.
const email = await shop.newPage();
const html = php(`$r = ${latestReminder('eli@example.com')}; $step = collect(NineteenNinetyFour\\AbandonedCart\\Settings::steps())->firstWhere("number", $r->step); echo base64_encode((new NineteenNinetyFour\\AbandonedCart\\Mail\\ReminderMail($r, $r->basket, $step))->render());`);
await email.setContent(Buffer.from(html, 'base64').toString());
await settle(email);
await email.screenshot({ path: `${out}/email.png`, fullPage: true });

// The link in it: the basket page, then the button.
const restore = await browser.newContext(desktop);
const link = await restore.newPage();
await link.goto(php(`echo ${latestReminder('eli@example.com')}->restoreUrl();`));
await settle(link);
await link.screenshot({ path: `${out}/basket-page.png` });

await link.click('button[type=submit]');
await link.waitForURL(/\/cart$/);
await settle(link);
await link.screenshot({ path: `${out}/restored.png` });

await browser.close();
console.log(`Screenshots in ${out}`);

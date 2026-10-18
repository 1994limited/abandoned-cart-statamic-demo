# Dog-ear Books with Cargo: an Abandoned Cart demo

A small bookshop built with [Statamic](https://statamic.com) and [Cargo](https://builtwithcargo.dev), running [Abandoned Cart for Statamic](https://github.com/1994limited/abandoned-cart-statamic). Put a book in your basket, give your email at the checkout, tick the box, and leave: an hour later you get a reminder, with a link that brings your basket back. Copy whatever helps.

It shows:

- **The consent box**, made with `{{ abandoned_cart:consent }}`, at the checkout's first step (for guests) and on the basket page (for signed-in customers). It saves itself when it's ticked.
- **Three reminders**: an hour, a day and three days after the basket was left. The demo turns the third on, with a one-off 10% code.
- **The link back**: it opens the basket at today's prices, says what's sold out, and a button makes it your basket again, with the code added. The basket page then says "Your basket's back" (`{{ abandoned_cart:restored }}`).
- **A customer's basket** (Jo's) only comes back for Jo, signed in.
- **The Control Panel**: Store → Abandoned Carts lists the baskets left, the reminders sent, what was clicked and what was recovered. The dashboard has an "Abandoned carts" widget.

The book covers are drawn in CSS: there are no image files, and every title and author is invented.

## Running it

You need PHP 8.3+, Composer, and a local web server such as [Herd](https://herd.laravel.com) or `php artisan serve`.

```bash
git clone https://github.com/1994limited/abandoned-cart-statamic-demo.git
cd abandoned-cart-statamic-demo
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan demo:users
php artisan demo:carts
php artisan serve
```

Then open http://localhost:8000.

`demo:users` makes two accounts, both with the password `password`:

| Account | For |
| --- | --- |
| `jo@example.com` | Shopping: the sign-in page is filled in with it |
| `admin@example.com` | The Control Panel, at `/cp` |

`demo:carts` adds ten baskets left behind in every state: still shopping, not emailed (no consent, no address), emailed once, twice and three times, brought back and ordered, and ordered without a reminder. It sends their reminders, as they'd have gone. Run it again with `--fresh` to start over. Both commands only run with `APP_ENV=local`: don't put this demo on a public server as it is, as the sign-in page gives the password away.

Reminders are sent by `php artisan abandoned-cart:send`, which Laravel's scheduler runs every minute. Locally, run `php artisan schedule:work` in a terminal, or run the command yourself.

Emails go to the log (`storage/logs/laravel.log`) unless you set `MAIL_MAILER` in `.env`. A local mail catcher such as [HELO](https://usehelo.com) or Mailpit shows them as they'd look.

Abandoned Cart and Cargo are commercial addons. Running them locally like this needs no licence. The demo turns on Statamic Pro (`STATAMIC_PRO_ENABLED=true`), which Cargo needs, and which runs in Statamic's trial mode locally.

## Things to try

1. Add a book to your basket, go to the checkout, give a name and email, tick "Email me a reminder", and continue. Then leave.
2. Sign in to the Control Panel as `admin@example.com`. Store → Abandoned Carts shows your basket, waiting. Open it, and send yourself a test reminder.
3. Open the reminder and click "Back to my basket". Eli's basket (from `demo:carts`) has a sold-out book in it: see it taken out, and the 10% code added.
4. Open one of Jo's reminders while signed out: it asks you to sign in first.
5. In Tools → Addons → Abandoned Cart → Settings, change a reminder's wording, add a discount, or switch to soft opt-in.

## Where to look

| File | What it shows |
| --- | --- |
| `resources/views/checkout/steps/_customer.antlers.html` | `{{ abandoned_cart:consent }}` in Cargo's prebuilt checkout (published with `php please vendor:publish --tag=cargo-prebuilt-checkout`) |
| `resources/views/cart.antlers.html` | The basket page, with the consent box for signed-in customers |
| `resources/views/layout.antlers.html` | `{{ abandoned_cart:restored }}` after a basket comes back |
| `config/abandoned-cart.php` | The reminders (the third on, with 10% off), the redirect to `/cart`, and the sign-in page |
| `config/statamic/cp.php` | The dashboard widgets |
| `routes/console.php` | `demo:users` and `demo:carts` |

Abandoned Cart's [docs](https://github.com/1994limited/abandoned-cart-statamic/blob/main/docs/README.md) explain each of these.

## Licence

The demo's own code (templates, styles, content) is MIT licensed: copy whatever helps. Abandoned Cart and Cargo are commercial software: see [Abandoned Cart's licence](https://github.com/1994limited/abandoned-cart-statamic/blob/main/LICENSE.md) and [Cargo's](https://builtwithcargo.dev).

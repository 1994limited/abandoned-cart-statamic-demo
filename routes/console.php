<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 * The demo's two accounts: Jo, who shops, and an admin for the Control
 * Panel. Both use the password "password", so this only runs locally.
 */
Artisan::command('demo:users', function () {
    if (! app()->environment('local')) {
        $this->error('demo:users only runs with APP_ENV=local: its passwords are public.');

        return 1;
    }

    $accounts = [
        ['jo@example.com', 'Jo Shopper', false],
        ['admin@example.com', 'Admin', true],
    ];

    foreach ($accounts as [$email, $name, $super]) {
        $user = \Statamic\Facades\User::findByEmail($email) ?? \Statamic\Facades\User::make()->email($email);
        $user->set('name', $name)->password('password');

        // makeSuper() takes no argument: it always makes a super user.
        $super ? $user->makeSuper() : $user->remove('super');

        $user->save();
        $this->info("{$email} / password".($super ? ' (Control Panel)' : ''));
    }
})->purpose('Create the demo shopper and admin accounts');

/*
 * Baskets left behind, in every state, so the Control Panel (Store →
 * Abandoned Carts), the dashboard widget and the HELO inbox have something
 * to show: still shopping, not emailed (no consent, no address), emailed
 * once, twice and three times (with a 10% code), brought back and ordered,
 * and ordered without a reminder. Each is made at its own time in the past,
 * and the reminders really are sent, at the times they'd have gone.
 * Local only.
 */
Artisan::command('demo:carts {--fresh : Delete every basket, order and one-off code first}', function () {
    if (! app()->environment('local')) {
        $this->error('demo:carts only runs with APP_ENV=local.');

        return 1;
    }

    $cart = \DuncanMcClean\Cargo\Facades\Cart::class;
    $sender = app(\NineteenNinetyFour\AbandonedCart\Sender::class);
    $real = now();

    if ($this->option('fresh')) {
        \NineteenNinetyFour\AbandonedCart\Models\Basket::query()->delete();
        $cart::query()->get()->each->deleteQuietly();
        \DuncanMcClean\Cargo\Facades\Order::query()->get()->each->deleteQuietly();
        \DuncanMcClean\Cargo\Facades\Discount::all()
            ->filter(fn ($discount) => str_starts_with($discount->handle(), \NineteenNinetyFour\AbandonedCart\Discounts::PREFIX))
            ->each->delete();
    }

    $books = [
        'salt' => 'b00c0001-0000-4000-8000-000000000001',
        'weathers' => 'b00c0002-0000-4000-8000-000000000002',
        'copper' => 'b00c0009-0000-4000-8000-000000000009',
        'lantern' => 'b00c0004-0000-4000-8000-000000000004', // sold out
        'notes' => 'b00c0010-0000-4000-8000-000000000010',
        'coral' => ['b00c0006-0000-4000-8000-000000000006', 'Paperback'],
        'kites' => 'b00c0007-0000-4000-8000-000000000007',
    ];

    // [email, name, books, hours ago it was left, consent, what happens]
    $baskets = [
        ['ada@example.com', 'Ada Lovelace', ['salt'], 0.3, true, 'shopping'],
        ['bea@example.com', 'Bea Shaw', ['weathers', 'copper'], 3, null, 'left'],
        [null, null, ['kites'], 5, null, 'left'],
        ['cal@example.com', 'Cal Okafor', ['notes'], 6, true, 'left'],
        ['dev@example.com', 'Dev Patel', ['copper', 'salt'], 30, true, 'left'],
        ['eli@example.com', 'Eli Moreau', ['kites', 'lantern'], 80, true, 'left'],
        ['fay@example.com', 'Fay Lindqvist', ['weathers'], 50, true, 'restored and ordered'],
        ['gus@example.com', 'Gus Romero', ['salt', 'coral'], 100, true, 'restored and ordered'],
        ['hal@example.com', 'Hal Nakamura', ['copper'], 26, true, 'ordered'],
        ['jo@example.com', 'Jo Shopper', ['notes', 'kites'], 28, true, 'left'],
    ];

    // Paid with Cargo's dummy gateway, as the demo's checkout does.
    $checkout = function ($basket) {
        // Orders use up stock: keep enough of what's ordered for the next run.
        foreach ($basket->lineItems() as $item) {
            $product = $item->product();

            if ($product && ! $item->variant && $product->isStockEnabled() && $product->stock() < 3) {
                $product->set('stock', 3)->saveQuietly();
            }

            if ($product && $item->variant) {
                $variants = $product->get('product_variants');
                $variants['options'] = collect($variants['options'] ?? [])
                    ->map(fn ($option) => $option['key'] === $item->variant && isset($option['stock']) && $option['stock'] < 3 ? array_merge($option, ['stock' => 3]) : $option)
                    ->all();
                $product->set('product_variants', $variants)->saveQuietly();
            }
        }

        $gateway = \DuncanMcClean\Cargo\Facades\PaymentGateway::find('dummy');
        $basket->set('payment_gateway', 'dummy')->saveWithoutRecalculating();

        return app(\DuncanMcClean\Cargo\Orders\Actions\CreateOrderFromCart::class)->handle($basket, $basket->isPaid() ? $gateway : null);
    };

    $made = 0;

    foreach ($baskets as [$email, $name, $items, $hours, $consent, $what]) {
        \Illuminate\Support\Carbon::setTestNow($real->copy()->subMinutes((int) round($hours * 60)));

        $new = $cart::make();

        // Jo has an account: hers is a customer's basket, which only comes
        // back for her signed in.
        $user = $email ? \Statamic\Facades\User::findByEmail($email) : null;

        if ($user) {
            $new->customer($user);
        } elseif ($email) {
            $new->customer(['first_name' => strtok($name, ' '), 'last_name' => substr($name, strpos($name, ' ') + 1), 'email' => $email]);
        }

        $new->set('billing_address', ['line_1' => '12 Paper Lane', 'city' => 'Norwich', 'postcode' => 'NR1 1AA', 'country' => 'GBR']);

        if ($consent !== null) {
            $new->set('abandoned_cart_consent', $consent);
        }

        foreach ($items as $book) {
            [$product, $variant] = (array) $books[$book] + [1 => null];
            $new->lineItems()->create(array_filter(['product' => $product, 'variant' => $variant, 'quantity' => 1]));
        }

        $new->save();
        $cart::forgetCurrentCart();
        $made++;

        if ($what === 'ordered') {
            \Illuminate\Support\Carbon::setTestNow(now()->addMinutes(20));
            $checkout($cart::find($new->id()));

            continue;
        }

        if ($what === 'shopping') {
            continue;
        }

        // The reminders that would have gone by now, each at its own time.
        $left = now()->copy();

        foreach (\NineteenNinetyFour\AbandonedCart\Settings::steps() as $step) {
            $due = $left->copy()->addHours($step->delay)->addMinutes(5);

            if ($due->gte($real)) {
                break;
            }

            \Illuminate\Support\Carbon::setTestNow($due);
            \Illuminate\Support\Facades\RateLimiter::clear(\NineteenNinetyFour\AbandonedCart\Sender::RATE_KEY);
            $sender->sendDue();
        }

        if ($what === 'restored and ordered') {
            $basket = \NineteenNinetyFour\AbandonedCart\Models\Basket::query()->firstWhere('cart_id', $new->id());
            $reminder = $basket?->reminders()->latest('sent_at')->first();

            if ($reminder) {
                \Illuminate\Support\Carbon::setTestNow($reminder->sent_at->copy()->addHours(2));
                $reminder->forceFill(['viewed_at' => now()->subMinutes(2), 'clicked_at' => now(), 'clicks' => 1])->save();

                $restored = $cart::find($new->id());
                if ($reminder->discount_code) {
                    $restored->set('discount_code', $reminder->discount_code);
                }
                $restored->recalculate();
                $restored->saveWithoutRecalculating();

                \Illuminate\Support\Carbon::setTestNow(now()->addMinutes(10));
                $checkout($cart::find($new->id()));
            }
        }
    }

    \Illuminate\Support\Carbon::setTestNow();
    $cart::forgetCurrentCart();

    // A run now, so the Control Panel knows the scheduler's working.
    $sender->sendDue();

    $this->info("Made {$made} baskets, and sent their reminders to the HELO inbox.");
})->purpose('Add baskets left behind in every state, and send their reminders');

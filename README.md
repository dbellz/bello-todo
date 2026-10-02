# bello-todo
## Shop (caps, sweatshirts, knitted tops) — `shop/`
Static storefront: product browsing, cart (localStorage), checkout page, Google sign-in (Supabase Auth), orders stored in Supabase, Mailgun confirmation email via a Supabase Edge Function.

Setup:
1. Create a Supabase project; run `supabase/schema.sql`.
2. In Google Cloud Console create an OAuth client (Web); add Supabase's callback URL (`https://<ref>.supabase.co/auth/v1/callback`) as redirect URI. Enable Google under Supabase Auth > Providers with the client ID/secret, and add your site URL to the redirect allow list.
3. Put your URL and anon key in `shop/config.js`.
4. Deploy the functions and set secrets (see Payments below).
5. Serve `shop/` with any static server.

Payments: Paystack and Flutterwave, both handled in Edge Functions (`pay` starts the payment with totals recomputed from the `products` table; `verify-payment` confirms with the provider, marks the order `paid` and sends the Mailgun email). Deploy with `supabase functions deploy pay verify-payment` and set secrets `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`, `PAYMENT_CURRENCY` (default `NGN`), `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM`. Prices in `shop/shop.js` are display-only; keep them in sync with the `products` table.

## Links
The to-do app (`index.html`) and the shop (`shop/index.html`) are separate projects; keep them separate. The to-do page links to the shop at `shop/index.html`.

## GitHub Pages
A workflow (`.github/workflows/pages.yml`) deploys on push to `main`. Enable it once under Settings > Pages > Source: "GitHub Actions". Then:
- To-do app: https://dbellz.github.io/bello-todo/
- Shop: https://dbellz.github.io/bello-todo/shop/

Add the Pages URL to the Supabase Auth redirect allow list for Google sign-in.

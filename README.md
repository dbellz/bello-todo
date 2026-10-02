# bello-todo
## Shop (caps, sweatshirts, knitted tops) — `shop/`
Static storefront: product browsing, cart (localStorage), checkout page, Google sign-in (Supabase Auth), orders stored in Supabase, Mailgun confirmation email via a Supabase Edge Function.

Setup:
1. Create a Supabase project; run `supabase/schema.sql`.
2. In Google Cloud Console create an OAuth client (Web); add Supabase's callback URL (`https://<ref>.supabase.co/auth/v1/callback`) as redirect URI. Enable Google under Supabase Auth > Providers with the client ID/secret, and add your site URL to the redirect allow list.
3. Put your URL and anon key in `shop/config.js`.
4. Deploy the function and set Mailgun secrets (see header of `supabase/functions/send-order-email/index.ts`).
5. Serve `shop/` with any static server.

Payment: orders are saved as `pending_payment`. No payment provider was specified, so none is wired in; integrate e.g. Stripe Checkout in an Edge Function and mark orders paid server-side (prices should also be verified server-side).

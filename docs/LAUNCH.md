# Launch runbook

Everything that has to happen once the production domain exists, in the order
it has to happen. Each step is a few minutes; the whole list is one sitting.

The store's address is `https://www.lesiko.ge` (`ORIGIN` below). The apex
`lesiko.ge` must also be attached on Vercel so it redirects to `www`.

## 1. Vercel

1. Settings → Domains: `www.lesiko.ge` is attached. Add the apex `lesiko.ge`
   too (an `A` record to `76.76.21.21` at the registrar) and set it to
   redirect to `www.lesiko.ge`, so a shopper typing the bare name lands on the
   store and not on the registrar's page.
3. Settings → General: confirm the project is on a plan that allows commercial
   use. Hobby does not.
4. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
   `VITE_WHISPERR_INGESTION_API_KEY` (a **Browser / mobile** key starting with
   `wpk_`, generated in Whisperr's **Lesiko** workspace). Set it for Production
   and deploy a new build: Vite embeds the value at build time. Renaming a
   variable does not update an existing deployment. `NEXT_PUBLIC_...` is a
   Next.js convention and is not read by this Vite app. Never use a `wrk_`
   server key in a `VITE_` variable. Production builds reject missing/wrong keys.
   The `connect-src` policy in `vercel.json` must allow `https://api.whisperr.net`.
   Nothing from Flitt ever goes here.
5. The storefront already sends anyone arriving on `lesiko.vercel.app` to the
   address saved under Admin → SEO, path intact, as soon as that address
   answers — so nothing breaks if you save it a day before DNS resolves. For a
   true 301 that crawlers honour too, `vercel.json` now carries the rule
   (`lesiko.vercel.app` → `https://www.lesiko.ge/:path*`); it takes effect on
   the next deploy.

## 2. Supabase

1. Authentication → URL Configuration: Site URL `ORIGIN`; Redirect URLs
   `ORIGIN/**` (keep the vercel.app entry until the redirect above is live).
2. Authentication → Settings → Password: turn on "Prevent use of leaked
   passwords".
3. Edge Functions → Secrets: `SITE_URL` is only a fallback now — both the seo
   and the payments functions read the address from Admin → SEO first. Delete
   the secret or set it to `ORIGIN`; never leave it on the preview host.
4. Optional but recommended before launch: migrate the project to Frankfurt
   (`eu-central-1`) — every request from Georgia is ~0.4 s against Sydney
   today. New project → dump/restore → storage copy → redeploy `media`,
   `payments`, `seo`, `delivery` with their secrets → repoint the Vercel env vars → rerun
   `scripts/smoke.mjs`.
5. Whisperr's **Server** key (`wrk_`) belongs in Edge Functions → Secrets as
   `WHISPERR_INGESTION_API_KEY`. A Vercel variable is not available to Supabase.
   Deploy the updated `payments` and `delivery` functions, including their
   `_shared` dependency, separately from the Vercel storefront. Both keys must
   belong to the same Lesiko workspace.

### Verify Whisperr delivery

Sign in as a **customer**, open a product, and add it to the cart. Browser
events wait for identification; signed-out browsing stays queued and admin
accounts are excluded. Check for accepted `/v1/events/batch` requests, then
confirm `view_item` and `add_to_cart` appear in Lesiko's Whisperr event feed.
A successful storefront build alone does not verify delivery.

Server order events use the same account-by-email association as order history
and send the customer UUID, never the email address, to Whisperr. Orders with no
matching customer account are explicitly skipped; guest identity linking is not
implemented. Edge logs distinguish a missing server key, unmatched customer,
and delivery failure. Use the existing payment sandbox process to verify order
events after the Edge Functions deploy; do not place a real charge to test analytics.

Local checks: `npm run test:whisperr` (Node 22.18+), `npx tsc --noEmit`,
`npm run build`, and `deno test supabase/functions/_shared/whisperr.test.ts`.

## 3. Admin panel

3. Settings: store name, support email, currency `GEL`, real tax rate,
   delivery charge and free-delivery threshold, **dispatch origin** (pickup
   street, city, coordinates, phone), default language, and — when you have
   one — the Google Analytics measurement ID (`G-…`).
2. SEO: site URL `ORIGIN`, share image, Google Search Console verification
   token.
3. Content → Legal: replace every value in square brackets, read all four
   pages once in both languages, save.
4. Content → Footer: your social profiles; the legal line.
5. Products → "Needs attention" filter: must be empty.

## 4. Flitt

Nothing to change per order: the payments function sends Flitt the return URL
(`ORIGIN/order-confirmation?order=…`) and the callback URL
(`https://vhuagxhfmhzyfazbhwpx.supabase.co/functions/v1/payments/callback`)
with every token request, built from the address in Admin → SEO. If the
merchant portal asks for defaults, use those two. Switch the two edge-function
secrets from the sandbox merchant to the live credentials only after the
test-mode purchase has been seen end to end on the dashboard.

## 5. Every variable and secret, in one place

| Where | Name | Value | Notes |
| --- | --- | --- | --- |
| Vercel → Settings → Environment Variables (Production) | `VITE_SUPABASE_URL` | `https://vhuagxhfmhzyfazbhwpx.supabase.co` | public |
| Vercel → same | `VITE_SUPABASE_PUBLISHABLE_KEY` | the anon/publishable key from Supabase → Project Settings → API | public; RLS protects the data |
| Supabase → Edge Functions → Secrets | `FLITT_MERCHANT_ID` | numeric merchant id from the Flitt merchant portal | sandbox `1549901` for the test purchase (Flitt's documented test merchant), then the live id |
| Supabase → same | `FLITT_SECRET_KEY` | the payment key (secret) from the Flitt portal | sandbox `test`, then the live key; signs every token request and verifies every callback |
| Supabase → same | `SITE_URL` | `https://www.lesiko.ge` or deleted | optional fallback; Admin → SEO wins |
| Supabase → Authentication → URL configuration | Site URL | `https://www.lesiko.ge` | where email links land when no redirect is given |
| Supabase → same | Redirect URLs | `https://www.lesiko.ge/**` | the password-reset link goes to `/reset-password`; the exact-root entry alone does not allow it |
| Admin → SEO | Site URL | `https://www.lesiko.ge` | drives canonicals, sitemap, the preview-host redirect and Flitt's return URL |
| Supabase → Edge Functions → Secrets | `QS_AUTH_URL` | sandbox `https://test-auth.quickshipper.ge`, then `https://auth.quickshipper.app` | QuickShipper OAuth |
| Supabase → same | `QS_API_URL` | sandbox `https://delivery-test.quickshipper.ge`, then `https://delivery.quickshipper.app` | Delivery API |
| Supabase → same | `QS_CLIENT_ID` / `QS_CLIENT_SECRET` | sandbox `DeliveryApiClient` / `DeliveryApiSecret` | Basic auth for `/connect/token`; production values come from QS |
| Supabase → same | `QS_USERNAME` / `QS_PASSWORD` | merchant login | never Vercel, never `VITE_` |
| Supabase → same | `QS_WEBHOOK_SECRET` | a long random string | webhook path is `/functions/v1/delivery/webhook/{secret}` |
| Supabase → same | `GOOGLE_GEOCODING_KEY` | optional | typed checkout addresses; Nominatim is used if this is blank |
| Admin → Settings | Dispatch origin | street, city, lat, lng, phone | pickup for `GET /v1/order/fees` and `POST /v1/order` |

Ask QuickShipper to enable Delivery API on the merchant and **allowlist Supabase Edge egress IPs**. After secrets are set, an admin can `POST /functions/v1/delivery/setup-webhook` once (or run a dispatch from a paid test order). Keep quotes on sandbox URLs until a test paid order creates a Draft then ReadyForPickup job.

The storefront CSP in `vercel.json` must stay free of QuickShipper script/style hosts — quotes, dispatch and webhooks are server-side only.

Nothing from Flitt or QuickShipper ever goes on Vercel. `SUPABASE_URL`,
`SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected into the edge
functions by Supabase itself. Changing a secret takes effect on the next
function call; no redeploy.

In the portal, set **Redirect method to the result page** to `GET`. If it is
left on `POST`, `api/return.js` still turns Flitt's form post into a GET of the
same confirmation address (Vercel routes form posts there via `vercel.json`),
so the shopper lands on the confirmation page either way.

Test cards for the sandbox merchant (any expiry, any CVV): `4444555566661111`
approves through 3-D Secure, `4444111166665555` declines, `4444555511116666`
approves without 3-D Secure. Source: docs.flitt.com/api/testing.

## 6. One-off scripts (from the repo, with the admin login)

```bash
node scripts/refresh-cache.mjs <admin-email> <admin-password>   # one-year cache headers on the old uploads
node scripts/warm-images.mjs                                    # pre-warm the image ladder
node scripts/smoke.mjs <admin-email> <admin-password>   # guest checkout, RPC guards, prerender parity
node scripts/capture-quickshipper.mjs                   # optional: overwrite QS fixtures from sandbox
```

## 7. Verify on the real domain

```bash
node scripts/verify-launch.mjs https://www.lesiko.ge
```

It checks the headers (CSP, HSTS, immutable assets), robots and sitemap on the
new origin, a crawler render of a product and of `/terms`, that private pages
stay out of the index, that the preview host hands over, and that the backend
answers. Every line is a pass or a fail with the reason.

Then, by hand:

- Browser console on the homepage, a product page and the checkout shows no
  `Content-Security-Policy` violations. If Flitt's widget ever changes what it
  loads, the quickest safe move is to rename the header in `vercel.json` to
  `Content-Security-Policy-Report-Only` and redeploy.
- Place a ₾1 order with a real card, confirm the dashboard alert, refund it
  from the Flitt portal.
- Submit the sitemap in Search Console.
- Add a free uptime check (UptimeRobot, Better Stack or similar) on `ORIGIN/`
  and on `https://vhuagxhfmhzyfazbhwpx.supabase.co/functions/v1/seo/robots.txt`.

## 8. What is already watching for you

- Uncaught storefront errors are reported to the `client-errors` function and
  appear on the admin dashboard as "client error" alerts — one per error per
  page per day, so a broken page shows up without flooding the list.
- Paid, failed and suspicious payments are alerts from the payments function.
- Courier dispatch failures, assigned-courier cancel blocks, and
  `DeliveryFailed` / `Cancelled` webhooks are alerts from the `delivery`
  function. The Flitt charge is never refunded automatically from those.
- Analytics start the moment a measurement ID is saved in Settings.

# Launch runbook

Everything that has to happen once the production domain exists, in the order
it has to happen. Each step is a few minutes; the whole list is one sitting.

Placeholders: `DOMAIN` is the bare domain (e.g. `lesiko.ge`), `ORIGIN` is
`https://DOMAIN`.

## 1. Vercel

1. Settings → Domains: add `DOMAIN` and `www.DOMAIN`, follow the DNS
   instructions, wait for the certificate.
2. Make `DOMAIN` the primary domain so `www` redirects to it (or the other way
   round — pick one and keep it).
3. Settings → General: confirm the project is on a plan that allows commercial
   use. Hobby does not.
4. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
   Nothing from Flitt ever goes here.
5. The storefront already sends anyone arriving on `lesiko.vercel.app` to the
   address saved under Admin → SEO, path intact, as soon as that address
   answers — so nothing breaks if you save it a day before DNS resolves. For a
   true 301 that crawlers honour too, add this to `vercel.json` under a
   top-level `"redirects"` key and redeploy:

   ```json
   {
     "source": "/:path*",
     "has": [{ "type": "host", "value": "lesiko.vercel.app" }],
     "destination": "https://DOMAIN/:path*",
     "permanent": true
   }
   ```

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
   `payments`, `seo` with their secrets → repoint the Vercel env vars → rerun
   `scripts/smoke.mjs`.

## 3. Admin panel

1. Settings: store name, support email, currency `GEL`, real tax rate,
   delivery charge and free-delivery threshold, default language, and — when
   you have one — the Google Analytics measurement ID (`G-…`).
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

## 5. One-off scripts (from the repo, with the admin login)

```bash
node scripts/refresh-cache.mjs <admin-email> <admin-password>   # one-year cache headers on the old uploads
node scripts/warm-images.mjs                                    # pre-warm the image ladder
node scripts/smoke.mjs                                          # guest checkout, RPC guards, prerender parity
```

## 6. Verify on the real domain

```bash
node scripts/verify-launch.mjs https://DOMAIN
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

## 7. What is already watching for you

- Uncaught storefront errors are reported to the `client-errors` function and
  appear on the admin dashboard as "client error" alerts — one per error per
  page per day, so a broken page shows up without flooding the list.
- Paid, failed and suspicious payments are alerts from the payments function.
- Analytics start the moment a measurement ID is saved in Settings.

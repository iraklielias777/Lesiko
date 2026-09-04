// Post-cutover check. Run it against the real domain once DNS resolves:
//
//   node scripts/verify-launch.mjs https://lesiko.ge
//
// No credentials: everything here is what a shopper or a crawler can see. Each
// line is a pass or a fail with the reason; the exit code is 1 if anything that
// would hurt launch failed. Warnings are informational.

const origin = (process.argv[2] || 'https://lesiko.vercel.app').replace(/\/+$/, '');
const PREVIEW = 'https://lesiko.vercel.app';
const BOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

let failures = 0;
const ok = (label, detail = '') => console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
const warn = (label, detail = '') => console.log(`  ! ${label}${detail ? ` — ${detail}` : ''}`);
const fail = (label, detail = '') => { failures += 1; console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); };
const check = (cond, label, detail = '') => (cond ? ok(label, detail) : fail(label, detail));

const get = async (url, opts = {}) => {
  const res = await fetch(url, { redirect: 'manual', ...opts, headers: { 'user-agent': 'lesiko-verify', ...(opts.headers || {}) } });
  const body = await res.text().catch(() => '');
  return { res, body, status: res.status, header: name => res.headers.get(name) || '' };
};

console.log(`\nVerifying ${origin}\n`);

// 1. The document and its headers.
const home = await get(`${origin}/`);
check(home.status === 200, 'homepage answers 200', `got ${home.status}`);
check(home.body.includes('id="root"'), 'homepage is the storefront shell');
check(/text\/html/.test(home.header('content-type')), 'homepage is HTML');
check(home.header('content-security-policy').includes('script-src'), 'Content-Security-Policy header present');
check(home.header('x-content-type-options') === 'nosniff', 'X-Content-Type-Options nosniff');
if (home.header('strict-transport-security')) ok('HSTS present', home.header('strict-transport-security'));
else warn('HSTS header missing', 'Vercel normally adds it on custom domains; check the domain is fully provisioned');

// 2. Fingerprinted assets are immutable.
const asset = (home.body.match(/\/assets\/[^"']+\.js/) || [])[0];
if (asset) {
  const js = await get(`${origin}${asset}`);
  check(js.status === 200 && /immutable/.test(js.header('cache-control')), 'JS bundle cached immutable', js.header('cache-control'));
} else warn('no bundle reference found in index.html');

// 3. robots and sitemap point at this origin.
const robots = await get(`${origin}/robots.txt`);
check(robots.status === 200, 'robots.txt answers 200', `got ${robots.status}`);
check(robots.body.includes(`Sitemap: ${origin}/sitemap.xml`), 'robots.txt names the sitemap on this origin', robots.body.match(/Sitemap: .*/)?.[0] || 'no Sitemap line');

const sitemap = await get(`${origin}/sitemap.xml`);
check(sitemap.status === 200, 'sitemap.xml answers 200', `got ${sitemap.status} ${sitemap.status === 503 ? '(site URL not set under Admin → SEO)' : ''}`);
const locs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const foreign = locs.filter(l => !l.startsWith(`${origin}/`) && l !== origin && l !== `${origin}/`);
check(locs.length > 0 && foreign.length === 0, 'every sitemap URL is on this origin', `${locs.length} URLs${foreign.length ? `, ${foreign.length} elsewhere e.g. ${foreign[0]}` : ''}`);
const count = prefix => locs.filter(l => l.startsWith(`${origin}${prefix}`)).length;
ok('sitemap contents', `${count('/product/')} products · ${count('/category/')} categories · ${count('/brand/')} brands · legal ${['/terms', '/privacy', '/delivery', '/returns'].filter(p => locs.includes(`${origin}${p}`)).length}/4`);

// 4. Crawlers get a real document with the canonical on this origin.
const productPath = (locs.find(l => l.includes('/product/')) || '').replace(origin, '');
if (productPath) {
  const bot = await get(`${origin}${productPath}`, { headers: { 'user-agent': BOT } });
  check(bot.status === 200, `bot render of ${productPath} answers 200`, `got ${bot.status}`);
  check(bot.body.includes(`<link rel="canonical" href="${origin}${productPath}"`), 'bot render carries the canonical on this origin');
  check(/<meta property="og:image" content="https:/.test(bot.body), 'bot render carries a share image');
  check(/<h1>/.test(bot.body) && !bot.body.includes('id="root"'), 'bot render is the prerendered document, not the shell');
} else warn('no product in the sitemap to render');

const legal = await get(`${origin}/terms`, { headers: { 'user-agent': BOT } });
check(legal.status === 200 && /<h1>/.test(legal.body), 'bot render of /terms has a heading', (legal.body.match(/<h1>([^<]*)<\/h1>/) || [])[1] || '');
const legalHuman = await get(`${origin}/terms`);
check(legalHuman.status === 200 && legalHuman.body.includes('id="root"'), 'human /terms is the storefront shell');

// 5. Nothing private is indexable.
const conf = await get(`${origin}/order-confirmation`, { headers: { 'user-agent': BOT } });
check(/noindex/i.test(conf.header('x-robots-tag')) || conf.status === 404 || robots.body.includes('Disallow: /order-confirmation'), 'order confirmation kept out of the index');

// 6. The preview host hands over to this origin.
if (origin !== PREVIEW) {
  const preview = await get(`${PREVIEW}/`);
  const location = preview.header('location');
  if (preview.status >= 300 && preview.status < 400 && location.startsWith(origin)) ok('preview host redirects here', `${preview.status} → ${location}`);
  else if (preview.status === 200) warn('preview host still serves the site', 'the storefront redirects shoppers on load once the site URL is set; add the vercel.json redirect for a true 301');
  else warn('preview host answered unexpectedly', `${preview.status}`);
} else warn('origin is the preview host', 'pass the real domain once it is attached');

// 7. The backend is reachable from here.
const supabase = (home.body.match(/https:\/\/[a-z0-9]+\.supabase\.co/) || [])[0];
if (supabase) {
  const api = await get(`${supabase}/rest/v1/`);
  check(api.status === 401 || api.status === 200, 'Supabase API reachable', `${supabase} → ${api.status}`);
  const fn = await get(`${supabase}/functions/v1/seo/robots.txt`);
  check(fn.status === 200, 'seo edge function reachable', `→ ${fn.status}`);
} else warn('could not find the Supabase origin in index.html');

console.log(failures ? `\n${failures} check(s) failed.\n` : '\nAll checks passed.\n');
process.exit(failures ? 1 : 0);

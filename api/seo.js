// Supabase Edge rewrites text/html to text/plain. Google will not treat that
// body as a page, so bot HTML, robots, and the sitemap are fetched here and
// sent back with the content type they actually are.

const SEO = 'https://vhuagxhfmhzyfazbhwpx.supabase.co/functions/v1/seo';

export default async function handler(req, res) {
  const raw = typeof req.url === 'string' ? req.url : '/api/seo';
  const query = new URL(raw, 'https://www.lesiko.ge').searchParams;
  const doc = query.get('doc') || 'render';
  const path = query.get('path') || '/';
  const lang = query.get('lang') || '';

  let target = `${SEO}/render?path=${encodeURIComponent(path)}`;
  let type = 'text/html; charset=utf-8';
  if (lang === 'en' || lang === 'ka') target += `&lang=${lang}`;
  if (doc === 'robots') {
    target = `${SEO}/robots.txt`;
    type = 'text/plain; charset=utf-8';
  } else if (doc === 'sitemap') {
    target = `${SEO}/sitemap.xml`;
    type = 'application/xml; charset=utf-8';
  }

  const upstream = await fetch(target);
  const body = await upstream.text();
  res.statusCode = upstream.status;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', doc === 'robots'
    ? 'public, max-age=3600, s-maxage=86400'
    : 'public, max-age=300, s-maxage=3600');
  res.setHeader('Vary', 'User-Agent');
  const robots = upstream.headers.get('x-robots-tag');
  if (robots) res.setHeader('X-Robots-Tag', robots);
  res.end(body);
}

// Flitt can send the shopper back to the result page with a POST (a merchant
// portal setting), and a static site answers a POST with a blank 405. Vercel
// routes such form posts here (vercel.json matches on the form content-type);
// this turns them into a plain GET of the same address, query string intact,
// so the confirmation page loads and polls the order as usual. Nothing from
// the posted body is trusted or used — the server callback is the source of
// truth for whether an order was paid.
export default function handler(req, res) {
  const raw = typeof req.url === 'string' ? req.url : '/order-confirmation';
  const query = raw.includes('?') ? raw.slice(raw.indexOf('?')) : '';
  res.statusCode = 303;
  res.setHeader('Location', `/order-confirmation${query}`);
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

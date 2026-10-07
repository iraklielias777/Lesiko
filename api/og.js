import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const WIDTH = 1200;
const HEIGHT = 630;
const GREEN = '#AED136';
const DARK = '#1A1A1A';
const MUTED = '#66705D';
const PAPER = '#FBFCF8';

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const clean = (value, max) =>
  String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);

const displayTitle = value => {
  const parts = clean(value, 180).split('|').map(part => part.trim()).filter(Boolean);
  if (parts.length > 1 && /lesi\s*ko/i.test(parts[parts.length - 1])) parts.pop();
  return parts.join(' · ') || 'Cosmetics & More';
};

const charWeight = char => {
  if (/\s/.test(char)) return 0.35;
  if (/[ilI1.,'’]/.test(char)) return 0.35;
  if (/[MW@%]/.test(char)) return 1.15;
  if (/[^\u0000-\u00ff]/.test(char)) return 0.9;
  return 0.65;
};

const wrap = (text, maxWeight, maxLines) => {
  const words = clean(text, 260).split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  let weight = 0;

  for (const word of words) {
    const wordWeight = [...word].reduce((sum, char) => sum + charWeight(char), 0);
    const gap = line ? 0.35 : 0;
    if (line && weight + gap + wordWeight > maxWeight) {
      lines.push(line);
      line = word;
      weight = wordWeight;
      if (lines.length === maxLines - 1) break;
    } else {
      line += `${line ? ' ' : ''}${word}`;
      weight += gap + wordWeight;
    }
  }

  const consumed = lines.join(' ').length + (lines.length ? 1 : 0) + line.length;
  if (line && lines.length < maxLines) {
    const truncated = consumed < clean(text, 260).length;
    lines.push(truncated ? `${line.replace(/[.,;:!?]?$/, '')}…` : line);
  }
  return lines.slice(0, maxLines);
};

const safeImageUrl = value => {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (
      host === 'localhost'
      || host.endsWith('.local')
      || host === '0.0.0.0'
      || host === '127.0.0.1'
      || host === '::1'
      || /^10\./.test(host)
      || /^192\.168\./.test(host)
      || /^169\.254\./.test(host)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) return null;
    return url.toString();
  } catch {
    return null;
  }
};

const sizeImage = input =>
  sharp(input)
    .rotate()
    .resize(540, HEIGHT, { fit: 'cover', position: 'attention' })
    .png()
    .toBuffer();

const loadImage = async url => {
  const safeUrl = safeImageUrl(url);
  if (!safeUrl) return null;
  try {
    const response = await fetch(safeUrl, {
      signal: AbortSignal.timeout(3500),
      headers: { accept: 'image/avif,image/webp,image/*' }
    });
    if (!response.ok) return null;
    const type = response.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return null;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 10_000_000) return null;
    return sizeImage(Buffer.from(bytes));
  } catch {
    return null;
  }
};

const loadFallbackImage = async () => {
  try {
    return await sizeImage(await readFile(new URL('../public/og-still-life.jpg', import.meta.url)));
  } catch {
    return null;
  }
};

const kindLabel = type => {
  const labels = {
    product: 'PRODUCT',
    category: 'COLLECTION',
    brand: 'BRAND',
    sale: 'SALE',
    help: 'CUSTOMER CARE',
    legal: 'INFORMATION'
  };
  return labels[type] || 'COSMETICS & MORE';
};

const makeSvg = ({ title, type, hasImage }) => {
  const titleLines = wrap(displayTitle(title), hasImage ? 10.8 : 18, 3);
  const titleSize = hasImage ? (titleLines.length > 2 ? 50 : 58) : (titleLines.length > 2 ? 55 : 64);
  const titleStart = titleLines.length > 2 ? 250 : 268;
  const titleMarkup = titleLines
    .map((line, index) => `<tspan x="64" dy="${index ? titleSize * 1.08 : 0}">${escapeXml(line)}</tspan>`)
    .join('');

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${PAPER}"/>
      <rect x="0" y="0" width="${WIDTH}" height="12" fill="${GREEN}"/>
      ${hasImage ? '' : `
        <rect x="900" y="0" width="300" height="${HEIGHT}" fill="${GREEN}"/>
        <text x="1050" y="402" text-anchor="middle" font-family="Montserrat, Arial, sans-serif"
          font-size="230" font-weight="700" fill="${DARK}" opacity="0.09">L</text>
        <path d="M950 98h200M950 532h200" stroke="${DARK}" stroke-width="2" opacity="0.18"/>
      `}

      <text x="64" y="94" font-family="Montserrat, Arial, sans-serif" font-size="38" font-weight="700"
        letter-spacing="-1.2" fill="${DARK}">Lesi<tspan fill="${GREEN}">Ko.</tspan></text>
      <rect x="64" y="144" width="14" height="14" fill="${GREEN}"/>
      <text x="94" y="157" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="700"
        letter-spacing="2.8" fill="${MUTED}">${escapeXml(kindLabel(type))}</text>

      <text x="64" y="${titleStart}" font-family="Montserrat, Arial, sans-serif" font-size="${titleSize}"
        font-weight="700" letter-spacing="-1.8" fill="${DARK}">${titleMarkup}</text>

      <line x1="64" y1="548" x2="${hasImage ? 596 : 840}" y2="548" stroke="#DDE3D3" stroke-width="2"/>
      <text x="64" y="590" font-family="Inter, Arial, sans-serif" font-size="19" font-weight="600"
        fill="${DARK}">lesiko.ge</text>
      <circle cx="${hasImage ? 590 : 834}" cy="583" r="6" fill="${GREEN}"/>
    </svg>
  `);
};

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end();
  }

  try {
    const url = new URL(req.url || '/api/og', 'https://www.lesiko.ge');
    const title = clean(url.searchParams.get('title'), 180);
    const type = clean(url.searchParams.get('type'), 20).toLowerCase();
    const productImage = await loadImage(url.searchParams.get('image')) || await loadFallbackImage();
    const svg = makeSvg({ title, type, hasImage: !!productImage });
    const base = sharp(svg).png({ compressionLevel: 9, palette: true, quality: 95 });
    const png = productImage
      ? await base.composite([
          { input: productImage, left: 660, top: 0 },
          {
            input: Buffer.from(
              `<svg width="540" height="630" xmlns="http://www.w3.org/2000/svg">
                <rect width="8" height="630" fill="${GREEN}"/>
              </svg>`
            ),
            left: 652,
            top: 0
          }
        ]).toBuffer()
      : await base.toBuffer();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', String(png.length));
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000');
    res.setHeader('Content-Disposition', 'inline; filename="lesiko-share.png"');
    if (req.method === 'HEAD') return res.end();
    res.end(png);
  } catch (error) {
    console.error('OG image generation failed', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Unable to generate share image');
  }
}

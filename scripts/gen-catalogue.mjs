// Builds supabase/migrations/0012_seed_full_catalogue.sql from the product
// definitions below. Kept in the repo so the demo catalogue can be regenerated
// (different images, extra subcategories) without hand-editing 31 SQL inserts.
//
// Usage: node scripts/gen-catalogue.mjs
//   IMAGE_POOL defaults to scripts/image-pool.txt ("<theme> <unsplash-photo-id>"
//   per line). Every id in that file was checked to return 200.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const pool = new Map();
for (const line of readFileSync(join(here, 'image-pool.txt'), 'utf8').trim().split('\n')) {
  const [theme, id] = line.trim().split(/\s+/);
  if (!pool.has(theme)) pool.set(theme, []);
  pool.get(theme).push(id);
}

const taken = new Map();
const image = theme => {
  const ids = pool.get(theme);
  if (!ids) throw new Error(`no images for theme ${theme}`);
  const i = taken.get(theme) ?? 0;
  taken.set(theme, i + 1);
  return `https://images.unsplash.com/photo-${ids[i % ids.length]}?auto=format&fit=crop&q=80&w=1000`;
};

const BRAND_NAMES = {
  'aurelia-lab': 'Aurelia Lab',
  'maison-teint': 'Maison Teint',
  'norwood-botanics': 'Norwood Botanics',
  lesiko: 'LesiKo'
};

const P = (o) => o;

const products = [
  // ---------------------------------------------------------- body & hands
  P({
    slug: 'silk-veil-body-lotion', cat: 'body-hands', sub: 'lotions', brand: 'norwood-botanics',
    name: 'Silk Veil Body Lotion', nameKa: 'სილქ ველი ტანის ლოსიონი',
    desc: 'A fast-absorbing daily lotion with shea butter and oat lipids. Leaves skin soft for twenty-four hours without a greasy finish.',
    descKa: 'სწრაფად შემწოვი ყოველდღიური ლოსიონი შის კარაქითა და შვრიის ლიპიდებით. კანი რჩება რბილი 24 საათის განმავლობაში.',
    price: 28, compare: 34, inv: 60, theme: 'body-lotion', skin: 'dry', tags: ['body', 'lotion'],
    variants: [['200 ml', 40], ['400 ml', 20]], isNew: true
  }),
  P({
    slug: 'coffee-grain-body-scrub', cat: 'body-hands', sub: 'scrubs', brand: 'norwood-botanics',
    name: 'Coffee Grain Body Scrub', nameKa: 'ყავის მარცვლის სკრაბი',
    desc: 'Ground coffee and brown sugar buff away dull skin, while cold-pressed coconut oil keeps the barrier comfortable.',
    descKa: 'დაფქული ყავა და ყავისფერი შაქარი ასუფთავებს კანს, ქოქოსის ზეთი კი ინარჩუნებს კომფორტს.',
    price: 24, inv: 45, theme: 'body-scrub', skin: 'normal', tags: ['body', 'scrub', 'exfoliant']
  }),
  P({
    slug: 'meadow-mint-body-wash', cat: 'body-hands', sub: 'wash', brand: 'norwood-botanics',
    name: 'Meadow Mint Body Wash', nameKa: 'მინდვრის პიტნის შხაპის გელი',
    desc: 'A sulphate-free gel that foams generously and rinses clean. Peppermint and eucalyptus wake up tired skin.',
    descKa: 'სულფატების გარეშე გელი, რომელიც უხვად ქაფდება და ადვილად ირეცხება. პიტნა და ევკალიპტი აღვიძებს კანს.',
    price: 19, inv: 80, theme: 'body-wash', skin: 'normal', tags: ['body', 'wash'],
    variants: [['250 ml', 50], ['500 ml', 30]]
  }),

  // --------------------------------------------------------------- brushes
  P({
    slug: 'contour-and-buff-face-brush', cat: 'brushes', sub: 'face-brushes', brand: 'lesiko',
    name: 'Contour & Buff Face Brush', nameKa: 'კონტურის ფუნჯი სახისთვის',
    desc: 'A dense, tapered synthetic brush for buffing foundation and placing cream contour. Handle balanced for close work.',
    descKa: 'მკვრივი, დავიწროებული სინთეზური ფუნჯი ტონალურის დასაფენად და კონტურისთვის.',
    price: 32, inv: 40, theme: 'makeup-brush', skin: 'normal', tags: ['brushes', 'tools']
  }),
  P({
    slug: 'precision-eye-brush-duo', cat: 'brushes', sub: 'eye-brushes', brand: 'lesiko',
    name: 'Precision Eye Brush Duo', nameKa: 'თვალის ფუნჯების წყვილი',
    desc: 'A flat packer and a tapered blender, sized for the crease. Vegan bristles hold powder without shedding.',
    descKa: 'ბრტყელი და დავიწროებული ფუნჯი თვალის ნაკეცისთვის. ვეგანური ბეწვი კარგად იჭერს პუდრს.',
    price: 26, compare: 32, inv: 55, theme: 'makeup-brush', skin: 'normal', tags: ['brushes', 'tools', 'eyes']
  }),

  // -------------------------------------------------- decorative cosmetics
  P({
    slug: 'soft-focus-cream-blush', cat: 'decorative-cosmetics', sub: 'blush', brand: 'maison-teint',
    name: 'Soft Focus Cream Blush', nameKa: 'კრემისებრი რუმიანა',
    desc: 'A weightless cream-to-powder blush that melts into skin. Buildable from a whisper of colour to a full flush.',
    descKa: 'მსუბუქი კრემისებრი რუმიანა, რომელიც ერწყმის კანს. ფერი შეგიძლიათ ააწყოთ სასურველ ინტენსივობამდე.',
    price: 29, inv: 50, theme: 'blush', skin: 'dry', tags: ['makeup', 'cheeks'], isTrending: true,
    variants: [['Rosewood', 20], ['Apricot', 18], ['Plum', 15]]
  }),
  P({
    slug: 'daily-brow-shaping-kit', cat: 'decorative-cosmetics', sub: 'brows', brand: 'maison-teint',
    name: 'Daily Brow Shaping Kit', nameKa: 'წარბის ყოველდღიური ნაკრები',
    desc: 'A compact with two brow powders, a wax and an angled brush. Everything needed to shape and set in one step.',
    descKa: 'კომპაქტი ორი წარბის პუდრით, ცვილითა და დახრილი ფუნჯით. ყველაფერი ერთ ნაკრებში.',
    price: 34, compare: 40, inv: 35, theme: 'eyebrow', skin: 'normal', tags: ['makeup', 'brows'],
    variants: [['Taupe', 15], ['Soft Brown', 12], ['Espresso', 10]]
  }),
  P({
    slug: 'undercover-radiance-concealer', cat: 'decorative-cosmetics', sub: 'concealer', brand: 'maison-teint',
    name: 'Undercover Radiance Concealer', nameKa: 'მანათობელი კონსილერი',
    desc: 'Medium coverage that brightens without creasing. Hyaluronic acid keeps the under-eye from going dry by midday.',
    descKa: 'საშუალო დაფარვა, რომელიც ანათებს და არ იკეცება. ჰიალურონის მჟავა იცავს კანს გამოშრობისგან.',
    price: 27, inv: 65, theme: 'concealer', skin: 'dry', tags: ['makeup', 'complexion'], isTrending: true,
    variants: [['Light 02', 25], ['Medium 05', 22], ['Deep 09', 18]]
  }),
  P({
    slug: 'blur-and-grip-face-primer', cat: 'decorative-cosmetics', sub: 'face-primer', brand: 'maison-teint',
    name: 'Blur & Grip Face Primer', nameKa: 'პრაიმერი სახისთვის',
    desc: 'A silicone-light gel primer that smooths texture and gives makeup something to hold onto through a long day.',
    descKa: 'გელისებრი პრაიმერი, რომელიც ასწორებს კანის ტექსტურას და ინარჩუნებს მაკიაჟს დღის განმავლობაში.',
    price: 31, inv: 48, theme: 'makeup', skin: 'combination', tags: ['makeup', 'primer'], isNew: true
  }),
  P({
    slug: 'lit-from-within-highlighter', cat: 'decorative-cosmetics', sub: 'highlighter', brand: 'maison-teint',
    name: 'Lit From Within Highlighter', nameKa: 'ჰაილაითერი',
    desc: 'A finely milled powder that catches light without glitter. Sits smoothly over both bare skin and foundation.',
    descKa: 'წვრილად დაფქული პუდრი, რომელიც იჭერს შუქს ბზინვარების გარეშე.',
    price: 30, compare: 36, inv: 42, theme: 'cosmetics', skin: 'normal', tags: ['makeup', 'glow'],
    variants: [['Champagne', 20], ['Rose Gold', 14]]
  }),
  P({
    slug: 'featherlight-setting-powder', cat: 'decorative-cosmetics', sub: 'face-powder', brand: 'maison-teint',
    name: 'Featherlight Setting Powder', nameKa: 'დამაფიქსირებელი პუდრი',
    desc: 'A translucent loose powder that locks makeup down and keeps shine in check without flattening the skin.',
    descKa: 'გამჭვირვალე ფხვიერი პუდრი, რომელიც აფიქსირებს მაკიაჟს და აკონტროლებს ცხიმიან ბზინვარებას.',
    price: 26, inv: 58, theme: 'face-powder', skin: 'oily', tags: ['makeup', 'powder']
  }),
  P({
    slug: 'shadow-play-sculptor', cat: 'decorative-cosmetics', sub: 'sculptor', brand: 'maison-teint',
    name: 'Shadow Play Sculptor', nameKa: 'სკულპტორი',
    desc: 'A cool-toned matte contour that reads as shadow rather than bronzer. Blends without patching on bare skin.',
    descKa: 'ცივი ტონის მქრქალი კონტური, რომელიც ქმნის ბუნებრივ ჩრდილს და თანაბრად იშლება.',
    price: 28, inv: 44, theme: 'face-powder', skin: 'normal', tags: ['makeup', 'contour'],
    variants: [['Light', 18], ['Medium', 16], ['Deep', 10]]
  }),
  P({
    slug: 'hold-tight-brow-gel', cat: 'decorative-cosmetics', sub: 'gel-for-brows', brand: 'maison-teint',
    name: 'Hold Tight Brow Gel', nameKa: 'წარბის ფიქსაციის გელი',
    desc: 'A clear laminating gel that holds hairs brushed up all day and stays flexible instead of crisping.',
    descKa: 'გამჭვირვალე გელი, რომელიც მთელი დღე ინარჩუნებს წარბის ფორმას და არ ხდება ხისტი.',
    price: 18, inv: 70, theme: 'eyebrow', skin: 'normal', tags: ['makeup', 'brows'], isTrending: true
  }),
  P({
    slug: 'fine-line-brow-pencil', cat: 'decorative-cosmetics', sub: 'pencil-for-brows', brand: 'maison-teint',
    name: 'Fine Line Brow Pencil', nameKa: 'წარბის ფანქარი',
    desc: 'A 1.5 mm retractable tip for drawing individual hairs, with a spoolie on the other end to soften the result.',
    descKa: '1.5 მმ წვერი ცალკეული ბეწვების დასახატად, მეორე მხარეს კი სავარცხელი.',
    price: 21, inv: 75, theme: 'eyebrow', skin: 'normal', tags: ['makeup', 'brows'],
    variants: [['Blonde', 20], ['Ash Brown', 30], ['Dark Brown', 25]]
  }),
  P({
    slug: 'sculpt-set-brow-pomade', cat: 'decorative-cosmetics', sub: 'pomade-for-brows', brand: 'maison-teint',
    name: 'Sculpt & Set Brow Pomade', nameKa: 'წარბის პომადა',
    desc: 'A waterproof cream pomade for filling sparse areas. Sets in seconds and survives humidity.',
    descKa: 'წყალგაუმტარი კრემისებრი პომადა იშვიათი უბნების შესავსებად. სწრაფად შრება.',
    price: 23, compare: 28, inv: 40, theme: 'eyebrow', skin: 'normal', tags: ['makeup', 'brows'],
    variants: [['Soft Brown', 22], ['Deep Brown', 18]]
  }),
  P({
    slug: 'feathered-brow-powder', cat: 'decorative-cosmetics', sub: 'powder-for-brows', brand: 'maison-teint',
    name: 'Feathered Brow Powder', nameKa: 'წარბის პუდრი',
    desc: 'A matte powder for a softer, diffused brow. Layers over pencil to blur any hard edges.',
    descKa: 'მქრქალი პუდრი რბილი, გაბუნდოვნებული წარბისთვის. ფანქრის ზემოდან რბილად იშლება.',
    price: 20, inv: 52, theme: 'eyebrow', skin: 'normal', tags: ['makeup', 'brows']
  }),
  P({
    slug: 'full-fan-volume-mascara', cat: 'decorative-cosmetics', sub: 'mascara', brand: 'maison-teint',
    name: 'Full Fan Volume Mascara', nameKa: 'მოცულობითი ტუში',
    desc: 'A hourglass brush that separates as it coats. Builds volume in three passes and does not flake by evening.',
    descKa: 'ფუნჯი, რომელიც ერთდროულად ჰყოფს და ფარავს წამწამებს. სამ ფენაში იძლევა მოცულობას.',
    price: 25, inv: 90, theme: 'mascara', skin: 'sensitive', tags: ['makeup', 'eyes'], isTrending: true
  }),
  P({
    slug: 'stay-put-eye-pencil', cat: 'decorative-cosmetics', sub: 'pencils-for-eyes', brand: 'maison-teint',
    name: 'Stay Put Eye Pencil', nameKa: 'თვალის ფანქარი',
    desc: 'A creamy kohl that glides on the waterline and sets waterproof within a minute.',
    descKa: 'კრემისებრი კოლი, რომელიც რბილად იხატება და ერთ წუთში ხდება წყალგაუმტარი.',
    price: 17, inv: 85, theme: 'eyeshadow', skin: 'sensitive', tags: ['makeup', 'eyes'],
    variants: [['Black', 40], ['Espresso', 25], ['Slate', 20]]
  }),
  P({
    slug: 'atelier-eyeshadow-palette', cat: 'decorative-cosmetics', sub: 'shadows', brand: 'maison-teint',
    name: 'Atelier Eyeshadow Palette', nameKa: 'ჩრდილების პალიტრა',
    desc: 'Nine shades across matte, satin and foil finishes, arranged so any three next to each other work together.',
    descKa: 'ცხრა ფერი მქრქალი, სატინისა და მბზინავი ტექსტურით — ნებისმიერი სამი მეზობელი ფერი ერთმანეთს ერგება.',
    price: 58, compare: 72, inv: 30, theme: 'eyeshadow', skin: 'normal', tags: ['makeup', 'eyes'], isNew: true
  }),
  P({
    slug: 'define-lip-pencil', cat: 'decorative-cosmetics', sub: 'pencils-for-lips', brand: 'maison-teint',
    name: 'Define Lip Pencil', nameKa: 'ტუჩის ფანქარი',
    desc: 'A firm-but-creamy pencil for a clean lip line that keeps colour from bleeding into fine lines.',
    descKa: 'მკვრივი, მაგრამ რბილი ფანქარი სუფთა კონტურისთვის, რომელიც არ უშვებს ფერს ნაოჭებში.',
    price: 19, inv: 68, theme: 'lipstick', skin: 'normal', tags: ['makeup', 'lips'],
    variants: [['Nude', 25], ['Rose', 24], ['Brick', 19]]
  }),

  // ------------------------------------------------------------- face care
  P({
    slug: 'ceramide-care-cleansing-balm', cat: 'face-care', sub: 'care', brand: 'aurelia-lab',
    name: 'Ceramide Care Cleansing Balm', nameKa: 'ცერამიდების გამწმენდი ბალზამი',
    desc: 'A solid balm that melts to an oil and rinses to a milk. Removes sunscreen and long-wear makeup in one pass.',
    descKa: 'მყარი ბალზამი, რომელიც ზეთად იქცევა და რძედ ირეცხება. ერთ ჯერზე შლის მზისგან დამცავსა და მაკიაჟს.',
    price: 36, inv: 55, theme: 'face-cream', skin: 'sensitive', tags: ['skincare', 'cleanser'], isTrending: true
  }),

  // ------------------------------------------------------------------ hair
  P({
    slug: 'midnight-repair-hair-oil', cat: 'hair', sub: 'leave-in-treatment-oil-for-hair', brand: 'norwood-botanics',
    name: 'Midnight Repair Hair Oil', nameKa: 'თმის აღმდგენი ზეთი',
    desc: 'A leave-in blend of squalane and camellia oil for dry ends. Absorbs overnight without leaving a slick on the pillow.',
    descKa: 'სკვალანისა და კამელიის ზეთის ნაზავი მშრალი ბოლოებისთვის. ღამით შეიწოვება და არ ტოვებს ცხიმიან კვალს.',
    price: 42, compare: 52, inv: 38, theme: 'hair-oil', skin: 'dry', tags: ['hair', 'treatment']
  }),
  P({
    slug: 'deep-fill-hair-mask', cat: 'hair', sub: 'masks-fillers', brand: 'norwood-botanics',
    name: 'Deep Fill Hair Mask', nameKa: 'თმის ღრმა ნიღაბი',
    desc: 'A five-minute protein-and-moisture mask for bleached or heat-damaged hair. Rebuilds body without weighing hair down.',
    descKa: 'ხუთწუთიანი ნიღაბი გაუფერულებული ან დაზიანებული თმისთვის. აღადგენს სტრუქტურას და არ ამძიმებს.',
    price: 38, inv: 44, theme: 'hair-conditioner', skin: 'dry', tags: ['hair', 'mask'],
    variants: [['200 ml', 30], ['500 ml', 14]]
  }),
  P({
    slug: 'sea-salt-texture-spray', cat: 'hair', sub: 'spray-for-hair', brand: 'norwood-botanics',
    name: 'Sea Salt Texture Spray', nameKa: 'ზღვის მარილის სპრეი',
    desc: 'A light mist for grip and second-day texture. Brushes out clean, so it will not build up over a week.',
    descKa: 'მსუბუქი სპრეი ტექსტურისა და მოცულობისთვის. ადვილად ივარცხნება და არ გროვდება თმაზე.',
    price: 27, inv: 62, theme: 'hair-spray', skin: 'oily', tags: ['hair', 'styling'], isNew: true
  }),
  P({
    slug: 'clarifying-scalp-peel', cat: 'hair', sub: 'pillings-for-hair', brand: 'aurelia-lab',
    name: 'Clarifying Scalp Peel', nameKa: 'თავის კანის პილინგი',
    desc: 'A weekly salicylic acid treatment that lifts product build-up from the scalp and calms flaking.',
    descKa: 'კვირაში ერთხელ გამოსაყენებელი სალიცილის მჟავას საშუალება, რომელიც წმენდს თავის კანს.',
    price: 34, inv: 40, theme: 'shampoo', skin: 'oily', tags: ['hair', 'scalp', 'exfoliant']
  }),
  P({
    slug: 'slip-and-shine-conditioner', cat: 'hair', sub: 'conditioners', brand: 'norwood-botanics',
    name: 'Slip & Shine Conditioner', nameKa: 'დამარბილებელი კონდიციონერი',
    desc: 'Detangles on contact and rinses without residue. Safe for colour-treated hair and daily use.',
    descKa: 'მყისიერად შლის თმის ჩახლართვას და ირეცხება ნარჩენების გარეშე. უსაფრთხოა შეღებილი თმისთვის.',
    price: 26, inv: 72, theme: 'hair-conditioner', skin: 'normal', tags: ['hair', 'conditioner'],
    variants: [['250 ml', 45], ['500 ml', 27]]
  }),
  P({
    slug: 'thermal-shield-heat-protectant', cat: 'hair', sub: 'heat-protection-for-hair', brand: 'norwood-botanics',
    name: 'Thermal Shield Heat Protectant', nameKa: 'თერმოდაცვის სპრეი',
    desc: 'Protects to 230 degrees Celsius and speeds up blow-drying. Fine enough not to flatten roots.',
    descKa: 'იცავს თმას 230 გრადუსამდე და აჩქარებს გაშრობას. საკმარისად მსუბუქია ფესვებისთვის.',
    price: 29, compare: 35, inv: 50, theme: 'hair-spray', skin: 'normal', tags: ['hair', 'protection']
  }),
  P({
    slug: 'soft-hold-styling-cream', cat: 'hair', sub: 'styling', brand: 'norwood-botanics',
    name: 'Soft Hold Styling Cream', nameKa: 'თმის სტაილინგის კრემი',
    desc: 'A flexible cream for shaping waves and taming frizz. Restyles with damp hands instead of needing a rewash.',
    descKa: 'მოქნილი კრემი ტალღების ფორმირებისა და აჩეჩილობის დასამორჩილებლად. ხელახლა ფორმდება სველი ხელით.',
    price: 24, inv: 58, theme: 'hair-spray', skin: 'normal', tags: ['hair', 'styling']
  }),

  // ----------------------------------------------------------------- nails
  P({
    slug: 'ten-day-gel-nail-polish', cat: 'nails', sub: 'polish', brand: 'lesiko',
    name: 'Ten Day Gel Nail Polish', nameKa: 'გელ-ლაქი ფრჩხილებისთვის',
    desc: 'A high-shine lacquer that wears ten days without a lamp. Brush is wide enough to cover a nail in three strokes.',
    descKa: 'მბზინავი ლაქი, რომელიც ლამპის გარეშე ძლებს ათ დღეს. ფუნჯი ფარავს ფრჩხილს სამ მოსმაში.',
    price: 16, inv: 95, theme: 'nail-polish', skin: 'normal', tags: ['nails', 'polish'], isTrending: true,
    variants: [['Clear', 30], ['Blush', 25], ['Cherry', 22], ['Ink', 18]]
  }),
  P({
    slug: 'cuticle-recovery-oil', cat: 'nails', sub: 'care', brand: 'lesiko',
    name: 'Cuticle Recovery Oil', nameKa: 'კუტიკულის ზეთი',
    desc: 'A jojoba and vitamin E pen for ragged cuticles. Click, brush on, and it absorbs before you put your hands back to work.',
    descKa: 'ჟოჟობასა და E ვიტამინის კალამი დაზიანებული კუტიკულისთვის. სწრაფად შეიწოვება.',
    price: 14, inv: 88, theme: 'manicure', skin: 'dry', tags: ['nails', 'care'], isNew: true
  }),
  P({
    slug: 'steel-manicure-tool-set', cat: 'nails', sub: 'tools', brand: 'lesiko',
    name: 'Steel Manicure Tool Set', nameKa: 'მანიკურის ხელსაწყოების ნაკრები',
    desc: 'Stainless clippers, a cuticle pusher and a glass file in a zip case. Sterilisable and built to outlast the trend cycle.',
    descKa: 'უჟანგავი ფოლადის მაკრატელი, კუტიკულის ბიძგი და მინის ქლიბი ჩანთაში. სტერილიზებადი და გამძლე.',
    price: 44, compare: 55, inv: 32, theme: 'manicure', skin: 'normal', tags: ['nails', 'tools']
  })
];

/** Expands the shorthand above into rows shaped like the `products` table. */
export const buildRows = () => {
  taken.clear();
  return products.map(p => {
    const images = [
      { id: `${p.slug}-1`, url: image(p.theme), altText: `${p.name} product shot`, isPrimary: true },
      { id: `${p.slug}-2`, url: image(p.theme), altText: `${p.name} in use`, isPrimary: false }
    ];

    const variants = (p.variants || []).map(([name, qty], i) => ({
      id: `${p.slug}-v${i + 1}`,
      name,
      sku: `${p.slug.slice(0, 12).toUpperCase().replace(/-/g, '')}-${i + 1}`,
      inventoryQuantity: qty
    }));

    return {
      name: p.name,
      name_ka: p.nameKa,
      slug: p.slug,
      description: p.desc,
      description_ka: p.descKa,
      price: p.price,
      compare_at_price: p.compare ?? null,
      inventory_quantity: variants.length
        ? variants.reduce((sum, v) => sum + v.inventoryQuantity, 0)
        : p.inv,
      brand_slug: p.brand,
      category_id: p.cat,
      sub_category: p.sub,
      images,
      variants,
      is_new: Boolean(p.isNew),
      is_trending: Boolean(p.isTrending),
      tags: ['demo', ...p.tags, p.skin],
      meta_title: `${p.name} | ${BRAND_NAMES[p.brand]}`,
      meta_description: p.desc.length > 155 ? `${p.desc.slice(0, 152).trimEnd()}...` : p.desc,
      meta_keywords: [...p.tags, p.skin, p.name.toLowerCase()].join(', ')
    };
  });
};

const q = s => `'${String(s).replace(/'/g, "''")}'`;
const jsonb = o => `${q(JSON.stringify(o))}::jsonb`;

const writeMigration = () => {
const rows = buildRows().map(r => `  (
    ${q(r.name)}, ${q(r.name_ka)}, ${q(r.slug)},
    ${q(r.description)},
    ${q(r.description_ka)},
    ${r.price}, ${r.compare_at_price ?? 'null'}, ${r.inventory_quantity},
    (select id from public.brands where slug = ${q(r.brand_slug)}),
    ${q(r.category_id)}, ${q(r.sub_category)},
    ${jsonb(r.images)},
    ${jsonb(r.variants)},
    ${r.is_new}, ${r.is_trending},
    ${q(`{${r.tags.map(t => `"${t}"`).join(',')}}`)}::text[],
    ${q(r.meta_title)},
    ${q(r.meta_description)},
    ${q(r.meta_keywords)}
  )`);

const sql = `-- Demo catalogue: one fully-populated product for every subcategory that had
-- none, so each filter combination in the storefront returns something and the
-- admin has a worked example of every field to copy from.
--
-- Generated by scripts/gen-catalogue.mjs. Every row carries the 'demo' tag and
-- can be removed with \`node scripts/purge-demo.mjs\` before real inventory
-- goes in.
--
-- Ratings are deliberately zero. Seeded stars imply reviews that do not exist,
-- and the storefront hides the rating block when review_count is 0.

insert into public.products (
  name, name_ka, slug,
  description,
  description_ka,
  price, compare_at_price, inventory_quantity,
  brand_id,
  category_id, sub_category,
  images,
  variants,
  is_new, is_trending,
  tags,
  meta_title,
  meta_description,
  meta_keywords
) values
${rows.join(',\n')}
on conflict (slug) do nothing;

-- The eight products seeded in 0004 carry invented ratings and no SEO fields.
-- Bring them in line with the rows above so the whole demo catalogue is
-- consistent and no product shows stars it has not earned.
update public.products
   set average_rating = 0,
       review_count   = 0
 where 'demo' = any(tags);

update public.products
   set meta_title       = name || ' | LesiKo',
       meta_description = left(description, 155),
       meta_keywords    = array_to_string(tags, ', ')
 where 'demo' = any(tags)
   and meta_title is null;
`;

  writeFileSync(join(root, 'supabase/migrations/0012_seed_full_catalogue.sql'), sql);
  console.log(`wrote ${products.length} products`);
};

// Importing this module should only hand over buildRows(); writing the
// migration is what running it from the command line does.
if (process.argv[1] === fileURLToPath(import.meta.url)) writeMigration();

-- DEMO DATA ONLY.
--
-- Sample brands and products so the storefront, filters, search and admin
-- tables have something to render during verification. Safe to remove:
--   delete from public.products where 'demo' = any(tags);
--   delete from public.brands where slug in ('aurelia-lab','maison-teint','norwood-botanics');

insert into public.brands (name, slug, image, description) values
  ('Aurelia Lab', 'aurelia-lab',
   'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800',
   'Clinical actives, formulated for sensitive skin.'),
  ('Maison Teint', 'maison-teint',
   'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=800',
   'Parisian colour cosmetics with a soft-focus finish.'),
  ('Norwood Botanics', 'norwood-botanics',
   'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=800',
   'Plant-derived haircare, free from silicones and sulphates.')
on conflict (slug) do nothing;

insert into public.products (
  name, name_ka, slug, description, description_ka,
  price, compare_at_price, inventory_quantity,
  brand_id, category_id, sub_category,
  images, variants, is_new, is_trending, average_rating, review_count, tags
)
select
  d.name, d.name_ka, d.slug, d.description, d.description_ka,
  d.price, d.compare_at_price, d.inventory_quantity,
  b.id, d.category_id, d.sub_category,
  d.images, d.variants, d.is_new, d.is_trending, d.average_rating, d.review_count, d.tags
from (values
  (
    'Hydra-Glow Vitamin C Serum', 'ჰიდრა-გლოუ ვიტამინ C შრატი', 'hydra-glow-vitamin-c-serum',
    'A 15% L-ascorbic acid serum buffered with ferulic acid to brighten uneven tone without the sting. Absorbs clean, layers under SPF.',
    'ვიტამინ C-ის შრატი კანის ტონის გასათანაბრებლად და სიკაშკაშისთვის.',
    45.00::numeric, 60.00::numeric, 42,
    'aurelia-lab', 'face-care', 'Serums',
    '[{"id":"img-vitc-1","url":"https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=1000","altText":"Vitamin C serum bottle","isPrimary":true},{"id":"img-vitc-2","url":"https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&q=80&w=1000","altText":"Serum texture swatch","isPrimary":false}]'::jsonb,
    '[{"id":"var-vitc-30","name":"30ml","inventoryQuantity":30,"sku":"AL-VITC-30"},{"id":"var-vitc-50","name":"50ml","price":68,"inventoryQuantity":12,"sku":"AL-VITC-50"}]'::jsonb,
    false, true, 4.70::numeric, 128, array['demo','serum','brightening','normal','combination']
  ),
  (
    'Barrier Repair Moisturiser', 'ბარიერის აღმდგენი კრემი', 'barrier-repair-moisturiser',
    'Ceramide and squalane cream that rebuilds a compromised moisture barrier overnight. Fragrance-free and non-comedogenic.',
    'ცერამიდებით და სკვალანით გამდიდრებული ღამის კრემი მშრალი კანისთვის.',
    38.00::numeric, null::numeric, 65,
    'aurelia-lab', 'face-care', 'Face cream',
    '[{"id":"img-barrier-1","url":"https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&q=80&w=1000","altText":"Moisturiser jar","isPrimary":true}]'::jsonb,
    '[]'::jsonb,
    true, true, 4.90::numeric, 214, array['demo','moisturiser','dry','sensitive']
  ),
  (
    'Mineral Daily Defence SPF 50', 'მინერალური SPF 50', 'mineral-daily-defence-spf-50',
    'A weightless zinc-oxide sunscreen with no white cast. Reef-safe filters, wearable under makeup every single day.',
    'უწონო მინერალური მზისგან დამცავი საშუალება SPF 50.',
    32.00::numeric, 40.00::numeric, 88,
    'aurelia-lab', 'face-care', 'Sun Care',
    '[{"id":"img-spf-1","url":"https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&q=80&w=1000","altText":"Sunscreen tube","isPrimary":true}]'::jsonb,
    '[]'::jsonb,
    false, true, 4.50::numeric, 96, array['demo','spf','oily','combination','sensitive']
  ),
  (
    'Overnight Recovery Mask', 'ღამის აღმდგენი ნიღაბი', 'overnight-recovery-mask',
    'A sleep-in gel mask with polyglutamic acid. Wake up with skin that looks like it drank a full glass of water.',
    'ღამის გელ-ნიღაბი ინტენსიური დატენიანებისთვის.',
    29.00::numeric, null::numeric, 0,
    'aurelia-lab', 'face-care', 'Masks for face',
    '[{"id":"img-mask-1","url":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=1000","altText":"Face mask jar","isPrimary":true}]'::jsonb,
    '[]'::jsonb,
    true, false, 4.30::numeric, 41, array['demo','mask','dry','normal']
  ),
  (
    'Second Skin Foundation', 'ბუნებრივი ტონალური საფუძველი', 'second-skin-foundation',
    'Buildable medium coverage with a natural satin finish. Twenty-four shades matched across warm, neutral and cool undertones.',
    'ბუნებრივი დაფარვის ტონალური კრემი სატინის ეფექტით.',
    52.00::numeric, null::numeric, 54,
    'maison-teint', 'decorative-cosmetics', 'Foundation',
    '[{"id":"img-found-1","url":"https://images.unsplash.com/photo-1631730359585-38a4935cbec4?auto=format&fit=crop&q=80&w=1000","altText":"Foundation bottle","isPrimary":true}]'::jsonb,
    '[{"id":"var-found-warm","name":"Warm 02","inventoryQuantity":18,"sku":"MT-FDN-W02"},{"id":"var-found-neutral","name":"Neutral 04","inventoryQuantity":24,"sku":"MT-FDN-N04"},{"id":"var-found-cool","name":"Cool 06","inventoryQuantity":12,"sku":"MT-FDN-C06"}]'::jsonb,
    false, true, 4.60::numeric, 302, array['demo','foundation','normal','combination']
  ),
  (
    'Velvet Matte Lip Tint', 'ხავერდოვანი მატი ლიპ-ტინტი', 'velvet-matte-lip-tint',
    'A pigment-dense tint that sets to a comfortable matte and stays put through coffee, lunch and the commute home.',
    'მდგრადი მატი ლიპ-ტინტი ინტენსიური პიგმენტით.',
    24.00::numeric, 30.00::numeric, 120,
    'maison-teint', 'decorative-cosmetics', 'Lipstick/tint/glossy',
    '[{"id":"img-lip-1","url":"https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=1000","altText":"Lip tint","isPrimary":true}]'::jsonb,
    '[{"id":"var-lip-rouge","name":"Rouge","inventoryQuantity":40,"sku":"MT-LIP-RG"},{"id":"var-lip-brique","name":"Brique","inventoryQuantity":35,"sku":"MT-LIP-BQ"},{"id":"var-lip-nu","name":"Nu","inventoryQuantity":45,"sku":"MT-LIP-NU"}]'::jsonb,
    true, true, 4.40::numeric, 187, array['demo','lipstick','normal']
  ),
  (
    'Sculpt & Blend Brush Set', 'ფუნჯების ნაკრები', 'sculpt-and-blend-brush-set',
    'Six vegan-fibre brushes for face and eyes in a magnetic travel case. Densely packed heads that do not shed.',
    'ექვსი ვეგანური ფუნჯის ნაკრები მაგნიტურ ქეისში.',
    68.00::numeric, 85.00::numeric, 27,
    'maison-teint', 'brushes', 'Sets',
    '[{"id":"img-brush-1","url":"https://images.unsplash.com/photo-1631729371254-42c2a89dd40d?auto=format&fit=crop&q=80&w=1000","altText":"Makeup brush set","isPrimary":true}]'::jsonb,
    '[]'::jsonb,
    false, false, 4.80::numeric, 73, array['demo','brushes','tools']
  ),
  (
    'Bond Restore Shampoo', 'აღმდგენი შამპუნი', 'bond-restore-shampoo',
    'A sulphate-free shampoo that repairs broken disulphide bonds in bleached and heat-styled hair. Colour-safe.',
    'სულფატების გარეშე შამპუნი დაზიანებული თმისთვის.',
    34.00::numeric, null::numeric, 76,
    'norwood-botanics', 'hair', 'Shampoo',
    '[{"id":"img-shampoo-1","url":"https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&q=80&w=1000","altText":"Shampoo bottle","isPrimary":true}]'::jsonb,
    '[{"id":"var-sham-250","name":"250ml","inventoryQuantity":50,"sku":"NB-SH-250"},{"id":"var-sham-500","name":"500ml","price":52,"inventoryQuantity":26,"sku":"NB-SH-500"}]'::jsonb,
    true, true, 4.20::numeric, 58, array['demo','shampoo','haircare']
  )
) as d(
  name, name_ka, slug, description, description_ka,
  price, compare_at_price, inventory_quantity,
  brand_slug, category_id, sub_category,
  images, variants, is_new, is_trending, average_rating, review_count, tags
)
join public.brands b on b.slug = d.brand_slug
on conflict (slug) do nothing;

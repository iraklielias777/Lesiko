-- Baseline content the storefront needs in order to render at all: the header
-- nav, homepage category grid and filter sidebar are all driven off the
-- categories table, and the homepage promo / skin-type sections off
-- site_content. Values mirror the defaults that used to be hardcoded in
-- constants/categories.ts and services/content-service.ts.

insert into public.categories (slug, label, image, subs, position) values
  ('face-care', 'Face Care',
   'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800',
   '["Masks for face","Face cream","Serums","Sun Care","Care"]'::jsonb, 1),

  ('decorative-cosmetics', 'Decorative Cosmetics',
   'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=800',
   '["Blush","Brows","Concealer","Face primer","Foundation","Highlighter","Face powder","Sculptor","Gel for brows","Pencil for brows","Pomade for brows","Powder for brows","Mascara","Pencils for eyes","Shadows","Pencils for lips","Lipstick/tint/glossy"]'::jsonb, 2),

  ('brushes', 'Brushes',
   'https://images.unsplash.com/photo-1631729371254-42c2a89dd40d?auto=format&fit=crop&q=80&w=800',
   '["Face Brushes","Eye Brushes","Sets"]'::jsonb, 3),

  ('nails', 'Nails',
   'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=800',
   '["Polish","Care","Tools"]'::jsonb, 4),

  ('body-hands', 'Body & Hands',
   'https://images.unsplash.com/photo-1608248597279-f99d160bfbc8?auto=format&fit=crop&q=80&w=800',
   '["Lotions","Scrubs","Wash"]'::jsonb, 5),

  ('hair', 'Hair',
   'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=800',
   '["Leave-in treatment, oil for hair","Shampoo","Masks/fillers","Spray for hair","Pillings for hair","Conditioners","Heat protection for hair","Styling"]'::jsonb, 6)
on conflict (slug) do nothing;

-- House brand, so the admin product form always has a valid brand to select
-- and mapProduct's LesiKo fallback resolves to a real row.
insert into public.brands (name, slug, description) values
  ('LesiKo', 'lesiko', 'Our own line of science-backed skincare essentials.')
on conflict (slug) do nothing;

insert into public.site_content (key, content) values
  ('homepage_promo', '{
    "title": "Summer Glow Essentials",
    "titleKa": "ზაფხულის ნაკრები",
    "description": "Get ready for the sun with our curated collection of SPF and hydration heroes.",
    "descriptionKa": "მოემზადეთ მზისთვის ჩვენი რჩეული SPF და დამატენიანებელი საშუალებებით.",
    "buttonText": "Shop the Collection",
    "buttonTextKa": "ნაკრების ნახვა",
    "image": "https://images.unsplash.com/photo-1618331835717-801e976710b2?auto=format&fit=crop&q=80&w=800",
    "link": "/products"
  }'::jsonb),

  ('homepage_skin_types', '[
    {"key":"normal","name":"Normal","nameKa":"ნორმალური","description":"Balanced hydration","descriptionKa":"ბალანსირებული","image":"https://images.unsplash.com/photo-1551024601-562963341c54?auto=format&fit=crop&q=80&w=800"},
    {"key":"dry","name":"Dry","nameKa":"მშრალი","description":"Deep nourishment","descriptionKa":"ღრმა კვება","image":"https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?auto=format&fit=crop&q=80&w=800"},
    {"key":"oily","name":"Oily","nameKa":"ცხიმიანი","description":"Shine control","descriptionKa":"ცხიმის კონტროლი","image":"https://images.unsplash.com/photo-1505944270255-72b8c68c6a70?auto=format&fit=crop&q=80&w=800"},
    {"key":"combination","name":"Combination","nameKa":"კომბინირებული","description":"Targeted care","descriptionKa":"მიზნობრივი მოვლა","image":"https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&q=80&w=800"},
    {"key":"sensitive","name":"Sensitive","nameKa":"მგრძნობიარე","description":"Gentle formulas","descriptionKa":"ნაზი ფორმულა","image":"https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800"}
  ]'::jsonb),

  ('store_settings', '{
    "storeName": "LesiKo Cosmetics",
    "supportEmail": "support@lesiko.com",
    "currency": "USD",
    "taxRate": 0.08,
    "freeShippingThreshold": 50
  }'::jsonb)
on conflict (key) do nothing;

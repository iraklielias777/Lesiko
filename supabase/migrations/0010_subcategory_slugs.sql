-- Subcategories were plain display strings, and products referenced them by
-- that exact text, so renaming one in the admin silently detached every product
-- in it. They become {slug,label,labelKa} objects here, and products.sub_category
-- switches to the slug, which stays put when the label is edited.
--
-- Georgian labels also move out of i18n/resources.ts and onto the row: a
-- category created after launch has no i18n key, so it would otherwise render
-- its English label in both languages.

alter table public.categories add column if not exists label_ka text;

-- -------------------------------------------------------- category labels

update public.categories c
   set label_ka = v.label_ka
  from (values
    ('face-care',            'სახის მოვლა'),
    ('decorative-cosmetics', 'დეკორატიული'),
    ('hair',                 'თმა'),
    ('body-hands',           'ტანი & ხელები'),
    ('nails',                'ფრჩხილები'),
    ('brushes',              'ფუნჯები')
  ) as v(slug, label_ka)
 where c.slug = v.slug
   and c.label_ka is null;

-- ------------------------------------------------------- subs to objects

with ka(label, label_ka) as (values
  ('Masks for face',                  'სახის ნიღბები'),
  ('Face cream',                      'სახის კრემი'),
  ('Serums',                          'შრატები'),
  ('Sun Care',                        'მზისგან დაცვა'),
  ('Care',                            'მოვლა'),
  ('Blush',                           'რუმიანა'),
  ('Brows',                           'წარბები'),
  ('Concealer',                       'კონსილერი'),
  ('Face primer',                     'პრაიმერი'),
  ('Foundation',                      'ტონალური'),
  ('Highlighter',                     'ჰაილაითერი'),
  ('Face powder',                     'პუდრი'),
  ('Sculptor',                        'სკულპტორი'),
  ('Gel for brows',                   'წარბის გელი'),
  ('Pencil for brows',                'წარბის ფანქარი'),
  ('Pomade for brows',                'წარბის პომადა'),
  ('Powder for brows',                'წარბის ჩრდილი'),
  ('Mascara',                         'ტუში'),
  ('Pencils for eyes',                'თვალის ფანქარი'),
  ('Shadows',                         'ჩრდილები'),
  ('Pencils for lips',                'ტუჩის ფანქარი'),
  ('Lipstick/tint/glossy',            'ტუჩსაცხი/ტინტი'),
  ('Face Brushes',                    'სახის ფუნჯები'),
  ('Eye Brushes',                     'თვალის ფუნჯები'),
  ('Sets',                            'ნაკრებები'),
  ('Polish',                          'ლაქი'),
  ('Tools',                           'ხელსაწყოები'),
  ('Lotions',                         'ლოსიონები'),
  ('Scrubs',                          'სკრაბები'),
  ('Wash',                            'დასაბანი'),
  ('Leave-in treatment, oil for hair','თმის ზეთი/მოუშორებელი'),
  ('Shampoo',                         'შამპუნი'),
  ('Masks/fillers',                   'ნიღბები/ფილერები'),
  ('Spray for hair',                  'სპრეი'),
  ('Pillings for hair',               'პილინგი'),
  ('Conditioners',                    'კონდიციონერი'),
  ('Heat protection for hair',        'თერმოდაცვა'),
  ('Styling',                         'სთაილინგი')
),
converted as (
  select c.slug,
         jsonb_agg(
           jsonb_build_object(
             'slug',    trim(both '-' from regexp_replace(lower(s.label), '[^a-z0-9]+', '-', 'g')),
             'label',   s.label,
             'labelKa', coalesce(ka.label_ka, s.label)
           )
           order by s.ord
         ) as subs
    from public.categories c
         cross join lateral jsonb_array_elements_text(c.subs) with ordinality as s(label, ord)
         left join ka on ka.label = s.label
   -- Guard so a re-run cannot try to re-slugify objects that are already converted.
   where jsonb_typeof(c.subs -> 0) = 'string'
   group by c.slug
)
update public.categories c
   set subs = converted.subs
  from converted
 where converted.slug = c.slug;

-- --------------------------------------------------- point products at slugs

update public.products p
   set sub_category = s.value ->> 'slug'
  from public.categories c
       cross join lateral jsonb_array_elements(c.subs) as s(value)
 where p.category_id = c.slug
   and p.sub_category is not null
   and p.sub_category = s.value ->> 'label';

comment on column public.categories.subs is
  'Array of {slug,label,labelKa}. slug is the stable key products reference; label/labelKa are display text.';

comment on column public.products.sub_category is
  'Subcategory slug matching a subs[].slug entry on the referenced category row.';

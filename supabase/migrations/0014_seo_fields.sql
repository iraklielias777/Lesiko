-- Per-entity and per-page SEO copy.
--
-- Until now only products carried meta fields, and only in English. Everything
-- a shopper can land on needs a title and description an operator can write
-- without a deploy, in both languages the storefront ships.

-- 1. Products gain the Georgian half of the meta fields they already had.
alter table public.products
  add column if not exists meta_title_ka       text,
  add column if not exists meta_description_ka text,
  add column if not exists meta_keywords_ka    text;

-- 2. Categories are landing pages in their own right (/category/<slug>).
--    Sub-category overrides live inside the existing `subs` jsonb objects as
--    optional metaTitle / metaTitleKa / metaDescription / metaDescriptionKa /
--    metaKeywords keys, so they need no columns of their own.
alter table public.categories
  add column if not exists meta_title          text,
  add column if not exists meta_title_ka       text,
  add column if not exists meta_description    text,
  add column if not exists meta_description_ka text,
  add column if not exists meta_keywords       text;

-- 3. Brands become landing pages too (/brand/<slug>).
alter table public.brands
  add column if not exists meta_title          text,
  add column if not exists meta_title_ka       text,
  add column if not exists meta_description    text,
  add column if not exists meta_description_ka text,
  add column if not exists meta_keywords       text;

-- 4. Absolute URLs cannot be derived from a client that may be served from a
--    preview domain, and a blank share image is the difference between a link
--    that gets clicked and one that does not.
update public.site_content
set content = content
  || jsonb_build_object(
       'siteUrl', coalesce(content->>'siteUrl', ''),
       'ogImage', coalesce(content->>'ogImage', '')
     )
where key = 'store_settings';

-- 5. Editable copy for every route that is not backed by a row.
insert into public.site_content (key, content)
values (
  'seo_pages',
  jsonb_build_object(
    'titleTemplate', '%s | %site%',
    'robotsExtra', '',
    'verification', jsonb_build_object('google', '', 'bing', '', 'facebookDomain', ''),
    'defaults', jsonb_build_object(
      'title', 'Premium Cosmetics & Skincare',
      'titleKa', 'პრემიუმ კოსმეტიკა და თავის მოვლა',
      'description', 'Discover premium skincare and cosmetics. Science-backed beauty delivered to your door.',
      'descriptionKa', 'აღმოაჩინეთ საუკეთესო კოსმეტიკური საშუალებები. მეცნიერულად დასაბუთებული სილამაზე თქვენს კარამდე.',
      'keywords', 'cosmetics, skincare, makeup, beauty, online store',
      'keywordsKa', 'კოსმეტიკა, თავის მოვლა, მაკიაჟი, სილამაზე, ონლაინ მაღაზია',
      'ogImage', '',
      'noindex', false
    ),
    'pages', jsonb_build_object(
      'home', jsonb_build_object(
        'title', '',
        'titleKa', '',
        'description', 'Shop science-backed skincare, makeup and haircare from the brands we trust. Fast delivery across Georgia.',
        'descriptionKa', 'შეიძინეთ მეცნიერულად დასაბუთებული კოსმეტიკა, მაკიაჟი და თმის მოვლის საშუალებები. სწრაფი მიწოდება საქართველოს მასშტაბით.',
        'keywords', 'serum, cream, skincare georgia, buy cosmetics online',
        'keywordsKa', 'შრატი, კრემი, კოსმეტიკა საქართველოში, კოსმეტიკის ყიდვა ონლაინ',
        'ogImage', '',
        'noindex', false
      ),
      'products', jsonb_build_object(
        'title', 'Shop All',
        'titleKa', 'ყველა პროდუქტი',
        'description', 'Browse the full catalogue: face care, decorative cosmetics, brushes, nails, body and hair.',
        'descriptionKa', 'დაათვალიერეთ სრული კატალოგი: სახის მოვლა, დეკორატიული კოსმეტიკა, ფუნჯები, ფრჩხილები, ტანი და თმა.',
        'keywords', 'cosmetics catalogue, beauty products, skincare shop',
        'keywordsKa', 'კოსმეტიკის კატალოგი, სილამაზის პროდუქტები, კოსმეტიკის მაღაზია',
        'ogImage', '',
        'noindex', false
      ),
      'sale', jsonb_build_object(
        'title', 'Sale',
        'titleKa', 'ფასდაკლება',
        'description', 'Discounted skincare and cosmetics while stock lasts.',
        'descriptionKa', 'ფასდაკლებული კოსმეტიკა და თავის მოვლის საშუალებები მარაგის ამოწურვამდე.',
        'keywords', 'cosmetics sale, discount skincare, beauty deals',
        'keywordsKa', 'კოსმეტიკის ფასდაკლება, აქცია, შეთავაზებები',
        'ogImage', '',
        'noindex', false
      ),
      'brands', jsonb_build_object(
        'title', 'Brands',
        'titleKa', 'ბრენდები',
        'description', 'Every brand we carry, in one place.',
        'descriptionKa', 'ყველა ბრენდი, რომელსაც ვყიდით, ერთ ადგილას.',
        'keywords', 'cosmetics brands, beauty brands georgia',
        'keywordsKa', 'კოსმეტიკის ბრენდები, სილამაზის ბრენდები',
        'ogImage', '',
        'noindex', false
      ),
      'help', jsonb_build_object(
        'title', 'Help Center',
        'titleKa', 'დახმარების ცენტრი',
        'description', 'Delivery, returns, payment and product questions, answered.',
        'descriptionKa', 'მიწოდება, დაბრუნება, გადახდა და პროდუქტებთან დაკავშირებული კითხვები.',
        'keywords', 'help, faq, delivery, returns, contact',
        'keywordsKa', 'დახმარება, კითხვები, მიწოდება, დაბრუნება, კონტაქტი',
        'ogImage', '',
        'noindex', false
      ),
      'wishlist', jsonb_build_object(
        'title', 'My Wishlist',
        'titleKa', 'სურვილების სია',
        'description', 'The products you saved for later.',
        'descriptionKa', 'პროდუქტები, რომლებიც შემდეგისთვის შეინახეთ.',
        'keywords', '',
        'keywordsKa', '',
        'ogImage', '',
        'noindex', true
      ),
      'login', jsonb_build_object(
        'title', 'Sign In',
        'titleKa', 'შესვლა',
        'description', 'Sign in to track orders and manage your saved products.',
        'descriptionKa', 'შედით სისტემაში შეკვეთების სანახავად და შენახული პროდუქტების სამართავად.',
        'keywords', '',
        'keywordsKa', '',
        'ogImage', '',
        'noindex', true
      ),
      'register', jsonb_build_object(
        'title', 'Create Account',
        'titleKa', 'რეგისტრაცია',
        'description', 'Create an account for faster checkout and order history.',
        'descriptionKa', 'შექმენით ანგარიში სწრაფი გადახდისა და შეკვეთების ისტორიისთვის.',
        'keywords', '',
        'keywordsKa', '',
        'ogImage', '',
        'noindex', true
      ),
      'notFound', jsonb_build_object(
        'title', 'Page Not Found',
        'titleKa', 'გვერდი ვერ მოიძებნა',
        'description', 'That page does not exist. Browse the catalogue instead.',
        'descriptionKa', 'ასეთი გვერდი არ არსებობს. დაათვალიერეთ კატალოგი.',
        'keywords', '',
        'keywordsKa', '',
        'ogImage', '',
        'noindex', true
      )
    )
  )
)
on conflict (key) do nothing;

-- 6. Seed category meta from the labels already on the row, so the sitemap and
--    the category pages read sensibly before anyone opens the SEO editor.
update public.categories
set meta_title       = coalesce(meta_title, label),
    meta_title_ka    = coalesce(meta_title_ka, label_ka),
    meta_description = coalesce(
      meta_description,
      'Shop ' || label || ' at LesiKo. Curated, science-backed products with fast delivery across Georgia.'
    ),
    meta_description_ka = coalesce(
      meta_description_ka,
      coalesce(label_ka, label) || ' — შერჩეული პროდუქტები სწრაფი მიწოდებით საქართველოს მასშტაბით.'
    );

-- 7. Seeded product meta titles ended in the store name, which the title
--    template appends anyway. Point the suffix at the actual brand instead so
--    titles read "Product | Brand | Store" rather than doubling the store.
update public.products p
set meta_title = regexp_replace(p.meta_title, '\s*\|\s*LesiKo$', '') || ' | ' || b.name
from public.brands b
where b.id = p.brand_id
  and p.meta_title like '%| LesiKo';

update public.brands
set meta_title       = coalesce(meta_title, name),
    meta_title_ka    = coalesce(meta_title_ka, name),
    meta_description = coalesce(
      meta_description,
      nullif(description, ''),
      'Explore the full ' || name || ' range.'
    ),
    meta_description_ka = coalesce(
      meta_description_ka,
      name || '-ის სრული ასორტიმენტი.'
    );

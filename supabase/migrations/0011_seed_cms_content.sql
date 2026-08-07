-- Marketing copy the admin could not previously change: the homepage hero, the
-- Help page FAQ and contact details, the footer blurb and social links, and the
-- Instagram grid. All of it was hardcoded in components or locked in
-- i18n/resources.ts, which meant a deploy for every wording tweak.
--
-- Values below reproduce exactly what those surfaces rendered before, so the
-- storefront looks identical until someone edits it.

insert into public.site_content (key, content) values
  ('homepage_hero', '{
    "eyebrow": "New Collection",
    "eyebrowKa": "ახალი კოლექცია",
    "title": "Redefine Beauty",
    "titleKa": "სილამაზის ახალი სტანდარტი",
    "subtitle": "Discover science-backed skincare and premium cosmetics designed to enhance your natural radiance.",
    "subtitleKa": "აღმოაჩინეთ მეცნიერულად შემუშავებული თავის მოვლის საშუალებები და პრემიუმ კოსმეტიკა.",
    "primaryLabel": "Shop Collection",
    "primaryLabelKa": "კოლექციის ნახვა",
    "primaryLink": "/products",
    "secondaryLabel": "Take Skin Quiz",
    "secondaryLabelKa": "კანის ტესტი",
    "secondaryLink": "/products",
    "image": "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?auto=format&fit=crop&q=80&w=1200"
  }'::jsonb),

  ('help_content', '{
    "email": "support@lesiko.com",
    "phone": "+995 555 123 456",
    "hours": "Mon - Fri: 10:00 - 18:00",
    "hoursKa": "ორშ - პარ: 10:00 - 18:00",
    "faqs": [
      {
        "id": "shipping-time",
        "question": "How long does shipping take?",
        "questionKa": "რამდენი დრო სჭირდება მიწოდებას?",
        "answer": "Standard shipping within Tbilisi takes 1-2 business days. Regional delivery takes 2-4 business days.",
        "answerKa": "თბილისში სტანდარტული მიწოდება ხდება 1-2 სამუშაო დღეში. რეგიონებში - 2-4 დღეში."
      },
      {
        "id": "international",
        "question": "Do you offer international shipping?",
        "questionKa": "გაქვთ თუ არა საერთაშორისო მიწოდება?",
        "answer": "Currently, we only ship within Georgia.",
        "answerKa": "ამ ეტაპზე ვემსახურებით მხოლოდ საქართველოს ტერიტორიას."
      },
      {
        "id": "returns",
        "question": "What is your return policy?",
        "questionKa": "როგორია დაბრუნების პოლიტიკა?",
        "answer": "We accept returns for unopened products within 14 days of delivery. Please contact support to initiate a return.",
        "answerKa": "უხსნელი პროდუქციის დაბრუნება შესაძლებელია მიღებიდან 14 დღის განმავლობაში."
      },
      {
        "id": "tracking",
        "question": "How can I track my order?",
        "questionKa": "როგორ ვადევნო თვალი შეკვეთას?",
        "answer": "You can track your order from the My Account section under Order History.",
        "answerKa": "შეკვეთის სტატუსის ნახვა შეგიძლიათ პირად კაბინეტში, შეკვეთების ისტორიის განყოფილებაში."
      },
      {
        "id": "choosing",
        "question": "How do I know which product is right for my skin?",
        "questionKa": "როგორ შევარჩიო ჩემი კანისთვის შესაფერისი პროდუქტი?",
        "answer": "You can filter products by skin type on our shop page, or take our Skin Quiz for personalized recommendations.",
        "answerKa": "შეგიძლიათ გაფილტროთ პროდუქტები კანის ტიპის მიხედვით მაღაზიის გვერდზე."
      },
      {
        "id": "cruelty-free",
        "question": "Are your products cruelty-free?",
        "questionKa": "არის თუ არა პროდუქცია cruelty-free?",
        "answer": "Yes, all brands we curate are cruelty-free and never tested on animals.",
        "answerKa": "დიახ, ჩვენი ყველა ბრენდი არის cruelty-free და არ იტესტება ცხოველებზე."
      }
    ]
  }'::jsonb),

  ('footer_content', '{
    "about": "Empowering your beauty journey with premium, science-backed skincare and cosmetics. Discover your unique glow with LesiKo.",
    "aboutKa": "პრემიუმ, მეცნიერულად დასაბუთებული კოსმეტიკა თქვენი სილამაზისთვის. აღმოაჩინეთ თქვენი ბზინვარება LesiKo-სთან.",
    "newsletterTitle": "Stay in the Know",
    "newsletterTitleKa": "იყავით კურსში",
    "newsletterText": "Subscribe to receive updates, access to exclusive deals, and more.",
    "newsletterTextKa": "გამოიწერეთ სიახლეები და მიიღეთ ექსკლუზიური შეთავაზებები.",
    "instagramUrl": "https://instagram.com/lesiko_official",
    "facebookUrl": "https://facebook.com/lesiko",
    "twitterUrl": "https://twitter.com/lesiko"
  }'::jsonb),

  ('social_content', '{
    "handle": "@LESIKO_OFFICIAL",
    "profileUrl": "https://instagram.com/lesiko_official",
    "title": "As Seen On You",
    "titleKa": "თქვენს ფოტოებში",
    "subtitle": "Tag us to be featured on our feed.",
    "subtitleKa": "მონიშნეთ ჩვენი გვერდი.",
    "images": [
      "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1596462502278-27bfdd403348?auto=format&fit=crop&q=80&w=400"
    ]
  }'::jsonb)
on conflict (key) do nothing;

-- Shipping was a constant in store/settings-store.ts, so the checkout total
-- could not be changed without a deploy either.
update public.site_content
   set content = content || '{"shippingRate": 15}'::jsonb
 where key = 'store_settings'
   and not content ? 'shippingRate';

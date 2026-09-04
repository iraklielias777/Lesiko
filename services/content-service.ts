
import {
  FooterContent,
  FooterSocial,
  SocialPlatform,
  HelpContent,
  HeroContent,
  LegalContent,
  PromoContent,
  SeoPages,
  SkinTypeContent,
  SocialContent,
  StoreSettings
} from '../types';
import { supabase } from '../lib/supabase';
import { DEFAULT_LEGAL } from '../content/legal-defaults';

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'LesiKo Cosmetics',
  supportEmail: 'support@lesiko.com',
  currency: 'GEL',
  taxRate: 0.08,
  freeShippingThreshold: 50,
  shippingRate: 15,
  siteUrl: '',
  ogImage: '',
  defaultLanguage: 'en',
  gaMeasurementId: ''
};

// Every route the storefront can land on. The admin editor renders one card per
// entry, so adding a page here is all it takes to make its copy editable.
export const SEO_PAGE_KEYS = [
  'home',
  'products',
  'sale',
  'brands',
  'help',
  'wishlist',
  'login',
  'register',
  'terms',
  'privacy',
  'delivery',
  'returns',
  'notFound'
] as const;

export const DEFAULT_SEO_PAGES: SeoPages = {
  titleTemplate: '%s | %site%',
  robotsExtra: '',
  verification: { google: '', bing: '', facebookDomain: '' },
  defaults: {
    title: 'Premium Cosmetics & Skincare',
    titleKa: 'პრემიუმ კოსმეტიკა და თავის მოვლა',
    description: 'Discover premium skincare and cosmetics. Science-backed beauty delivered to your door.',
    descriptionKa: 'აღმოაჩინეთ საუკეთესო კოსმეტიკური საშუალებები. მეცნიერულად დასაბუთებული სილამაზე თქვენს კარამდე.',
    keywords: 'cosmetics, skincare, makeup, beauty, online store',
    keywordsKa: 'კოსმეტიკა, თავის მოვლა, მაკიაჟი, სილამაზე, ონლაინ მაღაზია',
    ogImage: '',
    noindex: false
  },
  pages: {}
};

const DEFAULT_PROMO: PromoContent = {
  title: "Summer Glow Essentials",
  titleKa: "ზაფხულის ნაკრები",
  description: "Get ready for the sun with our curated collection of SPF and hydration heroes.",
  descriptionKa: "მოემზადეთ მზისთვის ჩვენი რჩეული SPF და დამატენიანებელი საშუალებებით.",
  buttonText: "Shop the Collection",
  buttonTextKa: "ნაკრების ნახვა",
  image: "https://images.unsplash.com/photo-1618331835717-801e976710b2?auto=format&fit=crop&q=80&w=800",
  link: "/products"
};

const DEFAULT_SKIN_TYPES: SkinTypeContent = [
  { key: 'normal', name: 'Normal', nameKa: 'ნორმალური', description: 'Balanced hydration', descriptionKa: 'ბალანსირებული', image: 'https://images.unsplash.com/photo-1551024601-562963341c54?auto=format&fit=crop&q=80&w=800' },
  { key: 'dry', name: 'Dry', nameKa: 'მშრალი', description: 'Deep nourishment', descriptionKa: 'ღრმა კვება', image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?auto=format&fit=crop&q=80&w=800' },
  { key: 'oily', name: 'Oily', nameKa: 'ცხიმიანი', description: 'Shine control', descriptionKa: 'ცხიმის კონტროლი', image: 'https://images.unsplash.com/photo-1505944270255-72b8c68c6a70?auto=format&fit=crop&q=80&w=800' },
  { key: 'combination', name: 'Combination', nameKa: 'კომბინირებული', description: 'Targeted care', descriptionKa: 'მიზნობრივი მოვლა', image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&q=80&w=800' },
  { key: 'sensitive', name: 'Sensitive', nameKa: 'მგრძნობიარე', description: 'Gentle formulas', descriptionKa: 'ნაზი ფორმულა', image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800' },
];

export const DEFAULT_HERO: HeroContent = {
  eyebrow: 'New Collection',
  eyebrowKa: 'ახალი კოლექცია',
  title: 'Redefine Beauty',
  titleKa: 'სილამაზის ახალი სტანდარტი',
  subtitle: 'Discover science-backed skincare and premium cosmetics designed to enhance your natural radiance.',
  subtitleKa: 'აღმოაჩინეთ მეცნიერულად შემუშავებული თავის მოვლის საშუალებები და პრემიუმ კოსმეტიკა.',
  primaryLabel: 'Shop Collection',
  primaryLabelKa: 'კოლექციის ნახვა',
  primaryLink: '/products',
  secondaryLabel: 'Take Skin Quiz',
  secondaryLabelKa: 'კანის ტესტი',
  secondaryLink: '/products',
  image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?auto=format&fit=crop&q=80&w=1200'
};

export const DEFAULT_HELP: HelpContent = {
  email: 'support@lesiko.com',
  phone: '+995 555 123 456',
  hours: 'Mon - Fri: 10:00 - 18:00',
  hoursKa: 'ორშ - პარ: 10:00 - 18:00',
  faqs: []
};

export const DEFAULT_FOOTER: FooterContent = {
  about: 'Empowering your beauty journey with premium, science-backed skincare and cosmetics. Discover your unique glow with LesiKo.',
  aboutKa: 'პრემიუმ, მეცნიერულად დასაბუთებული კოსმეტიკა თქვენი სილამაზისთვის.',
  columns: [
    {
      id: 'shop',
      title: 'Shop',
      titleKa: 'მაღაზია',
      autoCategories: 3,
      links: [
        { id: 'shop-all', label: 'Shop all', labelKa: 'ყველა პროდუქტი', href: '/products' },
        { id: 'sale', label: 'Sale', labelKa: 'ფასდაკლება', href: '/sale' }
      ]
    },
    {
      id: 'support',
      title: 'Support',
      titleKa: 'დახმარება',
      links: [
        { id: 'faq', label: 'FAQs', labelKa: 'ხშირი კითხვები', href: '/help' },
        { id: 'delivery', label: 'Delivery', labelKa: 'მიწოდება', href: '/delivery' },
        { id: 'returns', label: 'Returns', labelKa: 'დაბრუნება', href: '/returns' },
        { id: 'contact', label: 'Contact us', labelKa: 'კონტაქტი', href: '/help' },
        { id: 'track', label: 'Track your order', labelKa: 'შეკვეთის თვალყური', href: '/track-order' },
        { id: 'account', label: 'My account', labelKa: 'ჩემი ანგარიში', href: '/account' }
      ]
    }
  ],
  newsletterTitle: 'Stay in the Know',
  newsletterTitleKa: 'იყავით კურსში',
  newsletterText: 'Questions about an order or the catalogue? Email us and we will help.',
  newsletterTextKa: 'კითხვა გაქვთ შეკვეთაზე ან პროდუქტზე? მოგვწერეთ და დაგეხმარებით.',
  contactLabel: 'Email {email}',
  contactLabelKa: 'მოგვწერეთ: {email}',
  socials: [
    { id: 'ig', platform: 'instagram', url: 'https://instagram.com/lesiko_ge' },
    { id: 'fb', platform: 'facebook', url: 'https://facebook.com/lesiko' }
  ],
  legalLine: '© {year} {store}. All rights reserved.',
  legalLineKa: '© {year} {store}. ყველა უფლება დაცულია.',
  bottomLinks: [
    { id: 'terms', label: 'Terms', labelKa: 'პირობები', href: '/terms' },
    { id: 'privacy', label: 'Privacy', labelKa: 'კონფიდენციალურობა', href: '/privacy' },
    { id: 'support', label: 'Support', labelKa: 'დახმარება', href: '/help' }
  ]
};

/**
 * Rows saved before the footer became fully editable carry three social URL
 * fields and no columns. They are lifted into the new shape on read so the
 * storefront never renders a half-empty footer, and dropped on the next save.
 */
export const normaliseFooter = (raw: Partial<FooterContent>): FooterContent => {
  const legacySocials: FooterSocial[] = [
    ['instagram', raw.instagramUrl],
    ['facebook', raw.facebookUrl],
    ['twitter', raw.twitterUrl]
  ]
    .filter((entry): entry is [SocialPlatform, string] => !!entry[1] && !!entry[1].trim())
    .map(([platform, url]) => ({ id: platform, platform, url: url.trim() }));

  const { instagramUrl: _ig, facebookUrl: _fb, twitterUrl: _tw, ...rest } = raw;

  return {
    ...DEFAULT_FOOTER,
    ...rest,
    columns: Array.isArray(raw.columns) && raw.columns.length ? raw.columns : DEFAULT_FOOTER.columns,
    socials: Array.isArray(raw.socials) ? raw.socials : legacySocials.length ? legacySocials : DEFAULT_FOOTER.socials,
    bottomLinks: Array.isArray(raw.bottomLinks) ? raw.bottomLinks : DEFAULT_FOOTER.bottomLinks
  };
};

export const DEFAULT_SOCIAL: SocialContent = {
  handle: '@LESIKO_OFFICIAL',
  profileUrl: 'https://instagram.com/lesiko_official',
  title: 'As Seen On You',
  titleKa: 'თქვენს ფოტოებში',
  subtitle: 'Tag us to be featured on our feed.',
  subtitleKa: 'მონიშნეთ ჩვენი გვერდი.',
  images: []
};

/**
 * `site_content` is eight small rows — hero, promo, skin types, help, footer,
 * social, store settings, SEO — and the homepage alone needs six of them. Read
 * one key at a time that was eight round trips before the page could finish,
 * plus duplicates whenever two components wanted the same block (the footer
 * copy was fetched by both the Footer and the homepage).
 *
 * The whole table is 4.5 KB gzipped, so it travels in a single request and is
 * cached for the session. Admin writes drop the cache.
 */
type ContentBlocks = Record<string, unknown>;

let blockCache: ContentBlocks | null = null;
let blockInflight: Promise<ContentBlocks> | null = null;

export const invalidateContent = () => {
  blockCache = null;
  blockInflight = null;
};

const fetchBlocks = async (): Promise<ContentBlocks> => {
  if (!supabase) return {};
  const { data, error } = await supabase.from('site_content').select('key, content');
  if (error) {
    console.error('Error loading site content:', error);
    return {};
  }
  const blocks: ContentBlocks = {};
  for (const row of data || []) blocks[row.key as string] = row.content;
  return blocks;
};

const loadBlocks = (): Promise<ContentBlocks> => {
  if (blockCache) return Promise.resolve(blockCache);
  if (!blockInflight) {
    blockInflight = fetchBlocks()
      .then(blocks => { blockCache = blocks; blockInflight = null; return blocks; })
      .catch(err => { blockInflight = null; throw err; });
  }
  return blockInflight;
};

/** Raw block, or undefined when the row does not exist. */
async function rawBlock(key: string): Promise<unknown> {
  try {
    return (await loadBlocks())[key];
  } catch {
    return undefined;
  }
}

// Every block merges over its default, so a row written by an older build (or
// hand-edited to drop a field) still renders instead of blanking the page.
async function readBlock<T>(key: string, fallback: T): Promise<T> {
  const content = await rawBlock(key);
  if (!content) return fallback;
  return { ...fallback, ...(content as Partial<T>) } as T;
}

async function writeBlock<T>(key: string, content: T): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('site_content').upsert({ key, content });
  if (error) throw error;
  invalidateContent();
}

export const ContentService = {
  getHeroContent: (): Promise<HeroContent> => readBlock('homepage_hero', DEFAULT_HERO),
  updateHeroContent: (content: HeroContent): Promise<void> => writeBlock('homepage_hero', content),

  getHelpContent: (): Promise<HelpContent> => readBlock('help_content', DEFAULT_HELP),
  updateHelpContent: (content: HelpContent): Promise<void> => writeBlock('help_content', content),

  getFooterContent: async (): Promise<FooterContent> => {
    const content = await rawBlock('footer_content');
    return normaliseFooter((content as Partial<FooterContent>) || {});
  },
  updateFooterContent: (content: FooterContent): Promise<void> =>
    writeBlock('footer_content', normaliseFooter(content)),

  // Merged page by page, so a row saved by an older build that lacks one of
  // the four pages still shows that page's default rather than a blank route.
  getLegalContent: async (): Promise<LegalContent> => {
    const content = await rawBlock('legal_pages') as Partial<LegalContent> | undefined;
    const saved = Array.isArray(content?.pages) ? content!.pages : [];
    return {
      pages: DEFAULT_LEGAL.pages.map(fallback => {
        const row = saved.find(p => p && p.key === fallback.key);
        return row ? { ...fallback, ...row } : fallback;
      })
    };
  },
  updateLegalContent: (content: LegalContent): Promise<void> => writeBlock('legal_pages', content),

  getSocialContent: (): Promise<SocialContent> => readBlock('social_content', DEFAULT_SOCIAL),
  updateSocialContent: (content: SocialContent): Promise<void> => writeBlock('social_content', content),

  getSeoPages: async (): Promise<SeoPages> => {
    // readBlock's shallow merge would leave `defaults` and `verification` from
    // the row as-is, which is fine, but a row missing them entirely has to fall
    // back field by field or the resolver reads undefined.
    const block = await readBlock('seo_pages', DEFAULT_SEO_PAGES);
    return {
      ...DEFAULT_SEO_PAGES,
      ...block,
      defaults: { ...DEFAULT_SEO_PAGES.defaults, ...(block.defaults || {}) },
      verification: { ...DEFAULT_SEO_PAGES.verification, ...(block.verification || {}) },
      pages: block.pages || {}
    };
  },
  updateSeoPages: (content: SeoPages): Promise<void> => writeBlock('seo_pages', content),

  getPromoContent: async (): Promise<PromoContent> => {
    const content = await rawBlock('homepage_promo');
    return (content as PromoContent) || DEFAULT_PROMO;
  },

  updatePromoContent: (content: PromoContent): Promise<void> =>
    writeBlock('homepage_promo', content),

  // An array, not an object, so it cannot go through readBlock's merge.
  getSkinTypeContent: async (): Promise<SkinTypeContent> => {
    const content = await rawBlock('homepage_skin_types');
    return Array.isArray(content) ? (content as SkinTypeContent) : DEFAULT_SKIN_TYPES;
  },

  updateSkinTypeContent: (content: SkinTypeContent): Promise<void> =>
    writeBlock('homepage_skin_types', content),

  // Merge so a partially-filled row cannot produce NaN totals at checkout.
  getStoreSettings: (): Promise<StoreSettings> =>
    readBlock('store_settings', DEFAULT_STORE_SETTINGS),

  updateStoreSettings: (settings: StoreSettings): Promise<void> =>
    writeBlock('store_settings', settings)
};

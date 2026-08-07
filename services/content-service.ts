
import {
  FooterContent,
  HelpContent,
  HeroContent,
  PromoContent,
  SeoPages,
  SkinTypeContent,
  SocialContent,
  StoreSettings
} from '../types';
import { supabase } from '../lib/supabase';

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'LesiKo Cosmetics',
  supportEmail: 'support@lesiko.com',
  currency: 'USD',
  taxRate: 0.08,
  freeShippingThreshold: 50,
  shippingRate: 15,
  siteUrl: '',
  ogImage: ''
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
  newsletterTitle: 'Stay in the Know',
  newsletterTitleKa: 'იყავით კურსში',
  newsletterText: 'Subscribe to receive updates, access to exclusive deals, and more.',
  newsletterTextKa: 'გამოიწერეთ სიახლეები და მიიღეთ ექსკლუზიური შეთავაზებები.',
  instagramUrl: 'https://instagram.com/lesiko_official',
  facebookUrl: 'https://facebook.com/lesiko',
  twitterUrl: 'https://twitter.com/lesiko'
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

// Every block merges over its default, so a row written by an older build (or
// hand-edited to drop a field) still renders instead of blanking the page.
async function readBlock<T>(key: string, fallback: T): Promise<T> {
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from('site_content')
    .select('content')
    .eq('key', key)
    .maybeSingle();

  if (error || !data?.content) return fallback;
  return { ...fallback, ...(data.content as Partial<T>) } as T;
}

async function writeBlock<T>(key: string, content: T): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('site_content').upsert({ key, content });
  if (error) throw error;
}

export const ContentService = {
  getHeroContent: (): Promise<HeroContent> => readBlock('homepage_hero', DEFAULT_HERO),
  updateHeroContent: (content: HeroContent): Promise<void> => writeBlock('homepage_hero', content),

  getHelpContent: (): Promise<HelpContent> => readBlock('help_content', DEFAULT_HELP),
  updateHelpContent: (content: HelpContent): Promise<void> => writeBlock('help_content', content),

  getFooterContent: (): Promise<FooterContent> => readBlock('footer_content', DEFAULT_FOOTER),
  updateFooterContent: (content: FooterContent): Promise<void> => writeBlock('footer_content', content),

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
    if (!supabase) return DEFAULT_PROMO;
    
    const { data, error } = await supabase
        .from('site_content')
        .select('content')
        .eq('key', 'homepage_promo')
        .single();

    if (error || !data) return DEFAULT_PROMO;
    return data.content as PromoContent;
  },

  updatePromoContent: async (content: PromoContent): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'homepage_promo', content });
    
    if (error) throw error;
  },

  getSkinTypeContent: async (): Promise<SkinTypeContent> => {
    if (!supabase) return DEFAULT_SKIN_TYPES;
    
    const { data, error } = await supabase
        .from('site_content')
        .select('content')
        .eq('key', 'homepage_skin_types')
        .single();

    if (error || !data) return DEFAULT_SKIN_TYPES;
    return data.content as SkinTypeContent;
  },

  updateSkinTypeContent: async (content: SkinTypeContent): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'homepage_skin_types', content });
    
    if (error) throw error;
  },

  getStoreSettings: async (): Promise<StoreSettings> => {
    if (!supabase) return DEFAULT_STORE_SETTINGS;

    const { data, error } = await supabase
        .from('site_content')
        .select('content')
        .eq('key', 'store_settings')
        .maybeSingle();

    if (error || !data) return DEFAULT_STORE_SETTINGS;
    // Merge so a partially-filled row cannot produce NaN totals at checkout.
    return { ...DEFAULT_STORE_SETTINGS, ...(data.content as Partial<StoreSettings>) };
  },

  updateStoreSettings: async (settings: StoreSettings): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'store_settings', content: settings });

    if (error) throw error;
  }
};

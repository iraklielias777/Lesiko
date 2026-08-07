
export interface ProductVariant {
  id: string;
  name: string; // e.g. "Red", "XL", "100ml"
  price?: number; // Optional override
  inventoryQuantity: number;
  sku?: string;
}

export interface Product {
  id: string;
  name: string;
  nameKa?: string; // Georgian Name
  slug: string;
  description: string;
  descriptionKa?: string; // Georgian Description
  brand: Brand;
  category: Category; // Main Category (e.g., "Hair")
  subCategory?: string; // Sub-category slug (e.g. "shampoo"), matching CategoryHierarchyItem.subs[].slug
  price: number;
  compareAtPrice?: number;
  inventoryQuantity: number; // For simple products, or total stock cache
  variants?: ProductVariant[]; // NEW: Variations
  images: ProductImage[];
  videoPlaybackId?: string; // NEW: Mux Video ID
  isNew?: boolean;
  isTrending?: boolean; // New field for merchandising
  averageRating: number;
  reviewCount: number;
  tags?: string[];
  
  // SEO Fields
  metaTitle?: string;
  metaTitleKa?: string;
  metaDescription?: string;
  metaDescriptionKa?: string;
  metaKeywords?: string;
  metaKeywordsKa?: string;
}

// Shared by every entity that owns a landing page, so one editor component and
// one resolver cover products, categories, sub-categories and brands.
export interface EntitySeo {
  metaTitle?: string;
  metaTitleKa?: string;
  metaDescription?: string;
  metaDescriptionKa?: string;
  metaKeywords?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string;
  isPrimary: boolean;
}

export interface Brand extends EntitySeo {
  id: string;
  name: string;
  slug: string;
  image?: string; // Lifestyle image for the brand
  description?: string; // Short tagline
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

// Products reference a sub-category by `slug`, so renaming `label` never
// detaches them. `labelKa` lives on the row rather than in i18n/resources.ts
// because a category the admin creates after launch has no translation key.
export interface SubCategory extends EntitySeo {
  slug: string;
  label: string;
  labelKa?: string;
}

// For Admin Management
export interface CategoryHierarchyItem extends EntitySeo {
  slug: string;
  label: string;
  labelKa?: string;
  image?: string; // Added for Homepage visualization
  subs: SubCategory[];
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant; // NEW: Track selected variation
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  skinType?: 'normal' | 'oily' | 'dry' | 'combination' | 'sensitive';
  role?: 'customer' | 'admin';
  createdAt?: string;
}

export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  email: string; // Guest checkout support
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface SavedAddress extends Address {
  id: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName?: string; // Added for admin view
  items: CartItem[];
  shippingAddress: Address;
  paymentStatus: 'pending' | 'paid' | 'failed';
  status?: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'; // Added for admin view
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  supportEmail: string;
  currency: string;
  taxRate: number; // fraction, e.g. 0.08
  freeShippingThreshold: number;
  shippingRate: number; // charged when the order is under the free threshold
  // Canonical origin, e.g. https://lesiko.ge. Absolute URLs cannot be inferred
  // from the browser because previews and staging serve the same bundle.
  siteUrl: string;
  ogImage: string; // fallback social share image
}

// Copy for a route that has no database row behind it.
export interface PageSeo {
  title: string;
  titleKa?: string;
  description: string;
  descriptionKa?: string;
  keywords?: string;
  keywordsKa?: string;
  ogImage?: string;
  noindex?: boolean;
}

export interface SeoPages {
  // `%s` is the page title, `%site%` the store name.
  titleTemplate: string;
  robotsExtra: string;
  verification: {
    google?: string;
    bing?: string;
    facebookDomain?: string;
  };
  defaults: PageSeo;
  pages: Record<string, PageSeo>;
}

export interface PromoContent {
  title: string;
  titleKa?: string;
  description: string;
  descriptionKa?: string;
  buttonText: string;
  buttonTextKa?: string;
  image: string;
  link: string;
}

export interface SkinTypeItem {
  key: string;
  name: string;
  nameKa?: string;
  description: string;
  descriptionKa?: string;
  image: string;
}

export type SkinTypeContent = SkinTypeItem[];

// ------------------------------------------------------------------ CMS
// Marketing copy that used to be hardcoded or i18n-only. Each block lives
// under its own `site_content` key so the admin can edit it without a deploy.
// The `*Ka` fields fall back to the English text when left blank.

export interface HeroContent {
  eyebrow: string;
  eyebrowKa?: string;
  title: string;
  titleKa?: string;
  subtitle: string;
  subtitleKa?: string;
  primaryLabel: string;
  primaryLabelKa?: string;
  primaryLink: string;
  secondaryLabel: string;
  secondaryLabelKa?: string;
  secondaryLink: string;
  image: string;
}

export interface FaqItem {
  id: string;
  question: string;
  questionKa?: string;
  answer: string;
  answerKa?: string;
}

export interface HelpContent {
  faqs: FaqItem[];
  email: string;
  phone: string;
  hours: string;
  hoursKa?: string;
}

export interface FooterContent {
  about: string;
  aboutKa?: string;
  newsletterTitle: string;
  newsletterTitleKa?: string;
  newsletterText: string;
  newsletterTextKa?: string;
  instagramUrl: string;
  facebookUrl: string;
  twitterUrl: string;
}

export interface SocialContent {
  handle: string;
  profileUrl: string;
  title: string;
  titleKa?: string;
  subtitle: string;
  subtitleKa?: string;
  images: string[];
}

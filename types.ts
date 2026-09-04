
export interface ProductVariant {
  id: string;
  name: string; // e.g. "Red", "XL", "100ml"
  price?: number; // Optional override
  inventoryQuantity: number;
  sku?: string;
  /** Optional storefront photo; when set, detail page shows it for this variant. */
  imageUrl?: string;
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
  /** INCI list or free text, per language. The tab hides when both are empty. */
  ingredients?: string;
  ingredientsKa?: string;
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
  /**
   * Backdrop the photo was shot on, as #rrggbb, detected at upload. The card
   * paints its frame this colour so a grey studio shot does not sit inside a
   * lighter grey box with a visible seam. Absent on images uploaded before
   * normalisation existed; callers fall back to a neutral.
   */
  bgColor?: string;
  /**
   * `contain` for a normalised packshot (already re-framed at ingest, so it
   * fills its square). `cover` for a lifestyle photo, which should crop to fill
   * rather than letterbox. Defaults to `contain`.
   */
  fit?: 'contain' | 'cover';
  /**
   * When set, this photo belongs to that variant and is hidden from every other
   * option's gallery. Omitted images are product-level and show for every option.
   */
  variantId?: string;
}

export interface Brand extends EntitySeo {
  id: string;
  name: string;
  slug: string;
  image?: string; // Lifestyle image for the brand
  description?: string; // Short tagline
  /** Live product count; undefined when the list was loaded without it. */
  productCount?: number;
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
  phone?: string;
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
  /** order_id sent to Flitt (mirrors orderNumber). */
  flittOrderId?: string;
  /** Flitt payment_id from the verified server callback. */
  flittPaymentId?: string;
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
  /** Language a first-time visitor sees; a visitor's own toggle wins after that. */
  defaultLanguage?: 'en' | 'ka';
  /** Google Analytics 4 measurement ID (G-…); analytics stay off while empty. */
  gaMeasurementId?: string;
}

export type LegalPageKey = 'terms' | 'privacy' | 'delivery' | 'returns';

export interface LegalPage {
  key: LegalPageKey;
  title: string;
  titleKa?: string;
  /** See lib/rich-text.tsx for the three-rule format. */
  body: string;
  bodyKa?: string;
  /** ISO date, stamped by the admin editor when the page is saved. */
  updatedAt?: string;
}

export interface LegalContent {
  pages: LegalPage[];
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

export interface FooterLink {
  id: string;
  label: string;
  labelKa?: string;
  /** A storefront path (`/help`) or a full URL; full URLs open in a new tab. */
  href: string;
}

export interface FooterColumn {
  id: string;
  title: string;
  titleKa?: string;
  links: FooterLink[];
  /**
   * When set, this many top categories are inserted after the explicit links,
   * so the column follows the catalogue without anyone editing it.
   */
  autoCategories?: number;
}

export type SocialPlatform =
  | 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'youtube' | 'telegram' | 'whatsapp';

export interface FooterSocial {
  id: string;
  platform: SocialPlatform;
  url: string;
}

/**
 * Everything in the footer is editable: the blurb, every link column, the
 * social icons, the contact block and the legal line. `{year}`, `{store}` and
 * `{email}` are substituted at render time so the copy never goes stale.
 */
export interface FooterContent {
  about: string;
  aboutKa?: string;
  columns: FooterColumn[];
  newsletterTitle: string;
  newsletterTitleKa?: string;
  newsletterText: string;
  newsletterTextKa?: string;
  /** Label for the contact button. Defaults to the support email itself. */
  contactLabel?: string;
  contactLabelKa?: string;
  socials: FooterSocial[];
  legalLine?: string;
  legalLineKa?: string;
  bottomLinks: FooterLink[];
  /** @deprecated read-only compatibility with rows saved before `socials`. */
  instagramUrl?: string;
  /** @deprecated */
  facebookUrl?: string;
  /** @deprecated */
  twitterUrl?: string;
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

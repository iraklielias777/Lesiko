
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
  subCategory?: string; // Sub Category (e.g., "Shampoo")
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
  metaDescription?: string;
  metaKeywords?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string;
  isPrimary: boolean;
}

export interface Brand {
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

// For Admin Management
export interface CategoryHierarchyItem {
  slug: string;
  label: string;
  image?: string; // Added for Homepage visualization
  subs: string[];
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

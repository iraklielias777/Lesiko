
import { create } from 'zustand';
import { Product, Order, User, CategoryHierarchyItem, Brand, PromoContent } from '../types';
import { ProductService } from '../services/product-service';
import { CategoryService } from '../services/category-service';
import { BrandService } from '../services/brand-service';
import { ContentService } from '../services/content-service';
import { OrderService } from '../services/order-service';

interface StoreSettings {
  storeName: string;
  supportEmail: string;
  currency: string;
  taxRate: number;
  freeShippingThreshold: number;
}

interface AdminState {
  products: Product[];
  categories: CategoryHierarchyItem[];
  brands: Brand[];
  orders: Order[];
  customers: User[];
  settings: StoreSettings;
  promoContent: PromoContent | null;
  isLoading: boolean;
  
  // Actions
  fetchData: () => Promise<void>;
  
  // Product Actions
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  // Category Actions
  fetchCategories: () => Promise<void>;
  updateCategories: (categories: CategoryHierarchyItem[]) => Promise<void>;

  // Brand Actions
  addBrand: (brand: Brand) => Promise<void>;
  deleteBrand: (id: string) => Promise<void>;

  // Order Actions
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  
  // Settings Actions
  updateSettings: (settings: StoreSettings) => void;
  
  // Promo Actions
  updatePromo: (content: PromoContent) => Promise<void>;
}

const MOCK_CUSTOMERS: User[] = [
  { id: 'u1', firstName: 'Jane', lastName: 'Doe', email: 'demo@lesiko.com', role: 'customer', skinType: 'combination' },
  { id: 'u2', firstName: 'Michael', lastName: 'Smith', email: 'michael.smith@test.com', role: 'customer', skinType: 'oily' },
  { id: 'u3', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@design.co', role: 'customer', skinType: 'dry' },
  { id: 'u4', firstName: 'Emily', lastName: 'Davis', email: 'emily.d@web.net', role: 'customer', skinType: 'sensitive' },
  { id: 'u5', firstName: 'David', lastName: 'Wilson', email: 'david.w@tech.io', role: 'customer', skinType: 'normal' },
];

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'LesiKo Cosmetics',
  supportEmail: 'support@lesiko.com',
  currency: 'USD',
  taxRate: 0.08,
  freeShippingThreshold: 50
};

export const useAdminStore = create<AdminState>((set, get) => ({
  products: [],
  categories: [],
  brands: [],
  orders: [],
  customers: [],
  settings: DEFAULT_SETTINGS,
  promoContent: null,
  isLoading: false,

  fetchData: async () => {
    set({ isLoading: true });
    // Parallel fetch
    const [loadedProducts, loadedCategories, loadedBrands, loadedPromo, loadedOrders] = await Promise.all([
        ProductService.getAllProducts(),
        CategoryService.getCategories(),
        BrandService.getBrands(),
        ContentService.getPromoContent(),
        OrderService.getAllOrders()
    ]);

    set({ 
        products: loadedProducts,
        categories: loadedCategories,
        brands: loadedBrands,
        orders: loadedOrders,
        customers: MOCK_CUSTOMERS,
        settings: DEFAULT_SETTINGS,
        promoContent: loadedPromo,
        isLoading: false 
    });
  },

  fetchCategories: async () => {
      const cats = await CategoryService.getCategories();
      set({ categories: cats });
  },

  updateCategories: async (cats) => {
      await CategoryService.saveCategories(cats);
      set({ categories: cats });
  },

  addBrand: async (brand) => {
      await BrandService.addBrand(brand);
      const brands = await BrandService.getBrands();
      set({ brands });
  },

  deleteBrand: async (id) => {
      await BrandService.deleteBrand(id);
      const brands = await BrandService.getBrands();
      set({ brands });
  },

  deleteProduct: async (id) => {
    await ProductService.deleteProduct(id);
    set((state) => ({
      products: state.products.filter(p => p.id !== id)
    }));
  },

  addProduct: async (product) => {
    await ProductService.addProduct(product);
    const loadedProducts = await ProductService.getAllProducts();
    set({ products: loadedProducts });
  },

  updateProduct: async (updatedProduct) => {
    await ProductService.updateProduct(updatedProduct);
    set((state) => ({
      products: state.products.map(p => p.id === updatedProduct.id ? updatedProduct : p)
    }));
  },

  updateOrderStatus: async (orderId, status) => {
    // 1. Update in Service (Persist)
    await OrderService.updateStatus(orderId, status);
    
    // 2. Update in Local State
    set((state) => ({
      orders: state.orders.map(o => o.id === orderId ? { ...o, status } : o)
    }));
  },

  updateSettings: (newSettings) => {
    set({ settings: newSettings });
  },

  updatePromo: async (content) => {
      await ContentService.updatePromoContent(content);
      set({ promoContent: content });
  }
}));

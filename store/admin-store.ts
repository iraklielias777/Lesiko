
import { create } from 'zustand';
import { Product, Order, User, CategoryHierarchyItem, Brand, PromoContent, StoreSettings } from '../types';
import { ProductService } from '../services/product-service';
import { CategoryService } from '../services/category-service';
import { BrandService } from '../services/brand-service';
import { ContentService, DEFAULT_STORE_SETTINGS } from '../services/content-service';
import { OrderService } from '../services/order-service';
import { supabase } from '../lib/supabase';
import { invalidateCategories } from '../lib/use-categories';
import { useSettingsStore } from './settings-store';

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
  updateBrand: (brand: Brand) => Promise<void>;
  deleteBrand: (id: string) => Promise<void>;

  // Order Actions
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  updatePaymentStatus: (orderId: string, paymentStatus: Order['paymentStatus']) => Promise<void>;

  // Customer Actions
  updateCustomerRole: (customerId: string, role: User['role']) => Promise<void>;
  
  // Settings Actions
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: StoreSettings) => Promise<void>;
  
  // Promo Actions
  updatePromo: (content: PromoContent) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  products: [],
  categories: [],
  brands: [],
  orders: [],
  customers: [],
  settings: DEFAULT_STORE_SETTINGS,
  promoContent: null,
  isLoading: false,

  fetchData: async () => {
    set({ isLoading: true });
    
    // Fetch profiles from Supabase for the customer list
    const fetchCustomers = async (): Promise<User[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) return [];
        return data.map(p => ({
            id: p.id,
            email: p.email || '',
            firstName: p.first_name,
            lastName: p.last_name,
            role: p.role,
            skinType: p.skin_type,
            createdAt: p.created_at
        }));
    };

    const [loadedProducts, loadedCategories, loadedBrands, loadedPromo, loadedOrders, loadedCustomers, loadedSettings] = await Promise.all([
        ProductService.getAllForAdmin(),
        CategoryService.getCategories(),
        BrandService.getBrands(),
        ContentService.getPromoContent(),
        OrderService.getAllOrders(),
        fetchCustomers(),
        ContentService.getStoreSettings()
    ]);

    set({ 
        products: loadedProducts,
        categories: loadedCategories,
        brands: loadedBrands,
        orders: loadedOrders,
        customers: loadedCustomers,
        settings: loadedSettings,
        promoContent: loadedPromo,
        isLoading: false 
    });
  },

  fetchSettings: async () => {
    set({ settings: await ContentService.getStoreSettings() });
  },

  fetchCategories: async () => {
      const cats = await CategoryService.getCategories();
      set({ categories: cats });
  },

  updateCategories: async (cats) => {
      await CategoryService.saveCategories(cats);
      // Re-read rather than trusting the payload: saveCategories assigns the
      // stored ordering, and the storefront cache has to drop its stale copy.
      invalidateCategories();
      set({ categories: await CategoryService.getCategories() });
  },

  addBrand: async (brand) => {
      await BrandService.addBrand(brand);
      const brands = await BrandService.getBrands();
      set({ brands });
  },

  updateBrand: async (brand) => {
      await BrandService.updateBrand(brand);
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
    const loadedProducts = await ProductService.getAllForAdmin();
    set({ products: loadedProducts });
  },

  updateProduct: async (updatedProduct) => {
    await ProductService.updateProduct(updatedProduct);
    set((state) => ({
      products: state.products.map(p => p.id === updatedProduct.id ? updatedProduct : p)
    }));
  },

  updateOrderStatus: async (orderId, status) => {
    await OrderService.updateStatus(orderId, status);
    set((state) => ({
      orders: state.orders.map(o => o.id === orderId ? { ...o, status } : o)
    }));
  },

  updatePaymentStatus: async (orderId, paymentStatus) => {
    await OrderService.updatePaymentStatus(orderId, paymentStatus);
    set((state) => ({
      orders: state.orders.map(o => o.id === orderId ? { ...o, paymentStatus } : o)
    }));
  },

  updateCustomerRole: async (customerId, role) => {
    if (!supabase) throw new Error('Supabase client not initialized');
    // The protect_profile_role trigger allows this only when the caller is
    // already an admin, so a customer cannot promote themselves via the API.
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', customerId);
    if (error) throw error;
    set((state) => ({
      customers: state.customers.map(c => c.id === customerId ? { ...c, role } : c)
    }));
  },

  updateSettings: async (newSettings) => {
    await ContentService.updateStoreSettings(newSettings);
    set({ settings: newSettings });
    // The storefront (and the price columns in this panel) read currency,
    // tax and shipping from the settings store, which caches on first load.
    useSettingsStore.setState({ settings: newSettings, isLoaded: true });
  },

  updatePromo: async (content) => {
      await ContentService.updatePromoContent(content);
      set({ promoContent: content });
  }
}));

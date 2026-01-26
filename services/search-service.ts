
import { Product } from '../types';
import { ProductService } from './product-service';

export interface SearchFilters {
  query?: string;
  categories?: string[]; // Main Category slugs (e.g., 'face-care')
  subCategories?: string[]; // Sub Category names (e.g., 'Face cream')
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  skinTypes?: string[];
  rating?: number;
  inStock?: boolean;
  onSale?: boolean; // New filter
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating';
}

export interface Facet {
  label: string;
  value: string;
  count: number;
}

export interface SearchResults {
  products: Product[];
  total: number;
  facets: {
    categories: Facet[];
    subCategories: Record<string, Facet[]>; // Keyed by Main Category slug
    brands: Facet[];
    skinTypes: Facet[];
    priceRange: { min: number; max: number };
  };
}

// New Interface for Quick Search
export interface QuickSearchResults {
  products: Product[];
  categories: { name: string; slug: string; type: 'category' | 'subcategory' }[];
  brands: { name: string; slug: string }[];
}

export const SearchService = {
  async search(filters: SearchFilters): Promise<SearchResults> {
    // Fixed: ProductService.getAllProducts expects 0 arguments
    const allProducts = await ProductService.getAllProducts();

    // Filter Logic
    let filtered = allProducts.filter(product => {
      // Text Search
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesDesc = product.description.toLowerCase().includes(q);
        const matchesBrand = product.brand.name.toLowerCase().includes(q);
        const matchesCat = product.category.name.toLowerCase().includes(q);
        const matchesSub = product.subCategory?.toLowerCase().includes(q);
        
        if (!matchesName && !matchesDesc && !matchesBrand && !matchesCat && !matchesSub) return false;
      }

      // Categories (Main)
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(product.category.slug)) return false;
      }

      // SubCategories (Exact Match)
      if (filters.subCategories && filters.subCategories.length > 0) {
        if (!product.subCategory || !filters.subCategories.includes(product.subCategory)) return false;
      }

      // Brands
      if (filters.brands && filters.brands.length > 0) {
        if (!filters.brands.includes(product.brand.slug)) return false;
      }

      // Price
      if (filters.minPrice !== undefined && product.price < filters.minPrice) return false;
      if (filters.maxPrice !== undefined && product.price > filters.maxPrice) return false;

      // Rating
      if (filters.rating && product.averageRating < filters.rating) return false;

      // Stock
      if (filters.inStock && product.inventoryQuantity === 0) return false;

      // On Sale
      if (filters.onSale) {
          const isOnSale = product.compareAtPrice && product.compareAtPrice > product.price;
          if (!isOnSale) return false;
      }

      // Skin Types
      if (filters.skinTypes && filters.skinTypes.length > 0) {
        if (!product.tags) return false;
        const hasMatch = filters.skinTypes.some(type => 
          product.tags?.map(t => t.toLowerCase()).includes(type.toLowerCase())
        );
        if (!hasMatch) return false;
      }

      return true;
    });

    // Sorting
    filtered = [...filtered].sort((a, b) => {
      switch (filters.sort) {
        case 'price_asc': return a.price - b.price;
        case 'price_desc': return b.price - a.price;
        case 'newest': return (a.isNew === b.isNew) ? 0 : a.isNew ? -1 : 1;
        case 'rating': return b.averageRating - a.averageRating;
        default: return 0;
      }
    });

    // Facet Generation (Existing logic kept same)
    const getCounts = (items: any[], keyExtractor: (item: any) => string | undefined) => {
      const counts: Record<string, number> = {};
      items.forEach(item => {
        const key = keyExtractor(item);
        if (key) counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    };

    let baseForFacets = allProducts;
    if (filters.query) {
       const q = filters.query.toLowerCase();
       baseForFacets = allProducts.filter(p => 
         p.name.toLowerCase().includes(q) || 
         p.description.toLowerCase().includes(q) || 
         p.brand.name.toLowerCase().includes(q)
       );
    }

    const categoryCounts = getCounts(baseForFacets, p => p.category.slug);
    const categories: Facet[] = Object.keys(categoryCounts).map(slug => {
        const p = baseForFacets.find(p => p.category.slug === slug);
        return { label: p?.category.name || slug, value: slug, count: categoryCounts[slug] };
    });

    const subCategories: Record<string, Facet[]> = {};
    categories.forEach(cat => {
        const productsInCat = baseForFacets.filter(p => p.category.slug === cat.value);
        const subCounts = getCounts(productsInCat, p => p.subCategory);
        subCategories[cat.value] = Object.keys(subCounts).map(subName => ({
            label: subName,
            value: subName,
            count: subCounts[subName]
        }));
    });

    const brandCounts = getCounts(baseForFacets, p => p.brand.slug);
    const brands: Facet[] = Object.keys(brandCounts).map(slug => {
        const p = baseForFacets.find(p => p.brand.slug === slug);
        return { label: p?.brand.name || slug, value: slug, count: brandCounts[slug] };
    });

    const skinTypeCounts: Record<string, number> = {};
    baseForFacets.forEach(p => {
        p.tags?.forEach(tag => {
            const normalized = tag.toLowerCase();
            if (['normal', 'dry', 'oily', 'combination', 'sensitive'].includes(normalized)) {
                skinTypeCounts[normalized] = (skinTypeCounts[normalized] || 0) + 1;
            }
        });
    });
    const skinTypes: Facet[] = Object.keys(skinTypeCounts).map(type => ({
        label: type.charAt(0).toUpperCase() + type.slice(1),
        value: type,
        count: skinTypeCounts[type]
    }));

    const prices = baseForFacets.map(p => p.price);
    const minPrice = prices.length ? Math.floor(Math.min(...prices)) : 0;
    const maxPrice = prices.length ? Math.ceil(Math.max(...prices)) : 1000;

    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          products: filtered,
          total: filtered.length,
          facets: {
            categories,
            subCategories,
            brands,
            skinTypes,
            priceRange: { min: minPrice, max: maxPrice }
          }
        });
      }, 300);
    });
  },

  // Optimized for Autocomplete Overlay
  async quickSearch(query: string): Promise<QuickSearchResults> {
    if (!query) return { products: [], categories: [], brands: [] };

    // Fixed: ProductService.getAllProducts expects 0 arguments
    const allProducts = await ProductService.getAllProducts();
    const q = query.toLowerCase();

    // 1. Find Matching Products (limit 5)
    const products = allProducts.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.brand.name.toLowerCase().includes(q)
    ).slice(0, 5);

    // 2. Find Matching Categories/Subcategories (Unique)
    const categoryMap = new Map<string, { name: string; slug: string; type: 'category' | 'subcategory' }>();
    
    allProducts.forEach(p => {
        if (p.category.name.toLowerCase().includes(q)) {
            categoryMap.set(p.category.slug, { name: p.category.name, slug: p.category.slug, type: 'category' });
        }
        if (p.subCategory && p.subCategory.toLowerCase().includes(q)) {
            categoryMap.set(p.subCategory, { name: p.subCategory, slug: p.category.slug, type: 'subcategory' }); // Link sub to parent slug for now
        }
    });
    const categories = Array.from(categoryMap.values()).slice(0, 3);

    // 3. Find Matching Brands
    const brandMap = new Map<string, { name: string; slug: string }>();
    allProducts.forEach(p => {
        if (p.brand.name.toLowerCase().includes(q)) {
            brandMap.set(p.brand.slug, { name: p.brand.name, slug: p.brand.slug });
        }
    });
    const brands = Array.from(brandMap.values()).slice(0, 2);

    return { products, categories, brands };
  }
};

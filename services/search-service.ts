
import { Product } from '../types';
import { ProductService } from './product-service';

export interface SearchFilters {
  query?: string;
  categories?: string[];
  subCategories?: string[];
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  skinTypes?: string[];
  rating?: number;
  inStock?: boolean;
  onSale?: boolean;
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
    subCategories: Record<string, Facet[]>;
    brands: Facet[];
    skinTypes: Facet[];
    priceRange: { min: number; max: number };
  };
}

export interface QuickSearchResults {
  products: Product[];
  categories: { name: string; slug: string; type: 'category' | 'subcategory' }[];
  brands: { name: string; slug: string }[];
}

export const SearchService = {
  async search(filters: SearchFilters): Promise<SearchResults> {
    const allProducts = await ProductService.getAllProducts();
    
    if (!allProducts || allProducts.length === 0) {
      return {
        products: [],
        total: 0,
        facets: { categories: [], subCategories: {}, brands: [], skinTypes: [], priceRange: { min: 0, max: 1000 } }
      };
    }

    let filtered = allProducts.filter(product => {
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesDesc = product.description.toLowerCase().includes(q);
        const matchesBrand = product.brand.name.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesBrand) return false;
      }

      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(product.category.slug)) return false;
      }

      if (filters.brands && filters.brands.length > 0) {
        if (!filters.brands.includes(product.brand.slug)) return false;
      }

      if (filters.minPrice !== undefined && product.price < filters.minPrice) return false;
      if (filters.maxPrice !== undefined && product.price > filters.maxPrice) return false;

      if (filters.inStock && product.inventoryQuantity === 0) return false;

      if (filters.onSale) {
          const isOnSale = product.compareAtPrice && product.compareAtPrice > product.price;
          if (!isOnSale) return false;
      }

      if (filters.skinTypes && filters.skinTypes.length > 0) {
        const hasMatch = filters.skinTypes.some(type => 
          product.tags?.map(t => t.toLowerCase()).includes(type.toLowerCase())
        );
        if (!hasMatch) return false;
      }

      return true;
    });

    filtered = [...filtered].sort((a, b) => {
      switch (filters.sort) {
        case 'price_asc': return a.price - b.price;
        case 'price_desc': return b.price - a.price;
        case 'newest': return b.isNew ? 1 : -1;
        case 'rating': return b.averageRating - a.averageRating;
        default: return 0;
      }
    });

    // Helper for facets
    const getCounts = (items: any[], keyExtractor: (item: any) => string | undefined) => {
      const counts: Record<string, number> = {};
      items.forEach(item => {
        const key = keyExtractor(item);
        if (key) counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    };

    const categoryCounts = getCounts(allProducts, p => p.category.slug);
    const categories: Facet[] = Object.keys(categoryCounts).map(slug => {
        const p = allProducts.find(p => p.category.slug === slug);
        return { label: p?.category.name || slug, value: slug, count: categoryCounts[slug] };
    });

    const subCategories: Record<string, Facet[]> = {};
    categories.forEach(cat => {
        const productsInCat = allProducts.filter(p => p.category.slug === cat.value);
        const subCounts = getCounts(productsInCat, p => p.subCategory);
        subCategories[cat.value] = Object.keys(subCounts).map(subName => ({
            label: subName,
            value: subName,
            count: subCounts[subName]
        }));
    });

    const brandCounts = getCounts(allProducts, p => p.brand.slug);
    const brands: Facet[] = Object.keys(brandCounts).map(slug => {
        const p = allProducts.find(p => p.brand.slug === slug);
        return { label: p?.brand.name || slug, value: slug, count: brandCounts[slug] };
    });

    const prices = allProducts.map(p => p.price);
    const minPrice = prices.length ? Math.floor(Math.min(...prices)) : 0;
    const maxPrice = prices.length ? Math.ceil(Math.max(...prices)) : 1000;

    return {
      products: filtered,
      total: filtered.length,
      facets: {
        categories,
        subCategories,
        brands,
        skinTypes: [],
        priceRange: { min: minPrice, max: maxPrice }
      }
    };
  },

  async quickSearch(query: string): Promise<QuickSearchResults> {
    if (!query) return { products: [], categories: [], brands: [] };
    const allProducts = await ProductService.getAllProducts();
    const q = query.toLowerCase();

    const products = allProducts.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.brand.name.toLowerCase().includes(q)
    ).slice(0, 5);

    return { products, categories: [], brands: [] };
  }
};

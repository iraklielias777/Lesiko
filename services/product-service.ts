
import { Product, Brand, Category } from '../types';
import { supabase } from '../lib/supabase';

const mapProduct = (p: any): Product => {
  // Supabase returns joined data as nested objects
  // If no join data is found, we provide a safe fallback object to prevent UI crashes
  const brandData = p.brands;
  const categoryData = p.categories;

  return {
    id: p.id,
    name: p.name,
    nameKa: p.name_ka,
    slug: p.slug,
    description: p.description,
    descriptionKa: p.description_ka,
    price: Number(p.price),
    compareAtPrice: p.compare_at_price ? Number(p.compare_at_price) : undefined,
    inventoryQuantity: p.inventory_quantity || 0,
    brand: brandData ? {
        id: brandData.id,
        name: brandData.name,
        slug: brandData.slug,
        image: brandData.image,
        description: brandData.description
    } : { id: 'unknown', name: 'LesiKo', slug: 'lesiko' },
    category: categoryData ? {
        id: categoryData.slug,
        name: categoryData.label, 
        slug: categoryData.slug
    } : { id: 'unknown', name: 'General', slug: 'general' },
    subCategory: p.sub_category,
    images: Array.isArray(p.images) ? p.images : [],
    videoPlaybackId: p.video_playback_id,
    isNew: p.is_new,
    isTrending: p.is_trending,
    averageRating: Number(p.average_rating || 0),
    reviewCount: p.review_count || 0,
    tags: Array.isArray(p.tags) ? p.tags : [],
    variants: Array.isArray(p.variants) ? p.variants : [],
    metaTitle: p.meta_title,
    metaTitleKa: p.meta_title_ka,
    metaDescription: p.meta_description,
    metaDescriptionKa: p.meta_description_ka,
    metaKeywords: p.meta_keywords,
    metaKeywordsKa: p.meta_keywords_ka
  };
};

const emptyToNull = (value?: string) => (value && value.trim() ? value.trim() : null);

// mapProduct substitutes an 'unknown' id when a product has no brand or
// category row; writing that back would violate the foreign key.
const refId = (id?: string) => (id && id !== 'unknown' ? id : null);

// Insert and update write the same column set, so the admin form can never
// silently drop a field depending on which path it took.
const toRow = (product: Product) => ({
  name: product.name,
  name_ka: emptyToNull(product.nameKa),
  slug: product.slug,
  description: product.description,
  description_ka: emptyToNull(product.descriptionKa),
  price: product.price,
  compare_at_price: product.compareAtPrice ?? null,
  inventory_quantity: product.inventoryQuantity,
  brand_id: refId(product.brand?.id),
  category_id: refId(product.category?.id),
  sub_category: emptyToNull(product.subCategory),
  images: product.images ?? [],
  variants: product.variants ?? [],
  video_playback_id: emptyToNull(product.videoPlaybackId),
  is_new: !!product.isNew,
  is_trending: !!product.isTrending,
  average_rating: product.averageRating || 0,
  review_count: product.reviewCount || 0,
  tags: product.tags ?? [],
  meta_title: emptyToNull(product.metaTitle),
  meta_title_ka: emptyToNull(product.metaTitleKa),
  meta_description: emptyToNull(product.metaDescription),
  meta_description_ka: emptyToNull(product.metaDescriptionKa),
  meta_keywords: emptyToNull(product.metaKeywords),
  meta_keywords_ka: emptyToNull(product.metaKeywordsKa),
});

export const ProductService = {
  getAllProducts: async (): Promise<Product[]> => {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, brands(*), categories(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        return [];
      }
      return (data || []).map(mapProduct);
    } catch (e) {
      console.error('Unexpected error in getAllProducts:', e);
      return [];
    }
  },

  getProductBySlug: async (slug: string): Promise<Product | undefined> => {
    if (!supabase) return undefined;
    const { data, error } = await supabase
      .from('products')
      .select('*, brands(*), categories(*)')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapProduct(data);
  },

  getProductsByCategory: async (categorySlug: string): Promise<Product[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('products')
      .select('*, brands(*), categories!inner(*)')
      .eq('categories.slug', categorySlug);

    if (error) return [];
    return (data || []).map(mapProduct);
  },

  getRelatedProducts: async (productId: string, limit = 4): Promise<Product[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('products')
      .select('*, brands(*), categories(*)')
      .neq('id', productId)
      .limit(limit);

    if (error) return [];
    return (data || []).map(mapProduct);
  },

  addProduct: async (product: Product): Promise<void> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase.from('products').insert(toRow(product));
    if (error) throw error;
  },

  updateProduct: async (product: Product): Promise<void> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase
      .from('products')
      .update(toRow(product))
      .eq('id', product.id);
    if (error) throw error;
  },

  deleteProduct: async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  }
};

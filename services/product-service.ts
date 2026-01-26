
import { Product, Brand, Category } from '../types';
import { supabase } from '../lib/supabase';

const mapProduct = (p: any): Product => {
  // Supabase returns joined data as nested objects or arrays depending on the query
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
    } : { id: 'unknown', name: 'LesiKo Brand', slug: 'lesiko' },
    category: categoryData ? {
        id: categoryData.slug,
        name: categoryData.label || categoryData.name, 
        slug: categoryData.slug
    } : { id: 'unknown', name: 'Cosmetics', slug: 'cosmetics' },
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
    metaDescription: p.meta_description,
    metaKeywords: p.meta_keywords
  };
};

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
    const { error } = await supabase.from('products').insert({
      name: product.name,
      name_ka: product.nameKa,
      slug: product.slug,
      description: product.description,
      description_ka: product.descriptionKa,
      price: product.price,
      compare_at_price: product.compareAtPrice,
      inventory_quantity: product.inventoryQuantity,
      brand_id: product.brand.id,
      category_id: product.category.id, 
      sub_category: product.subCategory,
      images: product.images,
      is_new: product.isNew,
      is_trending: product.isTrending,
      tags: product.tags,
      average_rating: product.averageRating || 0,
      review_count: product.reviewCount || 0
    });
    if (error) throw error;
  },

  updateProduct: async (product: Product): Promise<void> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase
      .from('products')
      .update({
        name: product.name,
        name_ka: product.nameKa,
        price: product.price,
        compare_at_price: product.compareAtPrice,
        inventory_quantity: product.inventoryQuantity,
        description: product.description,
        description_ka: product.descriptionKa,
        category_id: product.category.id,
        brand_id: product.brand.id,
        images: product.images,
        is_trending: product.isTrending
      })
      .eq('id', product.id);
    if (error) throw error;
  },

  deleteProduct: async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  }
};

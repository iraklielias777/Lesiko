
import { Product, Brand, Category } from '../types';
import { supabase } from '../lib/supabase';

// Mapper to convert snake_case DB fields to camelCase TS types
const mapProduct = (p: any): Product => ({
  id: p.id,
  name: p.name,
  nameKa: p.name_ka,
  slug: p.slug,
  description: p.description,
  descriptionKa: p.description_ka,
  price: Number(p.price),
  compareAtPrice: p.compare_at_price ? Number(p.compare_at_price) : undefined,
  inventoryQuantity: p.inventory_quantity,
  brand: p.brands, // Joined
  category: p.categories, // Joined
  subCategory: p.sub_category,
  images: p.images,
  videoPlaybackId: p.video_playback_id,
  isNew: p.is_new,
  isTrending: p.is_trending,
  averageRating: Number(p.average_rating),
  reviewCount: p.review_count,
  tags: p.tags,
  variants: p.variants,
  metaTitle: p.meta_title,
  metaDescription: p.meta_description,
  metaKeywords: p.meta_keywords
});

export const ProductService = {
  getAllProducts: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*, brands(*), categories(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error, check if tables are created:', error);
      return [];
    }
    return data.map(mapProduct);
  },

  getProductBySlug: async (slug: string): Promise<Product | undefined> => {
    const { data, error } = await supabase
      .from('products')
      .select('*, brands(*), categories(*)')
      .eq('slug', slug)
      .single();

    if (error) return undefined;
    return mapProduct(data);
  },

  getProductsByCategory: async (categorySlug: string): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*, brands(*), categories(*)')
      .filter('categories.slug', 'eq', categorySlug);

    if (error) return [];
    return data.map(mapProduct);
  },

  getRelatedProducts: async (productId: string, limit = 4): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*, brands(*), categories(*)')
      .neq('id', productId)
      .limit(limit);

    if (error) return [];
    return data.map(mapProduct);
  },

  // Admin Write Ops
  addProduct: async (product: Product): Promise<void> => {
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
      video_playback_id: product.videoPlaybackId,
      is_new: product.isNew,
      is_trending: product.isTrending,
      tags: product.tags,
      variants: product.variants,
      meta_title: product.metaTitle,
      meta_description: product.metaDescription,
      meta_keywords: product.metaKeywords
    });
    if (error) throw error;
  },

  updateProduct: async (product: Product): Promise<void> => {
    const { error } = await supabase
      .from('products')
      .update({
        name: product.name,
        name_ka: product.nameKa,
        price: product.price,
        compare_at_price: product.compareAtPrice,
        inventory_quantity: product.inventoryQuantity,
        brand_id: product.brand.id,
        category_id: product.category.id,
        sub_category: product.subCategory,
        images: product.images,
        video_playback_id: product.videoPlaybackId,
        is_new: product.isNew,
        is_trending: product.isTrending,
        tags: product.tags,
        variants: product.variants,
        meta_title: product.metaTitle,
        meta_description: product.metaDescription,
        meta_keywords: product.metaKeywords
      })
      .eq('id', product.id);
    if (error) throw error;
  },

  deleteProduct: async (id: string): Promise<void> => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  }
};

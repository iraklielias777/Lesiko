
import { Brand } from '../types';
import { supabase } from '../lib/supabase';

// The row and the type diverged once brands gained meta columns, so reads and
// writes both go through an explicit mapping instead of passing the row along.
const mapBrand = (row: any): Brand => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  image: row.image || undefined,
  description: row.description || undefined,
  metaTitle: row.meta_title || undefined,
  metaTitleKa: row.meta_title_ka || undefined,
  metaDescription: row.meta_description || undefined,
  metaDescriptionKa: row.meta_description_ka || undefined,
  metaKeywords: row.meta_keywords || undefined,
});

const nullIfBlank = (value?: string) => (value && value.trim() ? value.trim() : null);

const seoColumns = (brand: Brand) => ({
  meta_title: nullIfBlank(brand.metaTitle),
  meta_title_ka: nullIfBlank(brand.metaTitleKa),
  meta_description: nullIfBlank(brand.metaDescription),
  meta_description_ka: nullIfBlank(brand.metaDescriptionKa),
  meta_keywords: nullIfBlank(brand.metaKeywords),
});

export const BrandService = {
  getBrands: async (): Promise<Brand[]> => {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching brands:', error);
      return [];
    }
    return (data || []).map(mapBrand);
  },

  getBrandBySlug: async (slug: string): Promise<Brand | undefined> => {
    if (!supabase) return undefined;
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapBrand(data);
  },

  addBrand: async (brand: Brand): Promise<void> => {
    const { error } = await supabase.from('brands').insert({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      image: brand.image,
      description: brand.description,
      ...seoColumns(brand),
    });
    if (error) throw error;
  },

  updateBrand: async (brand: Brand): Promise<void> => {
    // `slug` is deliberately not updated: products reference the brand by id,
    // but storefront links are built from the slug, so changing it would break
    // any URL already in the wild.
    const { error } = await supabase
      .from('brands')
      .update({
        name: brand.name,
        image: brand.image,
        description: brand.description,
        ...seoColumns(brand),
      })
      .eq('id', brand.id);
    if (error) throw error;
  },

  deleteBrand: async (id: string): Promise<void> => {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) throw error;
  }
};

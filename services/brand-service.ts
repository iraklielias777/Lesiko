
import { Brand } from '../types';
import { supabase } from '../lib/supabase';

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
    return data || [];
  },

  addBrand: async (brand: Brand): Promise<void> => {
    const { error } = await supabase.from('brands').insert({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      image: brand.image,
      description: brand.description
    });
    if (error) throw error;
  },

  deleteBrand: async (id: string): Promise<void> => {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) throw error;
  }
};

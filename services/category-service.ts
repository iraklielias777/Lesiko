
import { CategoryHierarchyItem } from '../types';
import { supabase } from '../lib/supabase';

export const CategoryService = {
  getCategories: async (): Promise<CategoryHierarchyItem[]> => {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('label');

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return (data || []).map(cat => ({
      slug: cat.slug,
      label: cat.label,
      image: cat.image,
      subs: Array.isArray(cat.subs) ? cat.subs : []
    }));
  },

  saveCategories: async (categories: CategoryHierarchyItem[]): Promise<void> => {
    if (!supabase) return;
    
    const items = categories.map(cat => ({
      slug: cat.slug,
      label: cat.label,
      image: cat.image,
      subs: cat.subs
    }));

    const { error } = await supabase
      .from('categories')
      .upsert(items, { onConflict: 'slug' });

    if (error) throw error;
  },

  addCategory: async (category: CategoryHierarchyItem): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('categories').insert({
      slug: category.slug,
      label: category.label,
      image: category.image,
      subs: category.subs
    });
    if (error) throw error;
  },

  deleteCategory: async (slug: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('categories').delete().eq('slug', slug);
    if (error) throw error;
  }
};

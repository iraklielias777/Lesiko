
import { CategoryHierarchyItem, SubCategory } from '../types';
import { supabase } from '../lib/supabase';
import { slugifyLabel } from '../lib/taxonomy';

// Rows written before 0010 stored subs as bare label strings. Normalising on
// read keeps the app working against either shape.
const mapSubs = (raw: unknown): SubCategory[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map(entry => {
    if (typeof entry === 'string') {
      return { slug: slugifyLabel(entry), label: entry };
    }
    const sub = entry as Partial<SubCategory>;
    const label = sub.label ?? '';
    return {
      slug: sub.slug || slugifyLabel(label),
      label,
      labelKa: sub.labelKa || undefined,
      metaTitle: sub.metaTitle || undefined,
      metaTitleKa: sub.metaTitleKa || undefined,
      metaDescription: sub.metaDescription || undefined,
      metaDescriptionKa: sub.metaDescriptionKa || undefined,
      metaKeywords: sub.metaKeywords || undefined,
    };
  });
};

// jsonb keeps whatever we hand it, so strip the empty strings the admin form
// produces rather than storing "" that later reads as "set but blank".
const packSubs = (subs: SubCategory[]) =>
  subs.map(sub => {
    const packed: Record<string, string> = { slug: sub.slug, label: sub.label };
    const optional: [keyof SubCategory, string | undefined][] = [
      ['labelKa', sub.labelKa],
      ['metaTitle', sub.metaTitle],
      ['metaTitleKa', sub.metaTitleKa],
      ['metaDescription', sub.metaDescription],
      ['metaDescriptionKa', sub.metaDescriptionKa],
      ['metaKeywords', sub.metaKeywords],
    ];
    for (const [key, value] of optional) {
      if (value && value.trim()) packed[key as string] = value.trim();
    }
    return packed;
  });

const nullIfBlank = (value?: string) => (value && value.trim() ? value.trim() : null);

export const CategoryService = {
  getCategories: async (): Promise<CategoryHierarchyItem[]> => {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('position')
      .order('label');

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return (data || []).map(cat => ({
      slug: cat.slug,
      label: cat.label,
      labelKa: cat.label_ka || undefined,
      image: cat.image,
      subs: mapSubs(cat.subs),
      metaTitle: cat.meta_title || undefined,
      metaTitleKa: cat.meta_title_ka || undefined,
      metaDescription: cat.meta_description || undefined,
      metaDescriptionKa: cat.meta_description_ka || undefined,
      metaKeywords: cat.meta_keywords || undefined,
    }));
  },

  /**
   * Replaces the category set with `categories`. The admin UI edits the whole
   * list at once, so anything missing from the payload was deleted there and
   * has to be deleted here too — an upsert alone would resurrect it on reload.
   */
  saveCategories: async (categories: CategoryHierarchyItem[]): Promise<void> => {
    if (!supabase) return;

    const items = categories.map((cat, index) => ({
      slug: cat.slug,
      label: cat.label,
      label_ka: cat.labelKa || null,
      image: cat.image,
      subs: packSubs(cat.subs),
      position: index,
      meta_title: nullIfBlank(cat.metaTitle),
      meta_title_ka: nullIfBlank(cat.metaTitleKa),
      meta_description: nullIfBlank(cat.metaDescription),
      meta_description_ka: nullIfBlank(cat.metaDescriptionKa),
      meta_keywords: nullIfBlank(cat.metaKeywords),
    }));

    const { data: existing, error: readError } = await supabase
      .from('categories')
      .select('slug');
    if (readError) throw readError;

    const keptSlugs = new Set(items.map(i => i.slug));
    const removed = (existing || [])
      .map(row => row.slug as string)
      .filter(slug => !keptSlugs.has(slug));

    if (items.length) {
      const { error } = await supabase
        .from('categories')
        .upsert(items, { onConflict: 'slug' });
      if (error) throw error;
    }

    if (removed.length) {
      const { error } = await supabase
        .from('categories')
        .delete()
        .in('slug', removed);
      if (error) throw error;
    }
  },

  addCategory: async (category: CategoryHierarchyItem): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('categories').insert({
      slug: category.slug,
      label: category.label,
      label_ka: category.labelKa || null,
      image: category.image,
      subs: packSubs(category.subs),
      meta_title: nullIfBlank(category.metaTitle),
      meta_title_ka: nullIfBlank(category.metaTitleKa),
      meta_description: nullIfBlank(category.metaDescription),
      meta_description_ka: nullIfBlank(category.metaDescriptionKa),
      meta_keywords: nullIfBlank(category.metaKeywords),
    });
    if (error) throw error;
  },

  deleteCategory: async (slug: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('categories').delete().eq('slug', slug);
    if (error) throw error;
  }
};

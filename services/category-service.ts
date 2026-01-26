
import { CategoryHierarchyItem } from '../types';
import { CATEGORY_HIERARCHY as INITIAL_DATA } from '../constants/categories';

const STORAGE_KEY = 'lesiko_categories_v2';

export const CategoryService = {
  getCategories: async (): Promise<CategoryHierarchyItem[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          resolve(JSON.parse(stored));
        } else {
          // Initialize with default constants if storage is empty
          localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
          resolve(INITIAL_DATA);
        }
      }, 200);
    });
  },

  saveCategories: async (categories: CategoryHierarchyItem[]): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
        resolve();
      }, 300);
    });
  },

  addCategory: async (category: CategoryHierarchyItem): Promise<void> => {
    const current = await CategoryService.getCategories();
    const updated = [...current, category];
    await CategoryService.saveCategories(updated);
  },

  updateCategory: async (oldSlug: string, updatedCategory: CategoryHierarchyItem): Promise<void> => {
    const current = await CategoryService.getCategories();
    const updated = current.map(c => c.slug === oldSlug ? updatedCategory : c);
    await CategoryService.saveCategories(updated);
  },

  deleteCategory: async (slug: string): Promise<void> => {
    const current = await CategoryService.getCategories();
    const updated = current.filter(c => c.slug !== slug);
    await CategoryService.saveCategories(updated);
  }
};

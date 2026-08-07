import { useEffect, useState } from 'react';
import { CategoryHierarchyItem } from '../types';
import { CategoryService } from '../services/category-service';

/**
 * The header, footer, filter sidebar, listing page and wishlist all need the
 * same hierarchy on first paint. One in-flight request serves all of them, and
 * the admin invalidates the cache after saving.
 */
let cache: CategoryHierarchyItem[] | null = null;
let inflight: Promise<CategoryHierarchyItem[]> | null = null;

export const loadCategories = (): Promise<CategoryHierarchyItem[]> => {
  if (cache) return Promise.resolve(cache);

  if (!inflight) {
    inflight = CategoryService.getCategories()
      .then(rows => {
        cache = rows;
        inflight = null;
        return rows;
      })
      .catch(err => {
        inflight = null;
        throw err;
      });
  }

  return inflight;
};

export const invalidateCategories = () => {
  cache = null;
};

export const useCategories = (): CategoryHierarchyItem[] => {
  const [categories, setCategories] = useState<CategoryHierarchyItem[]>(cache ?? []);

  useEffect(() => {
    let active = true;
    loadCategories()
      .then(rows => { if (active) setCategories(rows); })
      .catch(() => { /* the storefront renders fine with an empty nav */ });
    return () => { active = false; };
  }, []);

  return categories;
};

import { CategoryHierarchyItem, SubCategory } from '../types';

/**
 * Category and sub-category display names come from the database rather than
 * i18n/resources.ts, so a category the admin creates after launch renders
 * correctly in both languages without a code change.
 */

export const slugifyLabel = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const categoryLabel = (category: CategoryHierarchyItem, lang: string): string =>
  lang === 'ka' && category.labelKa ? category.labelKa : category.label;

export const subLabel = (sub: SubCategory, lang: string): string =>
  lang === 'ka' && sub.labelKa ? sub.labelKa : sub.label;

/**
 * Sub-category slugs are only unique within their category ("care" exists under
 * both Face Care and Nails), so pass `categorySlug` whenever it is known.
 */
export const findSub = (
  categories: CategoryHierarchyItem[],
  subSlug: string,
  categorySlug?: string,
): SubCategory | undefined => {
  const scope = categorySlug
    ? categories.filter(c => c.slug === categorySlug)
    : categories;

  for (const category of scope) {
    const match = category.subs.find(s => s.slug === subSlug);
    if (match) return match;
  }
  return undefined;
};

/** Falls back to the slug itself so a stale reference still renders something. */
export const subLabelBySlug = (
  categories: CategoryHierarchyItem[],
  subSlug: string,
  lang: string,
  categorySlug?: string,
): string => {
  const sub = findSub(categories, subSlug, categorySlug);
  return sub ? subLabel(sub, lang) : subSlug;
};

export const findCategoryOfSub = (
  categories: CategoryHierarchyItem[],
  subSlug: string,
): CategoryHierarchyItem | undefined =>
  categories.find(c => c.subs.some(s => s.slug === subSlug));

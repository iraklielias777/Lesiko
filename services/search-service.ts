
import { Product } from '../types';
import {
  CatalogueFilters,
  FacetRow,
  ProductService,
  SortKey,
} from './product-service';
import { BrandService, hasProducts } from './brand-service';
import { ContentService } from './content-service';
import { loadCategories } from '../lib/use-categories';
import { categoryLabel, subLabel } from '../lib/taxonomy';

/**
 * Storefront search and faceting.
 *
 * This used to download the whole catalogue and do everything in memory. Now
 * the matching, sorting and pagination happen in Postgres (see
 * ProductService.listProducts) and this module is only responsible for the
 * shape the UI expects and for the facet counts.
 *
 * Facet counts describe the catalogue, not the current result set — that is
 * deliberate and unchanged: the sidebar is telling you what each filter would
 * give you, so the numbers must not move as you tick boxes. Because they are
 * catalogue-wide they are also cacheable, which is what keeps them off the
 * critical path.
 */

export type SearchFilters = CatalogueFilters;
export type { SortKey };

export interface Facet {
  label: string;
  value: string;
  count: number;
}

export interface SearchResults {
  /** One page of results. */
  products: Product[];
  /** Everything matching the filters, for the pager. */
  total: number;
  facets: {
    categories: Facet[];
    subCategories: Record<string, Facet[]>;
    brands: Facet[];
    skinTypes: Facet[];
    priceRange: { min: number; max: number };
  };
}

export interface QuickSearchResults {
  products: Product[];
  // For a subcategory hit, `slug` is the parent category and `subSlug` the
  // sub-category, since a link needs both.
  categories: { name: string; slug: string; subSlug?: string; type: 'category' | 'subcategory' }[];
  brands: { name: string; slug: string }[];
}

const EMPTY_FACETS: SearchResults['facets'] = {
  categories: [], subCategories: {}, brands: [], skinTypes: [], priceRange: { min: 0, max: 1000 },
};

const countBy = <T>(items: T[], key: (item: T) => string | undefined): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const value = key(item);
    if (value) counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
};

/**
 * Built from the narrow facet projection plus the category, brand and skin-type
 * lists that are cached anyway. No product bodies are involved.
 */
const buildFacets = async (rows: FacetRow[]): Promise<SearchResults['facets']> => {
  if (!rows.length) return EMPTY_FACETS;

  const [brands, categories, skinTypeContent] = await Promise.all([
    BrandService.getBrands(),
    loadCategories().catch(() => []),
    ContentService.getSkinTypeContent().catch(() => []),
  ]);

  const categoryCounts = countBy(rows, row => row.categorySlug);
  const categoryFacets: Facet[] = Object.keys(categoryCounts).map(slug => ({
    label: categories.find(category => category.slug === slug)?.label || slug,
    value: slug,
    count: categoryCounts[slug],
  }));

  // Keyed by parent category slug; the sidebar resolves display labels from the
  // hierarchy, so only the count is consumed here.
  const subCategories: Record<string, Facet[]> = {};
  for (const facet of categoryFacets) {
    const inCategory = rows.filter(row => row.categorySlug === facet.value);
    const subCounts = countBy(inCategory, row => row.subCategory);
    subCategories[facet.value] = Object.keys(subCounts).map(subSlug => ({
      label: subSlug,
      value: subSlug,
      count: subCounts[subSlug],
    }));
  }

  const brandCounts = countBy(rows, row => row.brandId);
  const brandFacets: Facet[] = brands
    .map(brand => ({ label: brand.name, value: brand.slug, count: brandCounts[brand.id] || 0 }))
    .filter(facet => facet.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label));

  // A product declares its skin type through a tag, so the facet is the set of
  // configured skin types that at least one product actually carries.
  const tagCounts = countBy(
    rows.flatMap(row => row.tags.map(tag => ({ tag: tag.toLowerCase() }))),
    entry => entry.tag,
  );
  const skinTypes: Facet[] = skinTypeContent
    .map(type => ({
      label: type.name,
      value: type.key,
      count: tagCounts[type.key.toLowerCase()] || 0,
    }))
    .filter(facet => facet.count > 0);

  const prices = rows.map(row => row.price);
  return {
    categories: categoryFacets,
    subCategories,
    brands: brandFacets,
    skinTypes,
    priceRange: {
      min: prices.length ? Math.floor(Math.min(...prices)) : 0,
      max: prices.length ? Math.ceil(Math.max(...prices)) : 1000,
    },
  };
};

export const SearchService = {
  async search(filters: SearchFilters, page = 1, pageSize = 12): Promise<SearchResults> {
    // The page and the facets are independent, and the facets are usually a
    // cache hit, so they go out together rather than one after the other.
    const [pageResult, facetRows] = await Promise.all([
      ProductService.listProducts(filters, page, pageSize),
      ProductService.getFacetRows().catch(() => [] as FacetRow[]),
    ]);

    return {
      products: pageResult.products,
      total: pageResult.total,
      facets: await buildFacets(facetRows),
    };
  },

  /**
   * Type-ahead. Products come from the server; categories and brands are
   * matched against the lists already cached in the browser, so the whole
   * thing costs one small request.
   *
   * The category and brand sections were previously hardcoded to empty while
   * the overlay still rendered headings for them — permanently dead UI.
   */
  async quickSearch(query: string): Promise<QuickSearchResults> {
    const term = query.trim().toLowerCase();
    if (!term) return { products: [], categories: [], brands: [] };

    const [products, categories, brands] = await Promise.all([
      ProductService.quickSearch(query, 5),
      loadCategories().catch(() => []),
      BrandService.getBrands().catch(() => []),
    ]);

    const matchesTerm = (...candidates: (string | undefined)[]) =>
      candidates.some(candidate => (candidate || '').toLowerCase().includes(term));

    const categoryHits: QuickSearchResults['categories'] = [];
    for (const category of categories) {
      if (matchesTerm(category.label, category.labelKa)) {
        categoryHits.push({
          name: categoryLabel(category, 'en'),
          slug: category.slug,
          type: 'category',
        });
      }
      for (const sub of category.subs) {
        if (matchesTerm(sub.label, sub.labelKa)) {
          categoryHits.push({
            name: subLabel(sub, 'en'),
            slug: category.slug,
            subSlug: sub.slug,
            type: 'subcategory',
          });
        }
      }
    }

    return {
      products,
      categories: categoryHits.slice(0, 4),
      brands: brands
        .filter(brand => hasProducts(brand) && matchesTerm(brand.name))
        .slice(0, 3)
        .map(brand => ({ name: brand.name, slug: brand.slug })),
    };
  },
};

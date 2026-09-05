
import { Product } from '../types';
import { supabase } from '../lib/supabase';
import { getBrandIndex } from './brand-service';
import { withVariantOwnership } from '../lib/product-image';

/**
 * Catalogue reads.
 *
 * The storefront used to pull `select=*` with both joins — every column of
 * every product, including both description bodies and the whole `subs` array
 * repeated on each row — and then filter, facet, sort and paginate in the
 * browser. That is 468 KB gzipped for 240 products, on the homepage, on every
 * listing page, when the search overlay opens, and on every keystroke.
 *
 * Now each caller asks for the columns it renders, and Postgres does the work
 * it is for. A listing page is one page of 12 cards (~3 KB) plus a cached
 * facet projection (~9 KB), instead of the entire catalogue four times over.
 */

// --------------------------------------------------------------- projections

/** Everything a grid card renders, and nothing else. */
const CARD_COLUMNS = `
  id, name, name_ka, slug, price, compare_at_price, inventory_quantity,
  sub_category, images, is_new, is_trending, average_rating, review_count,
  video_playback_id,
  brands ( id, name, slug ),
  categories ( slug, label )
`;

/** Card columns plus variants, for re-pricing a persisted cart. */
const PRICING_COLUMNS = `${CARD_COLUMNS}, variants`;

/** The detail page and the admin editor need the whole row. */
const FULL_COLUMNS = '*, brands(*), categories(*)';

/**
 * Just enough to count facets and find the price range. Kept deliberately
 * narrow — this is the one query that still reads every row, so nothing goes in
 * here that the sidebar does not actually render. It also deliberately avoids
 * `is_on_sale`, so the sidebar keeps working on a database where migration
 * 0018 has not been applied yet; only the On-sale filter needs that column.
 */
const FACET_COLUMNS = 'price, tags, sub_category, category_id, brand_id';

export type SortKey = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'discount';

export interface CatalogueFilters {
  query?: string;
  /** Category slugs. */
  categories?: string[];
  /** Sub-category slugs. */
  subCategories?: string[];
  /** Brand slugs. */
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  /** Tag values, matched case-insensitively against products.tags. */
  skinTypes?: string[];
  inStock?: boolean;
  onSale?: boolean;
  sort?: SortKey;
}

export interface FacetRow {
  price: number;
  tags: string[];
  subCategory?: string;
  categorySlug?: string;
  brandId?: string;
}

export interface ProductPage {
  products: Product[];
  /** Total matching the filters, not the length of `products`. */
  total: number;
}

// ------------------------------------------------------------------ mapping

const mapProduct = (p: any): Product => {
  // Supabase returns joined data as nested objects. When a projection omits a
  // column the field is simply absent, so every optional read is defaulted
  // rather than assumed — a card row legitimately carries no description.
  const brandData = p.brands;
  const categoryData = p.categories;

  return {
    id: p.id,
    name: p.name,
    nameKa: p.name_ka,
    slug: p.slug,
    description: p.description ?? '',
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
    } : { id: 'unknown', name: 'LesiKo', slug: 'lesiko' },
    category: categoryData ? {
        id: categoryData.slug,
        name: categoryData.label,
        slug: categoryData.slug
    } : { id: 'unknown', name: 'General', slug: 'general' },
    subCategory: p.sub_category,
    images: withVariantOwnership({
      images: Array.isArray(p.images) ? p.images : [],
      variants: Array.isArray(p.variants) ? p.variants : [],
    }),
    videoPlaybackId: p.video_playback_id,
    isNew: p.is_new,
    isTrending: p.is_trending,
    averageRating: Number(p.average_rating || 0),
    reviewCount: p.review_count || 0,
    tags: Array.isArray(p.tags) ? p.tags : [],
    ingredients: p.ingredients ?? undefined,
    ingredientsKa: p.ingredients_ka ?? undefined,
    variants: Array.isArray(p.variants) ? p.variants : undefined,
    metaTitle: p.meta_title,
    metaTitleKa: p.meta_title_ka,
    metaDescription: p.meta_description,
    metaDescriptionKa: p.meta_description_ka,
    metaKeywords: p.meta_keywords,
    metaKeywordsKa: p.meta_keywords_ka
  };
};

const emptyToNull = (value?: string) => (value && value.trim() ? value.trim() : null);

// mapProduct substitutes an 'unknown' id when a product has no brand or
// category row; writing that back would violate the foreign key.
const refId = (id?: string) => (id && id !== 'unknown' ? id : null);

// Insert and update write the same column set, so the admin form can never
// silently drop a field depending on which path it took.
const toRow = (product: Product) => ({
  name: product.name,
  name_ka: emptyToNull(product.nameKa),
  slug: product.slug,
  description: product.description,
  description_ka: emptyToNull(product.descriptionKa),
  price: product.price,
  compare_at_price: product.compareAtPrice ?? null,
  inventory_quantity: product.inventoryQuantity,
  brand_id: refId(product.brand?.id),
  category_id: refId(product.category?.id),
  sub_category: emptyToNull(product.subCategory),
  images: product.images ?? [],
  variants: product.variants ?? [],
  video_playback_id: emptyToNull(product.videoPlaybackId),
  is_new: !!product.isNew,
  is_trending: !!product.isTrending,
  average_rating: product.averageRating || 0,
  review_count: product.reviewCount || 0,
  tags: product.tags ?? [],
  ingredients: emptyToNull(product.ingredients),
  ingredients_ka: emptyToNull(product.ingredientsKa),
  meta_title: emptyToNull(product.metaTitle),
  meta_title_ka: emptyToNull(product.metaTitleKa),
  meta_description: emptyToNull(product.metaDescription),
  meta_description_ka: emptyToNull(product.metaDescriptionKa),
  meta_keywords: emptyToNull(product.metaKeywords),
  meta_keywords_ka: emptyToNull(product.metaKeywordsKa),
});

// ------------------------------------------------------------ query building

/**
 * PostgREST parses `or=(...)` as a comma-separated logic tree, so a term
 * containing a comma or bracket breaks the request rather than returning
 * nothing. LIKE wildcards in user input would also silently change the match.
 * Shoppers do not search for punctuation, so it is dropped.
 */
const sanitizeTerm = (term: string): string =>
  term.trim().replace(/["'\\%_(),*]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Search covers both languages. It used to test the English name, description
 * and brand only, which on a Georgian storefront missed most of what shoppers
 * actually type.
 *
 * Brand matches cannot be expressed here — PostgREST rejects an `or` that
 * spans an embedded resource — so brand names are resolved to ids against the
 * cached brand list and folded in as a plain `brand_id.in`.
 */
const buildSearchClause = async (term: string): Promise<string | null> => {
  const safe = sanitizeTerm(term);
  if (!safe) return null;

  const like = `"%${safe}%"`;
  const parts = [
    `name.ilike.${like}`,
    `name_ka.ilike.${like}`,
    `description.ilike.${like}`,
    `description_ka.ilike.${like}`,
  ];

  const brandIds = await matchingBrandIds(safe);
  if (brandIds.length) parts.push(`brand_id.in.(${brandIds.join(',')})`);

  return parts.join(',');
};

const matchingBrandIds = async (term: string): Promise<string[]> => {
  try {
    const index = await getBrandIndex();
    const needle = term.toLowerCase();
    return [...index.values()]
      .filter(brand => brand.name.toLowerCase().includes(needle))
      .map(brand => brand.id);
  } catch {
    return [];
  }
};

const applySort = (query: any, sort: SortKey = 'relevance') => {
  switch (sort) {
    case 'price_asc':  query = query.order('price', { ascending: true }); break;
    case 'price_desc': query = query.order('price', { ascending: false }); break;
    case 'rating':     query = query.order('average_rating', { ascending: false }); break;
    // Stored generated column, migration 0022: the sale page's default order.
    case 'discount':   query = query.order('discount_percent', { ascending: false }); break;
    // "Relevance" has always meant newest-first here, because that is the order
    // the unsorted list arrived in. "Newest" used to run a comparator that was
    // not a valid ordering (`b.isNew ? 1 : -1`); both now order by recency.
    case 'newest':
    case 'relevance':
    default:           query = query.order('created_at', { ascending: false }); break;
  }
  // Ties are common on price, and an unstable order duplicates or skips rows
  // across pages.
  return query.order('id', { ascending: true });
};

/**
 * Anything that needs a round trip before the query can be built.
 *
 * This is separate from applyFilters, and applyFilters is synchronous, for a
 * sharp reason: a PostgrestFilterBuilder is itself a thenable. `await`ing an
 * async function that returns one does not hand back the builder — it runs the
 * query and resolves to the response. Keeping the builder out of every async
 * boundary is what stops that happening.
 */
interface ResolvedFilterInputs {
  brandIds: string[] | null;
  searchClause: string | null;
}

const resolveFilterInputs = async (filters: CatalogueFilters): Promise<ResolvedFilterInputs> => {
  let brandIds: string[] | null = null;
  if (filters.brands?.length) {
    const index = await getBrandIndex();
    brandIds = filters.brands.map(slug => index.get(slug)?.id).filter(Boolean) as string[];
  }

  const searchClause = filters.query ? await buildSearchClause(filters.query) : null;
  return { brandIds, searchClause };
};

const applyFilters = (query: any, filters: CatalogueFilters, resolved: ResolvedFilterInputs) => {
  if (filters.categories?.length) query = query.in('category_id', filters.categories);
  if (filters.subCategories?.length) query = query.in('sub_category', filters.subCategories);

  if (resolved.brandIds) {
    // A slug that matches no brand must return nothing, not everything.
    query = query.in(
      'brand_id',
      resolved.brandIds.length ? resolved.brandIds : ['00000000-0000-0000-0000-000000000000'],
    );
  }

  if (filters.minPrice !== undefined) query = query.gte('price', filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte('price', filters.maxPrice);
  if (filters.inStock) query = query.gt('inventory_quantity', 0);
  if (filters.onSale) query = query.eq('is_on_sale', true);

  if (filters.skinTypes?.length) {
    // Tags are stored lower-case; the homepage links carry the display name.
    query = query.overlaps('tags', filters.skinTypes.map(type => type.toLowerCase()));
  }

  if (resolved.searchClause) query = query.or(resolved.searchClause);

  return query;
};

// -------------------------------------------------------------- facet cache

/**
 * Facet counts describe the whole catalogue, not the current result set (that
 * is what lets the sidebar show you what selecting a filter would give you), so
 * they are the same for every visitor until the catalogue changes. One request
 * per session, shared by every page.
 */
let facetCache: FacetRow[] | null = null;
let facetInflight: Promise<FacetRow[]> | null = null;

export const invalidateFacets = () => {
  facetCache = null;
  facetInflight = null;
};

const fetchFacetRows = async (): Promise<FacetRow[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('products').select(FACET_COLUMNS);
  if (error) {
    console.error('Error loading facet data:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    price: Number(row.price) || 0,
    tags: Array.isArray(row.tags) ? row.tags : [],
    subCategory: row.sub_category || undefined,
    categorySlug: row.category_id || undefined,
    brandId: row.brand_id || undefined,
  }));
};

// ------------------------------------------------------------------ service

export const ProductService = {
  /** One page of cards for a filtered listing, plus the unpaginated total. */
  listProducts: async (
    filters: CatalogueFilters,
    page = 1,
    pageSize = 12,
  ): Promise<ProductPage> => {
    if (!supabase) return { products: [], total: 0 };

    const resolved = await resolveFilterInputs(filters);

    let query = supabase.from('products').select(CARD_COLUMNS, { count: 'exact' });
    query = applyFilters(query, filters, resolved);
    query = applySort(query, filters.sort);

    const from = Math.max(0, (page - 1) * pageSize);
    const { data, error, count } = await query.range(from, from + pageSize - 1);

    if (error) {
      console.error('Error listing products:', error);
      return { products: [], total: 0 };
    }
    return { products: (data || []).map(mapProduct), total: count ?? 0 };
  },

  /** Catalogue-wide counts for the filter sidebar. Cached for the session. */
  getFacetRows: (): Promise<FacetRow[]> => {
    if (facetCache) return Promise.resolve(facetCache);
    if (!facetInflight) {
      facetInflight = fetchFacetRows()
        .then(rows => { facetCache = rows; facetInflight = null; return rows; })
        .catch(err => { facetInflight = null; throw err; });
    }
    return facetInflight;
  },

  /**
   * Merchandising rail. Falls back to the newest products so the homepage is
   * never empty on a catalogue where nothing has been flagged yet.
   */
  getTrending: async (limit = 8): Promise<Product[]> => {
    if (!supabase) return [];

    const { data: trending } = await supabase
      .from('products')
      .select(CARD_COLUMNS)
      .eq('is_trending', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    const found = (trending || []).map(mapProduct);
    if (found.length >= limit) return found;

    const { data: filler } = await supabase
      .from('products')
      .select(CARD_COLUMNS)
      .eq('is_trending', false)
      .order('created_at', { ascending: false })
      .limit(limit - found.length);

    return [...found, ...(filler || []).map(mapProduct)];
  },

  /** Type-ahead. Server-side so a keystroke costs a few KB, not the catalogue. */
  quickSearch: async (term: string, limit = 5): Promise<Product[]> => {
    if (!supabase) return [];
    const clause = await buildSearchClause(term);
    if (!clause) return [];

    const { data, error } = await supabase
      .from('products')
      .select(CARD_COLUMNS)
      .or(clause)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Quick search failed:', error);
      return [];
    }
    return (data || []).map(mapProduct);
  },

  getProductBySlug: async (slug: string): Promise<Product | undefined> => {
    if (!supabase) return undefined;
    const { data, error } = await supabase
      .from('products')
      .select(FULL_COLUMNS)
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapProduct(data);
  },

  /** Cart re-pricing: needs live price, stock and variants, nothing else. */
  getProductsByIds: async (ids: string[]): Promise<Product[]> => {
    if (!supabase || ids.length === 0) return [];
    const unique = [...new Set(ids.filter(Boolean))];
    const { data, error } = await supabase
      .from('products')
      .select(PRICING_COLUMNS)
      .in('id', unique);

    if (error) {
      console.error('Supabase fetch error:', error);
      return [];
    }
    return (data || []).map(mapProduct);
  },

  /**
   * "You might also like" used to be `.neq(id).limit(4)` — the first four rows
   * in the table, unrelated to what you were looking at. Scoped to the same
   * category, it is at least a recommendation.
   */
  getRelatedProducts: async (
    productId: string,
    categorySlug?: string,
    limit = 4,
  ): Promise<Product[]> => {
    if (!supabase) return [];

    const run = (scoped: boolean) => {
      let query = supabase
        .from('products')
        .select(CARD_COLUMNS)
        .neq('id', productId)
        .gt('inventory_quantity', 0);
      if (scoped && categorySlug) query = query.eq('category_id', categorySlug);
      return query.order('is_trending', { ascending: false })
                  .order('created_at', { ascending: false })
                  .limit(limit);
    };

    const { data } = await run(true);
    const scoped = (data || []).map(mapProduct);
    if (scoped.length >= limit || !categorySlug) return scoped;

    // A thin category should still fill the row rather than show two cards.
    const { data: rest } = await run(false);
    const seen = new Set(scoped.map(p => p.id));
    const extra = (rest || []).map(mapProduct).filter(p => !seen.has(p.id));
    return [...scoped, ...extra].slice(0, limit);
  },

  /**
   * The admin editor writes every column, so it reads every column. Never call
   * this from the storefront — it is the query this refactor exists to remove.
   */
  getAllForAdmin: async (): Promise<Product[]> => {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('products')
        .select(FULL_COLUMNS)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        return [];
      }
      return (data || []).map(mapProduct);
    } catch (e) {
      console.error('Unexpected error in getAllForAdmin:', e);
      return [];
    }
  },

  addProduct: async (product: Product): Promise<void> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase.from('products').insert(toRow(product));
    if (error) throw error;
    invalidateFacets();
  },

  updateProduct: async (product: Product): Promise<void> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase
      .from('products')
      .update(toRow(product))
      .eq('id', product.id);
    if (error) throw error;
    invalidateFacets();
  },

  deleteProduct: async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    invalidateFacets();
  }
};

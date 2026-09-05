
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Filter, ChevronDown, SlidersHorizontal, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SearchService, SearchFilters, SearchResults } from '../services/search-service';
import { ProductCard } from '../components/product/ProductCard';
import { ProductFilters } from '../components/product/ProductFilters';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { SEO } from '../components/seo/SEO';
import { useCategories } from '../lib/use-categories';
import { categoryLabel, findSub, subLabelBySlug } from '../lib/taxonomy';
import { BrandService } from '../services/brand-service';
import { Brand } from '../types';
import { useEntitySeo, usePageSeo, useSiteUrl } from '../lib/use-seo';
import { useSettingsStore } from '../store/settings-store';
import { CARD_SIZES } from '../lib/product-image';
import { thumbSrc, thumbSrcSet } from '../lib/image-url';

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'discount';
const SORT_OPTIONS: SortOption[] = ['relevance', 'price_asc', 'price_desc', 'newest', 'rating', 'discount'];

const ITEMS_PER_PAGE = 12;

/**
 * Every filter, the sort and the page number live in the address bar. That is
 * what makes a listing survive a trip to a product and back, a reload, or a
 * shared link — component state used to hold them and lost them on the way
 * back. The crawler rules in the seo function keep these parameters out of
 * the index; the canonical stays the clean path.
 */
interface RouteContext {
  slug?: string;
  isSalePage: boolean;
  isBrandPage: boolean;
}

const list = (value: string | null): string[] =>
  value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];

const defaultSortFor = (ctx: RouteContext): SortOption => (ctx.isSalePage ? 'discount' : 'relevance');

const readFilters = (params: URLSearchParams, ctx: RouteContext): SearchFilters => {
  const sort = params.get('sort') as SortOption | null;
  const min = Number(params.get('min'));
  const max = Number(params.get('max'));
  return {
    query: params.get('q') || undefined,
    categories: ctx.slug && ctx.slug !== 'shop-all' && !ctx.isSalePage && !ctx.isBrandPage ? [ctx.slug] : [],
    subCategories: list(params.get('subCategory')),
    brands: ctx.isBrandPage ? (ctx.slug ? [ctx.slug] : []) : list(params.get('brands')),
    skinTypes: list(params.get('skinType')),
    minPrice: params.has('min') && Number.isFinite(min) ? min : undefined,
    maxPrice: params.has('max') && Number.isFinite(max) ? max : undefined,
    inStock: params.get('inStock') === '1' || undefined,
    onSale: ctx.isSalePage ? true : params.get('onSale') === '1' || undefined,
    sort: sort && SORT_OPTIONS.includes(sort) ? sort : defaultSortFor(ctx),
  };
};

/** A changed filter always starts from page one, so `page` is never carried over. */
const writeFilters = (next: SearchFilters, ctx: RouteContext): URLSearchParams => {
  const params = new URLSearchParams();
  if (next.query) params.set('q', next.query);
  if (next.subCategories?.length) params.set('subCategory', next.subCategories.join(','));
  if (!ctx.isBrandPage && next.brands?.length) params.set('brands', next.brands.join(','));
  if (next.skinTypes?.length) params.set('skinType', next.skinTypes.join(','));
  if (next.minPrice !== undefined) params.set('min', String(next.minPrice));
  if (next.maxPrice !== undefined) params.set('max', String(next.maxPrice));
  if (next.inStock) params.set('inStock', '1');
  if (!ctx.isSalePage && next.onSale) params.set('onSale', '1');
  if (next.sort && next.sort !== defaultSortFor(ctx)) params.set('sort', next.sort);
  return params;
};

export const ProductListingPage = () => {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const searchQuery = searchParams.get('q');
  const subCategoryParam = searchParams.get('subCategory');

  const isSalePage = location.pathname === '/sale';
  // /brand/:slug and /products?brands=:slug are the same view; the dedicated
  // path exists so a brand has one address worth indexing and linking to.
  const isBrandPage = location.pathname.startsWith('/brand/');
  const routeContext: RouteContext = { slug, isSalePage, isBrandPage };

  const [brand, setBrand] = useState<Brand | undefined>();
  const storeName = useSettingsStore(s => s.settings.storeName);
  
  const [results, setResults] = useState<SearchResults>({
    products: [],
    total: 0,
    facets: { categories: [], subCategories: {}, brands: [], skinTypes: [], priceRange: { min: 0, max: 1000 } }
  });
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  // Page headings resolve their display text from the category rows, so a
  // category added in the admin titles correctly in both languages.
  const categories = useCategories();
  
  // Filters are read from the address bar and written back to it — see
  // readFilters/writeFilters above. `replace` keeps the history clean: one
  // entry per listing, however many boxes were ticked, so "back" from a
  // product returns to exactly this view.
  const filters = useMemo(
    () => readFilters(searchParams, routeContext),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, slug, isSalePage, isBrandPage],
  );
  const currentPage = Math.max(1, Number(searchParams.get('page')) || 1);
  // Headings still want the first skin type and brand, as before.
  const skinTypeParam = filters.skinTypes?.[0] ?? null;
  const brandsParam = isBrandPage ? slug || null : (filters.brands?.[0] ?? null);

  const setFilters = (next: SearchFilters) => {
    setSearchParams(writeFilters(next, routeContext), { replace: true });
  };

  const setCurrentPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    if (page > 1) params.set('page', String(page));
    else params.delete('page');
    setSearchParams(params, { replace: true });
  };

  // Buffered Filter State for Mobile Drawer
  const [tempFilters, setTempFilters] = useState<SearchFilters>(filters);

  // The brand row carries its own SEO copy and description, so the page needs
  // more than the slug from the URL.
  useEffect(() => {
    if (!isBrandPage || !slug) { setBrand(undefined); return; }
    let active = true;
    BrandService.getBrandBySlug(slug).then(found => { if (active) setBrand(found); });
    return () => { active = false; };
  }, [isBrandPage, slug]);

  // `filters` is rebuilt on every change, so its identity is useless as a
  // dependency; the serialised form only changes when a value actually does.
  const filterKey = JSON.stringify(filters);

  // One page of results comes from the server now, not a slice of the whole
  // catalogue. The debounce covers the price inputs, which fire per keystroke.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const timeout = setTimeout(async () => {
      const data = await SearchService.search(filters, currentPage, ITEMS_PER_PAGE);
      if (cancelled) return;
      setResults(data);
      setLoading(false);
    }, 250);

    return () => { cancelled = true; clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, currentPage]);

  const handleOpenMobileFilters = () => {
      setTempFilters(filters);
      setShowMobileFilters(true);
  };

  const handleApplyMobileFilters = () => {
      setFilters(tempFilters);
      setShowMobileFilters(false);
  };

  const toggleSkinTypeFilter = (type: string) => {
      const current = filters.skinTypes || [];
      const updated = current.includes(type) 
        ? current.filter(t => t !== type)
        : [...current, type];
      setFilters({ ...filters, skinTypes: updated });
  };

  const handlePageChange = (newPage: number) => {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sortLabels: Record<SortOption, string> = {
    'relevance': t('filters.relevance'),
    'price_asc': t('filters.priceLowHigh'),
    'price_desc': t('filters.priceHighLow'),
    'newest': t('filters.newest'),
    'rating': t('filters.topRated'),
    'discount': t('filters.biggestDiscount')
  };

  const getPageTitle = () => {
      if (searchQuery) return t('common.searchResults', { query: searchQuery });
      if (isSalePage) return t('common.sale');
      if (isBrandPage) return brand?.name || (slug || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (subCategoryParam) return subLabelBySlug(categories, subCategoryParam, i18n.language, slug);
      if (skinTypeParam) return `${t(`skinTypes.${skinTypeParam.toLowerCase()}`, skinTypeParam)} ${t('common.skin')}`;
      if (brandsParam) return brandsParam.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (slug) {
        const category = categories.find(c => c.slug === slug);
        return category
          ? categoryLabel(category, i18n.language)
          : slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
      }
      return t('common.shopAll');
  };

  const title = getPageTitle();

  // `results.products` is already the current page; `total` is the full match
  // count, which is what the pager and the result count need.
  const totalPages = Math.max(1, Math.ceil(results.total / ITEMS_PER_PAGE));
  const paginatedProducts = results.products;

  // Whichever row backs this view owns its SEO copy. A filtered listing with no
  // row of its own falls through to the shop-all page entry.
  const activeCategory = !isBrandPage && slug ? categories.find(c => c.slug === slug) : undefined;
  const activeSub = subCategoryParam ? findSub(categories, subCategoryParam, slug) : undefined;
  const seoEntity = activeSub || (isBrandPage ? brand : activeCategory);

  const pageKey = isSalePage ? 'sale' : isBrandPage ? 'brands' : 'products';
  const pageSeo = usePageSeo(pageKey, { title, description: `${title}.` });
  const entitySeo = useEntitySeo(seoEntity || {}, {
    title,
    description: (isBrandPage ? brand?.description : '') || `Browse ${title} at ${storeName}.`,
    keywords: [
      ...(filters.categories || []),
      ...(filters.subCategories || []),
      ...(filters.brands || []),
      ...(filters.skinTypes || [])
    ].join(', '),
    image: isBrandPage ? brand?.image : activeCategory?.image
  });
  const resolved = seoEntity ? entitySeo : pageSeo;

  const url = useSiteUrl();

  // Filters produce many URLs for one set of products, so everything below the
  // canonical view points back at it rather than competing with it.
  const canonicalPath = isSalePage
    ? '/sale'
    : isBrandPage
      ? `/brand/${slug}`
      : subCategoryParam && slug
        ? `/category/${slug}?subCategory=${subCategoryParam}`
        : slug
          ? `/category/${slug}`
          : '/products';

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": t('common.home'), "item": url('/') },
      { "@type": "ListItem", "position": 2, "name": t('common.shop'), "item": url('/products') },
      ...(activeCategory ? [{
        "@type": "ListItem",
        "position": 3,
        "name": categoryLabel(activeCategory, i18n.language),
        "item": url(`/category/${activeCategory.slug}`)
      }] : []),
      ...(activeSub || isBrandPage || isSalePage ? [{
        "@type": "ListItem",
        "position": activeCategory ? 4 : 3,
        "name": title,
        "item": url(canonicalPath)
      }] : [])
    ]
  };

  // Tells search engines what is actually on the page, which is what earns the
  // product carousels in results rather than a plain blue link.
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": title,
    "numberOfItems": results.total,
    "itemListElement": paginatedProducts.map((product, index) => ({
      "@type": "ListItem",
      "position": (currentPage - 1) * ITEMS_PER_PAGE + index + 1,
      "url": url(`/product/${product.slug}`),
      "name": (i18n.language === 'ka' && product.nameKa) || product.name
    }))
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      <SEO 
        title={resolved.title}
        description={resolved.description}
        keywords={resolved.keywords}
        image={resolved.image}
        canonicalPath={canonicalPath}
        noindex={resolved.noindex}
        structuredData={[breadcrumbSchema, itemListSchema]}
      />

      {/* Header */}
      <div className="bg-[#FAFAF9] border-b border-gray-100">
        <div className="container mx-auto px-4 py-16 text-center animate-fade-in">
          {isBrandPage && brand?.image && (
            <img
              src={thumbSrc(brand.image, 80, { resize: 'cover' })}
              srcSet={thumbSrcSet(brand.image, 80, { resize: 'cover' })}
              alt={brand.name}
              width={160}
              height={160}
              className="w-20 h-20 rounded-full object-cover mx-auto mb-5 border border-gray-200"
              decoding="async"
            />
          )}
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight capitalize">{title}</h1>
          {isBrandPage && brand?.description && (
            <p className="text-gray-500 max-w-xl mx-auto mb-5 leading-relaxed">{brand.description}</p>
          )}
          <div className="text-xs md:text-sm text-gray-500 font-bold tracking-widest uppercase">
            {t('common.home')} <span className="mx-2 text-gray-300">/</span> {t('common.shop')} <span className="mx-2 text-gray-300">/</span> <span className="text-brand-dark capitalize">{title}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Mobile Filter Toggle & Quick Chips */}
          <div className="lg:hidden flex flex-col gap-4 mb-6">
             <div className="flex justify-between items-center">
                <Button 
                    variant="outline" 
                    className="flex-1 mr-4 justify-center border-gray-300"
                    onClick={handleOpenMobileFilters}
                    leftIcon={<SlidersHorizontal className="w-4 h-4" />}
                >
                    {t('filters.filters')}
                </Button>
                
                <div className="relative">
                    <select 
                    value={filters.sort}
                    onChange={(e) => setFilters({...filters, sort: e.target.value as SortOption})}
                    className="appearance-none bg-white border border-gray-300 text-gray-900 py-2.5 pl-4 pr-10 rounded-full text-sm font-medium focus:outline-none focus:border-brand-dark focus:ring-1 focus:ring-brand-dark"
                    >
                    {Object.entries(sortLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
             </div>

             {/* Quick Filter Chips (Horizontal Scroll) */}
             <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-4 px-4">
                {results.facets.skinTypes.map((type) => {
                    const isActive = filters.skinTypes?.includes(type.value);
                    return (
                        <button
                            key={type.value}
                            onClick={() => toggleSkinTypeFilter(type.value)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                isActive 
                                ? 'bg-brand-dark text-white border-brand-dark' 
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {isActive && <X className="w-3 h-3" />}
                            {t(`skinTypes.${type.value.toLowerCase()}`, type.label)}
                        </button>
                    )
                })}
             </div>
          </div>

          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0 animate-fade-in" style={{ animationDelay: '100ms' }}>
             <div className="sticky top-28">
               <ProductFilters 
                 filters={filters} 
                 facets={results.facets} 
                 onFilterChange={setFilters} 
                 onClear={() => setFilters({ sort: filters.sort, query: filters.query })}
               />
             </div>
          </aside>

          {/* Mobile Filter Drawer */}
          <Drawer 
            isOpen={showMobileFilters} 
            onClose={() => setShowMobileFilters(false)} 
            title={t('filters.filters')}
            position="right"
            footer={
              <div className="flex gap-4">
                 <Button variant="outline" className="flex-1" onClick={() => setTempFilters({ sort: tempFilters.sort })}>{t('filters.clearAll')}</Button>
                 <Button className="flex-1" onClick={handleApplyMobileFilters}>{t('filters.showResults')}</Button>
              </div>
            }
          >
             <ProductFilters 
                 filters={tempFilters} 
                 facets={results.facets} 
                 onFilterChange={setTempFilters} 
                 onClear={() => setTempFilters({ sort: tempFilters.sort, query: tempFilters.query })}
                 className="shadow-none p-0"
               />
          </Drawer>

          {/* Product Grid */}
          <main className="flex-1">
            <div className="hidden lg:flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
              <p className="text-sm text-gray-500">
                {t('filters.showing')} <span className="font-bold text-gray-900">{results.total}</span> {t('filters.products')}
              </p>
              
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('filters.sortBy')}:</span>
                <div className="relative group min-w-[180px]">
                   <select 
                     value={filters.sort}
                     onChange={(e) => setFilters({...filters, sort: e.target.value as SortOption})}
                     className="w-full appearance-none bg-transparent border-none text-gray-900 py-2 pl-0 pr-8 leading-tight focus:outline-none cursor-pointer text-sm font-bold text-right hover:text-brand-green transition-colors"
                   >
                     {Object.entries(sortLabels).map(([value, label]) => (
                       <option key={value} value={value}>{label}</option>
                     ))}
                   </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-gray-900">
                     <ChevronDown className="w-4 h-4" />
                   </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-gray-50 aspect-[4/5] rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : results.products.length === 0 ? (
               <div className="flex flex-col items-center justify-center text-center py-20 bg-gray-50 rounded-2xl animate-fade-in border border-gray-100">
                 <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-200">
                   <Search className="w-10 h-10 text-gray-300 stroke-[1.5]" />
                 </div>
                 <h3 className="text-xl font-heading font-bold text-gray-900 mb-2">{t('filters.noResults')}</h3>
                 <p className="text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">{t('filters.tryAdjusting')}</p>
                 <Button onClick={() => setFilters({ sort: filters.sort })}>
                   {t('filters.clearAll')}
                 </Button>
               </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
                  {paginatedProducts.map((product, index) => (
                    <div 
                      key={product.id} 
                      className="animate-fade-in-up" 
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                    >
                      <ProductCard product={product} sizes={CARD_SIZES.listing3} />
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-16 pt-8 border-t border-gray-100">
                        <button 
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        
                        <div className="flex items-center gap-1">
                            {[...Array(totalPages)].map((_, i) => {
                                const page = i + 1;
                                return (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                                            currentPage === page 
                                            ? 'bg-brand-dark text-white shadow-md' 
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                        </div>

                        <button 
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Filter, ChevronDown, SlidersHorizontal, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SearchService, SearchFilters, SearchResults } from '../services/search-service';
import { ProductCard } from '../components/product/ProductCard';
import { ProductFilters } from '../components/product/ProductFilters';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { SEO } from '../components/seo/SEO';

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating';

const ITEMS_PER_PAGE = 12;

export const ProductListingPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const searchQuery = searchParams.get('q');
  const subCategoryParam = searchParams.get('subCategory');
  const skinTypeParam = searchParams.get('skinType');
  const brandsParam = searchParams.get('brands');
  
  const isSalePage = location.pathname === '/sale';
  
  const [results, setResults] = useState<SearchResults>({
    products: [],
    total: 0,
    facets: { categories: [], subCategories: {}, brands: [], skinTypes: [], priceRange: { min: 0, max: 1000 } }
  });
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Advanced Filter State
  const [filters, setFilters] = useState<SearchFilters>({
    sort: 'relevance'
  });

  // Buffered Filter State for Mobile Drawer
  const [tempFilters, setTempFilters] = useState<SearchFilters>(filters);

  // Sync URL/Slug with filters
  useEffect(() => {
    const newFilters: SearchFilters = { ...filters };
    
    // Main Category from slug
    if (slug && slug !== 'shop-all' && !isSalePage) {
      newFilters.categories = [slug];
    } else {
       newFilters.categories = [];
    }

    // Sale Mode
    if (isSalePage) {
        newFilters.onSale = true;
        newFilters.categories = []; 
    } else {
        newFilters.onSale = false;
    }

    // Search Query
    if (searchQuery) {
      newFilters.query = searchQuery;
    } else {
      newFilters.query = undefined;
    }

    // SubCategory from URL
    if (subCategoryParam) {
      newFilters.subCategories = [subCategoryParam];
    }
    
    // Skin Type from URL
    if (skinTypeParam) {
       newFilters.skinTypes = [skinTypeParam];
    }

    // Brands from URL
    if (brandsParam) {
        newFilters.brands = [brandsParam];
    } else {
        newFilters.brands = [];
    }

    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset page on URL change
  }, [slug, searchQuery, subCategoryParam, skinTypeParam, brandsParam, isSalePage]);

  // Fetch Data when filters change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const data = await SearchService.search(filters);
      setResults(data);
      setCurrentPage(1); // Reset page on filter change
      setLoading(false);
    };

    const timeout = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timeout);
  }, [filters]);

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
    'rating': t('filters.topRated')
  };

  const getPageTitle = () => {
      if (searchQuery) return t('common.searchResults', { query: searchQuery });
      if (isSalePage) return t('common.sale');
      if (subCategoryParam) return t(`subCategories.${subCategoryParam}`, subCategoryParam);
      if (skinTypeParam) return `${t(`skinTypes.${skinTypeParam.toLowerCase()}`, skinTypeParam)} ${t('common.skin')}`;
      if (brandsParam) return brandsParam.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (slug) return t(`categories.${slug}`, slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' '));
      return t('common.shopAll');
  };

  const title = getPageTitle();

  // Pagination Logic
  const totalPages = Math.ceil(results.products.length / ITEMS_PER_PAGE);
  const paginatedProducts = results.products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Structured Data: Breadcrumbs
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": t('common.home'),
        "item": window.location.origin
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": t('common.shop'),
        "item": `${window.location.origin}/#/products`
      },
      ...(slug ? [{
        "@type": "ListItem",
        "position": 3,
        "name": title,
        "item": window.location.href
      }] : [])
    ]
  };

  // Generate extended keywords based on active filters
  const seoKeywords = [
      ...(filters.categories || []),
      ...(filters.subCategories || []),
      ...(filters.brands || []),
      ...(filters.skinTypes || []),
      'cosmetics', 'skincare', 'georgia', 'beauty shop'
  ];

  return (
    <div className="bg-white min-h-screen pb-20">
      <SEO 
        title={title} 
        description={`Browse our collection of ${title}. Premium quality cosmetics and skincare available in Georgia.`}
        keywords={seoKeywords}
        structuredData={breadcrumbSchema}
      />

      {/* Header */}
      <div className="bg-[#FAFAF9] border-b border-gray-100">
        <div className="container mx-auto px-4 py-16 text-center animate-fade-in">
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight capitalize">{title}</h1>
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
                      <ProductCard product={product} />
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

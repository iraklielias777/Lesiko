
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronRight, TrendingUp, ShoppingBag, ArrowRight, Tag, Eye, Clock, Trash2, PlayCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SearchService, QuickSearchResults } from '../../services/search-service';
import { ProductService } from '../../services/product-service'; 
import { Product } from '../../types';
import { Button } from '../ui/Button';
import { useFormatPrice } from '../../lib/format';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchItem = 
  | { type: 'category'; data: QuickSearchResults['categories'][number] }
  | { type: 'brand'; data: { name: string; slug: string } }
  | { type: 'product'; data: Product };

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const fmt = useFormatPrice();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QuickSearchResults>({ products: [], categories: [], brands: [] });
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Initial Data & Body Lock & History Load
  useEffect(() => {
    if (isOpen) {
        document.body.style.overflow = 'hidden';
        
        // Load Popular
        ProductService.getAllProducts().then(products => {
            setPopularProducts(products.filter(p => p.isTrending).slice(0, 3));
        });

        // Load History
        try {
            const history = localStorage.getItem('lesiko_search_history');
            if (history) setRecentSearches(JSON.parse(history));
        } catch (e) {
            console.error('Failed to load search history');
        }

        setTimeout(() => inputRef.current?.focus(), 100);
    } else {
        document.body.style.overflow = 'unset';
        setQuery('');
        setResults({ products: [], categories: [], brands: [] });
        setSelectedIndex(-1);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(async () => {
        if (query.trim()) {
            setLoading(true);
            const data = await SearchService.quickSearch(query);
            setResults(data);
            setLoading(false);
            setSelectedIndex(0); // Select first item automatically on new search
        } else {
            setResults({ products: [], categories: [], brands: [] });
            setSelectedIndex(-1);
        }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const addToHistory = (term: string) => {
      if (!term.trim()) return;
      const clean = term.trim();
      const newHistory = [clean, ...recentSearches.filter(s => s !== clean)].slice(0, 5);
      setRecentSearches(newHistory);
      localStorage.setItem('lesiko_search_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
      setRecentSearches([]);
      localStorage.removeItem('lesiko_search_history');
  };

  // Helper to get item from linear index
  const getItemAtIndex = (index: number): SearchItem | null => {
      if (index < 0) return null;
      let current = 0;
      
      if (index < results.categories.length) {
          return { type: 'category', data: results.categories[index] };
      }
      current += results.categories.length;

      if (index < current + results.brands.length) {
          return { type: 'brand', data: results.brands[index - current] };
      }
      current += results.brands.length;

      if (index < current + results.products.length) {
          return { type: 'product', data: results.products[index - current] };
      }
      
      return null;
  };

  const activeItem = getItemAtIndex(selectedIndex);

  // Keyboard Navigation
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!isOpen) return;

          const totalItems = results.products.length + results.categories.length + results.brands.length;
          
          if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev));
          } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
          } else if (e.key === 'Enter') {
              e.preventDefault();
              if (activeItem && query.trim()) {
                  handleItemClick(activeItem);
              } else {
                  handleFullSearch();
              }
          } else if (e.key === 'Escape') {
              onClose();
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, activeItem, query]);

  const handleFullSearch = () => {
      if (query.trim()) {
          addToHistory(query);
          navigate(`/products?q=${encodeURIComponent(query)}`);
          onClose();
      }
  };

  const handleItemClick = (item: SearchItem) => {
      // Add relevant term to history based on item type
      addToHistory(query || item.data.name);

      if (item.type === 'category') {
          const url = item.data.type === 'category'
              ? `/category/${item.data.slug}`
              : `/category/${item.data.slug}?subCategory=${encodeURIComponent(item.data.subSlug || '')}`;
          navigate(url);
      } else if (item.type === 'brand') {
          navigate(`/products?brands=${item.data.slug}`);
      } else if (item.type === 'product') {
          navigate(`/product/${item.data.slug}`);
      }
      onClose();
  };

  const highlightText = (text: string, highlight: string) => {
      if (!highlight.trim()) return text;
      const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
      return parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? <span key={i} className="text-brand-dark font-bold bg-brand-green/20 rounded-sm px-0.5">{part}</span> : part
      );
  };

  if (!isOpen) return null;

  let currentIndexTracker = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-0 sm:pt-16 px-0 sm:px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className="relative w-full sm:max-w-4xl bg-white sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[85vh] animate-scale-in origin-top transform transition-all"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search products"
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-4 sm:p-6 border-b border-gray-100 bg-white z-20 shrink-0">
            <Search className="w-5 h-5 text-gray-400 mr-4" />
            <input 
                ref={inputRef}
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('common.search')}
                className="flex-1 text-lg sm:text-xl text-gray-900 placeholder-gray-400 outline-none bg-transparent font-medium"
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls="search-results-list"
                aria-activedescendant={selectedIndex >= 0 ? `result-item-${selectedIndex}` : undefined}
            />
            <div className="flex items-center gap-3 ml-2">
                {loading && <div className="w-5 h-5 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin"></div>}
                <button 
                    onClick={onClose}
                    className="p-1.5 bg-gray-50 text-gray-500 rounded-md hover:bg-gray-100 transition-colors text-xs font-medium px-2"
                    aria-label="Close search"
                >
                    ESC
                </button>
            </div>
        </div>

        {/* Content Area - Split View on Desktop */}
        <div className="flex-1 flex overflow-hidden bg-gray-50/50">
            
            {/* Left: Results List */}
            <div 
                id="search-results-list"
                className={`flex-1 overflow-y-auto p-2 sm:p-4 custom-scrollbar ${activeItem ? 'md:border-r md:border-gray-100' : ''}`}
                role="listbox"
            >
                
                {/* Case 1: Empty State (History & Popular) */}
                {!query && (
                    <div className="space-y-8 px-2 py-2">
                        {/* Recent Searches */}
                        {recentSearches.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <Clock className="w-3 h-3" /> Recent Searches
                                    </h3>
                                    <button onClick={clearHistory} className="text-[10px] text-red-400 hover:text-red-600 font-medium">
                                        Clear History
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {recentSearches.map((term, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => setQuery(term)}
                                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-brand-green hover:text-brand-green transition-colors shadow-sm flex items-center gap-2 group"
                                        >
                                            {term}
                                            <div 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setRecentSearches(prev => {
                                                        const updated = prev.filter(t => t !== term);
                                                        localStorage.setItem('lesiko_search_history', JSON.stringify(updated));
                                                        return updated;
                                                    }); 
                                                }}
                                                className="hover:bg-gray-100 rounded-full p-0.5"
                                            >
                                                <X className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Popular / Trending */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <TrendingUp className="w-3 h-3" /> {t('home.trending')}
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {popularProducts.map((p) => (
                                    <div 
                                        key={p.id}
                                        onClick={() => { addToHistory(p.name); navigate(`/product/${p.slug}`); onClose(); }}
                                        className="flex items-center gap-4 p-2 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 cursor-pointer transition-all group"
                                    >
                                        <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
                                            <img src={p.images[0]?.url} alt="" className="w-full h-full object-contain p-0.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-medium text-gray-900 truncate group-hover:text-brand-green transition-colors">{p.name}</h4>
                                                <span className="text-xs font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">{fmt(p.price)}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 truncate">{p.brand.name}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-green opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Popular Tags */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Popular Tags</h3>
                            <div className="flex gap-2 flex-wrap">
                                {['Vitamin C', 'Sunscreen', 'Moisturizer', 'Lipstick', 'Anti-aging'].map(term => (
                                    <button 
                                        key={term}
                                        onClick={() => setQuery(term)}
                                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-bold hover:bg-brand-green hover:text-white transition-colors"
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Case 2: No Results */}
                {query && !loading && results.products.length === 0 && results.categories.length === 0 && results.brands.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">No matches found</h3>
                        <p className="text-gray-500 text-sm">Try searching for "Serum", "Cream", or a brand name.</p>
                    </div>
                )}

                {/* Case 3: Results */}
                {query && (
                    <div className="space-y-4">
                        
                        {/* Suggestions (Categories & Brands) */}
                        {(results.categories.length > 0 || results.brands.length > 0) && (
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Suggestions</h3>
                                <div className="space-y-1" role="group">
                                    {results.categories.map((cat) => {
                                        const index = currentIndexTracker++;
                                        const isSelected = selectedIndex === index;
                                        return (
                                            <div 
                                                key={cat.slug}
                                                id={`result-item-${index}`}
                                                role="option"
                                                aria-selected={isSelected}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                                onClick={() => handleItemClick({ type: 'category', data: cat })}
                                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-brand-green/10 text-brand-dark' : 'hover:bg-gray-100 text-gray-700'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? 'bg-brand-green text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                        <Search className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm">
                                                        {highlightText(cat.name, query)}
                                                        <span className="text-xs text-gray-400 ml-2 italic">in Categories</span>
                                                    </span>
                                                </div>
                                                {isSelected && <ArrowRight className="w-4 h-4 text-brand-green" />}
                                            </div>
                                        );
                                    })}
                                    {results.brands.map((brand) => {
                                        const index = currentIndexTracker++;
                                        const isSelected = selectedIndex === index;
                                        return (
                                            <div 
                                                key={brand.slug}
                                                id={`result-item-${index}`}
                                                role="option"
                                                aria-selected={isSelected}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                                onClick={() => handleItemClick({ type: 'brand', data: brand })}
                                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-brand-green/10 text-brand-dark' : 'hover:bg-gray-100 text-gray-700'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? 'bg-brand-green text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                        <Tag className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm">
                                                        {highlightText(brand.name, query)}
                                                        <span className="text-xs text-gray-400 ml-2 italic">Brand</span>
                                                    </span>
                                                </div>
                                                {isSelected && <ArrowRight className="w-4 h-4 text-brand-green" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Products */}
                        {results.products.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Products</h3>
                                <div className="space-y-2" role="group">
                                    {results.products.map((product) => {
                                        const index = currentIndexTracker++;
                                        const isSelected = selectedIndex === index;
                                        return (
                                            <div 
                                                key={product.id}
                                                id={`result-item-${index}`}
                                                role="option"
                                                aria-selected={isSelected}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                                onClick={() => handleItemClick({ type: 'product', data: product })}
                                                className={`flex gap-4 p-3 rounded-xl border transition-all cursor-pointer group ${
                                                    isSelected 
                                                    ? 'bg-white border-brand-green shadow-md scale-[1.01] relative z-10' 
                                                    : 'bg-white border-transparent hover:border-gray-200 hover:shadow-sm'
                                                }`}
                                            >
                                                <div className="w-14 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 relative">
                                                    <img src={product.images[0]?.url} alt="" className="w-full h-full object-contain p-0.5" />
                                                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                                                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-bold px-1 rounded-bl">SALE</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className={`text-sm font-bold truncate pr-2 ${isSelected ? 'text-brand-green' : 'text-gray-900'}`}>
                                                            {highlightText(product.name, query)}
                                                        </h4>
                                                        <div className="text-right flex-shrink-0">
                                                            <span className="text-sm font-bold text-gray-900">{fmt(product.price)}</span>
                                                            {product.compareAtPrice && (
                                                                <span className="text-xs text-gray-400 line-through block">{fmt(product.compareAtPrice)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500 truncate">{product.brand.name} • {product.category.name}</p>
                                                    {product.videoPlaybackId && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <PlayCircle className="w-3 h-3 text-brand-green" />
                                                            <span className="text-[10px] text-gray-400">Video Available</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`flex items-center justify-center w-6 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                                    <ChevronRight className="w-5 h-5 text-gray-300" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right: Preview Pane (Desktop Only) */}
            {activeItem && query && (
                <div className="hidden md:flex w-[40%] bg-white flex-col border-l border-gray-100 animate-fade-in">
                    {activeItem.type === 'product' ? (
                        <div className="flex flex-col h-full">
                            <div className="relative aspect-square w-full bg-gray-50 overflow-hidden">
                                <img 
                                    src={activeItem.data.images[0]?.url} 
                                    alt={activeItem.data.name} 
                                    className="w-full h-full object-contain p-2"
                                />
                                {activeItem.data.isNew && (
                                    <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-brand-dark text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm">
                                        {t('common.new')}
                                    </span>
                                )}
                            </div>
                            <div className="p-6 flex flex-col flex-1">
                                <div className="mb-auto">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">{activeItem.data.brand.name}</span>
                                    <h3 className="font-heading font-bold text-xl text-gray-900 mb-2 leading-tight">
                                        {activeItem.data.name}
                                    </h3>
                                    <div className="flex items-baseline gap-2 mb-4">
                                        <span className="text-xl font-bold text-gray-900">{fmt(activeItem.data.price)}</span>
                                        {activeItem.data.compareAtPrice && (
                                            <span className="text-sm text-gray-400 line-through">{fmt(activeItem.data.compareAtPrice)}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">
                                        {activeItem.data.description}
                                    </p>
                                </div>
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <Button 
                                        className="w-full shadow-xl shadow-brand-green/20" 
                                        onClick={() => handleItemClick(activeItem)}
                                        rightIcon={<ArrowRight className="w-4 h-4" />}
                                    >
                                        Go to Product
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full items-center justify-center p-8 text-center bg-gray-50/30">
                            <div className="w-20 h-20 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-6">
                                {activeItem.type === 'category' ? <Search className="w-8 h-8 text-gray-400" /> : <Tag className="w-8 h-8 text-gray-400" />}
                            </div>
                            <h3 className="font-heading font-bold text-xl text-gray-900 mb-2">{activeItem.data.name}</h3>
                            <p className="text-gray-500 text-sm mb-8 max-w-[200px]">
                                {activeItem.type === 'category' ? 'Explore all products in this category.' : 'View all products from this brand.'}
                            </p>
                            <Button 
                                variant="outline"
                                onClick={() => handleItemClick(activeItem)}
                                rightIcon={<ArrowRight className="w-4 h-4" />}
                            >
                                {activeItem.type === 'category' ? 'View Category' : 'View Brand'}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Footer actions */}
        {query && (
            <div 
                onClick={handleFullSearch}
                className="bg-gray-50 border-t border-gray-100 p-3 sm:px-6 text-center cursor-pointer hover:bg-gray-100 transition-colors shrink-0 z-20"
            >
                <span className="text-sm font-bold text-brand-green flex items-center justify-center gap-2">
                    View all results for "{query}" <ArrowRight className="w-4 h-4" />
                </span>
            </div>
        )}
      </div>
    </div>
  );
};

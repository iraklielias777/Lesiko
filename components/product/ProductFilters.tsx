
import React, { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Checkbox } from '../ui/Checkbox';
import { SearchFilters, Facet } from '../../services/search-service';
import { useCategories } from '../../lib/use-categories';
import { categoryLabel, subLabel } from '../../lib/taxonomy';
import { useTranslation } from 'react-i18next';
import { useCurrencySymbol } from '../../lib/format';

interface ProductFiltersProps {
  filters: SearchFilters;
  facets: {
    categories: Facet[];
    subCategories: Record<string, Facet[]>;
    brands: Facet[];
    skinTypes: Facet[];
    priceRange: { min: number; max: number };
  };
  onFilterChange: (newFilters: SearchFilters) => void;
  onClear: () => void;
  className?: string;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  facets,
  onFilterChange,
  onClear,
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['categories', 'brands', 'price', 'skinTypes'])
  );
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(filters.categories || [])
  );
  
  const categoryHierarchy = useCategories();
  const symbol = useCurrencySymbol();

  // Auto-expand categories when selections change (e.g. from URL params or manual select)
  useEffect(() => {
    const newExpanded = new Set(expandedCategories);
    
    // Ensure all selected main categories are expanded
    if (filters.categories) {
        filters.categories.forEach(c => newExpanded.add(c));
    }
    
    // If a subcategory is selected, ensure its parent is expanded
    if (filters.subCategories && filters.subCategories.length > 0 && categoryHierarchy.length > 0) {
        filters.subCategories.forEach(subSlug => {
            const parent = categoryHierarchy.find(c => c.subs.some(s => s.slug === subSlug));
            if (parent) newExpanded.add(parent.slug);
        });
    }

    setExpandedCategories(newExpanded);
  }, [filters.categories, filters.subCategories, categoryHierarchy]);

  const toggleSection = (key: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(key)) newExpanded.delete(key);
    else newExpanded.add(key);
    setExpandedSections(newExpanded);
  };

  const toggleCategoryExpand = (slug: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(slug)) newExpanded.delete(slug);
    else newExpanded.add(slug);
    setExpandedCategories(newExpanded);
  };

  const setCategoryExpanded = (slug: string, expanded: boolean) => {
      const newExpanded = new Set(expandedCategories);
      if (expanded) newExpanded.add(slug);
      else newExpanded.delete(slug);
      setExpandedCategories(newExpanded);
  };

  const handleCategoryChange = (slug: string, checked: boolean) => {
    let newCats = filters.categories || [];
    if (checked) {
      newCats = [...newCats, slug];
      // Explicitly expand when checked
      setCategoryExpanded(slug, true);
    } else {
      newCats = newCats.filter(c => c !== slug);
    }
    onFilterChange({ ...filters, categories: newCats });
  };

  const handleSubCategoryChange = (subSlug: string, checked: boolean) => {
    let newSubs = filters.subCategories || [];
    if (checked) {
      newSubs = [...newSubs, subSlug];
    } else {
      newSubs = newSubs.filter(s => s !== subSlug);
    }
    onFilterChange({ ...filters, subCategories: newSubs });
  };

  const handleCheckboxChange = (key: keyof SearchFilters, value: string, checked: boolean) => {
    const current = (filters[key] as string[]) || [];
    const updated = checked ? [...current, value] : current.filter(item => item !== value);
    onFilterChange({ ...filters, [key]: updated });
  };

  const handlePriceChange = (min: number, max: number) => {
    onFilterChange({ ...filters, minPrice: min, maxPrice: max });
  };

  const activeCount = 
    (filters.categories?.length || 0) + 
    (filters.subCategories?.length || 0) +
    (filters.brands?.length || 0) + 
    (filters.skinTypes?.length || 0) +
    (filters.minPrice !== undefined ? 1 : 0) +
    (filters.inStock ? 1 : 0) + 
    (filters.onSale ? 1 : 0);

  return (
    <div className={`space-y-8 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 lg:hidden">
        <h3 className="font-heading font-bold text-gray-900">{t('filters.activeFilters')} ({activeCount})</h3>
        {activeCount > 0 && (
          <button 
            onClick={onClear}
            className="text-xs text-brand-green font-bold uppercase tracking-wider"
          >
            {t('filters.clearAll')}
          </button>
        )}
      </div>

      {/* Categories */}
      <FilterSection 
        title={t('filters.categories')} 
        isExpanded={expandedSections.has('categories')} 
        onToggle={() => toggleSection('categories')}
      >
           <div className="space-y-3 mt-4">
             {categoryHierarchy.map(cat => {
               const facet = facets.categories.find(f => f.value === cat.slug);
               const count = facet?.count || 0;
               const isExpanded = expandedCategories.has(cat.slug);
               const isChecked = filters.categories?.includes(cat.slug) || false;
               const availableSubs = facets.subCategories[cat.slug] || [];
               const translatedLabel = categoryLabel(cat, i18n.language);

               return (
                 <div key={cat.slug} className="group">
                   <div className="flex items-center justify-between py-1">
                     <Checkbox
                        label={translatedLabel}
                        checked={isChecked}
                        onChange={(c) => handleCategoryChange(cat.slug, c)}
                     />
                     <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-medium">{count}</span>
                        {cat.subs.length > 0 && (
                        <button 
                            onClick={() => toggleCategoryExpand(cat.slug)}
                            className="text-gray-400 hover:text-brand-green transition-colors"
                        >
                            {isExpanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        </button>
                        )}
                     </div>
                   </div>
                   
                   {/* Subcategories */}
                   <div className={`
                       ml-5 space-y-2 border-l border-gray-100 pl-4 py-1 overflow-hidden transition-all duration-300 ease-in-out
                       ${isExpanded ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'}
                   `}>
                       {cat.subs.map(sub => {
                         const subFacet = availableSubs.find(s => s.value === sub.slug);
                         const subCount = subFacet?.count || 0;

                         return (
                           <div key={sub.slug} className="flex justify-between items-center group/sub">
                            <Checkbox
                                label={subLabel(sub, i18n.language)}
                                checked={filters.subCategories?.includes(sub.slug) || false}
                                onChange={(c) => handleSubCategoryChange(sub.slug, c)}
                            />
                            <span className="text-[10px] text-gray-300 group-hover/sub:text-gray-500">{subCount}</span>
                           </div>
                         );
                       })}
                   </div>
                 </div>
               );
             })}
           </div>
      </FilterSection>

      {/* Skin Types / Concerns */}
      <FilterSection 
        title="Skin Concerns / Types" 
        isExpanded={expandedSections.has('skinTypes')} 
        onToggle={() => toggleSection('skinTypes')}
      >
           <div className="space-y-2 mt-4 max-h-48 overflow-y-auto custom-scrollbar pr-2">
             {facets.skinTypes.map(facet => (
               <div key={facet.value} className="flex justify-between items-center">
                 <Checkbox
                    label={t(`skinTypes.${facet.value.toLowerCase()}`, facet.label)}
                    checked={filters.skinTypes?.includes(facet.value) || false}
                    onChange={(checked) => handleCheckboxChange('skinTypes', facet.value, checked)}
                 />
                 <span className="text-xs text-gray-400">{facet.count}</span>
               </div>
             ))}
           </div>
      </FilterSection>

      {/* Brands */}
      <FilterSection 
        title={t('filters.brands')} 
        isExpanded={expandedSections.has('brands')} 
        onToggle={() => toggleSection('brands')}
      >
           <div className="space-y-2 mt-4 max-h-48 overflow-y-auto custom-scrollbar pr-2">
             {facets.brands.map(facet => (
               <div key={facet.value} className="flex justify-between items-center">
                 <Checkbox
                    label={facet.label}
                    checked={filters.brands?.includes(facet.value) || false}
                    onChange={(checked) => handleCheckboxChange('brands', facet.value, checked)}
                 />
                 <span className="text-xs text-gray-400">{facet.count}</span>
               </div>
             ))}
           </div>
      </FilterSection>

      {/* Price */}
      <FilterSection 
        title={t('filters.priceRange')} 
        isExpanded={expandedSections.has('price')} 
        onToggle={() => toggleSection('price')}
      >
           <div className="mt-4 space-y-4">
             <div className="flex items-center gap-3">
               <div className="relative flex-1">
                 <span className="absolute left-3 top-2.5 text-gray-400 text-sm">{symbol}</span>
                 <input 
                   type="number" 
                   min={0}
                   className="w-full pl-6 pr-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-dark focus:ring-0 outline-none transition-colors"
                   value={filters.minPrice || ''}
                   onChange={(e) => handlePriceChange(Number(e.target.value) || 0, filters.maxPrice || 1000)}
                   placeholder="0"
                 />
               </div>
               <span className="text-gray-300">—</span>
               <div className="relative flex-1">
                 <span className="absolute left-3 top-2.5 text-gray-400 text-sm">{symbol}</span>
                 <input 
                   type="number" 
                   min={0}
                   className="w-full pl-6 pr-3 py-2 border border-gray-200 rounded text-sm focus:border-brand-dark focus:ring-0 outline-none transition-colors"
                   value={filters.maxPrice || ''}
                   onChange={(e) => handlePriceChange(filters.minPrice || 0, Number(e.target.value) || 1000)}
                   placeholder="1000"
                 />
               </div>
             </div>
           </div>
      </FilterSection>
      
      {/* Availability & Sale */}
      <div className="pt-4 border-t border-gray-100 space-y-3">
         <Checkbox 
           label={t('filters.inStock')}
           checked={filters.inStock || false} 
           onChange={(c) => onFilterChange({...filters, inStock: c})} 
         />
         <Checkbox 
           label={t('admin.putOnSale')}
           checked={filters.onSale || false} 
           onChange={(c) => onFilterChange({...filters, onSale: c})} 
         />
      </div>
    </div>
  );
};

const FilterSection = ({ 
  title, 
  isExpanded, 
  onToggle, 
  children 
}: { 
  title: string, 
  isExpanded: boolean, 
  onToggle: () => void, 
  children?: React.ReactNode 
}) => (
  <div className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
    <button 
      onClick={onToggle}
      className="flex items-center justify-between w-full text-left group"
    >
      <span className="font-heading font-bold text-sm uppercase tracking-wide text-gray-900 group-hover:text-brand-green transition-colors">{title}</span>
      {isExpanded ? <Minus className="w-4 h-4 text-gray-400" /> : <Plus className="w-4 h-4 text-gray-400" />}
    </button>
    <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
            {children}
        </div>
    </div>
  </div>
);

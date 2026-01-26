
import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Image as ImageIcon, UploadCloud, Download, TrendingUp, Tag, Globe, Sparkles, Sliders, Filter, List, PlayCircle } from 'lucide-react';
import MuxPlayer from '@mux/mux-player-react';
import { useAdminStore } from '../../store/admin-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Product, ProductVariant } from '../../types';
import { useToastStore } from '../../store/toast-store';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '../../components/ui/Checkbox';

export const AdminProducts = () => {
  const { t } = useTranslation();
  const { fetchData, products, deleteProduct, addProduct, updateProduct, categories, brands } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore(s => s.addToast);

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    nameKa: '',
    price: 0,
    compareAtPrice: 0,
    category: undefined,
    subCategory: '',
    inventoryQuantity: 0,
    description: '',
    descriptionKa: '',
    brand: undefined,
    images: [],
    videoPlaybackId: '',
    isTrending: false,
    tags: [], // For Skin Types
    variants: [], // NEW
    // SEO Defaults
    metaTitle: '',
    metaDescription: '',
    metaKeywords: ''
  });

  const [isOnSale, setIsOnSale] = useState(false);
  
  // Local state for adding a new variant inside modal
  const [newVariant, setNewVariant] = useState<Partial<ProductVariant>>({ name: '', price: 0, inventoryQuantity: 0 });

  // Defined Skin Types for selection
  const SKIN_TYPES = ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'];

  // Get available subcategories based on current selected main category
  const activeCategory = categories.find(c => c.slug === formData.category?.slug) || categories[0];
  const availableSubCategories = activeCategory?.subs || [];

  useEffect(() => {
    fetchData();
  }, []);

  // Enhanced Filter Logic: Includes Brand Name and Dropdown selection
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBrand = selectedBrand ? p.brand.id === selectedBrand : true;

    return matchesSearch && matchesBrand;
  });

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "ID,Name,Brand,Category,Price,Trending\n"
        + filteredProducts.map(p => `${p.id},"${p.name}",${p.brand.name},${p.category.name},${p.price},${p.isTrending ? 'Yes' : 'No'}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "products.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    if(confirm('Are you sure you want to delete this product?')) {
        await deleteProduct(id);
        addToast("Product deleted", "info");
    }
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData({ ...product });
      setIsOnSale(!!product.compareAtPrice && product.compareAtPrice > product.price);
    } else {
      setEditingId(null);
      // Default to first category & brand available
      const defaultCat = categories[0];
      const defaultBrand = brands[0];
      
      setFormData({
        name: '',
        nameKa: '',
        price: 0,
        compareAtPrice: 0,
        category: defaultCat ? { id: defaultCat.slug, name: defaultCat.label, slug: defaultCat.slug } : undefined,
        subCategory: defaultCat?.subs[0] || '',
        inventoryQuantity: 0,
        description: '',
        descriptionKa: '',
        brand: defaultBrand ? { id: defaultBrand.id, name: defaultBrand.name, slug: defaultBrand.slug } : { id: 'generic', name: 'Generic', slug: 'generic' },
        images: [],
        videoPlaybackId: '',
        isTrending: false,
        tags: [],
        variants: [],
        metaTitle: '',
        metaDescription: '',
        metaKeywords: ''
      });
      setIsOnSale(false);
    }
    setNewVariant({ name: '', price: 0, inventoryQuantity: 0 });
    setIsModalOpen(true);
  };

  const handleCategoryChange = (slug: string) => {
      const cat = categories.find(c => c.slug === slug);
      if (cat) {
        setFormData(prev => ({
            ...prev,
            category: { id: cat.slug, name: cat.label, slug: cat.slug },
            subCategory: cat.subs[0] || ''
        }));
      }
  };

  const handleBrandChange = (id: string) => {
      const brand = brands.find(b => b.id === id);
      if (brand) {
          setFormData(prev => ({
              ...prev,
              brand: { id: brand.id, name: brand.name, slug: brand.slug }
          }));
      }
  };

  const toggleSkinType = (type: string, checked: boolean) => {
      setFormData(prev => {
          const currentTags = prev.tags || [];
          if (checked) {
              return { ...prev, tags: [...currentTags, type] };
          } else {
              return { ...prev, tags: currentTags.filter(t => t !== type) };
          }
      });
  };

  const handleAddVariant = () => {
      if (!newVariant.name) return;
      
      const variant: ProductVariant = {
          id: crypto.randomUUID(),
          name: newVariant.name,
          price: newVariant.price || Number(formData.price), // Default to product price if 0
          inventoryQuantity: Number(newVariant.inventoryQuantity) || 0
      };

      setFormData(prev => ({
          ...prev,
          variants: [...(prev.variants || []), variant]
      }));
      
      // Reset logic
      setNewVariant({ name: '', price: 0, inventoryQuantity: 0 });
  };

  const handleRemoveVariant = (variantId: string) => {
      setFormData(prev => ({
          ...prev,
          variants: prev.variants?.filter(v => v.id !== variantId)
      }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          images: [
            ...(prev.images || []),
            { 
              id: crypto.randomUUID(), 
              url: reader.result as string, 
              altText: file.name, 
              isPrimary: (prev.images?.length || 0) === 0 
            }
          ]
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (imageId: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter(img => img.id !== imageId)
    }));
  };

  const generateSEO = () => {
      const brandName = formData.brand?.name || 'LesiKo';
      const cleanDesc = formData.description?.replace(/<[^>]*>?/gm, '').substring(0, 155).trim() + '...';
      const keywords = [formData.category?.name, formData.subCategory, 'Cosmetics', 'Skincare', brandName].filter(Boolean).join(', ');

      setFormData(prev => ({
          ...prev,
          metaTitle: prev.metaTitle || `${prev.name} | ${brandName}`,
          metaDescription: prev.metaDescription || cleanDesc,
          metaKeywords: prev.metaKeywords || keywords
      }));
      addToast("SEO data auto-generated");
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Auto-generate SEO if empty
      const brandName = formData.brand?.name || 'LesiKo';
      const metaTitle = formData.metaTitle || `${formData.name} | ${brandName}`;
      const metaDescription = formData.metaDescription || formData.description?.substring(0, 160) || '';
      
      // Calculate total inventory if variants exist
      let finalInventory = Number(formData.inventoryQuantity);
      if (formData.variants && formData.variants.length > 0) {
          finalInventory = formData.variants.reduce((acc, v) => acc + v.inventoryQuantity, 0);
      }

      const productPayload: Product = {
          id: editingId || crypto.randomUUID(),
          name: formData.name!,
          nameKa: formData.nameKa,
          slug: formData.name!.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: formData.description || '',
          descriptionKa: formData.descriptionKa,
          price: Number(formData.price),
          compareAtPrice: isOnSale ? Number(formData.compareAtPrice) : undefined,
          inventoryQuantity: finalInventory,
          brand: formData.brand!,
          category: formData.category!,
          subCategory: formData.subCategory,
          images: formData.images?.length ? formData.images : [{ id: 'def', url: 'https://via.placeholder.com/400', altText: 'Placeholder', isPrimary: true }],
          videoPlaybackId: formData.videoPlaybackId,
          averageRating: formData.averageRating || 0,
          reviewCount: formData.reviewCount || 0,
          isNew: formData.isNew,
          isTrending: formData.isTrending,
          tags: formData.tags,
          variants: formData.variants,
          metaTitle,
          metaDescription,
          metaKeywords: formData.metaKeywords
      };

      if (editingId) {
        await updateProduct(productPayload);
        addToast("Product updated successfully");
      } else {
        await addProduct(productPayload);
        addToast("Product created successfully");
      }
      
      setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="font-heading text-3xl font-bold text-gray-900">{t('admin.products') as string}</h1>
           <p className="text-gray-500">{t('admin.manageCatalog') as string}</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} leftIcon={<Download className="w-4 h-4" />}>{t('common.export') as string}</Button>
            <Button onClick={() => openModal()} leftIcon={<Plus className="w-4 h-4" />}>{t('admin.add') as string}</Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
                type="text" 
                placeholder={`${t('common.search') as string} (Name, Category, Brand)`}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-brand-green focus:border-brand-green outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-brand-green focus:border-brand-green outline-none bg-white appearance-none cursor-pointer"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                >
                    <option value="">{t('filters.allBrands') as string}</option>
                    {brands.map(brand => (
                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                </select>
            </div>
          </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                   <tr>
                     <th className="px-6 py-4">{t('filters.products') as string}</th>
                     <th className="px-6 py-4">{t('filters.brands') as string}</th>
                     <th className="px-6 py-4">{t('common.status') as string}</th>
                     <th className="px-6 py-4">{t('admin.price') as string}</th>
                     <th className="px-6 py-4">{t('admin.inventory') as string}</th>
                     <th className="px-6 py-4 text-right">{t('common.actions') as string}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                               <img src={product.images[0]?.url} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <span className="font-medium text-gray-900 line-clamp-1 max-w-[200px]">{product.name}</span>
                                <span className="text-xs text-gray-500">{t(`categories.${product.category.slug}`, product.category.name) as string}</span>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                          {product.brand.name}
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex gap-1">
                             {product.isTrending && (
                                 <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold uppercase rounded flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3"/> {t('common.hot') as string}
                                 </span>
                             )}
                             {product.compareAtPrice && product.compareAtPrice > product.price && (
                                 <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded flex items-center gap-1">
                                    <Tag className="w-3 h-3"/> {t('common.sale') as string}
                                 </span>
                             )}
                         </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                          ${product.price.toFixed(2)}
                          {product.compareAtPrice && (
                              <span className="text-xs text-gray-400 line-through ml-2">${product.compareAtPrice.toFixed(2)}</span>
                          )}
                      </td>
                      <td className="px-6 py-4">
                         <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                            product.inventoryQuantity > 10 ? 'bg-green-100 text-green-700' : 
                            product.inventoryQuantity > 0 ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-red-100 text-red-700'
                         }`}>
                             {t('admin.inStockCount', { count: product.inventoryQuantity }) as string}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2">
                             <button 
                                onClick={() => openModal(product)}
                                className="p-2 text-gray-400 hover:text-brand-green hover:bg-green-50 rounded transition-colors"
                             >
                                <Edit2 className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={() => handleDelete(product.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                      <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                              {t('admin.noProductsFound')}
                          </td>
                      </tr>
                  )}
                </tbody>
             </table>
         </div>
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl relative z-10 flex flex-col max-h-[90vh] animate-scale-in">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="font-heading font-bold text-xl">{editingId ? t('admin.edit') as string : t('admin.add') as string}</h2>
                    <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                  <form id="productForm" onSubmit={handleSubmit} className="space-y-8">
                      
                      {/* Merchandising Toggles */}
                      <div className="flex items-center gap-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 text-brand-green rounded border-gray-300 focus:ring-brand-green"
                                checked={formData.isTrending}
                                onChange={e => setFormData({...formData, isTrending: e.target.checked})}
                              />
                              <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                  <TrendingUp className="w-4 h-4 text-purple-500" /> {t('admin.markTrending') as string}
                              </span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 text-brand-green rounded border-gray-300 focus:ring-brand-green"
                                checked={isOnSale}
                                onChange={e => setIsOnSale(e.target.checked)}
                              />
                              <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                  <Tag className="w-4 h-4 text-red-500" /> {t('admin.putOnSale') as string}
                              </span>
                          </label>
                      </div>

                      <div className="grid md:grid-cols-2 gap-8">
                          {/* English Section */}
                          <div className="space-y-4">
                             <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">
                                <span className="w-6 h-4 bg-gray-200 rounded flex items-center justify-center text-[10px]">EN</span> {t('admin.english') as string}
                             </div>
                             <Input 
                                label={t('admin.productName') as string} 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                required 
                                placeholder="e.g. Hydra-Glow Serum"
                             />
                             <div>
                                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">{t('admin.descEn') as string}</label>
                                <textarea 
                                    className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-brand-green outline-none min-h-[100px]" 
                                    rows={5}
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    placeholder="..."
                                ></textarea>
                             </div>
                          </div>

                          {/* Georgian Section */}
                          <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                             <div className="flex items-center gap-2 text-sm font-bold text-brand-green uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">
                                <Globe className="w-4 h-4" /> {t('admin.georgian') as string}
                             </div>
                             <Input 
                                label={t('admin.productNameKa') as string}
                                value={formData.nameKa || ''} 
                                onChange={e => setFormData({...formData, nameKa: e.target.value})} 
                                placeholder="მაგ. ჰიდრა-გლოუ შრატი"
                                className="font-heading" // Assuming Noto Sans is loaded
                             />
                             <div>
                                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">{t('admin.descKa') as string}</label>
                                <textarea 
                                    className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-brand-green outline-none min-h-[100px] font-sans" 
                                    rows={5}
                                    value={formData.descriptionKa || ''}
                                    onChange={e => setFormData({...formData, descriptionKa: e.target.value})}
                                    placeholder="..."
                                ></textarea>
                             </div>
                          </div>
                      </div>
                      
                      {/* Price Section */}
                      <div className="grid grid-cols-2 gap-4">
                          <Input 
                              label={isOnSale ? `${t('admin.salePrice') as string} ($)` : `${t('admin.price') as string} ($)`}
                              type="number" 
                              value={formData.price} 
                              onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
                              required 
                          />
                          {isOnSale && (
                              <Input 
                                  label={`${t('admin.originalPrice') as string} ($)`}
                                  type="number" 
                                  value={formData.compareAtPrice || ''} 
                                  onChange={e => setFormData({...formData, compareAtPrice: Number(e.target.value)})} 
                                  required 
                              />
                          )}
                      </div>

                      {/* Inventory & Brand */}
                      <div className="grid grid-cols-2 gap-4">
                          <Input 
                              label={t('admin.inventoryCount') as string}
                              type="number" 
                              value={formData.inventoryQuantity} 
                              onChange={e => setFormData({...formData, inventoryQuantity: Number(e.target.value)})} 
                              required 
                              disabled={formData.variants && formData.variants.length > 0} // Disabled if variants exist
                          />
                          
                          <div>
                            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">{t('filters.brands') as string}</label>
                            <select 
                                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-brand-green outline-none"
                                value={formData.brand?.id}
                                onChange={e => handleBrandChange(e.target.value)}
                            >
                                {brands.map(brand => (
                                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                                ))}
                            </select>
                          </div>
                      </div>

                      {/* Categories */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">{t('filters.categories') as string}</label>
                          <select 
                            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-brand-green outline-none"
                            value={formData.category?.slug}
                            onChange={e => handleCategoryChange(e.target.value)}
                          >
                            {categories.map(cat => (
                                <option key={cat.slug} value={cat.slug}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">{t('admin.subCategory')}</label>
                          <select 
                            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-brand-green outline-none"
                            value={formData.subCategory}
                            onChange={e => setFormData({...formData, subCategory: e.target.value})}
                          >
                             {availableSubCategories.length > 0 ? (
                                availableSubCategories.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))
                             ) : (
                                <option value="">{t('admin.noSubcategories') as string}</option>
                             )}
                          </select>
                        </div>
                      </div>

                      {/* Variants Management */}
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                          <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                             <List className="w-4 h-4 text-brand-green" /> {t('admin.variantsConfig')}
                          </label>
                          
                          {formData.variants && formData.variants.length > 0 && (
                              <div className="mb-4 space-y-2">
                                  <div className="grid grid-cols-4 gap-2 text-xs font-bold text-gray-500 uppercase px-2">
                                      <span>{t('admin.variantName')}</span>
                                      <span>{t('admin.price')}</span>
                                      <span>{t('admin.variantStock')}</span>
                                      <span className="text-right">{t('common.actions')}</span>
                                  </div>
                                  {formData.variants.map((variant) => (
                                      <div key={variant.id} className="grid grid-cols-4 gap-2 items-center bg-white border border-gray-200 p-2 rounded-lg text-sm">
                                          <span className="font-medium">{variant.name}</span>
                                          <span>${variant.price?.toFixed(2)}</span>
                                          <span>{variant.inventoryQuantity}</span>
                                          <div className="text-right">
                                              <button type="button" onClick={() => handleRemoveVariant(variant.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                  <Trash2 className="w-4 h-4" />
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}

                          <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">{t('admin.variantName')}</label>
                                  <input 
                                      type="text" 
                                      placeholder="e.g. Red, 100ml"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-brand-green outline-none"
                                      value={newVariant.name}
                                      onChange={(e) => setNewVariant({...newVariant, name: e.target.value})}
                                  />
                              </div>
                              <div className="w-24">
                                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">{t('admin.price')}</label>
                                  <input 
                                      type="number" 
                                      placeholder={formData.price?.toString()}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-brand-green outline-none"
                                      value={newVariant.price || ''}
                                      onChange={(e) => setNewVariant({...newVariant, price: Number(e.target.value)})}
                                  />
                              </div>
                              <div className="w-24">
                                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">{t('admin.variantStock')}</label>
                                  <input 
                                      type="number" 
                                      placeholder="0"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-brand-green outline-none"
                                      value={newVariant.inventoryQuantity || ''}
                                      onChange={(e) => setNewVariant({...newVariant, inventoryQuantity: Number(e.target.value)})}
                                  />
                              </div>
                              <Button type="button" size="sm" variant="secondary" onClick={handleAddVariant} disabled={!newVariant.name}>
                                  {t('common.add')}
                              </Button>
                          </div>
                      </div>

                      {/* Media Management (Images & Video) */}
                      <div>
                        <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">{t('admin.upload') as string}</label>
                        
                        {/* Video Input with Live Preview */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <Input 
                                label="Mux Video Playback ID"
                                leftIcon={<PlayCircle className="w-4 h-4 text-gray-400" />}
                                value={formData.videoPlaybackId || ''} 
                                onChange={e => setFormData({...formData, videoPlaybackId: e.target.value})} 
                                placeholder="e.g. DS00Spx1CV902..."
                            />
                            <p className="text-[10px] text-gray-400 mt-2 mb-3">Enter the Playback ID from your Mux dashboard.</p>
                            
                            {/* Live Video Preview */}
                            {formData.videoPlaybackId && (
                                <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 shadow-sm max-w-sm">
                                    <div className="bg-black text-white text-[10px] uppercase font-bold px-2 py-1">Preview</div>
                                    <MuxPlayer
                                        streamType="on-demand"
                                        playbackId={formData.videoPlaybackId}
                                        metadataVideoTitle="Admin Preview"
                                        primaryColor="#AED136"
                                        secondaryColor="#000000"
                                        style={{ aspectRatio: '16/9', width: '100%' }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Image Grid */}
                        <div className="grid grid-cols-4 gap-3 mb-3">
                          {formData.images?.map((img) => (
                            <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                              <img src={img.url} alt="Preview" className="w-full h-full object-cover" />
                              <button
                                type="button" 
                                onClick={() => removeImage(img.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-brand-green hover:text-brand-green hover:bg-brand-green/5 transition-all"
                          >
                             <UploadCloud className="w-6 h-6 mb-1" />
                             <span className="text-[10px] font-bold uppercase">{t('admin.upload') as string}</span>
                          </button>
                        </div>
                        <input 
                           type="file" 
                           ref={fileInputRef} 
                           className="hidden" 
                           accept="image/*"
                           onChange={handleImageUpload}
                        />
                      </div>

                      {/* Skin Type Suitability (Tags) */}
                      <div>
                          <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                             <Sparkles className="w-4 h-4 text-brand-green" /> {t('admin.skinTypeSuitability')}
                          </label>
                          <div className="flex flex-wrap gap-4 p-4 border border-gray-100 rounded-lg bg-gray-50/50">
                              {SKIN_TYPES.map(type => (
                                  <Checkbox 
                                      key={type}
                                      label={t(`skinTypes.${type.toLowerCase()}`, type) as string}
                                      checked={formData.tags?.includes(type) || false}
                                      onChange={(checked) => toggleSkinType(type, checked)}
                                  />
                              ))}
                          </div>
                          <p className="text-xs text-gray-400 mt-2">Selected skin types will appear in the "Shop by Skin Type" sections.</p>
                      </div>

                      {/* SEO Automation Section */}
                      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                          <div className="flex justify-between items-center mb-4">
                              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-brand-green" /> {t('admin.seoConfig')}
                              </label>
                              <Button type="button" size="sm" variant="outline" onClick={generateSEO} className="text-xs h-8">{t('admin.autoGenerate')}</Button>
                          </div>
                          <div className="space-y-4">
                              <Input 
                                  label={t('admin.metaTitle') as string}
                                  value={formData.metaTitle} 
                                  onChange={e => setFormData({...formData, metaTitle: e.target.value})}
                                  placeholder="Auto-generated if empty"
                              />
                              <div>
                                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">{t('admin.metaDesc') as string}</label>
                                <textarea 
                                    className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-brand-green outline-none min-h-[80px]" 
                                    rows={3}
                                    value={formData.metaDescription}
                                    onChange={e => setFormData({...formData, metaDescription: e.target.value})}
                                    placeholder="Auto-generated from description if empty (160 chars)"
                                ></textarea>
                              </div>
                              <Input 
                                  label={t('admin.keywords') as string} 
                                  value={formData.metaKeywords} 
                                  onChange={e => setFormData({...formData, metaKeywords: e.target.value})}
                                  placeholder="e.g. serum, vitamin c, skincare"
                              />
                          </div>
                      </div>
                  </form>
                </div>
                
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>{t('common.cancel') as string}</Button>
                    <Button type="submit" form="productForm">{editingId ? t('common.save') as string : t('admin.add') as string}</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

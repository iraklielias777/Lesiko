
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, UploadCloud, Link as LinkIcon, Tag, Sliders, PlayCircle, Loader2, PackageOpen, AlertTriangle } from 'lucide-react';
import MuxPlayer from '@mux/mux-player-react';
import { useAdminStore } from '../../store/admin-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Product, ProductVariant } from '../../types';
import { useToastStore } from '../../store/toast-store';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '../../components/ui/Checkbox';
import { StorageService } from '../../services/storage-service';
import { imageUrl } from '../../lib/image-url';
import { useFormatPrice } from '../../lib/format';
import { useSettingsStore } from '../../store/settings-store';
import { EntitySeoFields } from '../../components/admin/SeoFields';
import { Pagination, usePagination } from '../../components/admin/Pagination';
import { slugifyLabel } from '../../lib/taxonomy';
import { absoluteUrl } from '../../lib/seo';

const IMAGE_ASPECT_GUIDE =
  'Ideal upload: 1:1 (square), e.g. 1200×1200. Also good: 4:5 (e.g. 1080×1350). Avoid ultra-wide panoramas — the storefront letterboxes photos in a square stage, so square or near-square fills best.';

export const AdminProducts = () => {
  const fmt = useFormatPrice();
  const { t } = useTranslation();
  const { fetchData, products, deleteProduct, addProduct, updateProduct, categories, brands, isLoading } = useAdminStore();
  const settings = useSettingsStore(s => s.settings);
  const seoPages = useSettingsStore(s => s.seoPages);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [urlInputVisible, setUrlInputVisible] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const variantFileInputRef = useRef<HTMLInputElement>(null);
  const [variantUploadIndex, setVariantUploadIndex] = useState<number | null>(null);
  const addToast = useToastStore(s => s.addToast);

  const [formData, setFormDataRaw] = useState<Partial<Product>>({
    name: '', nameKa: '', slug: '', price: 0, compareAtPrice: 0,
    category: undefined, subCategory: '', inventoryQuantity: 0,
    description: '', descriptionKa: '', brand: undefined,
    images: [], videoPlaybackId: '', isTrending: false,
    tags: [], variants: [], metaTitle: '', metaDescription: '', metaKeywords: ''
  });

  // Every field edit routes through here so the close guard and the Save button
  // cannot disagree about whether there is unsaved work.
  const setFormData: typeof setFormDataRaw = (value) => {
    setFormDataRaw(value);
    setIsDirty(true);
  };

  const [isOnSale, setIsOnSale] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const subCategoryOptions = categories.find(c => c.slug === formData.category?.slug)?.subs || [];

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter(p => {
      const matchesSearch = !term
        || p.name.toLowerCase().includes(term)
        || (p.nameKa || '').toLowerCase().includes(term)
        || p.slug.toLowerCase().includes(term)
        || p.category.name.toLowerCase().includes(term)
        || p.brand.name.toLowerCase().includes(term);
      const matchesBrand = selectedBrand ? p.brand.id === selectedBrand : true;
      const matchesCategory = selectedCategory ? p.category.slug === selectedCategory : true;
      return matchesSearch && matchesBrand && matchesCategory;
    });
  }, [products, searchTerm, selectedBrand, selectedCategory]);

  const pager = usePagination(filteredProducts, 25, [searchTerm, selectedBrand, selectedCategory]);

  // A slug already in use would fail the unique index at insert time with a
  // Postgres error the admin cannot act on.
  const slugConflict = useMemo(() => {
    const slug = (formData.slug || '').trim();
    if (!slug) return false;
    return products.some(p => p.slug === slug && p.id !== editingId);
  }, [formData.slug, products, editingId]);

  const originalSlug = editingId ? products.find(p => p.id === editingId)?.slug : undefined;
  const slugChanged = !!originalSlug && originalSlug !== (formData.slug || '').trim();

  const handleDelete = async (id: string) => {
    if(confirm('Are you sure? This will also delete images from storage.')) {
        const product = products.find(p => p.id === id);
        if (product?.images) {
            for (const img of product.images) {
                if (img.url.includes('supabase.co')) {
                    await StorageService.deleteFile(img.url);
                }
            }
        }
        await deleteProduct(id);
        addToast("Product deleted", "info");
    }
  };

  const openModal = (product?: Product) => {
    setUrlInputVisible(false);
    setRemoteUrl('');
    if (product) {
      setEditingId(product.id);
      setFormDataRaw({ ...product });
      setIsOnSale(!!product.compareAtPrice && product.compareAtPrice > product.price);
    } else {
      setEditingId(null);
      const defaultCat = categories[0];
      const defaultBrand = brands[0];
      setFormDataRaw({
        name: '', nameKa: '', slug: '', price: 0, compareAtPrice: 0,
        category: defaultCat ? { id: defaultCat.slug, name: defaultCat.label, slug: defaultCat.slug } : undefined,
        subCategory: defaultCat?.subs[0]?.slug || '', inventoryQuantity: 0,
        description: '', descriptionKa: '',
        brand: defaultBrand,
        images: [], videoPlaybackId: '', isNew: false, isTrending: false, tags: [], variants: [],
        metaTitle: '', metaTitleKa: '', metaDescription: '', metaDescriptionKa: '', metaKeywords: ''
      });
      setIsOnSale(false);
    }
    setIsDirty(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isDirty && !confirm('Close without saving? Your changes to this product will be lost.')) return;
    setIsModalOpen(false);
    setIsDirty(false);
  };

  // On a new product the slug tracks the name until the admin types their own.
  // On an existing one it never moves by itself: the URL is already indexed and
  // linked, and regenerating it silently would orphan every one of those links.
  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: editingId || (prev.slug && prev.slug !== slugifyLabel(prev.name || ''))
        ? prev.slug
        : slugifyLabel(name)
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const publicUrl = await StorageService.uploadFile(file, 'products');
        addImageToForm(publicUrl);
        addToast("Image uploaded successfully");
      } catch (err) {
        addToast("Failed to upload image. Make sure 'media' bucket exists.", "error");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoteUrlUpload = async () => {
    if (!remoteUrl) return;
    setIsUploading(true);
    try {
      const publicUrl = await StorageService.uploadFromUrl(remoteUrl, 'products');
      addImageToForm(publicUrl);
      setRemoteUrl('');
      setUrlInputVisible(false);
      addToast("Image fetched and saved");
    } catch (err) {
      addToast("Failed to fetch image. Check URL or CORS policy.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const addImageToForm = (url: string) => {
    setFormData(prev => ({
      ...prev,
      images: [
        ...(prev.images || []),
        {
          id: crypto.randomUUID(),
          url,
          // A sensible default the admin can refine; a raw filename would be
          // worse than nothing for screen readers.
          altText: prev.name?.trim() || '',
          isPrimary: (prev.images?.length || 0) === 0,
        }
      ]
    }));
  };

  const removeImage = async (img: any) => {
    try {
      if (img.url.includes('supabase.co')) {
        await StorageService.deleteFile(img.url);
      }
      setFormData(prev => {
        const images = (prev.images || []).filter(i => i.id !== img.id);
        // Removing the primary would otherwise leave the product with none.
        if (images.length && !images.some(i => i.isPrimary)) images[0].isPrimary = true;
        // Drop variant links that pointed at the deleted gallery file.
        const variants = (prev.variants || []).map(v => {
          if (v.imageUrl !== img.url) return v;
          const { imageUrl: _removed, ...rest } = v;
          return rest;
        });
        return { ...prev, images, variants };
      });
    } catch (e) {
      addToast("Failed to delete image", "error");
    }
  };

  const setPrimaryImage = (id: string) => {
    setFormData(prev => ({
      ...prev,
      images: (prev.images || []).map(i => ({ ...i, isPrimary: i.id === id })),
    }));
  };

  const setImageAlt = (id: string, altText: string) => {
    setFormData(prev => ({
      ...prev,
      images: (prev.images || []).map(i => (i.id === id ? { ...i, altText } : i)),
    }));
  };

  const selectCategory = (slug: string) => {
    const cat = categories.find(c => c.slug === slug);
    if (!cat) return;
    setFormData(prev => ({
      ...prev,
      category: { id: cat.slug, slug: cat.slug, name: cat.label },
      subCategory: cat.subs.some(s => s.slug === prev.subCategory)
        ? prev.subCategory
        : (cat.subs[0]?.slug || ''),
    }));
  };

  const selectBrand = (id: string) => {
    const brand = brands.find(b => b.id === id);
    if (!brand) return;
    setFormData(prev => ({ ...prev, brand }));
  };

  const updateVariant = (index: number, patch: Partial<ProductVariant>) => {
    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  };

  const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const index = variantUploadIndex;
    if (!file || index == null) return;
    setIsUploading(true);
    try {
      const publicUrl = await StorageService.uploadFile(file, 'products');
      addImageToForm(publicUrl);
      updateVariant(index, { imageUrl: publicUrl });
      addToast('Variant image uploaded');
    } catch {
      addToast("Failed to upload image. Make sure 'media' bucket exists.", 'error');
    } finally {
      setIsUploading(false);
      setVariantUploadIndex(null);
      if (variantFileInputRef.current) variantFileInputRef.current.value = '';
    }
  };

  const clearVariantImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).map((v, i) => {
        if (i !== index) return v;
        const { imageUrl: _removed, ...rest } = v;
        return rest;
      }),
    }));
  };

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [
        ...(prev.variants || []),
        { id: crypto.randomUUID(), name: '', inventoryQuantity: 0, sku: '' },
      ],
    }));
  };

  const removeVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      // Better to block the save than to persist a placeholder URL that then
      // looks like a real image everywhere the product is listed.
      if (!formData.images?.length) {
        addToast('Add at least one product image before saving', 'error');
        return;
      }

      const slug = (formData.slug || '').trim() || slugifyLabel(formData.name || '');
      if (!slug) {
        addToast('This product needs a URL slug', 'error');
        return;
      }
      if (slugConflict) {
        addToast('Another product already uses that URL slug', 'error');
        return;
      }
      if (slugChanged && !confirm(
        `Changing the URL from /product/${originalSlug} to /product/${slug} breaks every existing link and its search ranking. Continue?`
      )) return;

      // A variant with no name is an empty row the admin never filled in.
      const variants = (formData.variants || [])
        .filter(v => v.name.trim())
        .map(v => {
          const cleaned: ProductVariant = {
            id: v.id,
            name: v.name.trim(),
            inventoryQuantity: Number(v.inventoryQuantity) || 0,
            sku: v.sku?.trim() || undefined,
            price: v.price === undefined || v.price === null || Number.isNaN(Number(v.price))
              ? undefined
              : Number(v.price),
          };
          const imageUrl = v.imageUrl?.trim();
          if (imageUrl) cleaned.imageUrl = imageUrl;
          return cleaned;
        });

      const productPayload: Product = {
          ...formData,
          id: editingId || crypto.randomUUID(),
          slug,
          price: Number(formData.price),
          compareAtPrice: isOnSale ? Number(formData.compareAtPrice) : undefined,
          inventoryQuantity: Number(formData.inventoryQuantity),
          variants,
          tags: (formData.tags || []).map(tag => tag.trim()).filter(Boolean),
          images: formData.images || []
      } as Product;

      setIsSaving(true);
      try {
        if (editingId) await updateProduct(productPayload);
        else await addProduct(productPayload);

        setIsDirty(false);
        setIsModalOpen(false);
        addToast(editingId ? "Updated" : "Created");
      } catch (err) {
        addToast(err instanceof Error ? err.message : "Failed to save product", "error");
      } finally {
        setIsSaving(false);
      }
  };

  const productPreviewUrl = absoluteUrl(
    settings.siteUrl,
    `/product/${(formData.slug || 'your-product').trim()}`
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="font-heading text-3xl font-bold text-gray-900">{t('admin.products')}</h1>
           <p className="text-gray-500">{t('admin.manageCatalog')}</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => openModal()} leftIcon={<Plus className="w-4 h-4" />}>{t('admin.add')}</Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
                type="text" placeholder={`${t('common.search')}...`}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-brand-green outline-none"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:ring-1 focus:ring-brand-green outline-none md:w-52"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:ring-1 focus:ring-brand-green outline-none md:w-52"
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
          >
            <option value="">All brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
         {isLoading && products.length === 0 ? (
           <div className="flex items-center justify-center py-24">
             <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
           </div>
         ) : filteredProducts.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
             <PackageOpen className="w-10 h-10 text-gray-300 mb-3" />
             <p className="font-medium text-gray-900">
               {products.length === 0 ? 'No products yet' : 'Nothing matches those filters'}
             </p>
             <p className="text-sm text-gray-500 mt-1 max-w-sm">
               {products.length === 0
                 ? 'Add your first product to start filling the storefront.'
                 : 'Try a different search term, category or brand.'}
             </p>
             {products.length === 0 && (
               <Button onClick={() => openModal()} className="mt-5" leftIcon={<Plus className="w-4 h-4" />}>
                 {t('admin.add')}
               </Button>
             )}
           </div>
         ) : (
           <>
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                   <tr>
                     <th className="px-6 py-4">{t('filters.products')}</th>
                     <th className="px-6 py-4">{t('admin.price')}</th>
                     <th className="px-6 py-4">{t('admin.inventory')}</th>
                     <th className="px-6 py-4 text-right">{t('common.actions')}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pager.pageItems.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-50 rounded overflow-hidden flex-shrink-0">
                             <img src={imageUrl(product.images[0]?.url || '', { width: 80 })} alt="" className="w-full h-full object-contain p-0.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 line-clamp-1">{product.name}</p>
                            <p className="text-xs text-gray-400 line-clamp-1">/{product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{fmt(product.price)}</td>
                      <td className="px-6 py-4">
                        <span className={product.inventoryQuantity === 0 ? 'text-red-500 font-medium' : ''}>
                          {product.inventoryQuantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2">
                            <button onClick={() => openModal(product)} className="p-2 text-gray-400 hover:text-brand-green transition-colors"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
             <Pagination
               page={pager.page}
               pageCount={pager.pageCount}
               total={pager.total}
               firstIndex={pager.firstIndex}
               lastIndex={pager.lastIndex}
               onChange={pager.setPage}
               noun="products"
             />
           </>
         )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl relative z-10 flex flex-col max-h-[90vh] animate-scale-in">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="font-heading font-bold text-xl">{editingId ? t('admin.edit') : t('admin.add')}</h2>
                    <button onClick={closeModal}><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-8">
                    <form id="productForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <Input label="Name (English)" value={formData.name} onChange={e => handleNameChange(e.target.value)} required />
                            <Input label="Name (Georgian)" value={formData.nameKa || ''} onChange={e => setFormData({...formData, nameKa: e.target.value})} />
                        </div>

                        <div>
                            <Input
                                label="URL slug"
                                value={formData.slug || ''}
                                onChange={e => setFormData({...formData, slug: slugifyLabel(e.target.value)})}
                                error={slugConflict ? 'Another product already uses this slug' : undefined}
                                leftIcon={<span className="text-xs text-gray-400">/product/</span>}
                                className="pl-[70px]"
                            />
                            {slugChanged && !slugConflict && (
                                <p className="mt-2 text-xs text-amber-600 flex items-start gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                                    Was <code>/{originalSlug}</code>. Existing links and search results pointing at the old address will stop working.
                                </p>
                            )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <Input label="Price" type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required />
                            <div>
                                <div className="mb-2">
                                    <Checkbox label="On sale" checked={isOnSale} onChange={setIsOnSale} />
                                </div>
                                <Input
                                    type="number" step="0.01" placeholder="Compare-at price"
                                    disabled={!isOnSale}
                                    value={formData.compareAtPrice ?? 0}
                                    onChange={e => setFormData({...formData, compareAtPrice: Number(e.target.value)})}
                                />
                            </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                             <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Images</label>
                             <button 
                                type="button" 
                                onClick={() => setUrlInputVisible(!urlInputVisible)}
                                className="text-xs font-bold text-brand-green flex items-center gap-1 hover:underline"
                             >
                                <LinkIcon className="w-3 h-3" /> {urlInputVisible ? "Hide URL Input" : "Add via URL"}
                             </button>
                          </div>
                          <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">{IMAGE_ASPECT_GUIDE}</p>
                          
                          {urlInputVisible && (
                             <div className="mb-4 flex gap-2 animate-fade-in">
                                <Input 
                                   placeholder="Paste image URL here..." 
                                   value={remoteUrl} 
                                   onChange={e => setRemoteUrl(e.target.value)}
                                   className="flex-1"
                                />
                                <Button 
                                   type="button" 
                                   onClick={handleRemoteUrlUpload} 
                                   isLoading={isUploading}
                                   disabled={!remoteUrl}
                                >
                                   Save
                                </Button>
                             </div>
                          )}

                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                            {formData.images?.map((img) => (
                              <div key={img.id} className="space-y-1.5">
                                <div className={`relative aspect-square rounded-lg overflow-hidden border-2 group bg-gray-50 ${img.isPrimary ? 'border-brand-green' : 'border-gray-200'}`}>
                                  <img src={imageUrl(img.url, { width: 240 })} alt={img.altText} className="w-full h-full object-contain p-0.5" />
                                  <button type="button" onClick={() => removeImage(img)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><X className="w-3 h-3" /></button>
                                  {img.isPrimary ? (
                                    <div className="absolute bottom-0 left-0 right-0 bg-brand-green text-[8px] text-white text-center font-bold py-0.5">PRIMARY</div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setPrimaryImage(img.id)}
                                      className="absolute bottom-0 left-0 right-0 bg-gray-900/70 text-[8px] text-white text-center font-bold py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      MAKE PRIMARY
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  value={img.altText}
                                  onChange={e => setImageAlt(img.id, e.target.value)}
                                  placeholder="Alt text"
                                  title="Describes the image for screen readers and search engines"
                                  className="w-full p-1.5 border border-gray-200 rounded text-[10px] outline-none focus:border-brand-green"
                                />
                              </div>
                            ))}
                            <button
                              type="button" disabled={isUploading}
                              onClick={() => fileInputRef.current?.click()}
                              className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-brand-green hover:text-brand-green transition-all bg-gray-50/50"
                            >
                               {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
                               <span className="text-[10px] font-bold mt-1">UPLOAD</span>
                            </button>
                          </div>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">Category</label>
                                <select className="w-full p-3 border rounded-lg text-sm bg-white" value={formData.category?.slug || ''} onChange={e => selectCategory(e.target.value)}>
                                    {categories.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">Sub-category</label>
                                <select className="w-full p-3 border rounded-lg text-sm bg-white" value={formData.subCategory || ''} onChange={e => setFormData({...formData, subCategory: e.target.value})}>
                                    <option value="">None</option>
                                    {subCategoryOptions.map(s => <option key={s.slug} value={s.slug}>{s.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">Brand</label>
                                <select className="w-full p-3 border rounded-lg text-sm bg-white" value={formData.brand?.id || ''} onChange={e => selectBrand(e.target.value)}>
                                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 items-end">
                            <Input
                                label="Inventory Stock"
                                type="number"
                                value={formData.inventoryQuantity}
                                onChange={e => setFormData({...formData, inventoryQuantity: Number(e.target.value)})}
                            />
                            <div className="flex gap-6 pb-3">
                                <Checkbox label="New arrival" checked={!!formData.isNew} onChange={v => setFormData({...formData, isNew: v})} />
                                <Checkbox label="Trending" checked={!!formData.isTrending} onChange={v => setFormData({...formData, isTrending: v})} />
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl space-y-4">
                            <h4 className="text-xs font-bold uppercase text-gray-500">Description (English)</h4>
                            <textarea 
                                className="w-full p-3 border rounded-lg text-sm bg-white focus:ring-1 focus:ring-brand-green outline-none min-h-[120px]" 
                                rows={4} 
                                value={formData.description} 
                                onChange={e => setFormData({...formData, description: e.target.value})} 
                            />
                            <h4 className="text-xs font-bold uppercase text-gray-500">Description (Georgian)</h4>
                            <textarea
                                className="w-full p-3 border rounded-lg text-sm bg-white focus:ring-1 focus:ring-brand-green outline-none min-h-[120px]"
                                rows={4}
                                value={formData.descriptionKa || ''}
                                onChange={e => setFormData({...formData, descriptionKa: e.target.value})}
                            />
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><Sliders className="w-3.5 h-3.5" /> Variants</h4>
                                <button type="button" onClick={addVariant} className="text-xs font-bold text-brand-green flex items-center gap-1 hover:underline">
                                    <Plus className="w-3 h-3" /> Add variant
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-400 leading-relaxed">
                              Optional photo per variant shows on the product detail page when that option is selected. Pick from the product gallery above, or upload a new one (it is also added to the gallery). {IMAGE_ASPECT_GUIDE}
                            </p>
                            {(formData.variants || []).length === 0 && (
                                <p className="text-xs text-gray-400">No variants. The product is sold as a single option using the inventory above.</p>
                            )}
                            {(formData.variants || []).map((variant, index) => (
                                <div key={variant.id} className="bg-white border border-gray-100 rounded-xl p-3 space-y-3">
                                    <div className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-4">
                                            <Input placeholder="Name (e.g. 50ml)" value={variant.name} onChange={e => updateVariant(index, { name: e.target.value })} />
                                        </div>
                                        <div className="col-span-3">
                                            <Input placeholder="SKU" value={variant.sku || ''} onChange={e => updateVariant(index, { sku: e.target.value })} />
                                        </div>
                                        <div className="col-span-2">
                                            <Input type="number" step="0.01" placeholder="Price" value={variant.price ?? ''} onChange={e => updateVariant(index, { price: e.target.value === '' ? undefined : Number(e.target.value) })} />
                                        </div>
                                        <div className="col-span-2">
                                            <Input type="number" placeholder="Stock" value={variant.inventoryQuantity} onChange={e => updateVariant(index, { inventoryQuantity: Number(e.target.value) })} />
                                        </div>
                                        <button type="button" onClick={() => removeVariant(index)} className="col-span-1 p-2 text-gray-400 hover:text-red-500 transition-colors justify-self-center">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap items-start gap-3 pt-1 border-t border-gray-50">
                                        <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                                          {variant.imageUrl ? (
                                            <img src={imageUrl(variant.imageUrl, { width: 112 })} alt="" className="w-full h-full object-contain p-0.5" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-300 font-bold text-center px-1">No photo</div>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-[180px] space-y-2">
                                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Variant photo</p>
                                          {(formData.images || []).length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                              {(formData.images || []).map(img => (
                                                <button
                                                  key={img.id}
                                                  type="button"
                                                  title="Use this gallery image"
                                                  onClick={() => updateVariant(index, { imageUrl: img.url })}
                                                  className={`w-9 h-9 rounded-md overflow-hidden border-2 bg-gray-50 ${variant.imageUrl === img.url ? 'border-brand-green ring-1 ring-brand-green' : 'border-transparent hover:border-gray-200'}`}
                                                >
                                                  <img src={imageUrl(img.url, { width: 72 })} alt="" className="w-full h-full object-contain p-0.5" />
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                          <div className="flex flex-wrap gap-2">
                                            <button
                                              type="button"
                                              disabled={isUploading}
                                              onClick={() => {
                                                setVariantUploadIndex(index);
                                                variantFileInputRef.current?.click();
                                              }}
                                              className="text-[11px] font-bold text-brand-green hover:underline disabled:opacity-50"
                                            >
                                              Upload new
                                            </button>
                                            {variant.imageUrl && (
                                              <button
                                                type="button"
                                                onClick={() => clearVariantImage(index)}
                                                className="text-[11px] font-bold text-gray-400 hover:text-red-500"
                                              >
                                                Clear photo
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <input
                              type="file"
                              ref={variantFileInputRef}
                              className="hidden"
                              accept="image/*"
                              onChange={handleVariantImageUpload}
                            />
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl space-y-4">
                            <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><Tag className="w-3.5 h-3.5" /> Tags</h4>
                            <Input
                                placeholder="Comma separated, e.g. serum, dry, brightening"
                                value={(formData.tags || []).join(', ')}
                                onChange={e => setFormData({...formData, tags: e.target.value.split(',')})}
                            />
                            <p className="text-xs text-gray-400">Skin-type tags (normal, oily, dry, combination, sensitive) drive the storefront skin-type filter.</p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl space-y-4">
                            <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><PlayCircle className="w-3.5 h-3.5" /> Video</h4>
                            <Input
                                label="Mux playback ID"
                                placeholder="Leave blank for no video"
                                value={formData.videoPlaybackId || ''}
                                onChange={e => setFormData({...formData, videoPlaybackId: e.target.value})}
                            />
                            {formData.videoPlaybackId && (
                                <div className="rounded-lg overflow-hidden max-w-xs">
                                    <MuxPlayer playbackId={formData.videoPlaybackId} streamType="on-demand" />
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl">
                            <EntitySeoFields
                                value={formData}
                                onChange={patch => setFormData(prev => ({ ...prev, ...patch }))}
                                generatedTitle={`${formData.name || 'Product name'}${formData.brand ? ` | ${formData.brand.name}` : ''}`}
                                generatedDescription={formData.description || ''}
                                previewUrl={productPreviewUrl}
                                siteName={settings.storeName}
                                titleTemplate={seoPages.titleTemplate}
                            />
                        </div>
                    </form>
                </div>
                
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                    <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                    <Button type="submit" form="productForm" isLoading={isSaving} disabled={slugConflict}>Save Changes</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

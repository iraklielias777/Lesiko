
import React, { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Tag, Edit2, X, Package, UploadCloud, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../../store/admin-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToastStore } from '../../store/toast-store';
import { Brand } from '../../types';
import { StorageService } from '../../services/storage-service';
import { useSettingsStore } from '../../store/settings-store';
import { EntitySeoFields } from '../../components/admin/SeoFields';
import { absoluteUrl } from '../../lib/seo';
import { slugifyLabel } from '../../lib/taxonomy';

export const AdminBrands = () => {
  const { t } = useTranslation();
  const { brands, products, fetchData, addBrand, updateBrand, deleteBrand, isLoading } = useAdminStore();
  const addToast = useToastStore(s => s.addToast);
  const settings = useSettingsStore(s => s.settings);
  const seoPages = useSettingsStore(s => s.seoPages);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [urlInputVisible, setUrlInputVisible] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [formData, setFormData] = useState<Partial<Brand>>({ name: '', description: '', image: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Swapping the logo orphans the previous object; it is removed once the save
  // lands so cancelling out of the modal cannot delete a live image.
  const [replacedImages, setReplacedImages] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const setImage = (url: string) => {
      setFormData(prev => {
          if (prev.image && prev.image !== url && prev.image.includes('supabase.co')) {
              setReplacedImages(current => [...current, prev.image!]);
          }
          return { ...prev, image: url };
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name?.trim() || isSaving) return;

      setIsSaving(true);
      try {
          const slug = slugifyLabel(formData.slug?.trim() || formData.name);
          if (!slug) {
              addToast('This brand needs a URL slug', 'error');
              return;
          }
          if (brands.some(b => b.slug === slug && b.id !== editingId)) {
              addToast('Another brand already uses that URL slug', 'error');
              return;
          }

          if (editingId) {
              const existing = brands.find(b => b.id === editingId);
              if (!existing) return;
              if (existing.slug !== slug && !window.confirm(
                  `Move this brand from /brand/${existing.slug} to /brand/${slug}? Any link to the old address will stop working.`
              )) return;
              await updateBrand({ ...existing, ...formData, name: formData.name, slug } as Brand);
              addToast('Brand updated');
          } else {
              await addBrand({ ...formData, id: crypto.randomUUID(), name: formData.name, slug } as Brand);
              addToast(t('admin.brandAdded'));
          }

          for (const url of replacedImages) await StorageService.deleteFile(url);
          closeModal();
      } catch (err) {
          addToast(err instanceof Error ? err.message : 'Failed to save brand', 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const openModal = (brand?: Brand) => {
      setEditingId(brand?.id ?? null);
      setFormData(brand ? { ...brand } : { name: '', slug: '', description: '', image: '' });
      setReplacedImages([]);
      setRemoteUrl('');
      setUrlInputVisible(false);
      setIsModalOpen(true);
  };

  const closeModal = () => {
      // Any modal that still has local edits (including a pending image swap)
      // should ask before discarding — Cancel and the backdrop share this path.
      if ((formData.name || formData.description || formData.image || replacedImages.length) &&
          !window.confirm('Close without saving? Your brand changes will be lost.')) {
        return;
      }
      setIsModalOpen(false);
      setEditingId(null);
      setReplacedImages([]);
      setFormData({ name: '', description: '', image: '' });
      setRemoteUrl('');
      setUrlInputVisible(false);
  };

  const handleDelete = async (id: string) => {
      const brand = brands.find(b => b.id === id);
      if (window.confirm(t('admin.deleteBrandConfirm'))) {
          if (brand?.image?.includes('supabase.co')) {
              await StorageService.deleteFile(brand.image);
          }
          await deleteBrand(id);
          addToast(t('admin.brandDeleted'), 'info');
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsUploading(true);
          try {
              const publicUrl = await StorageService.uploadFile(file, 'brands');
              setImage(publicUrl);
              addToast("Brand logo uploaded");
          } catch (err) {
              addToast("Upload failed", "error");
          } finally {
              setIsUploading(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      }
  };

  const handleFetchFromUrl = async () => {
      if (!remoteUrl) return;
      setIsUploading(true);
      try {
          const publicUrl = await StorageService.uploadFromUrl(remoteUrl, 'brands');
          setImage(publicUrl);
          setUrlInputVisible(false);
          setRemoteUrl('');
          addToast("Logo fetched and saved to storage");
      } catch (err) {
          addToast("Failed to fetch image", "error");
      } finally {
          setIsUploading(false);
      }
  };

  const getProductCount = (brandId: string) => {
      return products.filter(p => p.brand.id === brandId).length;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="font-heading text-3xl font-bold text-gray-900">{t('admin.brands')}</h1>
                <p className="text-gray-500">{t('admin.manageBrands')}</p>
            </div>
            <Button onClick={() => openModal()} leftIcon={<Plus className="w-4 h-4"/>}>{t('admin.addBrand')}</Button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {isLoading && brands.length === 0 ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
                </div>
            ) : brands.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <Tag className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="font-medium text-gray-900">No brands yet</p>
                    <p className="text-sm text-gray-500 mt-1">Products need a brand, so add at least one before building the catalogue.</p>
                    <Button onClick={() => openModal()} className="mt-5" leftIcon={<Plus className="w-4 h-4"/>}>{t('admin.addBrand')}</Button>
                </div>
            ) : (
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4">{t('common.image')}</th>
                        <th className="px-6 py-4">{t('admin.brandName')}</th>
                        <th className="px-6 py-4">{t('admin.slug')}</th>
                        <th className="px-6 py-4">{t('filters.products')}</th>
                        <th className="px-6 py-4 text-right">{t('common.actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {brands.map((brand) => (
                        <tr key={brand.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                    {brand.image ? (
                                        <img src={brand.image} alt={brand.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <Tag className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="font-bold text-gray-900">{brand.name}</div>
                                {brand.description && <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{brand.description}</div>}
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">{brand.slug}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                                    <Package className="w-3 h-3" />
                                    {getProductCount(brand.id)}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button
                                    onClick={() => openModal(brand)}
                                    title="Edit brand"
                                    className="p-2 text-gray-400 hover:text-brand-green hover:bg-gray-100 rounded transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(brand.id)}
                                    title="Delete brand"
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            )}
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative z-10 animate-scale-in overflow-hidden">
                    <div className="flex justify-between items-center p-6 border-b border-gray-100">
                        <h2 className="font-heading font-bold text-xl">{editingId ? 'Edit Brand' : t('admin.addBrand')}</h2>
                        <button onClick={closeModal}><X className="w-5 h-5 text-gray-500" /></button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold uppercase text-gray-500">Brand Logo</label>
                                <button 
                                    type="button" 
                                    onClick={() => setUrlInputVisible(!urlInputVisible)}
                                    className="text-[10px] font-bold text-brand-green flex items-center gap-1 hover:underline"
                                >
                                    <LinkIcon className="w-3 h-3" /> {urlInputVisible ? "Hide URL" : "Fetch via URL"}
                                </button>
                            </div>

                            {urlInputVisible && (
                                <div className="mb-4 flex gap-2 animate-fade-in">
                                    <Input 
                                        placeholder="Paste image URL..." 
                                        value={remoteUrl} 
                                        onChange={e => setRemoteUrl(e.target.value)}
                                        className="flex-1 !py-2 !text-xs"
                                    />
                                    <Button 
                                        type="button" 
                                        size="sm"
                                        onClick={handleFetchFromUrl} 
                                        isLoading={isUploading}
                                        disabled={!remoteUrl}
                                    >
                                        Fetch
                                    </Button>
                                </div>
                            )}

                            <div 
                                onClick={() => !isUploading && fileInputRef.current?.click()}
                                className="w-full h-40 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-brand-green hover:text-brand-green hover:bg-brand-green/5 transition-all overflow-hidden relative group"
                            >
                                {isUploading ? (
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                ) : formData.image ? (
                                    <>
                                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                            Change Image
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="w-8 h-8 mb-2" />
                                        <span className="text-xs font-bold uppercase">{t('admin.uploadCover')}</span>
                                    </>
                                )}
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                            />
                        </div>

                        <Input 
                            label={t('admin.brandName') as string} 
                            value={formData.name} 
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                name: e.target.value,
                                // A new brand's slug follows its name until the admin edits it;
                                // an existing brand's address never moves by itself.
                                slug: editingId || (prev.slug && prev.slug !== slugifyLabel(prev.name || ''))
                                    ? prev.slug
                                    : slugifyLabel(e.target.value),
                            }))} 
                            placeholder="e.g. LesiKo Lab"
                            required
                        />

                        <div>
                            <Input
                                label="URL slug"
                                value={formData.slug || ''}
                                onChange={e => setFormData({ ...formData, slug: slugifyLabel(e.target.value) })}
                                leftIcon={<span className="text-xs text-gray-400">/brand/</span>}
                                className="pl-[64px]"
                            />
                            {editingId && (() => {
                                const existing = brands.find(b => b.id === editingId);
                                return existing && existing.slug !== (formData.slug || '') ? (
                                    <p className="mt-2 text-xs text-amber-600">
                                        Was <code>/brand/{existing.slug}</code>. Existing links to the old address will stop working.
                                    </p>
                                ) : null;
                            })()}
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">{t('admin.brandDescLabel')}</label>
                            <textarea 
                                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-brand-green outline-none" 
                                rows={2}
                                value={formData.description || ''}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                placeholder="..."
                            ></textarea>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <EntitySeoFields
                                value={formData}
                                onChange={patch => setFormData(prev => ({ ...prev, ...patch }))}
                                generatedTitle={formData.name || 'Brand name'}
                                generatedDescription={formData.description || ''}
                                previewUrl={absoluteUrl(
                                    settings.siteUrl,
                                    `/brand/${editingId ? brands.find(b => b.id === editingId)?.slug : slugifyLabel(formData.name || 'your-brand')}`
                                )}
                                siteName={settings.storeName}
                                titleTemplate={seoPages.titleTemplate}
                            />
                        </div>
                    </form>
                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={closeModal}>{t('common.cancel')}</Button>
                        <Button type="submit" onClick={handleSubmit} disabled={isUploading} isLoading={isSaving}>
                            {editingId ? t('admin.saveChanges') : t('admin.add')}
                        </Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

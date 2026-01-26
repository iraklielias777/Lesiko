
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChevronRight, Save, Info, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../../store/admin-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToastStore } from '../../store/toast-store';
import { CategoryHierarchyItem } from '../../types';

export const AdminCategories = () => {
  const { t } = useTranslation();
  const { categories, fetchCategories, updateCategories } = useAdminStore();
  const addToast = useToastStore(s => s.addToast);
  
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [tempData, setTempData] = useState<CategoryHierarchyItem[]>([]);
  const [newSubFilter, setNewSubFilter] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setTempData(categories);
  }, [categories]);

  const handleSaveAll = async () => {
      await updateCategories(tempData);
      addToast(t('admin.savedSuccess'));
  };

  const handleAddMainCategory = () => {
      const newSlug = `new-category-${Date.now()}`;
      setTempData([...tempData, {
          slug: newSlug,
          label: t('admin.newCategoryName'),
          subs: []
      }]);
      setEditingSlug(newSlug);
  };

  const handleDeleteMainCategory = (slug: string) => {
      if(window.confirm(t('admin.deleteCategoryConfirm'))) {
          setTempData(tempData.filter(c => c.slug !== slug));
      }
  };

  const handleAddSub = (catSlug: string) => {
      if (!newSubFilter.trim()) return;
      setTempData(tempData.map(c => {
          if (c.slug === catSlug) {
              return { ...c, subs: [...c.subs, newSubFilter] };
          }
          return c;
      }));
      setNewSubFilter('');
  };

  const handleDeleteSub = (catSlug: string, sub: string) => {
      setTempData(tempData.map(c => {
          if (c.slug === catSlug) {
              return { ...c, subs: c.subs.filter(s => s !== sub) };
          }
          return c;
      }));
  };

  // Only auto-update slug if it's a newly created category (starts with 'new-category-')
  // This prevents breaking links for existing categories when renaming them.
  const updateLabel = (slug: string, newLabel: string) => {
      setTempData(tempData.map(c => {
          if (c.slug === slug) {
              const isTemp = c.slug.startsWith('new-category-');
              const newSlug = isTemp ? newLabel.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') : c.slug;
              return { ...c, label: newLabel, slug: newSlug };
          }
          return c;
      }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && uploadingSlug) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setTempData(tempData.map(c => {
                  if (c.slug === uploadingSlug) {
                      return { ...c, image: reader.result as string };
                  }
                  return c;
              }));
              setUploadingSlug(null);
              // Reset file input
              if(fileInputRef.current) fileInputRef.current.value = '';
          };
          reader.readAsDataURL(file);
      }
  };

  const removeImage = (slug: string) => {
      setTempData(tempData.map(c => {
          if (c.slug === slug) {
              return { ...c, image: undefined };
          }
          return c;
      }));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="font-heading text-3xl font-bold text-gray-900">{t('admin.categoryHierarchy')}</h1>
                <p className="text-gray-500">{t('admin.manageTaxonomy')}</p>
            </div>
            <div className="flex gap-3">
                <Button variant="outline" onClick={() => setTempData(categories)}>{t('admin.reset')}</Button>
                <Button onClick={handleSaveAll} leftIcon={<Save className="w-4 h-4"/>}>{t('admin.saveChanges')}</Button>
            </div>
        </div>

        <div className="grid gap-6">
            {tempData.map((cat, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6 group/card">
                    {/* Category Image - Enhanced UI */}
                    <div className="flex-shrink-0">
                        <div className="w-32 h-32 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden relative group hover:border-brand-green transition-colors">
                            {cat.image ? (
                                <>
                                    <img src={cat.image} alt={cat.label} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                        <button 
                                            onClick={() => { setUploadingSlug(cat.slug); fileInputRef.current?.click(); }}
                                            className="text-white text-xs font-bold hover:underline"
                                        >
                                            {t('common.change')}
                                        </button>
                                        <button 
                                            onClick={() => removeImage(cat.slug)}
                                            className="text-red-400 text-xs font-bold hover:text-red-300"
                                        >
                                            {t('common.remove')}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <button 
                                    onClick={() => { setUploadingSlug(cat.slug); fileInputRef.current?.click(); }}
                                    className="w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-brand-green"
                                >
                                    <ImageIcon className="w-8 h-8 mb-1" />
                                    <span className="text-xs font-medium">{t('admin.addImage')}</span>
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 text-center mt-2">{t('admin.recommendedSize')}</p>
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                            {editingSlug === cat.slug ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <Input 
                                        autoFocus
                                        value={cat.label} 
                                        onChange={(e) => updateLabel(cat.slug, e.target.value)}
                                        className="max-w-xs font-bold"
                                    />
                                    <button onClick={() => setEditingSlug(null)} className="p-2 text-green-600 hover:bg-green-50 rounded"><Check className="w-5 h-5"/></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-gray-900">{cat.label}</h3>
                                    {!cat.slug.startsWith('new-category-') && (
                                        <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded">/{cat.slug}</span>
                                    )}
                                    <button onClick={() => setEditingSlug(cat.slug)} className="text-gray-400 hover:text-brand-green p-1 hover:bg-gray-50 rounded transition-colors"><Edit2 className="w-4 h-4"/></button>
                                </div>
                            )}
                            <button onClick={() => handleDeleteMainCategory(cat.slug)} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-5 h-5"/></button>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                {t('admin.subFilters')}
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{cat.subs.length}</span>
                            </h4>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {cat.subs.map((sub, sIdx) => (
                                    <span key={sIdx} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm border border-gray-200 group">
                                        {sub}
                                        <button onClick={() => handleDeleteSub(cat.slug, sub)} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2 max-w-sm">
                                <input 
                                    type="text" 
                                    placeholder={t('admin.addSubPlaceholder')}
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = (e.target as HTMLInputElement).value;
                                            setNewSubFilter(val); 
                                            handleAddSub(cat.slug);
                                        }
                                    }}
                                    value={newSubFilter}
                                    onChange={(e) => setNewSubFilter(e.target.value)}
                                />
                                <Button size="sm" variant="secondary" onClick={() => handleAddSub(cat.slug)} disabled={!newSubFilter}>{t('admin.addBtn')}</Button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            <button 
                onClick={handleAddMainCategory}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:border-brand-green hover:text-brand-green hover:bg-brand-green/5 transition-all"
            >
                <Plus className="w-8 h-8 mb-2" />
                <span className="font-bold">{t('admin.addNewCategory')}</span>
            </button>
        </div>

        {/* Hidden File Input for Image Upload */}
        <input 
            type="file" 
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
        />
    </div>
  );
};

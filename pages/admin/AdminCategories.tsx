
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChevronRight, Save, Info, Image as ImageIcon, UploadCloud, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../../store/admin-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToastStore } from '../../store/toast-store';
import { CategoryHierarchyItem } from '../../types';
import { StorageService } from '../../services/storage-service';

export const AdminCategories = () => {
  const { t } = useTranslation();
  const { categories, fetchCategories, updateCategories } = useAdminStore();
  const addToast = useToastStore(s => s.addToast);
  
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [tempData, setTempData] = useState<CategoryHierarchyItem[]>([]);
  const [newSubValues, setNewSubValues] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setTempData(categories);
  }, [categories]);

  const handleSaveAll = async () => {
      try {
          await updateCategories(tempData);
          addToast(t('admin.savedSuccess'));
      } catch (err) {
          addToast("Failed to save changes", "error");
      }
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

  const handleAddSubCategory = (slug: string) => {
      const subValue = newSubValues[slug]?.trim();
      if (!subValue) return;

      setTempData(prev => prev.map(c => {
          if (c.slug === slug) {
              return { ...c, subs: [...(c.subs || []), subValue] };
          }
          return c;
      }));

      setNewSubValues(prev => ({ ...prev, [slug]: '' }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && uploadingSlug) {
          setIsUploading(true);
          try {
              const publicUrl = await StorageService.uploadFile(file, 'categories');
              updateCategoryImage(uploadingSlug, publicUrl);
              addToast("Category image saved");
          } catch (e) {
              addToast("Upload failed", "error");
          } finally {
              setIsUploading(false);
              setUploadingSlug(null);
              if(fileInputRef.current) fileInputRef.current.value = '';
          }
      }
  };

  const handleUrlUpload = async (slug: string) => {
      if (!remoteUrl) return;
      setIsUploading(true);
      try {
          const publicUrl = await StorageService.uploadFromUrl(remoteUrl, 'categories');
          updateCategoryImage(slug, publicUrl);
          setShowUrlInput(null);
          setRemoteUrl('');
          addToast("Image fetched and saved");
      } catch (e) {
          addToast("Failed to fetch image", "error");
      } finally {
          setIsUploading(false);
      }
  };

  const updateCategoryImage = (slug: string, url: string) => {
      setTempData(tempData.map(c => c.slug === slug ? { ...c, image: url } : c));
  };

  const removeImage = async (slug: string, url?: string) => {
      if (url?.includes('supabase.co')) {
          await StorageService.deleteFile(url);
      }
      setTempData(tempData.map(c => c.slug === slug ? { ...c, image: undefined } : c));
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
            {tempData.map((cat) => (
                <div key={cat.slug} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6 group/card">
                    <div className="flex-shrink-0 w-32">
                        <div className="w-32 h-32 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden relative group hover:border-brand-green transition-colors">
                            {cat.image ? (
                                <>
                                    <img src={cat.image} alt={cat.label} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                        <button onClick={() => { setUploadingSlug(cat.slug); fileInputRef.current?.click(); }} className="text-white text-xs font-bold hover:underline">Change</button>
                                        <button onClick={() => removeImage(cat.slug, cat.image)} className="text-red-400 text-xs font-bold hover:text-red-300">Remove</button>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                    {isUploading && uploadingSlug === cat.slug ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        <>
                                            <button onClick={() => { setUploadingSlug(cat.slug); fileInputRef.current?.click(); }} className="hover:text-brand-green transition-colors"><UploadCloud className="w-8 h-8 mb-1" /></button>
                                            <button onClick={() => setShowUrlInput(cat.slug)} className="hover:text-brand-green transition-colors"><LinkIcon className="w-5 h-5 mt-1" /></button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        {showUrlInput === cat.slug && (
                           <div className="mt-2 space-y-2 animate-fade-in">
                              <input 
                                 type="text" 
                                 className="w-full p-1.5 text-[10px] border rounded" 
                                 placeholder="Paste image URL" 
                                 value={remoteUrl}
                                 onChange={e => setRemoteUrl(e.target.value)}
                              />
                              <div className="flex gap-1">
                                 <button onClick={() => handleUrlUpload(cat.slug)} className="bg-brand-green text-white text-[10px] px-2 py-1 rounded flex-1">Save</button>
                                 <button onClick={() => setShowUrlInput(null)} className="bg-gray-200 text-gray-600 text-[10px] px-2 py-1 rounded flex-1">X</button>
                              </div>
                           </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                            {editingSlug === cat.slug ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <Input value={cat.label} onChange={(e) => setTempData(tempData.map(c => c.slug === cat.slug ? {...c, label: e.target.value} : c))} className="max-w-xs font-bold" />
                                    <button onClick={() => setEditingSlug(null)} className="p-2 text-green-600"><Check className="w-5 h-5"/></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-gray-900">{cat.label}</h3>
                                    <button onClick={() => setEditingSlug(cat.slug)} className="text-gray-400 hover:text-brand-green"><Edit2 className="w-4 h-4"/></button>
                                </div>
                            )}
                            <button onClick={() => setTempData(tempData.filter(c => c.slug !== cat.slug))} className="text-gray-400 hover:text-red-600"><Trash2 className="w-5 h-5"/></button>
                        </div>

                        <div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {cat.subs.map((sub) => (
                                    <span key={sub} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm border">
                                        {sub}
                                        <button onClick={() => setTempData(tempData.map(c => c.slug === cat.slug ? {...c, subs: c.subs.filter(s => s !== sub)} : c))} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                                    </span>
                                ))}
                            </div>
                            
                            <div className="flex gap-2 max-w-xs">
                                <input 
                                    type="text" 
                                    placeholder={t('admin.addSubPlaceholder')}
                                    className="flex-1 p-2 border border-gray-200 rounded text-xs outline-none focus:border-brand-green"
                                    value={newSubValues[cat.slug] || ''}
                                    onChange={e => setNewSubValues({ ...newSubValues, [cat.slug]: e.target.value })}
                                    onKeyDown={e => e.key === 'Enter' && handleAddSubCategory(cat.slug)}
                                />
                                <button 
                                    onClick={() => handleAddSubCategory(cat.slug)}
                                    className="p-2 bg-gray-900 text-white rounded hover:bg-black transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            <button onClick={handleAddMainCategory} className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:border-brand-green hover:text-brand-green transition-all">
                <Plus className="w-8 h-8 mb-2" />
                <span className="font-bold">Add New Main Category</span>
            </button>
        </div>

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
};

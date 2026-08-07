
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Check, X, Save, UploadCloud, Link as LinkIcon, Loader2, ArrowUp, ArrowDown, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../../store/admin-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToastStore } from '../../store/toast-store';
import { CategoryHierarchyItem, SubCategory } from '../../types';
import { StorageService } from '../../services/storage-service';
import { slugifyLabel } from '../../lib/taxonomy';
import { useSettingsStore } from '../../store/settings-store';
import { EntitySeoFields } from '../../components/admin/SeoFields';
import { absoluteUrl } from '../../lib/seo';

export const AdminCategories = () => {
  const { t } = useTranslation();
  const { categories, fetchCategories, updateCategories } = useAdminStore();
  const addToast = useToastStore(s => s.addToast);
  const settings = useSettingsStore(s => s.settings);
  const seoPages = useSettingsStore(s => s.seoPages);

  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [tempData, setTempData] = useState<CategoryHierarchyItem[]>([]);
  const [newSubValues, setNewSubValues] = useState<Record<string, string>>({});
  const [editingSub, setEditingSub] = useState<{ category: string; sub: string } | null>(null);
  const [seoOpen, setSeoOpen] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // A saved category's slug is referenced by products.category_id, so only a
  // category that has never been saved can still have its slug regenerated.
  const [unsavedSlugs, setUnsavedSlugs] = useState<Set<string>>(new Set());

  // Storage objects are only deleted once the edit is actually saved, so
  // hitting Reset cannot destroy an image that is still referenced.
  const [pendingImageDeletes, setPendingImageDeletes] = useState<string[]>([]);

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

  const isDirty = JSON.stringify(tempData) !== JSON.stringify(categories);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const queueImageDelete = (url?: string) => {
    if (url && url.includes('supabase.co')) {
      setPendingImageDeletes(prev => [...prev, url]);
    }
  };

  const handleReset = () => {
    setTempData(categories);
    setPendingImageDeletes([]);
    setUnsavedSlugs(new Set());
    setEditingSlug(null);
    setEditingSub(null);
  };

  const handleSaveAll = async () => {
    const empty = tempData.find(c => !c.label.trim());
    if (empty) {
      addToast('Every category needs a name', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateCategories(tempData);

      for (const url of pendingImageDeletes) {
        await StorageService.deleteFile(url);
      }
      setPendingImageDeletes([]);
      setUnsavedSlugs(new Set());
      addToast(t('admin.savedSuccess'));
    } catch (err) {
      addToast('Failed to save changes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const uniqueSlug = (base: string, taken: string[]) => {
    const root = base || 'category';
    if (!taken.includes(root)) return root;
    let n = 2;
    while (taken.includes(`${root}-${n}`)) n++;
    return `${root}-${n}`;
  };

  const handleAddMainCategory = () => {
    const newSlug = uniqueSlug('new-category', tempData.map(c => c.slug));
    setTempData([...tempData, {
      slug: newSlug,
      label: t('admin.newCategoryName'),
      labelKa: '',
      subs: []
    }]);
    setUnsavedSlugs(prev => new Set(prev).add(newSlug));
    setEditingSlug(newSlug);
  };

  const patchCategory = (slug: string, patch: Partial<CategoryHierarchyItem>) => {
    setTempData(prev => prev.map(c => (c.slug === slug ? { ...c, ...patch } : c)));
  };

  const renameCategory = (slug: string, label: string) => {
    if (!unsavedSlugs.has(slug)) {
      patchCategory(slug, { label });
      return;
    }

    const nextSlug = uniqueSlug(
      slugifyLabel(label),
      tempData.filter(c => c.slug !== slug).map(c => c.slug),
    );
    setTempData(prev => prev.map(c => (c.slug === slug ? { ...c, label, slug: nextSlug } : c)));
    setUnsavedSlugs(prev => {
      const next = new Set(prev);
      next.delete(slug);
      next.add(nextSlug);
      return next;
    });
    if (editingSlug === slug) setEditingSlug(nextSlug);
  };

  const moveCategory = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= tempData.length) return;
    const next = [...tempData];
    [next[index], next[target]] = [next[target], next[index]];
    setTempData(next);
  };

  const deleteCategory = (cat: CategoryHierarchyItem) => {
    if (!confirm(`Delete "${cat.label}"? Products in it will lose their category.`)) return;
    queueImageDelete(cat.image);
    setTempData(prev => prev.filter(c => c.slug !== cat.slug));
  };

  const handleAddSubCategory = (slug: string) => {
    const label = newSubValues[slug]?.trim();
    if (!label) return;

    const category = tempData.find(c => c.slug === slug);
    if (!category) return;

    const subSlug = uniqueSlug(slugifyLabel(label), category.subs.map(s => s.slug));
    patchCategory(slug, { subs: [...category.subs, { slug: subSlug, label, labelKa: '' }] });
    setNewSubValues(prev => ({ ...prev, [slug]: '' }));
  };

  const patchSub = (categorySlug: string, subSlug: string, patch: Partial<SubCategory>) => {
    setTempData(prev => prev.map(c => (
      c.slug === categorySlug
        ? { ...c, subs: c.subs.map(s => (s.slug === subSlug ? { ...s, ...patch } : s)) }
        : c
    )));
  };

  const removeSub = (categorySlug: string, sub: SubCategory) => {
    if (!confirm(`Remove "${sub.label}"? Products filed under it will keep the reference until you re-file them.`)) return;
    setTempData(prev => prev.map(c => (
      c.slug === categorySlug ? { ...c, subs: c.subs.filter(s => s.slug !== sub.slug) } : c
    )));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingSlug) {
      setIsUploading(true);
      try {
        const publicUrl = await StorageService.uploadFile(file, 'categories');
        updateCategoryImage(uploadingSlug, publicUrl);
        addToast('Category image saved');
      } catch (e) {
        addToast('Upload failed', 'error');
      } finally {
        setIsUploading(false);
        setUploadingSlug(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
      addToast('Image fetched and saved');
    } catch (e) {
      addToast('Failed to fetch image', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const updateCategoryImage = (slug: string, url: string) => {
    const previous = tempData.find(c => c.slug === slug)?.image;
    if (previous && previous !== url) queueImageDelete(previous);
    patchCategory(slug, { image: url });
  };

  const removeImage = (slug: string, url?: string) => {
    queueImageDelete(url);
    patchCategory(slug, { image: undefined });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="font-heading text-3xl font-bold text-gray-900">{t('admin.categoryHierarchy')}</h1>
                <p className="text-gray-500">{t('admin.manageTaxonomy')}</p>
            </div>
            <div className="flex gap-3">
                <Button variant="outline" onClick={handleReset}>{t('admin.reset')}</Button>
                <Button onClick={handleSaveAll} isLoading={isSaving} leftIcon={<Save className="w-4 h-4"/>}>{t('admin.saveChanges')}</Button>
            </div>
        </div>

        <div className="grid gap-6">
            {tempData.map((cat, index) => (
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

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-100 gap-4">
                            {editingSlug === cat.slug ? (
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={cat.label}
                                            onChange={(e) => renameCategory(cat.slug, e.target.value)}
                                            className="max-w-xs font-bold"
                                            placeholder="Name (English)"
                                        />
                                        <button onClick={() => setEditingSlug(null)} className="p-2 text-green-600"><Check className="w-5 h-5"/></button>
                                    </div>
                                    <Input
                                        value={cat.labelKa || ''}
                                        onChange={(e) => patchCategory(cat.slug, { labelKa: e.target.value })}
                                        className="max-w-xs"
                                        placeholder="სახელი (ქართულად)"
                                    />
                                </div>
                            ) : (
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xl font-bold text-gray-900 truncate">{cat.label}</h3>
                                        <button onClick={() => setEditingSlug(cat.slug)} className="text-gray-400 hover:text-brand-green shrink-0"><Edit2 className="w-4 h-4"/></button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {cat.labelKa ? `${cat.labelKa} · ` : ''}<code>{cat.slug}</code>
                                    </p>
                                </div>
                            )}
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => moveCategory(index, -1)}
                                    disabled={index === 0}
                                    title="Move up"
                                    className="p-1.5 text-gray-400 hover:text-brand-green disabled:opacity-30 disabled:hover:text-gray-400"
                                ><ArrowUp className="w-4 h-4"/></button>
                                <button
                                    onClick={() => moveCategory(index, 1)}
                                    disabled={index === tempData.length - 1}
                                    title="Move down"
                                    className="p-1.5 text-gray-400 hover:text-brand-green disabled:opacity-30 disabled:hover:text-gray-400"
                                ><ArrowDown className="w-4 h-4"/></button>
                                <button onClick={() => deleteCategory(cat)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-5 h-5"/></button>
                            </div>
                        </div>

                        <div>
                            <div className="space-y-2 mb-4">
                                {cat.subs.map((sub) => {
                                    const isEditing = editingSub?.category === cat.slug && editingSub.sub === sub.slug;

                                    return isEditing ? (
                                        <div key={sub.slug} className="bg-gray-50 border rounded-lg p-3 space-y-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <input
                                                    className="flex-1 min-w-[140px] p-1.5 text-xs border rounded outline-none focus:border-brand-green"
                                                    value={sub.label}
                                                    placeholder="Name (English)"
                                                    onChange={e => patchSub(cat.slug, sub.slug, { label: e.target.value })}
                                                />
                                                <input
                                                    className="flex-1 min-w-[140px] p-1.5 text-xs border rounded outline-none focus:border-brand-green"
                                                    value={sub.labelKa || ''}
                                                    placeholder="ქართულად"
                                                    onChange={e => patchSub(cat.slug, sub.slug, { labelKa: e.target.value })}
                                                />
                                                <code className="text-[10px] text-gray-400">{sub.slug}</code>
                                                <button onClick={() => setEditingSub(null)} className="p-1 text-green-600"><Check className="w-4 h-4"/></button>
                                            </div>
                                            <div className="pt-3 border-t border-gray-200">
                                                <EntitySeoFields
                                                    value={sub}
                                                    onChange={patch => patchSub(cat.slug, sub.slug, patch)}
                                                    generatedTitle={sub.label}
                                                    generatedDescription={`Shop ${sub.label} in ${cat.label}.`}
                                                    previewUrl={absoluteUrl(settings.siteUrl, `/category/${cat.slug}?subCategory=${sub.slug}`)}
                                                    siteName={settings.storeName}
                                                    titleTemplate={seoPages.titleTemplate}
                                                    compact
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <span key={sub.slug} className="inline-flex items-center gap-2 px-3 py-1 mr-2 rounded-full bg-gray-100 text-gray-700 text-sm border">
                                            {sub.label}
                                            {sub.labelKa && <span className="text-gray-400 text-xs">{sub.labelKa}</span>}
                                            {sub.metaDescription && <Globe className="w-3 h-3 text-brand-green" aria-label="Has custom SEO copy" />}
                                            <button onClick={() => setEditingSub({ category: cat.slug, sub: sub.slug })} className="text-gray-400 hover:text-brand-green"><Edit2 className="w-3 h-3"/></button>
                                            <button onClick={() => removeSub(cat.slug, sub)} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                                        </span>
                                    );
                                })}
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

                        <div className="mt-6 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setSeoOpen(seoOpen === cat.slug ? null : cat.slug)}
                                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-brand-green transition-colors"
                            >
                                <Globe className="w-3.5 h-3.5" />
                                Search listing
                                {cat.metaDescription && <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />}
                                <span className="text-gray-300 font-normal normal-case">{seoOpen === cat.slug ? 'Hide' : 'Edit'}</span>
                            </button>

                            {seoOpen === cat.slug && (
                                <div className="mt-4 animate-fade-in">
                                    <EntitySeoFields
                                        value={cat}
                                        onChange={patch => patchCategory(cat.slug, patch)}
                                        generatedTitle={cat.label}
                                        generatedDescription={`Shop ${cat.label} at ${settings.storeName}.`}
                                        previewUrl={absoluteUrl(settings.siteUrl, `/category/${cat.slug}`)}
                                        siteName={settings.storeName}
                                        titleTemplate={seoPages.titleTemplate}
                                        compact
                                    />
                                </div>
                            )}
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

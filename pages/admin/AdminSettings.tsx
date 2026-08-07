
import React, { useEffect, useState, useRef } from 'react';
import { Save, Image, Link as LinkIcon, Edit, Globe, UploadCloud, Loader2, X, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../../store/admin-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToastStore } from '../../store/toast-store';
import { PromoContent, SkinTypeContent, SkinTypeItem } from '../../types';
import { StorageService } from '../../services/storage-service';
import { ContentService } from '../../services/content-service';

export const AdminSettings = () => {
  const { t } = useTranslation();
  const { fetchData, settings, updateSettings, promoContent, updatePromo } = useAdminStore();
  const addToast = useToastStore(s => s.addToast);
  
  const [formData, setFormData] = useState(settings);
  const [promoForm, setPromoForm] = useState<PromoContent>({
      title: '', titleKa: '', description: '', descriptionKa: '', buttonText: '', buttonTextKa: '', image: '', link: ''
  });
  
  const [skinTypes, setSkinTypes] = useState<SkinTypeContent>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isPromoDirty, setIsPromoDirty] = useState(false);
  const [isSkinDirty, setIsSkinDirty] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeSkinUpload, setActiveSkinUpload] = useState<string | null>(null);
  const [urlInputVisible, setUrlInputVisible] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skinFileInputRef = useRef<HTMLInputElement>(null);

  // Replacing an image leaves the old object in the bucket. It is only removed
  // once the form is saved, so abandoning an edit cannot delete a live image.
  const [replacedPromoImages, setReplacedPromoImages] = useState<string[]>([]);
  const [replacedSkinImages, setReplacedSkinImages] = useState<string[]>([]);

  const purge = async (urls: string[]) => {
    for (const url of urls) {
      if (url.includes('supabase.co')) await StorageService.deleteFile(url);
    }
  };

  useEffect(() => {
    fetchData();
    ContentService.getSkinTypeContent().then(setSkinTypes);
  }, []);

  useEffect(() => {
      setFormData(settings);
  }, [settings]);

  useEffect(() => {
      if (promoContent) setPromoForm(promoContent);
  }, [promoContent]);

  const handleChange = (field: string, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      setIsDirty(true);
  };

  const handlePromoChange = (field: string, value: any) => {
      setPromoForm(prev => ({ ...prev, [field]: value }));
      setIsPromoDirty(true);
  };

  const replacePromoImage = (url: string) => {
      if (promoForm.image && promoForm.image !== url) {
          setReplacedPromoImages(prev => [...prev, promoForm.image]);
      }
      handlePromoChange('image', url);
  };

  const handleSkinTypeChange = (key: string, field: keyof SkinTypeItem, value: any) => {
      setSkinTypes(prev => prev.map(s => s.key === key ? { ...s, [field]: value } : s));
      setIsSkinDirty(true);
  };

  const replaceSkinImage = (key: string, url: string) => {
      const previous = skinTypes.find(s => s.key === key)?.image;
      if (previous && previous !== url) {
          setReplacedSkinImages(prev => [...prev, previous]);
      }
      handleSkinTypeChange(key, 'image', url);
  };

  const handlePromoImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsUploading(true);
          try {
              const publicUrl = await StorageService.uploadFile(file, 'content');
              replacePromoImage(publicUrl);
              addToast("Promo image updated");
          } catch (err) {
              addToast("Upload failed", "error");
          } finally {
              setIsUploading(false);
          }
      }
  };

  const handleSkinImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && activeSkinUpload) {
          setIsUploading(true);
          try {
              const publicUrl = await StorageService.uploadFile(file, 'content');
              replaceSkinImage(activeSkinUpload, publicUrl);
              addToast("Skin type image updated");
          } catch (err) {
              addToast("Upload failed", "error");
          } finally {
              setIsUploading(false);
              setActiveSkinUpload(null);
          }
      }
  };

  const handleFetchFromUrl = async () => {
      if (!remoteUrl) return;
      setIsUploading(true);
      try {
          const publicUrl = await StorageService.uploadFromUrl(remoteUrl, 'content');
          replacePromoImage(publicUrl);
          setUrlInputVisible(false);
          setRemoteUrl('');
          addToast("Image fetched and saved");
      } catch (err) {
          addToast("Failed to fetch image", "error");
      } finally {
          setIsUploading(false);
      }
  };

  const handleSkinUrlUpload = async (key: string) => {
      const url = prompt("Enter image URL:");
      if (!url) return;
      setIsUploading(true);
      try {
          const publicUrl = await StorageService.uploadFromUrl(url, 'content');
          replaceSkinImage(key, publicUrl);
          addToast("Image updated from URL");
      } catch (err) {
          addToast("Failed to fetch image", "error");
      } finally {
          setIsUploading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await updateSettings(formData);
          addToast(t('admin.savedSuccess'));
          setIsDirty(false);
      } catch (err) {
          addToast(err instanceof Error ? err.message : 'Failed to save settings', 'error');
      }
  };

  const handlePromoSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await updatePromo(promoForm);
      await purge(replacedPromoImages);
      setReplacedPromoImages([]);
      addToast(t('admin.savedSuccess'));
      setIsPromoDirty(false);
  };

  const handleSkinSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await ContentService.updateSkinTypeContent(skinTypes);
      await purge(replacedSkinImages);
      setReplacedSkinImages([]);
      addToast(t('admin.savedSuccess'));
      setIsSkinDirty(false);
  };

  return (
    <div className="space-y-12 animate-fade-in max-w-4xl">
      <div>
           <h1 className="font-heading text-3xl font-bold text-gray-900">{t('admin.storeSettings')}</h1>
           <p className="text-gray-500">{t('admin.manageSettingsDesc')}</p>
      </div>

      {/* Store Settings Form */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
         <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="font-heading font-bold text-lg border-b border-gray-100 pb-2">{t('admin.generalInfo')}</h3>
            <Input label={t('admin.storeName') as string} value={formData.storeName} onChange={e => handleChange('storeName', e.target.value)} />
            <Input label={t('admin.supportEmail') as string} type="email" value={formData.supportEmail} onChange={e => handleChange('supportEmail', e.target.value)} />

            <h3 className="font-heading font-bold text-lg border-b border-gray-100 pb-2 pt-4">Checkout</h3>
            <div className="grid md:grid-cols-2 gap-4">
                <Input label="Currency code" value={formData.currency} onChange={e => handleChange('currency', e.target.value)} />
                <Input
                    label="Tax rate (%)"
                    type="number" step="0.1" min="0"
                    value={(formData.taxRate * 100).toFixed(2).replace(/\.?0+$/, '')}
                    onChange={e => handleChange('taxRate', Number(e.target.value) / 100)}
                />
                <Input
                    label="Shipping rate"
                    type="number" step="1" min="0"
                    value={formData.shippingRate}
                    onChange={e => handleChange('shippingRate', Number(e.target.value))}
                />
                <Input
                    label="Free shipping over"
                    type="number" step="1" min="0"
                    value={formData.freeShippingThreshold}
                    onChange={e => handleChange('freeShippingThreshold', Number(e.target.value))}
                />
            </div>
            <p className="text-xs text-gray-400">These drive the cart drawer progress bar and the totals on the checkout page. Currency accepts an ISO code such as USD, EUR or GEL.</p>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
                <Button type="submit" disabled={!isDirty} leftIcon={<Save className="w-4 h-4"/>}>{t('admin.saveChanges')}</Button>
            </div>
         </form>
      </div>

      {/* Skin Types Configuration */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
         <form onSubmit={handleSkinSubmit} className="space-y-8">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h3 className="font-heading font-bold text-lg">Homepage Skin Types</h3>
                <span className="text-xs font-bold text-brand-green uppercase tracking-wide bg-brand-green/10 px-2 py-1 rounded">Visual Config</span>
            </div>
            
            <div className="grid gap-8">
                {skinTypes.map((type) => (
                    <div key={type.key} className="flex flex-col md:flex-row gap-6 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                        <div className="w-full md:w-48 shrink-0">
                            <div 
                                onClick={() => { setActiveSkinUpload(type.key); skinFileInputRef.current?.click(); }}
                                className="aspect-[4/5] rounded-lg bg-gray-100 overflow-hidden relative group cursor-pointer hover:ring-2 hover:ring-brand-green transition-all border border-gray-200"
                            >
                                <img src={type.image} alt={type.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2">
                                    <UploadCloud className="w-6 h-6" />
                                    <span className="text-[10px] font-bold">CHANGE IMAGE</span>
                                </div>
                                {isUploading && activeSkinUpload === type.key && (
                                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-green" /></div>
                                )}
                            </div>
                            <button 
                                type="button" 
                                onClick={() => handleSkinUrlUpload(type.key)}
                                className="w-full mt-2 text-[10px] font-bold text-gray-400 hover:text-brand-green flex items-center justify-center gap-1"
                            >
                                <LinkIcon className="w-3 h-3" /> Fetch from URL
                            </button>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-brand-green" />
                                <h4 className="font-bold text-gray-900 uppercase tracking-wider text-sm">{type.key} Profile</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <Input label="Name (EN)" value={type.name} onChange={e => handleSkinTypeChange(type.key, 'name', e.target.value)} />
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Description (EN)</label>
                                        <textarea className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-brand-green" rows={2} value={type.description} onChange={e => handleSkinTypeChange(type.key, 'description', e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-4 bg-white/50 p-3 rounded-lg border border-gray-100">
                                    <Input label="Name (KA)" value={type.nameKa || ''} onChange={e => handleSkinTypeChange(type.key, 'nameKa', e.target.value)} />
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-brand-green mb-1 block">Description (KA)</label>
                                        <textarea className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-brand-green" rows={2} value={type.descriptionKa || ''} onChange={e => handleSkinTypeChange(type.key, 'descriptionKa', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
                <Button type="submit" disabled={!isSkinDirty || isUploading} leftIcon={<Save className="w-4 h-4"/>}>Update Skin Types</Button>
            </div>
            <input type="file" ref={skinFileInputRef} className="hidden" accept="image/*" onChange={handleSkinImageUpload} />
         </form>
      </div>

      {/* Homepage Promo Form */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
         <form onSubmit={handlePromoSubmit} className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h3 className="font-heading font-bold text-lg">{t('admin.promoConfig')}</h3>
                <span className="text-xs font-bold text-brand-green uppercase tracking-wide bg-brand-green/10 px-2 py-1 rounded">{t('admin.limitedSection')}</span>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="space-y-4">
                        <Input label={t('admin.promoTitle') as string} value={promoForm.title} onChange={e => handlePromoChange('title', e.target.value)} />
                        <textarea className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none min-h-[80px]" rows={3} value={promoForm.description} onChange={e => handlePromoChange('description', e.target.value)} placeholder="Description (EN)"></textarea>
                    </div>
                    <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                        <Input label={t('admin.promoTitleKa') as string} value={promoForm.titleKa || ''} onChange={e => handlePromoChange('titleKa', e.target.value)} />
                        <textarea className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none min-h-[80px]" rows={3} value={promoForm.descriptionKa || ''} onChange={e => handlePromoChange('descriptionKa', e.target.value)} placeholder="Description (KA)"></textarea>
                    </div>
                </div>
                <div className="space-y-6">
                    <Input label="Button text (EN)" value={promoForm.buttonText || ''} onChange={e => handlePromoChange('buttonText', e.target.value)} />
                    <Input label="Button text (KA)" value={promoForm.buttonTextKa || ''} onChange={e => handlePromoChange('buttonTextKa', e.target.value)} />
                    <Input label={t('admin.buttonLink') as string} value={promoForm.link} onChange={e => handlePromoChange('link', e.target.value)} leftIcon={<LinkIcon className="w-4 h-4 text-gray-400" />} />
                    <div 
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        className="aspect-[4/3] rounded-lg bg-gray-50 overflow-hidden border-2 border-dashed border-gray-200 relative group cursor-pointer hover:border-brand-green transition-all"
                    >
                        {isUploading ? (
                            <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>
                        ) : promoForm.image ? (
                            <>
                                <img src={promoForm.image} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">Replace Image</div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                <UploadCloud className="w-8 h-8 mb-2" />
                                <span className="text-[10px] font-bold uppercase">UPLOAD PROMO</span>
                            </div>
                        )}
                    </div>
                    {urlInputVisible ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 p-2 border border-gray-200 rounded text-xs outline-none focus:border-brand-green"
                                placeholder="Paste image URL"
                                value={remoteUrl}
                                onChange={e => setRemoteUrl(e.target.value)}
                            />
                            <button type="button" onClick={handleFetchFromUrl} disabled={isUploading} className="bg-brand-green text-white text-xs px-3 rounded disabled:opacity-50">Fetch</button>
                            <button type="button" onClick={() => { setUrlInputVisible(false); setRemoteUrl(''); }} className="bg-gray-200 text-gray-600 text-xs px-3 rounded">Cancel</button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setUrlInputVisible(true)}
                            className="w-full text-[10px] font-bold text-gray-400 hover:text-brand-green flex items-center justify-center gap-1"
                        >
                            <LinkIcon className="w-3 h-3" /> Fetch from URL
                        </button>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePromoImageUpload} />
                </div>
            </div>
            <div className="pt-6 border-t border-gray-100 flex justify-end">
                <Button type="submit" disabled={!isPromoDirty || isUploading} leftIcon={<Edit className="w-4 h-4"/>}>{t('admin.updatePromo')}</Button>
            </div>
         </form>
      </div>
    </div>
  );
};

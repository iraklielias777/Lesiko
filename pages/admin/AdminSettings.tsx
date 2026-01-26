
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

  const handleSkinTypeChange = (key: string, field: keyof SkinTypeItem, value: any) => {
      setSkinTypes(prev => prev.map(s => s.key === key ? { ...s, [field]: value } : s));
      setIsSkinDirty(true);
  };

  const handlePromoImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsUploading(true);
          try {
              const publicUrl = await StorageService.uploadFile(file, 'content');
              handlePromoChange('image', publicUrl);
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
              handleSkinTypeChange(activeSkinUpload, 'image', publicUrl);
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
          handlePromoChange('image', publicUrl);
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
          handleSkinTypeChange(key, 'image', publicUrl);
          addToast("Image updated from URL");
      } catch (err) {
          addToast("Failed to fetch image", "error");
      } finally {
          setIsUploading(false);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      updateSettings(formData);
      addToast(t('admin.savedSuccess'));
      setIsDirty(false);
  };

  const handlePromoSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await updatePromo(promoForm);
      addToast(t('admin.savedSuccess'));
      setIsPromoDirty(false);
  };

  const handleSkinSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await ContentService.updateSkinTypeContent(skinTypes);
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

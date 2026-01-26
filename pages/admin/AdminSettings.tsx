
import React, { useEffect, useState, useRef } from 'react';
import { Save, Image, Link as LinkIcon, Edit, Globe, UploadCloud, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../../store/admin-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToastStore } from '../../store/toast-store';
import { PromoContent } from '../../types';
import { StorageService } from '../../services/storage-service';

export const AdminSettings = () => {
  const { t } = useTranslation();
  const { fetchData, settings, updateSettings, promoContent, updatePromo } = useAdminStore();
  const addToast = useToastStore(s => s.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState(settings);
  const [promoForm, setPromoForm] = useState<PromoContent>({
      title: '', titleKa: '', description: '', descriptionKa: '', buttonText: '', buttonTextKa: '', image: '', link: ''
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isPromoDirty, setIsPromoDirty] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInputVisible, setUrlInputVisible] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');

  useEffect(() => {
    fetchData();
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleFetchFromUrl = async () => {
      if (!remoteUrl) return;
      setIsUploading(true);
      try {
          const publicUrl = await StorageService.uploadFromUrl(remoteUrl, 'content');
          handlePromoChange('image', publicUrl);
          setUrlInputVisible(false);
          setRemoteUrl('');
          addToast("Image fetched and saved to storage");
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

  return (
    <div className="space-y-12 animate-fade-in max-w-3xl">
      <div>
           <h1 className="font-heading text-3xl font-bold text-gray-900">{t('admin.storeSettings')}</h1>
           <p className="text-gray-500">{t('admin.manageSettingsDesc')}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
         <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="font-heading font-bold text-lg border-b border-gray-100 pb-2">{t('admin.generalInfo')}</h3>
            <Input label={t('admin.storeName') as string} value={formData.storeName} onChange={e => handleChange('storeName', e.target.value)} />
            <Input label={t('admin.supportEmail') as string} type="email" value={formData.supportEmail} onChange={e => handleChange('supportEmail', e.target.value)} />

            <h3 className="font-heading font-bold text-lg border-b border-gray-100 pb-2 pt-4">{t('admin.financial')}</h3>
            <div className="grid grid-cols-2 gap-6">
                <Input label={t('admin.currency') as string} value={formData.currency} onChange={e => handleChange('currency', e.target.value)} />
                <Input label={t('admin.taxRate') as string} type="number" step="0.01" value={formData.taxRate * 100} onChange={e => handleChange('taxRate', Number(e.target.value) / 100)} />
            </div>
            
            <Input label={t('admin.freeShippingThreshold') as string} type="number" value={formData.freeShippingThreshold} onChange={e => handleChange('freeShippingThreshold', Number(e.target.value))} />

            <div className="pt-6 border-t border-gray-100 flex justify-end">
                <Button type="submit" disabled={!isDirty} leftIcon={<Save className="w-4 h-4"/>}>{t('admin.saveChanges')}</Button>
            </div>
         </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
         <form onSubmit={handlePromoSubmit} className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h3 className="font-heading font-bold text-lg">{t('admin.promoConfig')}</h3>
                <span className="text-xs font-bold text-brand-green uppercase tracking-wide bg-brand-green/10 px-2 py-1 rounded">{t('admin.limitedSection')}</span>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1 mb-2">
                            <span className="w-6 h-4 bg-gray-200 rounded flex items-center justify-center text-[10px] text-gray-700">EN</span> English
                        </div>
                        <Input label={t('admin.promoTitle') as string} value={promoForm.title} onChange={e => handlePromoChange('title', e.target.value)} />
                        <div>
                            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">{t('product.desc') as string}</label>
                            <textarea className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none min-h-[80px]" rows={3} value={promoForm.description} onChange={e => handlePromoChange('description', e.target.value)}></textarea>
                        </div>
                        <Input label={t('admin.buttonText') as string} value={promoForm.buttonText} onChange={e => handlePromoChange('buttonText', e.target.value)} />
                    </div>

                    <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2 text-xs font-bold text-brand-green uppercase tracking-widest border-b border-gray-100 pb-1 mb-2">
                            <Globe className="w-3 h-3" /> Georgian (KA)
                        </div>
                        <Input label={t('admin.promoTitleKa') as string} value={promoForm.titleKa || ''} onChange={e => handlePromoChange('titleKa', e.target.value)} />
                        <textarea className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none min-h-[80px]" rows={3} value={promoForm.descriptionKa || ''} onChange={e => handlePromoChange('descriptionKa', e.target.value)}></textarea>
                        <Input label={t('admin.buttonTextKa') as string} value={promoForm.buttonTextKa || ''} onChange={e => handlePromoChange('buttonTextKa', e.target.value)} />
                    </div>
                </div>

                <div className="space-y-6">
                    <Input label={t('admin.buttonLink') as string} value={promoForm.link} onChange={e => handlePromoChange('link', e.target.value)} leftIcon={<LinkIcon className="w-4 h-4 text-gray-400" />} />
                    
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">{t('admin.image') as string}</label>
                            <button type="button" onClick={() => setUrlInputVisible(!urlInputVisible)} className="text-[10px] font-bold text-brand-green flex items-center gap-1 hover:underline">
                                <LinkIcon className="w-3 h-3" /> {urlInputVisible ? "Hide URL Input" : "Add via URL"}
                            </button>
                        </div>

                        {urlInputVisible && (
                            <div className="mb-4 flex gap-2 animate-fade-in">
                                <Input placeholder="Paste image URL..." value={remoteUrl} onChange={e => setRemoteUrl(e.target.value)} className="flex-1 !py-2 !text-xs" />
                                <Button type="button" size="sm" onClick={handleFetchFromUrl} isLoading={isUploading} disabled={!remoteUrl}>Save</Button>
                            </div>
                        )}

                        <div 
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                            className="aspect-[4/3] rounded-lg bg-gray-50 overflow-hidden border-2 border-dashed border-gray-200 relative group cursor-pointer hover:border-brand-green transition-all"
                        >
                            {isUploading ? (
                                <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>
                            ) : promoForm.image ? (
                                <>
                                    <img src={promoForm.image} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">Replace Promo Image</div>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                    <UploadCloud className="w-8 h-8 mb-2" />
                                    <span className="text-[10px] font-bold uppercase">UPLOAD PROMO</span>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>
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

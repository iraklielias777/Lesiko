
import React, { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Tag, Save, X, Package, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../../store/admin-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToastStore } from '../../store/toast-store';
import { Brand } from '../../types';

export const AdminBrands = () => {
  const { t } = useTranslation();
  const { brands, products, fetchData, addBrand, deleteBrand } = useAdminStore();
  const addToast = useToastStore(s => s.addToast);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Brand>>({ name: '', description: '', image: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddBrand = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name?.trim()) return;

      const newBrand: Brand = {
          id: crypto.randomUUID(),
          name: formData.name,
          slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          image: formData.image,
          description: formData.description
      };

      await addBrand(newBrand);
      addToast(t('admin.brandAdded'));
      setFormData({ name: '', description: '', image: '' });
      setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
      if (window.confirm(t('admin.deleteBrandConfirm'))) {
          await deleteBrand(id);
          addToast(t('admin.brandDeleted'), 'info');
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setFormData(prev => ({ ...prev, image: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  // Helper to count products per brand
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
            <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4"/>}>{t('admin.addBrand')}</Button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
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
                                    onClick={() => handleDelete(brand.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {brands.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                {t('admin.noBrands')}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Add Brand Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative z-10 animate-scale-in">
                    <div className="flex justify-between items-center p-6 border-b border-gray-100">
                        <h2 className="font-heading font-bold text-xl">{t('admin.addBrand')}</h2>
                        <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
                    </div>
                    
                    <form onSubmit={handleAddBrand} className="p-6 space-y-4">
                        <div className="flex justify-center mb-4">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-32 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-brand-green hover:text-brand-green hover:bg-brand-green/5 transition-all overflow-hidden relative"
                            >
                                {formData.image ? (
                                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
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
                            onChange={(e) => setFormData({...formData, name: e.target.value})} 
                            placeholder="e.g. LesiKo Lab"
                            autoFocus
                            required
                        />
                        
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

                        <div className="flex justify-end pt-4">
                            <Button type="submit">{t('admin.add')}</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

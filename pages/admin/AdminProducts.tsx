
import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Image as ImageIcon, UploadCloud, Download, TrendingUp, Tag, Globe, Sparkles, Sliders, Filter, List, PlayCircle, Loader2 } from 'lucide-react';
import MuxPlayer from '@mux/mux-player-react';
import { useAdminStore } from '../../store/admin-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Product, ProductVariant } from '../../types';
import { useToastStore } from '../../store/toast-store';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '../../components/ui/Checkbox';
import { StorageService } from '../../services/storage-service';

export const AdminProducts = () => {
  const { t } = useTranslation();
  const { fetchData, products, deleteProduct, addProduct, updateProduct, categories, brands } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore(s => s.addToast);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', nameKa: '', price: 0, compareAtPrice: 0,
    category: undefined, subCategory: '', inventoryQuantity: 0,
    description: '', descriptionKa: '', brand: undefined,
    images: [], videoPlaybackId: '', isTrending: false,
    tags: [], variants: [], metaTitle: '', metaDescription: '', metaKeywords: ''
  });

  const [isOnSale, setIsOnSale] = useState(false);
  const [newVariant, setNewVariant] = useState<Partial<ProductVariant>>({ name: '', price: 0, inventoryQuantity: 0 });

  const SKIN_TYPES = ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'];
  const activeCategory = categories.find(c => c.slug === formData.category?.slug) || categories[0];
  const availableSubCategories = activeCategory?.subs || [];

  useEffect(() => { fetchData(); }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = selectedBrand ? p.brand.id === selectedBrand : true;
    return matchesSearch && matchesBrand;
  });

  const handleDelete = async (id: string) => {
    const product = products.find(p => p.id === id);
    if(confirm('Are you sure? This will also delete images from storage.')) {
        if (product?.images) {
            for (const img of product.images) {
                await StorageService.deleteFile(img.url);
            }
        }
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
      const defaultCat = categories[0];
      const defaultBrand = brands[0];
      setFormData({
        name: '', nameKa: '', price: 0, compareAtPrice: 0,
        category: defaultCat ? { id: defaultCat.slug, name: defaultCat.label, slug: defaultCat.slug } : undefined,
        subCategory: defaultCat?.subs[0] || '', inventoryQuantity: 0,
        description: '', descriptionKa: '',
        brand: defaultBrand ? { id: defaultBrand.id, name: defaultBrand.name, slug: defaultBrand.slug } : { id: 'generic', name: 'Generic', slug: 'generic' },
        images: [], videoPlaybackId: '', isTrending: false, tags: [], variants: [],
        metaTitle: '', metaDescription: '', metaKeywords: ''
      });
      setIsOnSale(false);
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const publicUrl = await StorageService.uploadFile(file, 'products');
        setFormData(prev => ({
          ...prev,
          images: [
            ...(prev.images || []),
            { id: crypto.randomUUID(), url: publicUrl, altText: file.name, isPrimary: (prev.images?.length || 0) === 0 }
          ]
        }));
        addToast("Image uploaded successfully");
      } catch (err) {
        addToast("Failed to upload image", "error");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = async (img: any) => {
    try {
      await StorageService.deleteFile(img.url);
      setFormData(prev => ({
        ...prev,
        images: prev.images?.filter(i => i.id !== img.id)
      }));
    } catch (e) {
      addToast("Failed to delete image", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const productPayload: Product = {
          ...formData,
          id: editingId || crypto.randomUUID(),
          slug: formData.name!.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          price: Number(formData.price),
          compareAtPrice: isOnSale ? Number(formData.compareAtPrice) : undefined,
          inventoryQuantity: formData.variants?.length 
            ? formData.variants.reduce((acc, v) => acc + v.inventoryQuantity, 0)
            : Number(formData.inventoryQuantity),
          images: formData.images?.length ? formData.images : [{ id: 'def', url: 'https://via.placeholder.com/400', altText: 'Placeholder', isPrimary: true }]
      } as Product;

      if (editingId) await updateProduct(productPayload);
      else await addProduct(productPayload);
      
      setIsModalOpen(false);
      addToast(editingId ? "Updated" : "Created");
  };

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
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
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
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden">
                       <img src={product.images[0]?.url} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-medium text-gray-900">{product.name}</span>
                  </td>
                  <td className="px-6 py-4 font-medium">${product.price.toFixed(2)}</td>
                  <td className="px-6 py-4">{product.inventoryQuantity}</td>
                  <td className="px-6 py-4 text-right">
                     <div className="flex justify-end gap-2">
                        <button onClick={() => openModal(product)} className="p-2 text-gray-400 hover:text-brand-green"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
         </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl relative z-10 flex flex-col max-h-[90vh] animate-scale-in">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="font-heading font-bold text-xl">{editingId ? t('admin.edit') : t('admin.add')}</h2>
                    <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-6">
                    <form id="productForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <Input label="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            <Input label="Price" type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold uppercase mb-2">Images</label>
                          <div className="grid grid-cols-4 gap-3">
                            {formData.images?.map((img) => (
                              <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                                <img src={img.url} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => removeImage(img)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                              </div>
                            ))}
                            <button
                              type="button" disabled={isUploading}
                              onClick={() => fileInputRef.current?.click()}
                              className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-brand-green hover:text-brand-green transition-all"
                            >
                               {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
                               <span className="text-[10px] font-bold mt-1">UPLOAD</span>
                            </button>
                          </div>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">Category</label>
                                <select className="w-full p-3 border rounded-lg text-sm" value={formData.category?.slug} onChange={e => setFormData({...formData, category: {id: e.target.value, slug: e.target.value, name: e.target.value}})}>
                                    {categories.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">Brand</label>
                                <select className="w-full p-3 border rounded-lg text-sm" value={formData.brand?.id} onChange={e => setFormData({...formData, brand: {id: e.target.value, slug: e.target.value, name: e.target.value}})}>
                                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl space-y-4">
                            <h4 className="text-xs font-bold uppercase">Description (English)</h4>
                            <textarea className="w-full p-3 border rounded-lg text-sm" rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                        </div>
                    </form>
                </div>
                
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button type="submit" form="productForm">Save Product</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

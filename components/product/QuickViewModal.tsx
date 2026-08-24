
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useUIStore } from '../../store/ui-store';
import { ProductDetailView } from './ProductDetailView';
import { ProductService } from '../../services/product-service';
import { Product } from '../../types';

export const QuickViewModal = () => {
  const { isQuickViewOpen, quickViewProduct, closeQuickView } = useUIStore();
  const [detail, setDetail] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isQuickViewOpen || !quickViewProduct) {
      setDetail(null);
      return;
    }

    if (Array.isArray(quickViewProduct.variants)) {
      setDetail(quickViewProduct);
      return;
    }

    let cancelled = false;
    setLoading(true);
    ProductService.getProductBySlug(quickViewProduct.slug)
      .then(full => {
        if (!cancelled) setDetail(full || quickViewProduct);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isQuickViewOpen, quickViewProduct]);

  if (!isQuickViewOpen || !quickViewProduct) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={closeQuickView}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <button 
          onClick={closeQuickView}
          className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 lg:p-10">
          {loading && !detail ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-brand-green border-t-transparent rounded-full" />
            </div>
          ) : (
            <ProductDetailView product={detail || quickViewProduct} />
          )}
        </div>
      </div>
    </div>
  );
};

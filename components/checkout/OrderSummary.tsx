
import React from 'react';
import { CartItem } from '../../types';
import { useFormatPrice } from '../../lib/format';
import { useTranslation } from 'react-i18next';
import { ProductThumb } from '../product/ProductThumb';

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({ items, subtotal, shipping, tax, total }) => {
  const fmt = useFormatPrice();
  const { t } = useTranslation();
  return (
    <div className="bg-gray-50 rounded-lg p-6 sticky top-24">
      <h3 className="font-heading font-bold text-lg mb-4">{t('checkout.orderSummary')}</h3>
      
      <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
        {items.map((item) => {
          const displayPrice = item.selectedVariant?.price || item.product.price;
          
          return (
            <div key={item.id} className="flex gap-4">
              <div className="relative flex-shrink-0">
                <ProductThumb
                  product={item.product}
                  alt={item.product.name}
                  size={64}
                  className="w-16 h-16 rounded border border-gray-200"
                />
                <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                  {item.quantity}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.product.name}</p>
                <p className="text-xs text-gray-500">
                    {item.product.brand.name}
                    {item.selectedVariant && (
                       <span className="ml-1 text-gray-700 font-bold">• {item.selectedVariant.name}</span>
                    )}
                </p>
              </div>
              <p className="text-sm font-medium text-gray-900">{fmt(displayPrice * item.quantity)}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-gray-200 pt-4 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>{t('common.subtotal')}</span>
          <span>{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>{t('common.shipping')}</span>
          <span>{shipping === 0 ? t('common.free') : fmt(shipping)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>{t('checkout.estimatedTax')}</span>
          <span>{fmt(tax)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-gray-200 pt-3">
          <span>{t('common.total')}</span>
          <span>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
};

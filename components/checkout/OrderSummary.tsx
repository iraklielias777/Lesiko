
import React from 'react';
import { CartItem } from '../../types';

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({ items, subtotal, shipping, tax, total }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-6 sticky top-24">
      <h3 className="font-heading font-bold text-lg mb-4">Order Summary</h3>
      
      <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
        {items.map((item) => {
          const displayPrice = item.selectedVariant?.price || item.product.price;
          
          return (
            <div key={item.id} className="flex gap-4">
              <div className="w-16 h-16 bg-white rounded overflow-hidden border border-gray-200 flex-shrink-0 relative">
                 <img src={item.product.images[0]?.url} alt={item.product.name} className="w-full h-full object-cover" />
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
              <p className="text-sm font-medium text-gray-900">${(displayPrice * item.quantity).toFixed(2)}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-gray-200 pt-4 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Estimated Tax</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-gray-200 pt-3">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

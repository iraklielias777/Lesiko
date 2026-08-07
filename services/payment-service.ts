import { Order, Address, CartItem } from '../types';

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

// Simulating the backend PaymentService and EmailService logic
export const PaymentService = {
  
  // Simulate creating a payment intent. Totals are passed in rather than
  // recomputed here so the tax rate and free-shipping threshold have a single
  // source of truth (the store settings the admin edits).
  createPaymentIntent: async (items: CartItem[], shippingAddress: Address, totals: OrderTotals) => {
    return new Promise<{ clientSecret: string; orderId: string; totals: OrderTotals }>((resolve) => {
      setTimeout(() => {
        const orderId = `ORD-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

        resolve({
          clientSecret: 'mock_sk_test_12345', // Mock secret
          orderId,
          totals
        });
      }, 1500);
    });
  },

  // Simulate confirming payment with Stripe
  confirmPayment: async (orderId: string, paymentDetails: any) => {
    return new Promise<{ success: boolean; order: Order }>((resolve, reject) => {
      setTimeout(() => {
        // Simulate 10% failure rate
        if (Math.random() > 0.95) {
          reject(new Error('Card declined. Please try a different payment method.'));
          return;
        }

        resolve({
          success: true,
          order: {
            id: orderId,
            orderNumber: orderId,
            items: [], // Populated in context
            shippingAddress: {} as Address, // Populated in context
            paymentStatus: 'paid',
            subtotal: 0,
            shipping: 0,
            tax: 0,
            total: 0,
            createdAt: new Date().toISOString()
          }
        });
      }, 2000);
    });
  }
};
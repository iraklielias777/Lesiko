import { Order, Address, CartItem } from '../types';

// Simulating the backend PaymentService and EmailService logic
export const PaymentService = {
  
  // Simulate creating a payment intent and calculating totals
  createPaymentIntent: async (items: CartItem[], shippingAddress: Address) => {
    return new Promise<{ clientSecret: string; orderId: string; totals: any }>((resolve) => {
      setTimeout(() => {
        const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const shipping = subtotal > 50 ? 0 : 15; // Logic from header
        const tax = subtotal * 0.08; // 8% tax mock
        const total = subtotal + shipping + tax;

        const orderId = `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        resolve({
          clientSecret: 'mock_sk_test_12345', // Mock secret
          orderId,
          totals: { subtotal, shipping, tax, total }
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
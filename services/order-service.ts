
import { Order } from '../types';

const STORAGE_KEY = 'lesiko_orders_db_v1';

// Seed data to make the admin panel look populated initially
const MOCK_SEED_ORDERS: Order[] = [
  {
    id: 'ORD-8921',
    orderNumber: '8921',
    customerName: 'Jane Doe', // Matches mock user
    shippingAddress: {
        firstName: 'Jane', lastName: 'Doe', email: 'demo@lesiko.com', 
        address1: '123 Fashion Ave', city: 'New York', state: 'NY', zip: '10001', country: 'US'
    },
    items: [
        { 
            id: 'item-1', 
            quantity: 1, 
            product: { 
                id: '1', name: 'Hydra-Glow Vitamin C Serum', price: 45.00, 
                slug: 'hydra-glow-vitamin-c', 
                images: [{ id: 'i1', url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=600', altText: 'Serum', isPrimary: true }],
                brand: { id: 'b1', name: 'LesiKo Lab', slug: 'lesiko-lab' },
                category: { id: 'face', name: 'Face', slug: 'face-care' },
                description: '', inventoryQuantity: 10, averageRating: 5, reviewCount: 10
            } 
        }
    ],
    paymentStatus: 'paid',
    status: 'Delivered',
    subtotal: 45.00,
    shipping: 0,
    tax: 3.60,
    total: 48.60,
    createdAt: '2023-11-15'
  },
  {
    id: 'ORD-9921',
    orderNumber: '9921',
    customerName: 'Jane Doe',
    shippingAddress: {
        firstName: 'Jane', lastName: 'Doe', email: 'demo@lesiko.com', 
        address1: '123 Fashion Ave', city: 'New York', state: 'NY', zip: '10001', country: 'US'
    },
    items: [
        { 
            id: 'item-2', 
            quantity: 2, 
            product: { 
                id: '4', name: 'Velvet Matte Lipstick', price: 18.00, 
                slug: 'velvet-matte-lipstick',
                images: [{ id: 'i4', url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=600', altText: 'Lipstick', isPrimary: true }],
                brand: { id: 'b2', name: 'ColorPop', slug: 'colorpop' },
                category: { id: 'makeup', name: 'Makeup', slug: 'decorative-cosmetics' },
                description: '', inventoryQuantity: 10, averageRating: 5, reviewCount: 10
            } 
        }
    ],
    paymentStatus: 'paid',
    status: 'Processing',
    subtotal: 36.00,
    shipping: 15.00,
    tax: 2.88,
    total: 53.88,
    createdAt: new Date().toISOString().split('T')[0] // Today
  }
];

const getStoredOrders = (): Order[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
        
        // Seed if empty
        localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_SEED_ORDERS));
        return MOCK_SEED_ORDERS;
    } catch (e) {
        console.error("Order Service Error", e);
        return [];
    }
};

const saveOrders = (orders: Order[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
};

export const OrderService = {
    // Admin: Get All
    getAllOrders: async (): Promise<Order[]> => {
        return new Promise(resolve => {
            setTimeout(() => resolve(getStoredOrders()), 300);
        });
    },

    // Customer: Get My Orders
    getOrdersByUser: async (email: string): Promise<Order[]> => {
        return new Promise(resolve => {
            setTimeout(() => {
                const all = getStoredOrders();
                // Filter case-insensitive
                const userOrders = all.filter(o => o.shippingAddress.email.toLowerCase() === email.toLowerCase());
                // Sort by date desc
                resolve(userOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            }, 300);
        });
    },

    // Checkout: Create Order
    createOrder: async (order: Order): Promise<void> => {
        return new Promise(resolve => {
            setTimeout(() => {
                const all = getStoredOrders();
                saveOrders([order, ...all]);
                resolve();
            }, 400);
        });
    },

    // Admin: Update Status
    updateStatus: async (orderId: string, status: Order['status']): Promise<void> => {
        return new Promise(resolve => {
            setTimeout(() => {
                const all = getStoredOrders();
                const updated = all.map(o => o.id === orderId ? { ...o, status } : o);
                saveOrders(updated);
                resolve();
            }, 300);
        });
    }
};

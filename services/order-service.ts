
import { Order, CartItem } from '../types';
import { supabase } from '../lib/supabase';

export const OrderService = {
    getAllOrders: async (): Promise<Order[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return [];
        return data.map(o => ({
            id: o.id,
            orderNumber: o.order_number,
            customerName: o.customer_name,
            shippingAddress: o.shipping_address,
            items: [], // Items usually fetched separately or via join
            paymentStatus: o.payment_status,
            status: o.status,
            subtotal: Number(o.subtotal),
            shipping: Number(o.shipping),
            tax: Number(o.tax),
            total: Number(o.total),
            createdAt: new Date(o.created_at).toISOString().split('T')[0]
        }));
    },

    getOrdersByUser: async (email: string): Promise<Order[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('customer_email', email)
            .order('created_at', { ascending: false });

        if (error) return [];
        return data.map(o => ({
            id: o.id,
            orderNumber: o.order_number,
            customerName: o.customer_name,
            shippingAddress: o.shipping_address,
            items: (o.order_items || []).map((item: any) => ({
                id: item.id,
                quantity: item.quantity,
                product: { name: item.product_name, price: Number(item.price), images: [{url: ''}] } as any,
                selectedVariant: item.variant_name ? { name: item.variant_name } : undefined
            })),
            paymentStatus: o.payment_status,
            status: o.status,
            subtotal: Number(o.subtotal),
            shipping: Number(o.shipping),
            tax: Number(o.tax),
            total: Number(o.total),
            createdAt: new Date(o.created_at).toISOString().split('T')[0]
        }));
    },

    createOrder: async (order: Order): Promise<void> => {
        if (!supabase) throw new Error('Supabase not initialized');

        // 1. Insert Order
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                order_number: order.orderNumber,
                customer_email: order.shippingAddress.email,
                customer_name: order.customerName,
                shipping_address: order.shippingAddress,
                payment_status: order.paymentStatus,
                status: order.status,
                subtotal: order.subtotal,
                shipping: order.shipping,
                tax: order.tax,
                total: order.total
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 2. Insert Items
        const itemsToInsert = order.items.map(item => ({
            order_id: orderData.id,
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            price: item.selectedVariant?.price || item.product.price,
            variant_name: item.selectedVariant?.name
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsToInsert);

        if (itemsError) throw itemsError;
    },

    updateStatus: async (orderId: string, status: Order['status']): Promise<void> => {
        if (!supabase) return;
        const { error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId);
        if (error) throw error;
    }
};

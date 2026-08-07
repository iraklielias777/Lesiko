
import { Order, CartItem } from '../types';
import { supabase } from '../lib/supabase';

// order_items stores a snapshot of the name and price at purchase time; the
// join back to products is only there to recover an image and a link target,
// and it stays null if the product was deleted since.
const ORDER_SELECT = '*, order_items(*, products(slug, images))';

const mapItem = (item: any): CartItem => ({
    id: item.id,
    quantity: item.quantity,
    product: {
        id: item.product_id,
        name: item.product_name,
        slug: item.products?.slug,
        price: Number(item.price),
        images: Array.isArray(item.products?.images) ? item.products.images : [],
    } as any,
    selectedVariant: item.variant_name
        ? ({ name: item.variant_name } as any)
        : undefined,
});

const mapOrder = (o: any): Order => ({
    id: o.id,
    orderNumber: o.order_number,
    customerName: o.customer_name,
    shippingAddress: o.shipping_address,
    items: (o.order_items || []).map(mapItem),
    paymentStatus: o.payment_status,
    status: o.status,
    subtotal: Number(o.subtotal),
    shipping: Number(o.shipping),
    tax: Number(o.tax),
    total: Number(o.total),
    createdAt: new Date(o.created_at).toISOString().split('T')[0],
});

export const OrderService = {
    getAllOrders: async (): Promise<Order[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('orders')
            .select(ORDER_SELECT)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching orders:', error);
            return [];
        }
        return (data || []).map(mapOrder);
    },

    getOrdersByUser: async (email: string): Promise<Order[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('orders')
            .select(ORDER_SELECT)
            .ilike('customer_email', email)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching orders:', error);
            return [];
        }
        return (data || []).map(mapOrder);
    },

    createOrder: async (order: Order): Promise<string> => {
        if (!supabase) throw new Error('Supabase not initialized');

        // The id is generated here rather than read back from the insert:
        // guest checkout runs on the anon key, which can insert an order but
        // cannot select one (the read policy matches on the signed-in email),
        // so a RETURNING clause would come back empty.
        const orderId = crypto.randomUUID();

        const { error: orderError } = await supabase
            .from('orders')
            .insert({
                id: orderId,
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
            });

        if (orderError) throw orderError;

        const itemsToInsert = order.items.map(item => ({
            order_id: orderId,
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            price: item.selectedVariant?.price || item.product.price,
            variant_name: item.selectedVariant?.name
        }));

        if (itemsToInsert.length) {
            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;
        }

        return orderId;
    },

    updateStatus: async (orderId: string, status: Order['status']): Promise<void> => {
        if (!supabase) return;
        const { error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId);
        if (error) throw error;
    },

    updatePaymentStatus: async (
        orderId: string,
        paymentStatus: Order['paymentStatus']
    ): Promise<void> => {
        if (!supabase) return;
        const { error } = await supabase
            .from('orders')
            .update({ payment_status: paymentStatus })
            .eq('id', orderId);
        if (error) throw error;
    }
};


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
    flittOrderId: o.flitt_order_id || undefined,
    flittPaymentId: o.flitt_payment_id || undefined,
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

    getOrderById: async (orderId: string): Promise<Order | null> => {
        if (!supabase) return null;
        const { data, error } = await supabase
            .from('orders')
            .select(ORDER_SELECT)
            .eq('id', orderId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching order:', error);
            return null;
        }
        return data ? mapOrder(data) : null;
    },

    createOrder: async (order: Order): Promise<{ orderId: string; publicToken: string }> => {
        if (!supabase) throw new Error('Supabase not initialized');

        // Id + public_token are generated client-side: guest checkout uses the
        // anon key, which can insert but cannot SELECT the row back (read policy
        // matches signed-in email), so RETURNING would come back empty.
        const orderId = crypto.randomUUID();
        const publicToken = crypto.randomUUID();

        const { error: orderError } = await supabase
            .from('orders')
            .insert({
                id: orderId,
                order_number: order.orderNumber,
                customer_email: order.shippingAddress.email,
                customer_name: order.customerName,
                shipping_address: order.shippingAddress,
                // RLS only allows pending inserts; payment is set by the edge callback.
                payment_status: 'pending',
                status: 'Processing',
                subtotal: order.subtotal,
                shipping: order.shipping,
                tax: order.tax,
                total: order.total,
                public_token: publicToken,
                // Flitt receives this as order_id; keep it identical to order_number.
                flitt_order_id: order.flittOrderId || order.orderNumber,
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

        return { orderId, publicToken };
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

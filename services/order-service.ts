
import { Order, CartItem } from '../types';
import { supabase } from '../lib/supabase';
import { resolvePrice } from '../lib/pricing';

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

    /**
     * One transaction, server-side. The order row and its lines used to be two
     * separate inserts from the browser, which left an order with no lines
     * whenever the second one did not happen — two of those reached
     * production. create_pending_order() inserts both or neither, applies the
     * abuse throttle, and hands back the id and the guest token the
     * confirmation page polls with. See migration 0019.
     */
    createOrder: async (order: Order): Promise<{ orderId: string; publicToken: string }> => {
        if (!supabase) throw new Error('Supabase not initialized');

        const { data, error } = await supabase.rpc('create_pending_order', {
            p_order: {
                orderNumber: order.orderNumber,
                customerEmail: order.shippingAddress.email,
                customerName: order.customerName,
                shippingAddress: order.shippingAddress,
                subtotal: order.subtotal,
                shipping: order.shipping,
                tax: order.tax,
                total: order.total,
            },
            p_items: order.items.map(item => ({
                productId: item.product.id,
                productName: item.product.name,
                variantName: item.selectedVariant?.name,
                quantity: item.quantity,
                price: resolvePrice(item.product, item.selectedVariant).price,
            })),
        });

        // A RAISE inside the function (throttle, empty bag, bad email) arrives
        // as the error message verbatim, and it is written to be shown.
        if (error) throw new Error(error.message || 'Could not create the order');

        const row = Array.isArray(data) ? data[0] : data;
        if (!row?.order_id || !row?.public_token) {
            throw new Error('Could not create the order');
        }
        return { orderId: row.order_id, publicToken: row.public_token };
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


import { Address, SavedAddress } from '../types';
import { supabase } from '../lib/supabase';

const mapAddress = (row: any): SavedAddress => ({
  id: row.id,
  isDefault: row.is_default,
  firstName: row.first_name || '',
  lastName: row.last_name || '',
  email: row.email || '',
  phone: row.phone || '',
  address1: row.address1 || '',
  address2: row.address2 || '',
  city: row.city || '',
  state: row.state || '',
  zip: row.zip || '',
  country: row.country || '',
});

const toRow = (address: Address) => ({
  first_name: address.firstName,
  last_name: address.lastName,
  email: address.email,
  phone: address.phone || '',
  address1: address.address1,
  address2: address.address2 || null,
  city: address.city,
  state: address.state,
  zip: address.zip,
  country: address.country,
});

export const AddressService = {
  getAddresses: async (userId: string): Promise<SavedAddress[]> => {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at');

    if (error) {
      console.error('Error fetching addresses:', error);
      return [];
    }
    return (data || []).map(mapAddress);
  },

  addAddress: async (userId: string, address: Address, isDefault: boolean): Promise<SavedAddress> => {
    if (!supabase) throw new Error('Supabase client not initialized');

    if (isDefault) await AddressService.clearDefault(userId);

    const { data, error } = await supabase
      .from('addresses')
      .insert({ ...toRow(address), user_id: userId, is_default: isDefault })
      .select()
      .single();

    if (error) throw error;
    return mapAddress(data);
  },

  updateAddress: async (id: string, address: Address): Promise<SavedAddress> => {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('addresses')
      .update(toRow(address))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapAddress(data);
  },

  setDefault: async (userId: string, id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase client not initialized');

    await AddressService.clearDefault(userId);

    const { error } = await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
  },

  clearDefault: async (userId: string): Promise<void> => {
    if (!supabase) return;
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);
  },

  deleteAddress: async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase.from('addresses').delete().eq('id', id);
    if (error) throw error;
  },
};

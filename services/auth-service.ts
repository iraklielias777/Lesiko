
import { User } from '../types';
import { supabase } from '../lib/supabase';

export const AuthService = {
  login: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return {
      id: data.user.id,
      email: data.user.email!,
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      skinType: profile?.skin_type,
      role: profile?.role || 'customer'
    };
  },

  register: async (data: Partial<User> & { password: string }): Promise<User> => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email!,
      password: data.password,
    });
    if (authError) throw authError;

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user!.id,
        first_name: data.firstName,
        last_name: data.lastName,
        skin_type: data.skinType,
        role: 'customer'
      });
    
    if (profileError) throw profileError;

    return {
      id: authData.user!.id,
      email: data.email!,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      skinType: data.skinType,
      role: 'customer'
    };
  },

  logout: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    return {
      id: session.user.id,
      email: session.user.email!,
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      skinType: profile?.skin_type,
      role: profile?.role || 'customer'
    };
  }
};

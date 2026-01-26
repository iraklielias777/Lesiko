
import { User } from '../types';
import { supabase } from '../lib/supabase';

export const AuthService = {
  login: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.warn("Profile fetch error:", profileError);
    }

    return {
      id: data.user.id,
      email: data.user.email!,
      firstName: profile?.first_name || 'User',
      lastName: profile?.last_name || '',
      skinType: profile?.skin_type,
      role: (profile?.role as any) || 'customer'
    };
  },

  register: async (data: Partial<User> & { password: string }): Promise<User> => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email!,
      password: data.password,
      options: {
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          skinType: data.skinType
        }
      }
    });
    
    if (authError) throw authError;
    if (!authData.user) throw new Error("Signup failed");

    return {
      id: authData.user.id,
      email: data.email!,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      skinType: data.skinType as any,
      role: 'customer'
    };
  },

  updateProfile: async (userId: string, updates: Partial<User>): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: updates.firstName,
        last_name: updates.lastName,
        skin_type: updates.skinType
      })
      .eq('id', userId);
    
    if (error) throw error;
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
      firstName: profile?.first_name || 'User',
      lastName: profile?.last_name || '',
      skinType: profile?.skin_type,
      role: profile?.role || 'customer'
    };
  }
};

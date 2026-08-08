
import { User } from '../types';
import { supabase } from '../lib/supabase';

const mapProfile = (authUser: { id: string; email?: string | null }, profile: any | null): User => ({
  id: authUser.id,
  email: authUser.email || '',
  firstName: profile?.first_name || 'User',
  lastName: profile?.last_name || '',
  skinType: profile?.skin_type,
  role: (profile?.role as User['role']) || 'customer',
  createdAt: profile?.created_at || undefined,
});

const fetchProfile = async (userId: string) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) console.warn('Profile fetch error:', error);
  return data;
};

export const AuthService = {
  login: async (email: string, password: string): Promise<User> => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('Sign in failed');

    const profile = await fetchProfile(data.user.id);
    return mapProfile(data.user, profile);
  },

  register: async (
    data: Partial<User> & { password: string },
  ): Promise<{ user: User; hasSession: boolean }> => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email!,
      password: data.password,
      options: {
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          skinType: data.skinType,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Signup failed');

    const profile = await fetchProfile(authData.user.id);
    return {
      user: mapProfile(authData.user, profile || {
        first_name: data.firstName,
        last_name: data.lastName,
        skin_type: data.skinType,
        role: 'customer',
      }),
      hasSession: !!authData.session,
    };
  },

  requestPasswordReset: async (email: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase is not configured');
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) throw error;
  },

  updatePassword: async (password: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  updateProfile: async (userId: string, updates: Partial<User>): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: updates.firstName,
        last_name: updates.lastName,
        skin_type: updates.skinType,
      })
      .eq('id', userId);

    if (error) throw error;
  },

  logout: async (): Promise<void> => {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  getCurrentUser: async (): Promise<User | null> => {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const profile = await fetchProfile(session.user.id);
    return mapProfile(session.user, profile);
  },
};


import { useEffect } from 'react';
import { AuthService } from '../../services/auth-service';
import { useAuthStore } from '../../store/auth-store';
import { supabase } from '../../lib/supabase';

/**
 * Keeps the Zustand auth store aligned with the Supabase session on load
 * and whenever the JWT changes (login, logout, recovery, refresh).
 */
export const AuthBootstrap = () => {
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      try {
        const user = await AuthService.getCurrentUser();
        if (!active) return;
        if (user) login(user);
        else logout();
      } catch {
        if (active) logout();
      }
    };

    sync();

    if (!supabase) return () => { active = false; };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        logout();
        return;
      }
      // Defer so getSession inside getCurrentUser sees the new token.
      void AuthService.getCurrentUser().then((user) => {
        if (!active) return;
        if (user) login(user);
        else logout();
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [login, logout]);

  return null;
};

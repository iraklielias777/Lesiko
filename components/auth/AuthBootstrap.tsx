
import { useCallback, useEffect } from 'react';
import { useWhisperr } from '@whisperr/react';
import { AuthService } from '../../services/auth-service';
import { useAuthStore } from '../../store/auth-store';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';

/**
 * Keeps the Zustand auth store aligned with the Supabase session on load
 * and whenever the JWT changes (login, logout, recovery, refresh).
 */
export const AuthBootstrap = () => {
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const whisperr = useWhisperr();

  /**
   * Shoppers are the audience here; the admin role is the store operator and is
   * deliberately left unidentified. Only profile fields the app already holds
   * are sent, and no contact channel is declared because the app stores no
   * marketing opt-in flag — consent is never inferred from an address on file.
   */
  const identifyShopper = useCallback((user: User) => {
    if (!whisperr || user.role === 'admin') return;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    // Only an explicit, stored language choice overrides the SDK's device locale.
    let locale: string | null = null;
    try { locale = localStorage.getItem('i18nextLng'); } catch { /* ignore */ }
    try {
      whisperr.identify(user.id, {
        traits: {
          ...(name ? { name } : {}),
          ...(locale ? { locale } : {}),
        },
      });
    } catch { /* analytics must never break the app */ }
  }, [whisperr]);

  const resetShopper = useCallback(() => {
    if (!whisperr) return;
    try { whisperr.reset(); } catch { /* analytics must never break the app */ }
  }, [whisperr]);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      try {
        const user = await AuthService.getCurrentUser();
        if (!active) return;
        if (user) {
          login(user);
          identifyShopper(user);
        } else {
          logout();
          resetShopper();
        }
      } catch {
        if (active) {
          logout();
          resetShopper();
        }
      }
    };

    sync();

    if (!supabase) return () => { active = false; };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        logout();
        resetShopper();
        return;
      }
      // Defer so getSession inside getCurrentUser sees the new token.
      void AuthService.getCurrentUser().then((user) => {
        if (!active) return;
        if (user) {
          login(user);
          identifyShopper(user);
        } else {
          logout();
          resetShopper();
        }
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [login, logout, identifyShopper, resetShopper]);

  return null;
};

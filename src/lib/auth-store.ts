'use client';

import { useUser, useClerk } from '@clerk/nextjs';

/**
 * Clerk Auth Adapter
 *
 * This adapter exposes the same interface as the old Zustand auth store,
 * so components that consume `useAuthStore()` don't need changes.
 *
 * Under the hood, it delegates to Clerk's `useUser()` and `useClerk()`.
 * The `user` object is shaped to match the old `DemoUser` interface for
 * backward compatibility.
 *
 * Migration notes:
 * - `login(email, password)` → opens Clerk's sign-in modal
 * - `loginAs(userId)` → opens Clerk's sign-up modal (demo users no longer exist)
 * - `logout()` → calls Clerk's `signOut()`
 * - `hasHydrated` → `isLoaded` from Clerk (true once Clerk has checked session)
 */

// Shape matching the old DemoUser interface for backward compat
interface AdaptedUser {
  id: string;
  email: string;
  name: string;
  nameLocalized: { ar: string; en: string };
  avatarUrl?: string;
  bio: string;
  bioLocalized: { ar: string; en: string };
  gender?: 'male' | 'female';
  nationality?: string;
  interests: string[];
  membershipTier: 'NEWCOMER' | 'REGULAR' | 'CURATOR' | 'HOST';
  hostedCount: number;
  attendedCount: number;
}

interface AuthState {
  user: AdaptedUser | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  login: (email: string, password: string) => { success: boolean; error?: string };
  loginAs: (userId: string) => void;
  logout: () => void;
}

export function useAuthStore(): AuthState {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut, openSignIn, openSignUp } = useClerk();

  const adaptedUser: AdaptedUser | null = user
    ? {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? '',
        name: user.fullName ?? user.username ?? '',
        nameLocalized: {
          ar: user.fullName ?? user.username ?? '',
          en: user.fullName ?? user.username ?? '',
        },
        avatarUrl: user.imageUrl,
        bio: '{}',
        bioLocalized: { ar: '', en: '' },
        interests: [],
        membershipTier: 'NEWCOMER',
        hostedCount: 0,
        attendedCount: 0,
      }
    : null;

  return {
    user: adaptedUser,
    isAuthenticated: isSignedIn ?? false,
    hasHydrated: isLoaded,
    setHasHydrated: () => {}, // no-op (Clerk manages this)
    login: () => {
      openSignIn({ fallbackRedirectUrl: '/dashboard' });
      return { success: true };
    },
    loginAs: () => {
      openSignUp({ fallbackRedirectUrl: '/dashboard' });
    },
    logout: () => {
      void signOut({ redirectUrl: '/' });
    },
  };
}

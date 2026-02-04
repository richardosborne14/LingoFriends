/**
 * LingoFriends - Auth Hook & Context
 * 
 * Provides authentication state and methods throughout the app.
 * Handles session persistence, loading states, and auth changes.
 * 
 * Usage:
 *   // Wrap app with AuthProvider
 *   <AuthProvider>
 *     <App />
 *   </AuthProvider>
 * 
 *   // Use in components
 *   const { user, profile, login, logout, isLoading } = useAuth();
 * 
 * @module useAuth
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  pb,
  isAuthenticated,
  getCurrentUser,
  login as pbLogin,
  signup as pbSignup,
  logout as pbLogout,
  refreshAuth,
  getProfile,
  updateProfile as pbUpdateProfile,
  addXP as pbAddXP,
  requestPasswordReset as pbRequestPasswordReset,
} from '../../services/pocketbaseService';
import type { UserProfile, NativeLanguage } from '../../types';

// ============================================
// TYPES
// ============================================

/** Auth state for the context */
interface AuthState {
  /** Whether auth check is in progress */
  isLoading: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Pocketbase user record (id, username, etc) */
  user: ReturnType<typeof getCurrentUser>;
  /** User's profile (name, level, XP, etc) */
  profile: UserProfile | null;
  /** Last auth error message (kid-friendly) */
  error: string | null;
}

/** Result of adding XP */
interface AddXPResult {
  /** New total XP */
  xp: number;
  /** Today's earned XP */
  dailyXP: number;
  /** Whether daily cap was hit */
  capped: boolean;
}

/** Auth methods exposed by the hook */
interface AuthMethods {
  /** Log in with username and password */
  login: (username: string, password: string) => Promise<boolean>;
  /** Sign up a new user */
  signup: (username: string, password: string, displayName: string, nativeLanguage?: NativeLanguage) => Promise<boolean>;
  /** Log out the current user */
  logout: () => void;
  /** Update the user's profile */
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  /** Add XP with daily cap enforcement */
  addXP: (amount: number) => Promise<AddXPResult>;
  /** Clear any auth errors */
  clearError: () => void;
  /** Refresh profile from server */
  refreshProfile: () => Promise<void>;
}

type AuthContextType = AuthState & AuthMethods;

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | null>(null);

// ============================================
// PROVIDER
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * 
 * Wrap your app with this to enable auth throughout the component tree.
 * Handles:
 * - Session restoration on mount
 * - Auth state management
 * - Profile sync
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    profile: null,
    error: null,
  });

  /**
   * Initialize auth state on mount
   * Checks for existing session and restores it
   */
  useEffect(() => {
    const initAuth = async () => {
      // Try to refresh existing auth
      const isValid = await refreshAuth();
      
      if (isValid && isAuthenticated()) {
        // Session is valid, fetch profile
        const profile = await getProfile();
        setState({
          isLoading: false,
          isAuthenticated: true,
          user: getCurrentUser(),
          profile,
          error: null,
        });
      } else {
        // No valid session
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          profile: null,
          error: null,
        });
      }
    };

    initAuth();
  }, []);

  /**
   * Subscribe to Pocketbase auth store changes
   * This handles cases where auth changes externally (e.g., token expiry)
   */
  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(async (token, model) => {
      if (token && model) {
        // Auth gained or refreshed
        const profile = await getProfile();
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: model,
          profile,
        }));
      } else {
        // Auth lost
        setState(prev => ({
          ...prev,
          isAuthenticated: false,
          user: null,
          profile: null,
        }));
      }
    });

    return unsubscribe;
  }, []);

  /**
   * Login handler
   */
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const profile = await pbLogin(username, password);
      setState({
        isLoading: false,
        isAuthenticated: true,
        user: getCurrentUser(),
        profile,
        error: null,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      return false;
    }
  }, []);

  /**
   * Signup handler
   */
  const signup = useCallback(async (
    username: string,
    password: string,
    displayName: string,
    nativeLanguage: NativeLanguage = 'English'
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const profile = await pbSignup(username, password, displayName, nativeLanguage);
      setState({
        isLoading: false,
        isAuthenticated: true,
        user: getCurrentUser(),
        profile,
        error: null,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      return false;
    }
  }, []);

  /**
   * Logout handler
   */
  const logout = useCallback(() => {
    pbLogout();
    setState({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      profile: null,
      error: null,
    });
  }, []);

  /**
   * Update profile handler
   */
  const updateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<void> => {
    try {
      const updatedProfile = await pbUpdateProfile(updates);
      setState(prev => ({
        ...prev,
        profile: updatedProfile,
      }));
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  }, []);

  /**
   * Add XP with daily cap enforcement
   * Updates local state optimistically, syncs with Pocketbase
   */
  const addXP = useCallback(async (amount: number): Promise<AddXPResult> => {
    try {
      const result = await pbAddXP(amount);
      
      // Update local profile state with new XP
      setState(prev => ({
        ...prev,
        profile: prev.profile ? {
          ...prev.profile,
          xp: result.xp,
        } : null,
      }));
      
      return result;
    } catch (err) {
      console.error('Failed to add XP:', err);
      // Return safe defaults on error - don't throw to keep UX smooth for kids
      return {
        xp: state.profile?.xp || 0,
        dailyXP: 0,
        capped: false,
      };
    }
  }, [state.profile?.xp]);

  /**
   * Refresh profile from server
   */
  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!state.isAuthenticated) return;
    
    const profile = await getProfile();
    if (profile) {
      setState(prev => ({
        ...prev,
        profile,
      }));
    }
  }, [state.isAuthenticated]);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Build context value
  const value: AuthContextType = {
    ...state,
    login,
    signup,
    logout,
    updateProfile,
    addXP,
    clearError,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

/**
 * Use Auth Hook
 * 
 * Access auth state and methods from any component.
 * Must be used within an AuthProvider.
 * 
 * @example
 * const { user, profile, login, logout } = useAuth();
 * 
 * if (!user) {
 *   return <LoginScreen />;
 * }
 * 
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Hook that only returns when auth check is complete
 * Useful for route guards
 */
export function useAuthReady(): boolean {
  const { isLoading } = useAuth();
  return !isLoading;
}

/**
 * Hook that requires authentication
 * Returns profile if authenticated, null if not
 * Useful for protected components
 */
export function useRequireAuth(): UserProfile | null {
  const { isAuthenticated, profile, isLoading } = useAuth();
  
  if (isLoading) return null;
  if (!isAuthenticated) return null;
  
  return profile;
}

export default useAuth;

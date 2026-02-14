import { createContext, useContext, ReactNode, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useAuth0 } from '@auth0/auth0-react';
import { supabase } from '@/integrations/supabase/client';
import { logAction } from '@/services/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithCredentials: (email: string, password: string) => Promise<{ error: any }>;
  signUp: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    user: auth0User,
    isAuthenticated: auth0IsAuthenticated,
    isLoading: auth0IsLoading,
    loginWithRedirect,
    logout
  } = useAuth0();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const loggedRef = useRef(false); // Ref to prevent double logging on re-renders

  const authProvider = import.meta.env.VITE_AUTH_PROVIDER || 'auth0'; // Default to 'auth0' for smooth transition

  useEffect(() => {
    if (authProvider === 'supabase') {
      // Initialize Supabase auth
      const getSession = async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        if (session) {
          setUser(session.user);
          setSession(session);
          setIsAuthenticated(true);
          // Log Login Event only once per session/mount
          if (!loggedRef.current) {
            logAction('LOGIN', {
              method: 'Supabase',
              email: session.user.email,
              provider: 'supabase'
            }, session.user.id);
            loggedRef.current = true;
          }
        } else {
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
          loggedRef.current = false;
        }
        setLoading(false);
      };

      getSession();

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          setUser(session.user);
          setSession(session);
          setIsAuthenticated(true);
          if (event === 'SIGNED_IN' && !loggedRef.current) {
            logAction('LOGIN', {
              method: 'Supabase',
              email: session.user.email,
              provider: 'supabase'
            }, session.user.id);
            loggedRef.current = true;
          }
        } else {
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
          if (event === 'SIGNED_OUT' && loggedRef.current) {
            loggedRef.current = false;
          }
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Auth0 logic
      if (auth0User) {
        // Compatibility mapping: Auth0 User -> Supabase User shape
        // We map 'sub' to 'id' so that useRbac and other hooks can identify the user.
        const mappedUser: any = {
          id: auth0User.sub,
          email: auth0User.email,
          app_metadata: {},
          user_metadata: {
            nome: auth0User.name,
            picture: auth0User.picture,
          },
          aud: 'authenticated',
          created_at: auth0User.updated_at || new Date().toISOString(),
        };

        setUser(mappedUser as User);

        // Create a mock session object since we don't have a direct Supabase session yet.
        // In a production app integrating with Supabase RLS, you would exchange the
        // Auth0 token for a custom JWT here.
        const mockSession: any = {
          access_token: 'auth0-access-token-placeholder',
          user: mappedUser,
          token_type: 'bearer'
        };
        setSession(mockSession as Session);

        // Log Login Event only once per session/mount
        if (!loggedRef.current) {
          logAction('LOGIN', {
            method: 'Auth0',
            email: auth0User.email,
            provider: auth0User.sub?.split('|')[0]
          }, auth0User.sub);
          loggedRef.current = true;
        }
        setIsAuthenticated(auth0IsAuthenticated);
        setLoading(auth0IsLoading);

      } else {
        setUser(null);
        setSession(null);
        setIsAuthenticated(false);
        setLoading(auth0IsLoading);
        loggedRef.current = false;
      }
    }
  }, [auth0User, auth0IsAuthenticated, auth0IsLoading, authProvider]);

  const signIn = async () => {
    if (authProvider === 'supabase') {
      // Temporary implementation: use prompts for email/password
      // In production, this would be replaced with a proper login form
      const email = window.prompt('Email:');
      const password = window.prompt('Password:');
      if (email && password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          console.error('Sign in error:', error);
          alert(`Erro no login: ${error.message}`);
        } else if (data.user) {
          // User is set via onAuthStateChange
        }
      }
    } else {
      await loginWithRedirect();
    }
  };

  const signInWithCredentials = async (email: string, password: string) => {
    if (authProvider === 'supabase') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } else {
      // For Auth0, we could potentially implement password-based login
      // but for now, fall back to redirect
      await loginWithRedirect();
      return { error: null };
    }
  };

  const signUp = async () => {
    if (authProvider === 'supabase') {
      // Temporary implementation
      const email = window.prompt('Email:');
      const password = window.prompt('Password:');
      if (email && password) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          console.error('Sign up error:', error);
          alert(`Erro no registro: ${error.message}`);
        } else if (data.user) {
          // User is set via onAuthStateChange
          alert('Registro realizado! Verifique seu email.');
        }
      }
    } else {
      await loginWithRedirect({
        authorizationParams: {
          screen_hint: 'signup'
        }
      });
    }
  };

  const signOut = async () => {
    if (user?.id) {
      await logAction('LOGOUT', {}, user.id);
    }
    if (authProvider === 'supabase') {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
    } else {
      await logout({
        logoutParams: { returnTo: window.location.origin }
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signInWithCredentials,
      signUp,
      signOut,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import { createContext, useContext, ReactNode, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const loggedRef = useRef(false);

  useEffect(() => {
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
  }, []);

  const signIn = async () => {
    const email = window.prompt('Email:');
    const password = window.prompt('Password:');
    if (email && password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Sign in error:', error);
        alert(`Erro no login: ${error.message}`);
      }
    }
  };

  const signInWithCredentials = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async () => {
    const email = window.prompt('Email:');
    const password = window.prompt('Password:');
    if (email && password) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        console.error('Sign up error:', error);
        alert(`Erro no registro: ${error.message}`);
      } else {
        alert('Registro realizado! Verifique seu email.');
      }
    }
  };

  const signOut = async () => {
    if (user?.id) {
      await logAction('LOGOUT', {}, user.id);
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
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

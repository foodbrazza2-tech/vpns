import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

const ALLOWED_LOGIN_EMAIL = 'edson@gmail.com';
const ALLOWED_LOGIN_PASSWORD = 'Vpns2025';
const LOCAL_AUTH_KEY = 'vpns-local-auth';

// Initialisation sécurisée du client Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key-for-testing';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'Variables Supabase manquantes. Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY. L\'authentification et l\'archivage fonctionneront en mode degrade.'
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // sessionStorage clears when the browser/app is fully closed, forcing a fresh login next time
    // while still surviving reloads/navigation during the same visit.
    storage: window.sessionStorage,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'vpns-consulting/1.0.0',
    },
  },
});

// Types d'authentification
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role?: 'admin' | 'user' | 'viewer';
}

export interface AuthResponse {
  user: AuthUser | null;
  session: Session | null;
  error: Error | null;
}

function isAllowedEmail(email: string | undefined | null): boolean {
  return (email || '').trim().toLowerCase() === ALLOWED_LOGIN_EMAIL;
}

function setLocalAuth(enabled: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (enabled) {
    window.sessionStorage.setItem(LOCAL_AUTH_KEY, ALLOWED_LOGIN_EMAIL);
    return;
  }

  window.sessionStorage.removeItem(LOCAL_AUTH_KEY);
}

function hasLocalAuth(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.sessionStorage.getItem(LOCAL_AUTH_KEY) === ALLOWED_LOGIN_EMAIL;
}

function createLocalSession(): Session {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: 'vpns-local-access-token',
    refresh_token: 'vpns-local-refresh-token',
    expires_in: 86400,
    expires_at: now + 86400,
    token_type: 'bearer',
    user: {
      id: 'vpns-local-user',
      app_metadata: {},
      user_metadata: { name: 'Edson' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: ALLOWED_LOGIN_EMAIL,
    },
  } as Session;
}

// Service d'authentification
export class AuthService {
  static getAllowedEmail(): string {
    return ALLOWED_LOGIN_EMAIL;
  }

  /**
   * Inscrit un nouvel utilisateur
   */
  static async signup(email: string, password: string, name: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            created_at: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;

      return {
        user: data.user
          ? {
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.user_metadata?.name,
            }
          : null,
        session: data.session,
        error: null,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error : new Error('Erreur d\'inscription'),
      };
    }
  }

  /**
   * Connecte un utilisateur
   */
  static async signin(email: string, password: string): Promise<AuthResponse> {
    if (!isAllowedEmail(email) || password !== ALLOWED_LOGIN_PASSWORD) {
      return {
        user: null,
        session: null,
        error: new Error('Identifiants non autorises'),
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setLocalAuth(false);

      return {
        user: data.user
          ? {
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.user_metadata?.name,
            }
          : null,
        session: data.session,
        error: null,
      };
    } catch (error) {
      setLocalAuth(true);

      return {
        user: {
          id: 'vpns-local-user',
          email: ALLOWED_LOGIN_EMAIL,
          name: 'Edson',
        },
        session: createLocalSession(),
        error: null,
      };
    }
  }

  /**
   * Se déconnecte
   */
  static async signout(): Promise<{ error: Error | null }> {
    try {
      setLocalAuth(false);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Erreur de déconnexion'),
      };
    }
  }

  /**
   * Récupère la session actuelle
   */
  static async getSession(): Promise<Session | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;
      if (session?.user?.email && !isAllowedEmail(session.user.email)) {
        await supabase.auth.signOut();
        return null;
      }

      if (session) {
        return session;
      }

      if (hasLocalAuth()) {
        return createLocalSession();
      }

      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération de la session:', error);
      if (hasLocalAuth()) {
        return createLocalSession();
      }
      return null;
    }
  }

  /**
   * Écoute les changements d'authentification
   */
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && isAllowedEmail(session.user.email)) {
        callback({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name,
        });
      } else {
        if (session?.user && !isAllowedEmail(session.user.email)) {
          supabase.auth.signOut();
        }

        if (hasLocalAuth()) {
          callback({
            id: 'vpns-local-user',
            email: ALLOWED_LOGIN_EMAIL,
            name: 'Edson',
          });
          return;
        }

        callback(null);
      }
    });

    return data.subscription;
  }

  /**
   * Réinitialise le mot de passe
   */
  static async resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Erreur de réinitialisation'),
      };
    }
  }

  /**
   * Met à jour le mot de passe
   */
  static async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Erreur de mise à jour'),
      };
    }
  }
}

export default AuthService;

import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

// Initialisation sécurisée du client Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variables Supabase manquantes. Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
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

// Service d'authentification
export class AuthService {
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
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
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
        error: error instanceof Error ? error : new Error('Erreur de connexion'),
      };
    }
  }

  /**
   * Se déconnecte
   */
  static async signout(): Promise<{ error: Error | null }> {
    try {
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
      return session;
    } catch (error) {
      console.error('Erreur lors de la récupération de la session:', error);
      return null;
    }
  }

  /**
   * Écoute les changements d'authentification
   */
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name,
        });
      } else {
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

/**
 * Service de sécurité - Audit persistant (Supabase) et utilitaires de validation
 */
import { supabase } from './authService';

export type AuditStatus = 'success' | 'failure' | 'warning';

export interface SecurityAudit {
  id: string;
  created_at: string;
  action: string;
  status: AuditStatus;
  details: Record<string, unknown> | null;
  user_agent: string | null;
}

export class SecurityService {
  /**
   * Enregistre une action de sécurité dans la table Supabase `audit_logs`.
   * Best-effort : une erreur d'écriture d'audit ne doit jamais bloquer le flux appelant
   * (ex: on ne veut pas empêcher une connexion parce que le log a échoué).
   */
  static async logAudit(
    action: string,
    status: AuditStatus = 'success',
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        action,
        status,
        details: details ?? null,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error("Erreur d'ecriture du journal d'audit:", error);
    }

    if (status !== 'success') {
      console.warn(`[Security] ${action}`, details);
    }
  }

  /**
   * Récupère les logs d'audit les plus récents (limités au propriétaire connecté via RLS).
   */
  static async getAuditLogs(limit: number = 100): Promise<SecurityAudit[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erreur de recuperation du journal d'audit:", error);
      return [];
    }

    return (data as SecurityAudit[]) ?? [];
  }

  /**
   * Valide une entrée pour prévenir les injections
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Valide une adresse email
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Vérifie la force du mot de passe
   */
  static validatePassword(password: string): {
    isValid: boolean;
    strength: 'weak' | 'fair' | 'good' | 'strong';
    errors: string[];
  } {
    const errors: string[] = [];
    let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';

    if (password.length < 8) errors.push('Au moins 8 caractères');
    if (!/[A-Z]/.test(password)) errors.push('Une majuscule');
    if (!/[a-z]/.test(password)) errors.push('Une minuscule');
    if (!/[0-9]/.test(password)) errors.push('Un chiffre');
    if (!/[!@#$%^&*]/.test(password)) errors.push('Un caractère spécial');

    if (errors.length === 0) strength = 'strong';
    else if (errors.length <= 2) strength = 'good';
    else if (errors.length <= 3) strength = 'fair';

    return {
      isValid: errors.length === 0,
      strength,
      errors,
    };
  }

  /**
   * Génère un token CSRF
   */
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Vérifie la validité d'une URL
   */
  static isValidURL(url: string): boolean {
    try {
      const u = new URL(url);
      return ['http:', 'https:'].includes(u.protocol);
    } catch {
      return false;
    }
  }
}

export default SecurityService;

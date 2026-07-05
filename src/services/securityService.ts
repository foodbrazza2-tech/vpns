/**
 * Service de sécurité - Audit et protection
 */

export interface SecurityAudit {
  timestamp: string;
  action: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  status: 'success' | 'failure' | 'warning';
  details?: Record<string, any>;
}

/**
 * Logs de sécurité en mémoire (à persister en DB en production)
 */
const securityLogs: SecurityAudit[] = [];

export class SecurityService {
  /**
   * Enregistre une action de sécurité
   */
  static logAudit(
    action: string,
    status: 'success' | 'failure' | 'warning' = 'success',
    details?: Record<string, any>
  ): void {
    const audit: SecurityAudit = {
      timestamp: new Date().toISOString(),
      action,
      status,
      details,
      userAgent: navigator.userAgent,
    };

    securityLogs.push(audit);

    // Log seulement les erreurs et avertissements en console
    if (status !== 'success') {
      console.warn(`[Security] ${action}:`, audit);
    }
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

  /**
   * Détecte les activités suspectes
   */
  static detectSuspiciousActivity(): boolean {
    // Vérifier le taux de requêtes
    const recentLogs = securityLogs.filter(
      (log) => new Date(log.timestamp).getTime() > Date.now() - 60000 // Dernière minute
    );

    // Plus de 10 tentatives échouées par minute
    const failures = recentLogs.filter((log) => log.status === 'failure').length;
    if (failures > 10) {
      this.logAudit('suspicious_activity_detected', 'warning', { failures });
      return true;
    }

    return false;
  }

  /**
   * Récupère les logs d'audit (admin seulement)
   */
  static getAuditLogs(limit: number = 100): SecurityAudit[] {
    return securityLogs.slice(-limit);
  }

  /**
   * Nettoie les logs anciens
   */
  static clearOldLogs(hoursAgo: number = 24): number {
    const cutoff = Date.now() - hoursAgo * 60 * 60 * 1000;
    const count = securityLogs.length;
    securityLogs.splice(
      0,
      securityLogs.findIndex((log) => new Date(log.timestamp).getTime() > cutoff)
    );
    return count - securityLogs.length;
  }
}

export default SecurityService;

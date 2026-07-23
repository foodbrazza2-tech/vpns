import { useEffect, useState } from 'react';
import AuthService from '../services/authService';
import SecurityService from '../services/securityService';
import { checkLockout, recordFailedAttempt, resetAttempts } from '../utils/loginRateLimit';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

export function LoginComponent({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lockedSeconds, setLockedSeconds] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const status = checkLockout();
    setLockedSeconds(status.remainingSeconds);
    setIsLocked(status.locked);
  }, []);

  // Reevalue le verrouillage chaque seconde pendant qu'il est actif (que le
  // verrouillage vienne du chargement de la page ou d'une tentative echouee en
  // cours de session), pour reactiver automatiquement le formulaire au bon moment.
  useEffect(() => {
    if (!isLocked) return;

    const interval = window.setInterval(() => {
      const s = checkLockout();
      setLockedSeconds(s.remainingSeconds);
      if (!s.locked) setIsLocked(false);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isLocked]);

  const validateInputs = (): boolean => {
    if (email.trim().toLowerCase() !== AuthService.getAllowedEmail()) {
      setError('Seul l identifiant autorise peut se connecter');
      SecurityService.logAudit('login_blocked_email', 'failure', { email });
      return false;
    }

    if (!SecurityService.isValidEmail(email)) {
      setError('Email invalide');
      SecurityService.logAudit('login_invalid_email', 'failure', { email });
      return false;
    }

    if (password.length < 8) {
      setError('Mot de passe invalide');
      SecurityService.logAudit('login_invalid_password', 'failure');
      return false;
    }

    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const lockout = checkLockout();
    if (lockout.locked) {
      setLockedSeconds(lockout.remainingSeconds);
      setIsLocked(true);
      setError(`Trop de tentatives echouees. Reessayez dans ${lockout.remainingSeconds}s.`);
      return;
    }

    if (!validateInputs()) {
      const attempt = recordFailedAttempt();
      if (attempt.locked) {
        setLockedSeconds(attempt.remainingSeconds);
        setIsLocked(true);
        SecurityService.logAudit('login_lockout', 'warning', { email, attempts: attempt.attempts });
        setError(`Trop de tentatives echouees. Reessayez dans ${attempt.remainingSeconds}s.`);
      }
      return;
    }

    setLoading(true);
    SecurityService.logAudit('login_attempt', 'success', { email });

    const response = await AuthService.signin(email, password);

    if (response.error) {
      setError(response.error.message);
      await SecurityService.logAudit('login_failed', 'failure', { email, error: response.error.message });
      const attempt = recordFailedAttempt();
      if (attempt.locked) {
        setLockedSeconds(attempt.remainingSeconds);
        setIsLocked(true);
        await SecurityService.logAudit('login_lockout', 'warning', { email, attempts: attempt.attempts });
        setError(`Trop de tentatives echouees. Reessayez dans ${attempt.remainingSeconds}s.`);
      }
      setLoading(false);
      return;
    }

    if (response.session?.access_token) {
      resetAttempts();
      SecurityService.logAudit('login_success', 'success', { email });
      onLoginSuccess(response.session.access_token);
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🔐 Connexion</h1>
        <p style={styles.subtitle}>VPNS Consulting</p>
        <p style={styles.helper}>Identifiant autorise: edson@gmail.com</p>

        {error && <div style={styles.error}>{error}</div>}
        {isLocked && !error && (
          <div style={styles.error}>Trop de tentatives echouees. Reessayez dans {lockedSeconds}s.</div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email / Identifiant</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="edson@gmail.com"
              disabled={loading || isLocked}
              style={styles.input}
              autoComplete="off"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Mot de passe</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading || isLocked}
                style={styles.input}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isLocked}
            style={{
              ...styles.button,
              opacity: loading || isLocked ? 0.6 : 1,
              cursor: loading || isLocked ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Connexion en cours...' : isLocked ? `Verrouille (${lockedSeconds}s)` : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '16px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '8px',
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '8px',
    fontSize: '14px',
  },
  helper: {
    textAlign: 'center',
    color: '#4b5563',
    marginBottom: '24px',
    fontSize: '13px',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '8px',
    fontWeight: '500',
    fontSize: '14px',
    color: '#333',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordToggle: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '8px',
  },
  button: {
    padding: '12px',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    marginTop: '8px',
  },
};

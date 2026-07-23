/**
 * Protection anti-bruteforce sur la connexion : verrouillage progressif base sur
 * le nombre de tentatives echouees, stocke en sessionStorage (par onglet/session
 * de navigateur, remis a zero a la fermeture complete de l'app, comme la session
 * Supabase elle-meme).
 */

const STORAGE_KEY = 'vpns_login_attempts';

interface AttemptState {
  count: number;
  lockedUntil: number | null;
}

function readState(): AttemptState {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, lockedUntil: null };
    const parsed = JSON.parse(raw);
    return { count: parsed.count || 0, lockedUntil: parsed.lockedUntil ?? null };
  } catch {
    return { count: 0, lockedUntil: null };
  }
}

function writeState(state: AttemptState): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage indisponible (mode prive strict) : on tolere l'absence de blocage persistant.
  }
}

// Palier de verrouillage en secondes selon le nombre cumule de tentatives echouees.
function lockoutDurationSeconds(attemptCount: number): number {
  if (attemptCount >= 8) return 600;
  if (attemptCount >= 6) return 300;
  if (attemptCount >= 5) return 120;
  if (attemptCount >= 4) return 60;
  if (attemptCount >= 3) return 30;
  return 0;
}

export interface LockoutStatus {
  locked: boolean;
  remainingSeconds: number;
}

export function checkLockout(): LockoutStatus {
  const state = readState();
  if (state.lockedUntil && state.lockedUntil > Date.now()) {
    return { locked: true, remainingSeconds: Math.ceil((state.lockedUntil - Date.now()) / 1000) };
  }
  return { locked: false, remainingSeconds: 0 };
}

export function recordFailedAttempt(): LockoutStatus & { attempts: number } {
  const state = readState();
  const count = state.count + 1;
  const durationSeconds = lockoutDurationSeconds(count);
  const lockedUntil = durationSeconds > 0 ? Date.now() + durationSeconds * 1000 : null;
  writeState({ count, lockedUntil });
  return { locked: durationSeconds > 0, remainingSeconds: durationSeconds, attempts: count };
}

export function resetAttempts(): void {
  writeState({ count: 0, lockedUntil: null });
}

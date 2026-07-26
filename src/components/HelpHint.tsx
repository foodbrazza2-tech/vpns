import { useState } from 'react';

interface HelpHintProps {
  id: string;
  children: React.ReactNode;
}

const STORAGE_PREFIX = 'vpns_hint_dismissed_';

function isDismissed(id: string): boolean {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + id) === '1';
  } catch {
    return false;
  }
}

function dismiss(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + id, '1');
  } catch {
    // stockage indisponible : le conseil reste visible, sans consequence grave.
  }
}

// Petit encart d'aide contextuelle, en langage simple, explique quoi cliquer
// pour faire une action donnee. Se referme et reste ferme (par section, via
// localStorage) une fois lu - le bouton "Aide" dans la barre laterale permet
// de tout reafficher si besoin.
export function HelpHint({ id, children }: HelpHintProps) {
  const [dismissed, setDismissed] = useState(() => isDismissed(id));
  if (dismissed) return null;

  return (
    <div className="help-hint">
      <span className="help-hint-icon">💡</span>
      <span className="help-hint-text">{children}</span>
      <button
        type="button"
        className="help-hint-close"
        onClick={() => { dismiss(id); setDismissed(true); }}
        aria-label="Fermer ce conseil"
      >
        ×
      </button>
    </div>
  );
}

// Reaffiche tous les conseils precedemment fermes (bouton "Aide").
export function resetAllHints(): void {
  try {
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(STORAGE_PREFIX));
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // stockage indisponible : rien a reinitialiser.
  }
}

export default HelpHint;

import { usePWA } from '../hooks/usePWA';

export function PWAPrompt() {
  const { canInstall, updateAvailable, promptInstall, updateSW } = usePWA();

  if (!canInstall && !updateAvailable) {
    return null;
  }

  return (
    <div style={styles.container}>
      {canInstall && (
        <div style={styles.prompt}>
          <div>
            <strong>📱 Installer l'application</strong>
            <p>Utilisez VPNS hors ligne</p>
          </div>
          <button onClick={promptInstall} style={styles.buttonPrimary}>
            Installer
          </button>
          <button onClick={() => {}} style={styles.buttonSecondary}>
            ✕
          </button>
        </div>
      )}

      {updateAvailable && (
        <div style={styles.prompt}>
          <div>
            <strong>🔄 Mise à jour disponible</strong>
            <p>Une nouvelle version est disponible</p>
          </div>
          <button onClick={updateSW} style={styles.buttonPrimary}>
            Mettre à jour
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  prompt: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#2196f3',
    color: 'white',
    gap: '16px',
  },
  buttonPrimary: {
    padding: '8px 16px',
    backgroundColor: 'white',
    color: '#2196f3',
    border: 'none',
    borderRadius: '4px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: 'white',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
  },
};

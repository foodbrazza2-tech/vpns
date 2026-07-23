interface ParametresSectionProps {
  userEmail?: string;
  notificationsCount: number;
  clientsCount: number;
  invoicesCount: number;
  entriesCount: number;
  onLogout: () => void;
}

export function ParametresSection({
  userEmail,
  notificationsCount,
  clientsCount,
  invoicesCount,
  entriesCount,
  onLogout,
}: ParametresSectionProps) {
  return (
    <section className="section-stack">
      <article className="panel-card">
        <div className="panel-top">
          <h4>Parametres</h4>
          <span>Compte et preferences</span>
        </div>
        <div className="setting-grid">
          <div className="setting-item">
            <div className="setting-icon" style={{ background: 'rgba(79,70,229,0.12)' }}>👤</div>
            <strong>Compte</strong>
            <p>{userEmail}</p>
            <span>Administrateur</span>
          </div>
          <div className="setting-item">
            <div className="setting-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>🔒</div>
            <strong>Securite</strong>
            <p>Authentification par identifiant unique</p>
            <span>Active</span>
          </div>
          <div className="setting-item">
            <div className="setting-icon" style={{ background: 'rgba(217,119,6,0.12)' }}>🔔</div>
            <strong>Notifications</strong>
            <p>{notificationsCount} notification(s) programmee(s)</p>
            <span>Configure</span>
          </div>
          <div className="setting-item">
            <div className="setting-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>💾</div>
            <strong>Donnees</strong>
            <p>{clientsCount} clients - {invoicesCount} factures - {entriesCount} ecritures</p>
            <span>A jour</span>
          </div>
          <div className="setting-item">
            <div className="setting-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>🚪</div>
            <strong>Session</strong>
            <p>Se deconnecter de VPNS Consulting</p>
            <button type="button" className="secondary-btn" onClick={onLogout}>Se deconnecter</button>
          </div>
        </div>
      </article>
    </section>
  );
}

export default ParametresSection;

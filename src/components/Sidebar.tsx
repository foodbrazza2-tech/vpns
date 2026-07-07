import React from 'react';

type SectionKey = 'dashboard' | 'comptabilite' | 'factures' | 'clients' | 'agenda' | 'documents' | 'rapports' | 'notifications' | 'parametres';

type NavItem = { key: SectionKey; label: string; icon: string };

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: '🏠' },
  { key: 'comptabilite', label: 'Comptabilite', icon: '🧾' },
  { key: 'factures', label: 'Factures', icon: '📄' },
  { key: 'clients', label: 'Clients', icon: '👥' },
  { key: 'agenda', label: 'Agenda', icon: '🗓️' },
  { key: 'documents', label: 'Documents', icon: '📁' },
  { key: 'rapports', label: 'Rapports', icon: '📊' },
  { key: 'notifications', label: 'Notifications', icon: '🔔' },
  { key: 'parametres', label: 'Parametres', icon: '⚙️' },
];

interface SidebarProps {
  activeSection: SectionKey;
  onSelectSection: (section: SectionKey) => void;
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  onLogout?: () => void;
  notificationCount?: number;
}

export default function Sidebar({ activeSection, onSelectSection, isOpen, onClose, userName, onLogout, notificationCount = 0 }: SidebarProps) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`.trim()}>
      <div className="sidebar-head">
        <div className="brand-block">
          <div className="brand-mark">VP</div>
          <div>
            <h1>VPNS Consulting</h1>
            <p>Comptabilite OHADA</p>
          </div>
        </div>
        <button type="button" className="sidebar-close" onClick={onClose} aria-label="Fermer le menu">
          ×
        </button>
      </div>

      <nav className="nav-list">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nav-item ${activeSection === item.key ? 'active' : ''}`}
            onClick={() => {
              onSelectSection(item.key);
              onClose();
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.key === 'notifications' && notificationCount > 0 && (
              <span className="nav-badge">{notificationCount > 9 ? '9+' : notificationCount}</span>
            )}
          </button>
        ))}
      </nav>

      {userName && (
        <div className="sidebar-footer">
          <div className="user-info">
            <p className="user-name">{userName}</p>
            <p className="user-role">Administrateur</p>
          </div>
          {onLogout && (
            <button type="button" className="logout-btn" onClick={onLogout}>
              Se deconnecter
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

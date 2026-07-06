import React from 'react';

type SectionKey = 'dashboard' | 'comptabilite' | 'factures' | 'clients' | 'agenda' | 'documents' | 'rapports' | 'notifications' | 'parametres';

type NavItem = { key: SectionKey; label: string; icon: string };

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: '🏠' },
  { key: 'comptabilite', label: 'Comptabilité', icon: '🧾' },
  { key: 'factures', label: 'Factures', icon: '📄' },
  { key: 'clients', label: 'Clients', icon: '👥' },
  { key: 'agenda', label: 'Agenda', icon: '🗓️' },
  { key: 'documents', label: 'Documents', icon: '📁' },
  { key: 'rapports', label: 'Rapports', icon: '📊' },
  { key: 'notifications', label: 'Notifications', icon: '🔔' },
  { key: 'parametres', label: 'Paramètres', icon: '⚙️' },
];

interface SidebarProps {
  activeSection: SectionKey;
  onSelectSection: (section: SectionKey) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export default function Sidebar({ activeSection, onSelectSection, onClose, isMobile = false }: SidebarProps) {
  return (
    <aside className={`sidebar ${isMobile ? 'sidebar-mobile' : ''}`.trim()}>
      <div className="sidebar-head">
        <div className="brand-block">
          <div className="brand-mark">VP</div>
          <div>
            <h1>VPNS Consulting</h1>
            <p>Comptabilité OHADA</p>
          </div>
        </div>
        {isMobile && (
          <button type="button" className="sidebar-close" onClick={onClose} aria-label="Fermer le menu">
            ×
          </button>
        )}
      </div>

      <nav className="nav-list">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nav-item ${activeSection === item.key ? 'active' : ''}`}
            onClick={() => {
              onSelectSection(item.key);
              if (onClose) onClose();
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

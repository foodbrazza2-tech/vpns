import React from 'react';
import PrimaryButton from './PrimaryButton';

interface TopBarProps {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  onMenuToggle: () => void;
}

export default function TopBar({ title, subtitle, actionLabel, onAction, onMenuToggle }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="menu-toggle" onClick={onMenuToggle}>
          ☰ Menu
        </button>
        <div>
          <p className="eyebrow">{title}</p>
          <h2>{subtitle}</h2>
        </div>
      </div>
      <div className="topbar-actions">
        <span className="hero-pill">Aujourd’hui</span>
        <PrimaryButton onClick={onAction}>{actionLabel}</PrimaryButton>
      </div>
    </header>
  );
}

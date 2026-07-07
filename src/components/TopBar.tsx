import React from 'react';
import PrimaryButton from './PrimaryButton';

interface TopBarProps {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  onMenuToggle?: () => void;
}

export default function TopBar({ title, subtitle, actionLabel, onAction, onMenuToggle }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="menu-toggle" onClick={onMenuToggle} aria-label="Ouvrir le menu">
          <span aria-hidden="true">☰</span>
          <span>Menu</span>
        </button>
        <div>
          <p className="eyebrow">{title}</p>
          <h2>{subtitle}</h2>
        </div>
      </div>
      {actionLabel && onAction && <PrimaryButton onClick={onAction}>{actionLabel}</PrimaryButton>}
    </header>
  );
}

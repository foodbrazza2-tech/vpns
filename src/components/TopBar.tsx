import React from 'react';
import PrimaryButton from './PrimaryButton';

interface TopBarProps {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}

export default function TopBar({ title, subtitle, actionLabel, onAction }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div>
          <p className="eyebrow">{title}</p>
          <h2>{subtitle}</h2>
        </div>
      </div>
      <PrimaryButton onClick={onAction}>{actionLabel}</PrimaryButton>
    </header>
  );
}

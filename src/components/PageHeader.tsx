import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
}

export default function PageHeader({ title, subtitle, description }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">{subtitle}</p>
        <h1>{title}</h1>
      </div>
      {description && <p className="page-description">{description}</p>}
    </div>
  );
}

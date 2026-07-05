import React from 'react';

interface StatisticCardProps {
  label: string;
  value: string;
  icon?: string;
}

export default function StatisticCard({ label, value, icon }: StatisticCardProps) {
  return (
    <article className="stat-card statistic-card">
      <div className="stat-card-head">
        <span className="stat-icon">{icon}</span>
        <p>{label}</p>
      </div>
      <strong>{value}</strong>
    </article>
  );
}

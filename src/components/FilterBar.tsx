import React from 'react';

interface FilterBarProps {
  filters: Array<{ label: string; value: string }>;
  selected: string;
  onChange: (value: string) => void;
}

export default function FilterBar({ filters, selected, onChange }: FilterBarProps) {
  return (
    <div className="filter-bar">
      {filters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          className={`filter-pill ${selected === filter.value ? 'active' : ''}`}
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

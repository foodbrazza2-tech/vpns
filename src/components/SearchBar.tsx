import React from 'react';

interface SearchBarProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, placeholder = 'Rechercher...', onChange }: SearchBarProps) {
  return (
    <div className="search-bar">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}

import React from 'react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export default function PrimaryButton({ variant = 'primary', className = '', children, ...props }: PrimaryButtonProps) {
  const classes = ['primary-btn', variant === 'secondary' ? 'secondary-btn' : variant === 'ghost' ? 'ghost-btn' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

import React from 'react';

interface NotificationToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export default function NotificationToast({ message, type = 'info', onClose }: NotificationToastProps) {
  return (
    <div className={`toast toast-${type}`} onClick={onClose} role="alert">
      <span>{message}</span>
      <button type="button" className="toast-close">×</button>
    </div>
  );
}

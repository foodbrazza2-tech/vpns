import React from 'react';
import PrimaryButton from './PrimaryButton';

interface ConfirmationDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  title,
  description,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Confirmation</p>
            <h3>{title}</h3>
          </div>
          <button type="button" className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <p>{description}</p>
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onCancel}>{cancelLabel}</button>
            <PrimaryButton onClick={onConfirm}>{confirmLabel}</PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

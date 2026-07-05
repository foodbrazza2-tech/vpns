import React, { useState } from 'react';
import PrimaryButton from './PrimaryButton';

interface AccountingEntryData {
  date: string;
  description: string;
  accountCode: string;
  debit: number;
  credit: number;
  reference?: string;
  category: string;
}

interface AccountingEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AccountingEntryData) => void;
}

export function AccountingEntryModal({ isOpen, onClose, onSubmit }: AccountingEntryModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [debit, setDebit] = useState('');
  const [credit, setCredit] = useState('');
  const [reference, setReference] = useState('');
  const [category, setCategory] = useState('general');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!date) newErrors.date = 'Date requise';
    if (!description.trim()) newErrors.description = 'Description requise';
    if (!accountCode.trim()) newErrors.accountCode = 'Code compte requis';
    
    const debitVal = parseFloat(debit) || 0;
    const creditVal = parseFloat(credit) || 0;
    
    if (debitVal === 0 && creditVal === 0) {
      newErrors.amount = 'Débit ou crédit requis';
    }
    if (debitVal > 0 && creditVal > 0) {
      newErrors.amount = 'Débit et crédit ne peuvent pas être tous deux saisis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      onSubmit({
        date,
        description,
        accountCode,
        debit: parseFloat(debit) || 0,
        credit: parseFloat(credit) || 0,
        reference: reference || undefined,
        category,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Comptabilité OHADA</p>
            <h3>Nouvelle écriture comptable</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {/* Date */}
            <label>
              Date *
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSubmitting}
              />
              {errors.date && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.date}</span>}
            </label>

            {/* Description */}
            <label>
              Libellé de l'écriture *
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Achat de fournitures de bureau"
                style={{ minHeight: '60px' }}
                disabled={isSubmitting}
              />
              {errors.description && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.description}</span>}
            </label>

            {/* Account Code */}
            <label>
              Code compte (plan comptable OHADA) *
              <input
                type="text"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                placeholder="Ex: 401 (Fournisseurs)"
                disabled={isSubmitting}
              />
              {errors.accountCode && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.accountCode}</span>}
            </label>

            {/* Category */}
            <label>
              Catégorie
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="general">Générale</option>
                <option value="achat">Achat</option>
                <option value="vente">Vente</option>
                <option value="depense">Dépense</option>
                <option value="recette">Recette</option>
                <option value="tresorerie">Trésorerie</option>
              </select>
            </label>

            {/* Debit & Credit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>
                Débit (FCFA)
                <input
                  type="number"
                  value={debit}
                  onChange={(e) => setDebit(e.target.value)}
                  placeholder="0"
                  disabled={isSubmitting}
                  step="100"
                />
              </label>

              <label>
                Crédit (FCFA)
                <input
                  type="number"
                  value={credit}
                  onChange={(e) => setCredit(e.target.value)}
                  placeholder="0"
                  disabled={isSubmitting}
                  step="100"
                />
              </label>
            </div>
            {errors.amount && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.amount}</span>}

            {/* Reference */}
            <label>
              Référence (facture, reçu, etc.)
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: FAC-2026-001"
                disabled={isSubmitting}
              />
            </label>

            {/* Actions */}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={onClose} disabled={isSubmitting}>
                Annuler
              </button>
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer l\'écriture'}
              </PrimaryButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

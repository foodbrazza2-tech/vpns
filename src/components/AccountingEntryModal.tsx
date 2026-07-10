import React, { useState } from 'react';
import PrimaryButton from './PrimaryButton';
import { PLAN_COMPTABLE_SYSCOHADA, libelleCompte } from '../data/planComptable';

export interface AccountingEntryData {
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
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
  const [debitAccount, setDebitAccount] = useState('');
  const [creditAccount, setCreditAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [category, setCategory] = useState('general');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!date) newErrors.date = 'Date requise';
    if (!description.trim()) newErrors.description = 'Description requise';
    if (!debitAccount.trim()) newErrors.debitAccount = 'Compte a debiter requis';
    if (!creditAccount.trim()) newErrors.creditAccount = 'Compte a crediter requis';
    if (debitAccount.trim() && creditAccount.trim() && debitAccount.trim() === creditAccount.trim()) {
      newErrors.creditAccount = 'Le compte credite doit etre different du compte debite';
    }

    const amountVal = parseFloat(amount);
    if (!amount || Number.isNaN(amountVal) || amountVal <= 0) {
      newErrors.amount = 'Montant valide requis';
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
        debitAccount,
        creditAccount,
        amount: parseFloat(amount),
        reference: reference || undefined,
        category,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const accountsDatalist = (
    <datalist id="plan-comptable-syscohada">
      {PLAN_COMPTABLE_SYSCOHADA.map((cl) => (
        <optgroup key={cl.classe} label={cl.titre}>
          {cl.comptes.map((c) => (
            <option key={c.code} value={c.code}>{c.code} - {c.libelle}</option>
          ))}
        </optgroup>
      ))}
    </datalist>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Comptabilité OHADA - partie double</p>
            <h3>Nouvelle écriture comptable</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="import-hint">
              Chaque écriture débite un compte et crédite un autre du même montant : l'équilibre débit = crédit est garanti automatiquement (norme SYSCOHADA).
            </div>

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

            {/* Debit & Credit accounts (plan comptable SYSCOHADA) */}
            {accountsDatalist}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>
                Compte à débiter *
                <input
                  type="text"
                  list="plan-comptable-syscohada"
                  value={debitAccount}
                  onChange={(e) => setDebitAccount(e.target.value.split(' - ')[0].trim())}
                  placeholder="Tapez un code ou un nom"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
                {debitAccount && libelleCompte(debitAccount) && (
                  <span style={{ color: '#059669', fontSize: '0.8rem', marginTop: '2px', display: 'block' }}>{libelleCompte(debitAccount)}</span>
                )}
                {errors.debitAccount && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.debitAccount}</span>}
              </label>

              <label>
                Compte à créditer *
                <input
                  type="text"
                  list="plan-comptable-syscohada"
                  value={creditAccount}
                  onChange={(e) => setCreditAccount(e.target.value.split(' - ')[0].trim())}
                  placeholder="Tapez un code ou un nom"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
                {creditAccount && libelleCompte(creditAccount) && (
                  <span style={{ color: '#059669', fontSize: '0.8rem', marginTop: '2px', display: 'block' }}>{libelleCompte(creditAccount)}</span>
                )}
                {errors.creditAccount && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.creditAccount}</span>}
              </label>
            </div>

            {/* Amount */}
            <label>
              Montant (FCFA) *
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 53390"
                disabled={isSubmitting}
                step="100"
              />
              {errors.amount && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.amount}</span>}
            </label>

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

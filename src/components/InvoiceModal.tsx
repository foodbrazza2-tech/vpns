import React, { useState } from 'react';
import PrimaryButton from './PrimaryButton';

export interface InvoiceData {
  clientId: string;
  date: string;
  dueDate: string;
  amountHt: number;
  vatRate: number;
  vatAmount: number;
  amount: number; // TTC
  description: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  type: 'vente' | 'achat';
  counterpartAccount?: string;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceData) => void;
  clients?: Array<{ id: string; name: string }>;
  initialData?: Partial<InvoiceData>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const formatFcfa = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;

// Comptes de produit (classe 7) et de charge (classe 6) usuels pour la contrepartie.
const VENTE_ACCOUNTS = [
  { code: '701', libelle: 'Ventes de marchandises' },
  { code: '702', libelle: 'Ventes de produits finis' },
  { code: '704', libelle: 'Ventes de travaux' },
  { code: '705', libelle: 'Ventes de services' },
  { code: '706', libelle: 'Services vendus (honoraires, commissions)' },
  { code: '707', libelle: 'Produits accessoires' },
];
const ACHAT_ACCOUNTS = [
  { code: '601', libelle: 'Achats de marchandises' },
  { code: '602', libelle: 'Achats de matieres premieres' },
  { code: '604', libelle: 'Achats stockes de fournitures' },
  { code: '605', libelle: 'Autres achats (eau, electricite, fournitures)' },
  { code: '622', libelle: 'Locations et charges locatives' },
  { code: '624', libelle: 'Entretien et reparations' },
  { code: '627', libelle: 'Publicite, relations publiques' },
];

export function InvoiceModal({ isOpen, onClose, onSubmit, clients = [], initialData }: InvoiceModalProps) {
  const [clientId, setClientId] = useState(initialData?.clientId || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [amountHt, setAmountHt] = useState(
    initialData?.amountHt ? String(initialData.amountHt) : initialData?.amount ? String(initialData.amount) : ''
  );
  const [vatRate, setVatRate] = useState<string>(initialData?.vatRate != null ? String(initialData.vatRate) : '18');
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState<'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'>(initialData?.status || 'draft');
  const [type, setType] = useState<'vente' | 'achat'>(initialData?.type || 'vente');
  const [counterpartAccount, setCounterpartAccount] = useState(initialData?.counterpartAccount || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const htValue = parseFloat(amountHt) || 0;
  const rateValue = parseFloat(vatRate) || 0;
  const vatValue = round2(htValue * (rateValue / 100));
  const ttcValue = round2(htValue + vatValue);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!clientId) newErrors.clientId = 'Client requis';
    if (!date) newErrors.date = 'Date requise';
    if (!dueDate) newErrors.dueDate = 'Date d\'échéance requise';
    if (!amountHt || Number.isNaN(htValue) || htValue <= 0) {
      newErrors.amountHt = 'Montant HT valide requis';
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
        clientId,
        date,
        dueDate,
        amountHt: htValue,
        vatRate: rateValue,
        vatAmount: vatValue,
        amount: ttcValue,
        description,
        status,
        type,
        counterpartAccount: counterpartAccount || undefined,
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
            <p className="eyebrow">Gestion des factures</p>
            <h3>Créer une nouvelle facture</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {initialData && (initialData.amount || initialData.amountHt) && (
              <div className="import-hint">
                Champs pre-remplis depuis le document importe. Verifiez-les avant d'enregistrer.
              </div>
            )}

            <p className="import-hint">Le numéro de facture sera généré automatiquement (NN/DG/VPNS/{new Date().getFullYear()}). L'écriture comptable sera <strong>enregistrée automatiquement</strong> dans le journal {type === 'vente' ? 'des Ventes' : 'des Achats'}.</p>

            {/* Type vente / achat */}
            <label>
              Nature *
              <select value={type} onChange={(e) => setType(e.target.value as 'vente' | 'achat')} disabled={isSubmitting}>
                <option value="vente">Vente (facture client → journal Ventes)</option>
                <option value="achat">Achat (facture fournisseur → journal Achats)</option>
              </select>
            </label>

            {/* Client / Fournisseur Selection */}
            <label>
              {type === 'vente' ? 'Client' : 'Fournisseur'} *
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">-- Sélectionner {type === 'vente' ? 'un client' : 'un fournisseur'} --</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              {errors.clientId && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.clientId}</span>}
            </label>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>
                Date de facture *
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.date && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.date}</span>}
              </label>

              <label>
                Date d'échéance *
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.dueDate && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.dueDate}</span>}
              </label>
            </div>

            {/* Montant HT + TVA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>
                Montant HT (FCFA) *
                <input
                  type="number"
                  value={amountHt}
                  onChange={(e) => setAmountHt(e.target.value)}
                  placeholder="Ex: 100000"
                  disabled={isSubmitting}
                  step="100"
                />
                {errors.amountHt && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.amountHt}</span>}
              </label>

              <label>
                Taux de TVA
                <select value={vatRate} onChange={(e) => setVatRate(e.target.value)} disabled={isSubmitting}>
                  <option value="18">18% (taux normal Congo)</option>
                  <option value="5">5% (taux reduit)</option>
                  <option value="0">0% (exoneree)</option>
                </select>
              </label>
            </div>

            {/* Compte de produit (vente) ou de charge (achat) - optionnel */}
            <label>
              Compte {type === 'vente' ? 'de produit (vente)' : 'de charge (achat)'}
              <input
                type="text"
                list="plan-comptable-syscohada-inv"
                value={counterpartAccount}
                onChange={(e) => setCounterpartAccount(e.target.value.split(' - ')[0].trim())}
                placeholder={type === 'vente' ? 'Defaut: 706 (Services vendus)' : 'Defaut: 605 (Autres achats)'}
                disabled={isSubmitting}
                autoComplete="off"
              />
              <datalist id="plan-comptable-syscohada-inv">
                {(type === 'vente' ? VENTE_ACCOUNTS : ACHAT_ACCOUNTS).map((c) => (
                  <option key={c.code} value={c.code}>{c.code} - {c.libelle}</option>
                ))}
              </datalist>
            </label>

            {/* Recap HT / TVA / TTC */}
            <div className="parsed-box">
              <p><strong>Montant HT :</strong> {formatFcfa(htValue)}</p>
              <p><strong>TVA ({rateValue}%) :</strong> {formatFcfa(vatValue)}</p>
              <p><strong>Total TTC :</strong> {formatFcfa(ttcValue)}</p>
            </div>

            {/* Status */}
            <label>
              Statut
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled')}
                disabled={isSubmitting}
              >
                <option value="draft">Brouillon</option>
                <option value="sent">Envoyée</option>
                <option value="paid">Payée</option>
                <option value="overdue">Impayée</option>
                {status === 'cancelled' && <option value="cancelled">Annulee</option>}
              </select>
            </label>

            {/* Description */}
            <label>
              Observations
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes supplémentaires, conditions de paiement, etc."
                style={{ minHeight: '80px' }}
                disabled={isSubmitting}
              />
            </label>

            {/* Actions */}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={onClose} disabled={isSubmitting}>
                Annuler
              </button>
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Création...' : 'Créer la facture'}
              </PrimaryButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

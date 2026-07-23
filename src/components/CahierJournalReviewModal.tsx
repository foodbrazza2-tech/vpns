import { useEffect, useState } from 'react';
import PrimaryButton from './PrimaryButton';
import type { CandidateCaisseOperation } from '../utils/cahierJournalParser';

export interface ConfirmedCaisseOperation {
  date: string;
  description: string;
  amount: number;
  sens: 'entree' | 'sortie';
}

interface EditableRow extends CandidateCaisseOperation {
  included: boolean;
}

interface CahierJournalReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: CandidateCaisseOperation[];
  onConfirm: (operations: ConfirmedCaisseOperation[]) => void;
  isSubmitting?: boolean;
}

export function CahierJournalReviewModal({ isOpen, onClose, candidates, onConfirm, isSubmitting }: CahierJournalReviewModalProps) {
  const [rows, setRows] = useState<EditableRow[]>([]);

  // Reinitialise l'etat editable a chaque nouvelle analyse (nouvelle liste de candidats).
  useEffect(() => {
    setRows(candidates.map((c) => ({ ...c, included: true })));
  }, [candidates]);

  if (!isOpen) return null;

  const updateRow = (index: number, patch: Partial<EditableRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const includedRows = rows.filter((r) => r.included);
  const hasUnresolvedSens = includedRows.some((r) => r.sens === 'inconnu');
  const totalEntrees = includedRows.filter((r) => r.sens === 'entree').reduce((s, r) => s + r.amount, 0);
  const totalSorties = includedRows.filter((r) => r.sens === 'sortie').reduce((s, r) => s + r.amount, 0);

  const handleConfirm = () => {
    if (hasUnresolvedSens || includedRows.length === 0) return;
    onConfirm(
      includedRows.map((r) => ({ date: r.date, description: r.description, amount: r.amount, sens: r.sens as 'entree' | 'sortie' }))
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Import du cahier journal</p>
            <h3>Verifiez les operations detectees</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="import-hint">
            {rows.length} operation(s) detectee(s) sur la photo. L'OCR d'une ecriture manuscrite reste faillible :
            verifiez chaque ligne, corrigez si besoin, decochez ce qui ne doit pas etre enregistre.
          </p>

          {rows.length === 0 ? (
            <p className="chart-empty-hint">Aucune operation avec montant n'a ete detectee sur cette photo.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Date</th>
                    <th>Libelle</th>
                    <th>Montant</th>
                    <th>Sens</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ opacity: row.included ? 1 : 0.5 }}>
                      <td>
                        <input type="checkbox" checked={row.included} onChange={(e) => updateRow(i, { included: e.target.checked })} />
                      </td>
                      <td>
                        <input type="date" value={row.date} onChange={(e) => updateRow(i, { date: e.target.value })} style={{ minWidth: 130 }} disabled={!row.included} />
                      </td>
                      <td>
                        <input type="text" value={row.description} onChange={(e) => updateRow(i, { description: e.target.value })} style={{ minWidth: 160 }} disabled={!row.included} />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(e) => updateRow(i, { amount: Number(e.target.value) || 0 })}
                          style={{ width: 110 }}
                          disabled={!row.included}
                        />
                      </td>
                      <td>
                        <select value={row.sens} onChange={(e) => updateRow(i, { sens: e.target.value as EditableRow['sens'] })} disabled={!row.included}>
                          <option value="entree">Entree</option>
                          <option value="sortie">Sortie</option>
                          {row.sens === 'inconnu' && <option value="inconnu">-- A choisir --</option>}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {hasUnresolvedSens && (
            <div className="import-hint" style={{ color: '#dc2626' }}>
              Choisissez "Entree" ou "Sortie" pour chaque ligne cochee avant d'enregistrer.
            </div>
          )}

          <div className="parsed-box">
            <p><strong>Total entrees a enregistrer :</strong> {totalEntrees.toLocaleString('fr-FR')} FCFA</p>
            <p><strong>Total sorties a enregistrer :</strong> {totalSorties.toLocaleString('fr-FR')} FCFA</p>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </button>
            <PrimaryButton onClick={handleConfirm} disabled={isSubmitting || hasUnresolvedSens || includedRows.length === 0}>
              {isSubmitting ? 'Enregistrement...' : `Enregistrer ${includedRows.length} operation(s)`}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CahierJournalReviewModal;

import React, { useState } from 'react';
import PrimaryButton from './PrimaryButton';

export interface ReportData {
  title: string;
  type: 'accounting' | 'client' | 'sales' | 'expenses' | 'custom';
  period: string;
  startDate: string;
  endDate: string;
  description: string;
  includeGraphs: boolean;
  clientId?: string;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReportData) => void;
  clients?: Array<{ id: string; name: string }>;
  initialData?: ReportData;
}

export function ReportModal({ isOpen, onClose, onSubmit, clients = [], initialData }: ReportModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [type, setType] = useState<'accounting' | 'client' | 'sales' | 'expenses' | 'custom'>(initialData?.type || 'accounting');
  const [period, setPeriod] = useState(initialData?.period || 'monthly');
  const [startDate, setStartDate] = useState(initialData?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialData?.endDate || new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(initialData?.description || '');
  const [includeGraphs, setIncludeGraphs] = useState(initialData?.includeGraphs ?? true);
  const [clientId, setClientId] = useState(initialData?.clientId || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Titre du rapport requis';
    if (!startDate) newErrors.startDate = 'Date de début requise';
    if (!endDate) newErrors.endDate = 'Date de fin requise';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      onSubmit({
        title,
        type,
        period,
        startDate,
        endDate,
        description,
        includeGraphs,
        clientId: clientId || undefined,
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
            <p className="eyebrow">Rapports et analyses</p>
            <h3>{initialData ? 'Modifier le rapport' : 'Générer un nouveau rapport'}</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {/* Title */}
            <label>
              Titre du rapport *
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Rapport comptable Q1 2026"
                disabled={isSubmitting}
              />
              {errors.title && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.title}</span>}
            </label>

            {/* Report Type */}
            <label>
              Type de rapport
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value as 'accounting' | 'client' | 'sales' | 'expenses' | 'custom')}
                disabled={isSubmitting}
              >
                <option value="accounting">Comptabilité OHADA</option>
                <option value="client">Par client</option>
                <option value="sales">Ventes et factures</option>
                <option value="expenses">Dépenses</option>
                <option value="custom">Personnalisé</option>
              </select>
            </label>

            {/* Client Selection */}
            {type === 'client' && (
              <label>
                Client
                <select 
                  value={clientId} 
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">-- Sélectionner un client --</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Period */}
            <label>
              Période
              <select 
                value={period} 
                onChange={(e) => setPeriod(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="daily">Quotidien</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuel</option>
                <option value="quarterly">Trimestriel</option>
                <option value="annual">Annuel</option>
                <option value="custom">Personnalisé</option>
              </select>
            </label>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>
                Date de début *
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.startDate && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.startDate}</span>}
              </label>

              <label>
                Date de fin *
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.endDate && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.endDate}</span>}
              </label>
            </div>

            {/* Include Graphs */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeGraphs}
                onChange={(e) => setIncludeGraphs(e.target.checked)}
                disabled={isSubmitting}
              />
              <span>Inclure des graphiques et visualisations</span>
            </label>

            {/* Description */}
            <label>
              Description / Notes
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détails supplémentaires sur le rapport souhaité..."
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
                {isSubmitting ? 'Enregistrement...' : initialData ? 'Enregistrer les modifications' : 'Générer le rapport'}
              </PrimaryButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

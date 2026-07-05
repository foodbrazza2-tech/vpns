import React, { useState } from 'react';
import PrimaryButton from './PrimaryButton';

interface ClientData {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  taxId?: string;
  archiveFolder?: string;
}

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClientData) => void;
}

export function ClientModal({ isOpen, onClose, onSubmit }: ClientModalProps) {
  const [formData, setFormData] = useState<ClientData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    taxId: '',
    archiveFolder: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Nom du contact requis';
    if (!formData.email.trim()) newErrors.email = 'Email requis';
    if (formData.email && !formData.email.includes('@')) newErrors.email = 'Email invalide';
    if (!formData.phone.trim()) newErrors.phone = 'Téléphone requis';
    if (!formData.company.trim()) newErrors.company = 'Entreprise/SARL requise';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      // Auto-generate archive folder name if not provided
      const archiveFolder = formData.archiveFolder || `${formData.company.replace(/\s+/g, '_')}_${formData.name.replace(/\s+/g, '_')}`;
      onSubmit({
        ...formData,
        archiveFolder,
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
            <p className="eyebrow">Gestion des clients</p>
            <h3>Ajouter un nouveau client</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {/* Name */}
            <label>
              Nom du contact *
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Jean Dupont"
                disabled={isSubmitting}
              />
              {errors.name && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
            </label>

            {/* Company */}
            <label>
              Entreprise/SARL *
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Ex: EEC Cameroun SARL"
                disabled={isSubmitting}
              />
              {errors.company && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.company}</span>}
            </label>

            {/* Email & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>
                Email *
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@example.com"
                  disabled={isSubmitting}
                />
                {errors.email && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.email}</span>}
              </label>

              <label>
                Téléphone *
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+237 6 XX XX XX XX"
                  disabled={isSubmitting}
                />
                {errors.phone && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.phone}</span>}
              </label>
            </div>

            {/* Address */}
            <label>
              Adresse
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ex: 123 Rue de la Paix"
                disabled={isSubmitting}
              />
            </label>

            {/* City */}
            <label>
              Ville
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ex: Douala"
                disabled={isSubmitting}
              />
            </label>

            {/* Tax ID */}
            <label>
              Numéro IFU / RC
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                placeholder="Ex: RC/SND/2021/A 12345"
                disabled={isSubmitting}
              />
            </label>

            {/* Archive Folder */}
            <label>
              Dossier d'archivage (généré automatiquement)
              <input
                type="text"
                value={formData.archiveFolder || `${formData.company.replace(/\s+/g, '_')}_${formData.name.replace(/\s+/g, '_')}`}
                onChange={(e) => setFormData({ ...formData, archiveFolder: e.target.value })}
                placeholder="Généré automatiquement"
                disabled={isSubmitting}
              />
              <small style={{ color: '#718096', fontSize: '0.8rem' }}>
                Un dossier avec ce nom sera créé pour archiver tous les documents de ce client
              </small>
            </label>

            {/* Actions */}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={onClose} disabled={isSubmitting}>
                Annuler
              </button>
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Création...' : 'Ajouter le client'}
              </PrimaryButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

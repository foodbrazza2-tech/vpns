import React, { useState } from 'react';
import PrimaryButton from './PrimaryButton';

export interface NotificationData {
  title: string;
  message: string;
  type: 'reminder' | 'alert' | 'success' | 'info';
  priority: 'low' | 'medium' | 'high';
  sendDate: string;
  sendTime: string;
  clientId?: string;
  recurring: boolean;
  recurringDays?: number;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NotificationData) => void;
  clients?: Array<{ id: string; name: string }>;
}

export function NotificationModal({ isOpen, onClose, onSubmit, clients = [] }: NotificationModalProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'reminder' | 'alert' | 'success' | 'info'>('reminder');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [sendDate, setSendDate] = useState(new Date().toISOString().split('T')[0]);
  const [sendTime, setSendTime] = useState('09:00');
  const [clientId, setClientId] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState(7);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Titre requis';
    if (!message.trim()) newErrors.message = 'Message requis';
    if (!sendDate) newErrors.sendDate = 'Date d\'envoi requise';
    if (!sendTime) newErrors.sendTime = 'Heure d\'envoi requise';
    if (recurring && (!recurringDays || recurringDays <= 0)) {
      newErrors.recurringDays = 'Intervalle de récurrence requis';
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
        title,
        message,
        type,
        priority,
        sendDate,
        sendTime,
        clientId: clientId || undefined,
        recurring,
        recurringDays: recurring ? recurringDays : undefined,
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
            <p className="eyebrow">Notifications et relances</p>
            <h3>Créer une nouvelle notification</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {/* Title */}
            <label>
              Titre *
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Relance facture impayée"
                disabled={isSubmitting}
              />
              {errors.title && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.title}</span>}
            </label>

            {/* Message */}
            <label>
              Message *
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Contenu de la notification..."
                style={{ minHeight: '100px' }}
                disabled={isSubmitting}
              />
              {errors.message && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.message}</span>}
            </label>

            {/* Type & Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>
                Type
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value as 'reminder' | 'alert' | 'success' | 'info')}
                  disabled={isSubmitting}
                >
                  <option value="reminder">Rappel</option>
                  <option value="alert">Alerte</option>
                  <option value="success">Succès</option>
                  <option value="info">Information</option>
                </select>
              </label>

              <label>
                Priorité
                <select 
                  value={priority} 
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                  disabled={isSubmitting}
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </label>
            </div>

            {/* Client Selection */}
            <label>
              Client associé
              <select 
                value={clientId} 
                onChange={(e) => setClientId(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">-- Tous les utilisateurs --</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Date & Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>
                Date d'envoi *
                <input
                  type="date"
                  value={sendDate}
                  onChange={(e) => setSendDate(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.sendDate && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.sendDate}</span>}
              </label>

              <label>
                Heure d'envoi *
                <input
                  type="time"
                  value={sendTime}
                  onChange={(e) => setSendTime(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.sendTime && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.sendTime}</span>}
              </label>
            </div>

            {/* Recurring */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                disabled={isSubmitting}
              />
              <span>Notification récurrente</span>
            </label>

            {/* Recurring Days */}
            {recurring && (
              <label>
                Intervalle (jours)
                <input
                  type="number"
                  value={recurringDays}
                  onChange={(e) => setRecurringDays(parseInt(e.target.value) || 0)}
                  placeholder="7"
                  disabled={isSubmitting}
                  min="1"
                  step="1"
                />
                {errors.recurringDays && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.recurringDays}</span>}
              </label>
            )}

            {/* Actions */}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={onClose} disabled={isSubmitting}>
                Annuler
              </button>
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Création...' : 'Créer la notification'}
              </PrimaryButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import PrimaryButton from './PrimaryButton';

interface EventData {
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number; // in minutes
  clientId?: string;
  location?: string;
  type: 'meeting' | 'call' | 'reminder' | 'followup';
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EventData) => void;
  clients?: Array<{ id: string; name: string }>;
}

export function EventModal({ isOpen, onClose, onSubmit, clients = [] }: EventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [clientId, setClientId] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<'meeting' | 'call' | 'reminder' | 'followup'>('meeting');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Titre requis';
    if (!date) newErrors.date = 'Date requise';
    if (!time) newErrors.time = 'Heure requise';
    if (duration <= 0) newErrors.duration = 'Durée doit être positive';

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
        description,
        date,
        time,
        duration,
        clientId: clientId || undefined,
        location,
        type,
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
            <p className="eyebrow">Agenda et rappels</p>
            <h3>Créer un nouvel événement</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {/* Title */}
            <label>
              Titre de l'événement *
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Réunion avec le client"
                disabled={isSubmitting}
              />
              {errors.title && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.title}</span>}
            </label>

            {/* Type */}
            <label>
              Type d'événement
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value as 'meeting' | 'call' | 'reminder' | 'followup')}
                disabled={isSubmitting}
              >
                <option value="meeting">Réunion</option>
                <option value="call">Appel téléphonique</option>
                <option value="reminder">Rappel</option>
                <option value="followup">Relance</option>
              </select>
            </label>

            {/* Client Selection */}
            <label>
              Client associé
              <select 
                value={clientId} 
                onChange={(e) => setClientId(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">-- Aucun client --</option>
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
                Date *
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.date && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.date}</span>}
              </label>

              <label>
                Heure *
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.time && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.time}</span>}
              </label>
            </div>

            {/* Duration */}
            <label>
              Durée (minutes)
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                placeholder="60"
                disabled={isSubmitting}
                min="15"
                step="15"
              />
              {errors.duration && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors.duration}</span>}
            </label>

            {/* Location */}
            <label>
              Lieu/Plateforme
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Bureau, Zoom, Google Meet"
                disabled={isSubmitting}
              />
            </label>

            {/* Description */}
            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détails de l'événement, ordre du jour, notes..."
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
                {isSubmitting ? 'Création...' : 'Créer l\'événement'}
              </PrimaryButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

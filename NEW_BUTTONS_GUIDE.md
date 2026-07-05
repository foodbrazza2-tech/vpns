# VPNS "New" Buttons & Modal Implementation Guide

## Current System

### How "New" Buttons Work Today

The TopBar component displays an action button with the text from `sectionActions`:

```tsx
// In App.tsx
const sectionActions: Record<SectionKey, string> = {
  dashboard: '➕ Nouvelle écriture comptable',
  comptabilite: '➕ Nouvelle écriture comptable',
  factures: '➕ Nouvelle facture',
  clients: '➕ Nouveau client',
  agenda: '➕ Nouvel événement',
  documents: '➕ Ajouter un document',
  rapports: '➕ Nouveau rapport',
  notifications: '➕ Nouvelle notification',
  parametres: '➕ Nouvelle configuration',
};

// In TopBar
<PrimaryButton onClick={onAction}>{actionLabel}</PrimaryButton>

// Which calls App's onAction
<TopBar onAction={() => setIsModalOpen(true)} />
```

### Current Modal (App.tsx)
```tsx
{isModalOpen && (
  <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
    <div className="modal-card" onClick={(event) => event.stopPropagation()}>
      <div className="modal-header">
        <div>
          <p className="eyebrow">Action rapide</p>
          <h3>{sectionActions[activeSection]}</h3>
        </div>
        <button type="button" className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
      </div>
      <div className="modal-body">
        <label>
          Description
          <input type="text" placeholder="Décrivez l'élément à créer" 
                 value={quickText} onChange={(e) => setQuickText(e.target.value)} />
        </label>
        <label>
          Montant (facultatif)
          <input type="text" placeholder="Ex: 53 390" />
        </label>
        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(false)}>Annuler</button>
          <button type="button" className="primary-btn" onClick={() => setIsModalOpen(false)}>Enregistrer</button>
        </div>
      </div>
    </div>
  </div>
)}
```

### ❌ Problems with Current Modal
1. **Generic form fields** - Works for accounting entries but not for other features
2. **No section-specific validation** - Same validation for all sections
3. **No data persistence** - Clicking "Enregistrer" doesn't actually save anything
4. **Not accessible** - Same UX for invoices, clients, events, etc.
5. **No feedback** - No error messages or success confirmation
6. **Not extensible** - Hard to add new sections

---

## 🎯 Solution: Specialized Modals Per Section

### Approach 1: Inline Modals (Recommended for Quick Wins)

Add conditional modals in `App.tsx` for each section:

```tsx
// In App.tsx renderSection()

case 'factures':
  return (
    <section className="section-stack">
      <article className="panel-card">
        <div className="panel-top">
          <h4>Factures</h4>
          <span>Gérez vos documents commerciaux</span>
        </div>
        {invoices.length === 0 ? (
          <EmptyState
            title="Aucune facture"
            description="Créez une nouvelle facture pour commencer votre suivi."
          />
        ) : (
          <table>
            {/* Invoice list */}
          </table>
        )}
      </article>
    </section>
  );
```

Then, add specialized modals in the main component tree:

```tsx
// NEW: Invoice Modal
{isModalOpen && activeSection === 'factures' && (
  <InvoiceModal 
    isOpen={true}
    onClose={() => setIsModalOpen(false)}
    onSubmit={(data) => {
      // Handle invoice creation
      setIsModalOpen(false);
    }}
  />
)}

// NEW: Client Modal
{isModalOpen && activeSection === 'clients' && (
  <ClientModal 
    isOpen={true}
    onClose={() => setIsModalOpen(false)}
    onSubmit={(data) => {
      // Handle client creation
      setIsModalOpen(false);
    }}
  />
)}

// NEW: Event Modal
{isModalOpen && activeSection === 'agenda' && (
  <EventModal 
    isOpen={true}
    onClose={() => setIsModalOpen(false)}
    onSubmit={(data) => {
      // Handle event creation
      setIsModalOpen(false);
    }}
  />
)}

// Keep generic modal for other sections
{isModalOpen && !['factures', 'clients', 'agenda'].includes(activeSection) && (
  <GenericModal 
    isOpen={true}
    onClose={() => setIsModalOpen(false)}
  />
)}
```

---

## 📝 Modal Templates by Section

### 1️⃣ InvoiceModal

```tsx
// src/components/InvoiceModal.tsx
import React, { useState } from 'react';
import PrimaryButton from './PrimaryButton';

interface InvoiceData {
  invoiceNumber: string;
  clientId: string;
  date: string;
  dueDate: string;
  amount: number;
  description: string;
  items: InvoiceItem[];
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceData) => void;
  clients?: Array<{ id: string; name: string }>;
}

export function InvoiceModal({ isOpen, onClose, onSubmit, clients = [] }: InvoiceModalProps) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!invoiceNumber.trim()) newErrors.invoiceNumber = 'Numéro de facture requis';
    if (!clientId) newErrors.clientId = 'Client requis';
    if (!date) newErrors.date = 'Date requise';
    if (!dueDate) newErrors.dueDate = 'Date d\'échéance requise';
    if (!amount || isNaN(parseFloat(amount))) newErrors.amount = 'Montant invalide';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    onSubmit({
      invoiceNumber,
      clientId,
      date,
      dueDate,
      amount: parseFloat(amount),
      description,
      items: [], // TODO: Add item management
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Nouvelle facture</p>
            <h3>Créer une facture</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {/* Invoice Number */}
            <label>
              Numéro de facture
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ex: FAC-2026-001"
              />
              {errors.invoiceNumber && <span style={{ color: 'red', fontSize: '0.85rem' }}>{errors.invoiceNumber}</span>}
            </label>

            {/* Client Selection */}
            <label>
              Client
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">-- Sélectionner un client --</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              {errors.clientId && <span style={{ color: 'red', fontSize: '0.85rem' }}>{errors.clientId}</span>}
            </label>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                {errors.date && <span style={{ color: 'red', fontSize: '0.85rem' }}>{errors.date}</span>}
              </label>

              <label>
                Date d'échéance
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                {errors.dueDate && <span style={{ color: 'red', fontSize: '0.85rem' }}>{errors.dueDate}</span>}
              </label>
            </div>

            {/* Amount */}
            <label>
              Montant total (FCFA)
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 100000"
              />
              {errors.amount && <span style={{ color: 'red', fontSize: '0.85rem' }}>{errors.amount}</span>}
            </label>

            {/* Description */}
            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détails supplémentaires"
                style={{ minHeight: '80px' }}
              />
            </label>

            {/* Actions */}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={onClose}>
                Annuler
              </button>
              <PrimaryButton type="submit">
                Créer la facture
              </PrimaryButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 2️⃣ ClientModal

```tsx
// src/components/ClientModal.tsx
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
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Nom requis';
    if (!formData.email.trim()) newErrors.email = 'Email requis';
    if (!formData.email.includes('@')) newErrors.email = 'Email invalide';
    if (!formData.phone.trim()) newErrors.phone = 'Téléphone requis';
    if (!formData.company.trim()) newErrors.company = 'Entreprise requise';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Nouveau client</p>
            <h3>Ajouter un client</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {/* Name */}
            <label>
              Nom du contact
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Jean Dupont"
              />
              {errors.name && <span style={{ color: 'red', fontSize: '0.85rem' }}>{errors.name}</span>}
            </label>

            {/* Company */}
            <label>
              Entreprise/SARL
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Ex: EEC Cameroun"
              />
              {errors.company && <span style={{ color: 'red', fontSize: '0.85rem' }}>{errors.company}</span>}
            </label>

            {/* Email & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>
                Email
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@example.com"
                />
                {errors.email && <span style={{ color: 'red', fontSize: '0.85rem' }}>{errors.email}</span>}
              </label>

              <label>
                Téléphone
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+237 6 XX XX XX XX"
                />
                {errors.phone && <span style={{ color: 'red', fontSize: '0.85rem' }}>{errors.phone}</span>}
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
              />
            </label>

            {/* Tax ID */}
            <label>
              Numéro IFU (optionnel)
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                placeholder="Ex: RC/SND/2021/A 12345"
              />
            </label>

            {/* Actions */}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={onClose}>
                Annuler
              </button>
              <PrimaryButton type="submit">
                Ajouter le client
              </PrimaryButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 3️⃣ EventModal

```tsx
// src/components/EventModal.tsx
import React, { useState } from 'react';
import PrimaryButton from './PrimaryButton';

interface EventData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  participants: string;
  priority: 'low' | 'medium' | 'high';
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EventData) => void;
}

export function EventModal({ isOpen, onClose, onSubmit }: EventModalProps) {
  const [formData, setFormData] = useState<EventData>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    description: '',
    participants: '',
    priority: 'medium',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Titre requis';
    if (!formData.date) newErrors.date = 'Date requise';
    if (!formData.startTime) newErrors.startTime = 'Heure de début requise';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Nouvel événement</p>
            <h3>Planifier un rendez-vous</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {/* Title */}
            <label>
              Titre
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Réunion avec le client EEC"
              />
              {errors.title && <span style={{ color: 'red', fontSize: '0.85rem' }}>{errors.title}</span>}
            </label>

            {/* Date & Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <label>
                Date
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
                {errors.date && <span style={{ color: 'red', fontSize: '0.85rem' }}>{errors.date}</span>}
              </label>

              <label>
                Début
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </label>

              <label>
                Fin
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </label>
            </div>

            {/* Priority */}
            <label>
              Priorité
              <select 
                value={formData.priority} 
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <option value="low">Basse 🟢</option>
                <option value="medium">Moyenne 🟡</option>
                <option value="high">Haute 🔴</option>
              </select>
            </label>

            {/* Participants */}
            <label>
              Participants
              <input
                type="text"
                value={formData.participants}
                onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
                placeholder="Ex: Jean Dupont, Marie Martin"
              />
            </label>

            {/* Description */}
            <label>
              Notes
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Détails de l'événement"
                style={{ minHeight: '80px' }}
              />
            </label>

            {/* Actions */}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={onClose}>
                Annuler
              </button>
              <PrimaryButton type="submit">
                Créer l'événement
              </PrimaryButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 🔗 Integration Steps

### Step 1: Import Modals in App.tsx
```tsx
import { InvoiceModal } from './components/InvoiceModal';
import { ClientModal } from './components/ClientModal';
import { EventModal } from './components/EventModal';
```

### Step 2: Add Modal Conditionals
```tsx
// In App.tsx, after renderSection()

{isModalOpen && activeSection === 'factures' && (
  <InvoiceModal 
    isOpen={true}
    onClose={() => setIsModalOpen(false)}
    onSubmit={async (data) => {
      console.log('New invoice:', data);
      // TODO: Call API to save invoice
      setIsModalOpen(false);
    }}
    clients={clientsData}
  />
)}

{isModalOpen && activeSection === 'clients' && (
  <ClientModal 
    isOpen={true}
    onClose={() => setIsModalOpen(false)}
    onSubmit={async (data) => {
      console.log('New client:', data);
      // TODO: Call API to save client
      setIsModalOpen(false);
    }}
  />
)}

{isModalOpen && activeSection === 'agenda' && (
  <EventModal 
    isOpen={true}
    onClose={() => setIsModalOpen(false)}
    onSubmit={async (data) => {
      console.log('New event:', data);
      // TODO: Call API to save event
      setIsModalOpen(false);
    }}
  />
)}

{isModalOpen && !['factures', 'clients', 'agenda'].includes(activeSection) && (
  // Existing generic modal
  <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
    {/* ... */}
  </div>
)}
```

### Step 3: Create Data State
```tsx
// In App.tsx, add state for each section

const [invoices, setInvoices] = useState<Invoice[]>([]);
const [clients, setClients] = useState<Client[]>([]);
const [events, setEvents] = useState<Event[]>([]);
```

### Step 4: Create API Calls
```tsx
// In App.tsx, add submit handlers

const handleInvoiceSubmit = async (data: InvoiceData) => {
  try {
    // const response = await InvoiceApiClient.createInvoice(data);
    setInvoices([...invoices, data as any]);
    setIsModalOpen(false);
  } catch (error) {
    console.error('Error creating invoice:', error);
  }
};

const handleClientSubmit = async (data: ClientData) => {
  try {
    // const response = await ClientApiClient.createClient(data);
    setClients([...clients, data as any]);
    setIsModalOpen(false);
  } catch (error) {
    console.error('Error creating client:', error);
  }
};

const handleEventSubmit = async (data: EventData) => {
  try {
    // const response = await EventApiClient.createEvent(data);
    setEvents([...events, data as any]);
    setIsModalOpen(false);
  } catch (error) {
    console.error('Error creating event:', error);
  }
};
```

---

## 📊 Implementation Checklist

For each new section (Factures, Clients, Agenda, etc.):

- [ ] Create Modal component (`src/components/{Feature}Modal.tsx`)
- [ ] Define data type (`src/types/{feature}.ts` or in Modal file)
- [ ] Create API client (`src/api/{feature}ApiClient.ts`)
- [ ] Add state in App.tsx
- [ ] Add conditional modal rendering in App.tsx
- [ ] Create list view component
- [ ] Create data persistence logic
- [ ] Add error handling
- [ ] Add success notification
- [ ] Write unit tests

---

## 🎨 Styling for New Modals

All modals follow the same CSS classes:
```css
.modal-backdrop    /* Overlay background */
.modal-card        /* Modal container */
.modal-header      /* Title area */
.modal-close       /* Close button */
.modal-body        /* Form content */
.modal-actions     /* Button row */

label              /* Form label */
input              /* Form input */
textarea           /* Multi-line input */
select             /* Dropdown */

.primary-btn       /* Submit button */
.secondary-btn     /* Cancel button */
```

No additional CSS needed - use existing utility classes!

---

## ✨ Next: Add More Features

Once Factures, Clients, and Agenda are implemented, add:

1. **Rapports** - Report generator with date range and export
2. **Notifications** - Notification center with filtering
3. **Paramètres** - Settings forms for company info, preferences

Each follows the same pattern:
1. Create Modal component
2. Add state management
3. Add API integration
4. Create list view
5. Add validation

---

## 🚀 Quick Copy-Paste Setup

Want to get started immediately? Here's the minimal setup:

```tsx
// 1. In App.tsx, add state
const [invoices, setInvoices] = useState([]);

// 2. Import modal
import { InvoiceModal } from './components/InvoiceModal';

// 3. Add conditional rendering in JSX tree
{isModalOpen && activeSection === 'factures' && (
  <InvoiceModal 
    isOpen={true}
    onClose={() => setIsModalOpen(false)}
    onSubmit={(data) => {
      setInvoices([...invoices, data]);
      setIsModalOpen(false);
    }}
  />
)}

// 4. Use state in section rendering
case 'factures':
  return (
    <section>
      {invoices.length === 0 ? (
        <EmptyState title="Aucune facture" description="Créez une facture" />
      ) : (
        <table>{/* invoice list */}</table>
      )}
    </section>
  );
```

Done! Now you have a working "New Facture" button with form validation and state management.

# VPNS Project - Quick Reference Guide

## 🗂️ File Locations Quick Map

### Components
```
Sidebar.tsx              → Navigation menu (9 sections)
TopBar.tsx              → Header with action button
App.tsx                 → Main controller + generic modal
ArchiveManager.tsx      → Document management (FULLY FEATURED)
ConfirmationDialog.tsx  → Modal template
EmptyState.tsx          → Placeholder for inactive sections
```

### Services & Utils
```
archiveManager.ts       → Archive business logic functions
authService.ts          → Supabase authentication
fileService.ts          → File validation and operations
helpers.ts              → OHADA entry parsing
archiveApiClient.ts     → REST API wrapper
```

### Styles
```
styles.css              → ALL CSS (800+ lines, utility-first)
```

---

## 🔑 Key Concepts

### State in App.tsx
```typescript
const [activeSection, setActiveSection] = useState<SectionKey>('dashboard');
const [isModalOpen, setIsModalOpen] = useState(false);
const [isDrawerOpen, setIsDrawerOpen] = useState(false);
const [quickText, setQuickText] = useState('');
const [appointmentText, setAppointmentText] = useState('');
```

### 9 Sections (SectionKey type)
```typescript
'dashboard' | 'comptabilite' | 'factures' | 'clients' | 'agenda' | 
'documents' | 'rapports' | 'notifications' | 'parametres'
```

### "New" Button Actions
```typescript
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
```
→ Shown in TopBar as action button label
→ Used as modal title

---

## 📦 Data Models

### ClientArchive (in ArchiveManager)
```typescript
{
  clientId: string;           // "eec-1719756234abc"
  clientName: string;         // "EEC"
  folderPath: string;         // "/archives/eec-1719756234abc"
  createdDate: string;        // ISO 8601
  lastModified: string;       // ISO 8601
  documentCount: number;      // 0+
}
```

### ArchivedDocument (in ArchiveManager)
```typescript
{
  id: string;                 // "doc-1719756234789-abc123"
  clientId: string;           // FK
  fileName: string;           // "facture-001.pdf"
  fileSize: number;           // bytes
  fileType: string;           // MIME type
  uploadDate: string;         // ISO 8601
  category: string;           // Facture|Devis|Reçu|Contrat|Rapport|Justificatif|Autre
  description?: string;       // Optional
  tags?: string[];            // Optional
}
```

### FileValidation (fileService)
```typescript
{
  isValid: boolean;
  errors: string[];           // Validation failures
  warnings: string[];         // Non-critical issues
}
```

---

## 🎯 Component Props

### ArchiveManager
```typescript
interface ArchiveManagerProps {
  clients: Array<{ id: string; name: string }>;
}
```

### Sidebar
```typescript
interface SidebarProps {
  activeSection: SectionKey;
  onSelectSection: (section: SectionKey) => void;
  onClose?: () => void;
  isMobile?: boolean;
}
```

### TopBar
```typescript
interface TopBarProps {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  onMenuToggle: () => void;
}
```

### PrimaryButton
```typescript
interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}
```

---

## 🔄 Common Functions

### File Upload Flow (in ArchiveManager)
```typescript
handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
  const files = event.target.files;
  if (!files || !selectedClient) {
    window.alert('Veuillez sélectionner un client');
    return;
  }
  
  Array.from(files).forEach((file) => {
    const newDocument = addDocumentToArchive(
      selectedClient,
      file.name,
      file.size,
      file.type || 'application/octet-stream',
      'Autre'  // Default category
    );
    setDocuments((prev) => [...prev, newDocument]);
    // Update archives with new documentCount
  });
}
```

### Search & Filter Flow
```typescript
const filteredDocuments = (() => {
  let result = documents.filter((doc) => 
    !selectedClient || doc.clientId === selectedClient
  );
  if (selectedCategory) {
    result = filterDocumentsByCategory(result, selectedCategory);
  }
  if (searchQuery) {
    result = searchDocuments(result, searchQuery);
  }
  return result;
})();
```

### File Validation
```typescript
const validation = FileService.validateFile(file);
if (!validation.isValid) {
  console.error('Errors:', validation.errors);
  return;
}
if (validation.warnings.length > 0) {
  console.warn('Warnings:', validation.warnings);
}
```

---

## 🎨 CSS Classes Reference

### Layout
```css
.app-shell                  /* Main container */
.sidebar                    /* Left panel */
.sidebar-mobile             /* Mobile sidebar overlay */
.app-content                /* Right side content area */
.topbar                     /* Header bar */
.main-panel                 /* Main content container */
.main-content               /* Scrollable content area */
```

### Cards & Panels
```css
.panel-card                 /* White card with shadow */
.stat-card                  /* Metric card */
.modal-card                 /* Modal dialog */
.hero-card                  /* Large feature card */
.empty-state-card           /* Empty placeholder */
```

### Forms & Input
```css
input                       /* Form input field */
.modal-body                 /* Modal content area */
.modal-actions              /* Button group */
.upload-box                 /* Upload progress area */
.parsed-box                 /* Parse result display */
```

### Buttons
```css
.primary-btn                /* Main action button */
.secondary-btn              /* Secondary action */
.menu-toggle                /* Mobile menu button */
```

### Lists
```css
.archive-list               /* Document/client list */
.archive-list-item          /* List item */
.nav-list                   /* Navigation menu */
.nav-item                   /* Navigation item */
```

---

## 🔌 API Endpoints (Backend)

### Base URL
```
${VITE_API_URL}/api or http://localhost:5000/api
```

### Archive Operations
```
POST   /api/archives              Create archive
GET    /api/archives              List archives
PATCH  /api/archives/:clientId    Update archive
```

### Document Operations
```
POST   /api/archives/:clientId/documents         Upload document
GET    /api/archives/:clientId/documents         Get documents
GET    /api/archives/:clientId/documents/:docId  Get document
DELETE /api/archives/:clientId/documents/:docId  Delete document
```

---

## 🚀 How to Add a New Feature

### Step 1: Create Modal Component
```tsx
// src/components/InvoiceModal.tsx
interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceData) => void;
}

export function InvoiceModal({ isOpen, onClose, onSubmit }: InvoiceModalProps) {
  // Form logic here
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card">
        {/* Modal content */}
      </div>
    </div>
  );
}
```

### Step 2: Create Data Model
```tsx
// src/utils/invoiceManager.ts
export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  amount: number;
  date: string;
  items: InvoiceItem[];
  // ... more fields
}
```

### Step 3: Create Service/API
```tsx
// src/api/invoiceApiClient.ts
export class InvoiceApiClient {
  static async createInvoice(data: Invoice): Promise<Invoice> {
    // API call
  }
  static async getInvoices(): Promise<Invoice[]> {
    // API call
  }
}
```

### Step 4: Integrate in App.tsx
```tsx
// Option A: Add specialized modal
{activeSection === 'factures' && isModalOpen && (
  <InvoiceModal 
    isOpen={isModalOpen} 
    onClose={() => setIsModalOpen(false)}
    onSubmit={handleInvoiceSubmit}
  />
)}

// Option B: Create feature component like ArchiveManager
case 'factures':
  return <InvoiceManager />;
```

---

## 🐛 Common Patterns & Anti-Patterns

### ✅ DO
```tsx
// Use utility functions
const validated = FileService.validateFile(file);
const parsed = parseQuickEntry(text);
const filtered = filterDocumentsByCategory(docs, category);

// Use component composition
<Sidebar>
  <nav-item />
  <nav-item />
</Sidebar>

// Use state for conditional rendering
{isModalOpen && <Modal />}
{isUploading && <ProgressBar />}

// Use descriptive variable names
const filteredDocuments = (() => { /* ... */ })();
const selectedClientData = archives.find(...);
```

### ❌ DON'T
```tsx
// Don't put complex logic in render
{documents.filter(...).map(...).sort(...).map(...)}

// Don't mutate state directly
documents.push(newDoc);  // WRONG!
setDocuments([...documents, newDoc]);  // RIGHT

// Don't use string literals for keys
documents.map((doc) => <Item key={doc.fileName} />)  // Bad, not unique
documents.map((doc) => <Item key={doc.id} />)        // Good

// Don't mix concerns
// Bad: Component doing validation AND rendering
// Good: Separate into service layer + component
```

---

## 📊 Feature Status Matrix

| Feature | Status | Modal | List | API | State |
|---------|--------|-------|------|-----|-------|
| **Documents** | ✅ DONE | ✅ | ✅ | ✅ | ✅ |
| **Comptabilité** | ✅ DONE | Parse | Display | - | ✅ |
| **Dashboard** | ✅ DONE | - | - | - | ✅ |
| **Factures** | ⏳ TODO | ❌ | ❌ | ❌ | ❌ |
| **Clients** | ⏳ TODO | ❌ | ❌ | ❌ | ❌ |
| **Agenda** | ⏳ TODO | ❌ | ❌ | ❌ | ❌ |
| **Rapports** | ⏳ TODO | ❌ | ❌ | ❌ | ❌ |
| **Notifications** | ⏳ TODO | ❌ | ❌ | ❌ | ❌ |

---

## 🔍 Debugging Tips

### Check Modal State
```tsx
// Add to App.tsx renderSection() or useEffect
console.log('activeSection:', activeSection);
console.log('isModalOpen:', isModalOpen);
console.log('sectionActions[activeSection]:', sectionActions[activeSection]);
```

### Check Archive State (ArchiveManager)
```tsx
console.log('archives:', archives);
console.log('documents:', documents);
console.log('selectedClient:', selectedClient);
console.log('filteredDocuments:', filteredDocuments);
```

### Check File Validation
```tsx
const validation = FileService.validateFile(file);
console.log('validation:', validation);
if (!validation.isValid) {
  validation.errors.forEach((err) => console.error(err));
}
```

### Check API Connection
```tsx
// In browser console
fetch('http://localhost:5000/api/archives')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

---

## 📚 Resource Links (in project)

- [ARCHIVAGE.md](ARCHIVAGE.md) - Archive system overview
- [EXAMPLES.md](EXAMPLES.md) - Usage examples
- [README.md](README.md) - General project info
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Implementation details
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Folder structure

---

## 🎯 Next Steps

1. **Review ArchiveManager** - Study how it handles state, rendering, and UX
2. **Plan modal strategy** - Decide: specialized modals vs dynamic modal vs context
3. **Create data models** - Define Invoice, Client, Event types
4. **Build first section** - Implement one feature (Factures) as template
5. **Add API integration** - Connect to backend/Supabase
6. **Test & iterate** - Use Vitest for unit tests

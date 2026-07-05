# VPNS Project - Comprehensive Architecture Overview

## 📋 Executive Summary

**VPNS Consulting** is a React/TypeScript SaaS platform for OHADA-compliant accounting and document archiving. The application features a split-pane responsive layout with a sidebar navigation and feature sections that are toggled via state management.

**Current Status**: Core archiving system is fully implemented; most other features are in "empty state" (UI ready, data layer pending).

---

## 🏗️ Overall Architecture

### Technology Stack
| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 18.3.1 + TypeScript 5.6.3 |
| **Build Tool** | Vite 5.4.10 |
| **Styling** | CSS (utility-first classes) |
| **State Management** | React hooks (useState) |
| **Authentication** | Supabase (JWT-based) |
| **File Upload** | Multer (backend), FormData (frontend) |
| **Storage** | Supabase + MongoDB (backend) |
| **Backend** | Express.js + MongoDB + Multer |
| **PWA** | Service Workers + Workbox |
| **Testing** | Vitest |

### Directory Structure
```
src/
├── App.tsx                 # Main app controller
├── main.tsx               # React entry point
├── styles.css             # All CSS styles
├── components/
│   ├── ArchiveManager.tsx       # Document archiving (FULL FEATURED)
│   ├── Sidebar.tsx              # Navigation menu
│   ├── TopBar.tsx               # Header with action button
│   ├── PageHeader.tsx           # Section title
│   ├── ConfirmationDialog.tsx   # Modal template
│   ├── EmptyState.tsx           # Empty placeholder
│   ├── FilterBar.tsx            # Filter pills
│   ├── PrimaryButton.tsx        # Button component
│   ├── NotificationToast.tsx    # Toast notifications
│   ├── LoginComponent.tsx       # Auth form
│   ├── LoadingSkeleton.tsx      # Loading state
│   ├── PWAPrompt.tsx            # PWA install prompt
│   └── StatisticCard.tsx        # Metric cards
├── services/
│   ├── authService.ts           # Supabase auth
│   ├── fileService.ts           # File operations
│   ├── securityService.ts       # Audit logging
│   └── supabaseClient.ts        # Supabase config
├── api/
│   └── archiveApiClient.ts      # REST API wrapper
├── utils/
│   ├── archiveManager.ts        # Archive business logic
│   └── helpers.ts               # OHADA parsing
├── hooks/
│   ├── useMediaQuery.ts
│   ├── usePWA.ts
│   └── (utilities for responsive design)
└── [test files]

server/
└── archiveServer.ts             # Express backend (optional)

public/
├── manifest.json                # PWA manifest
├── sw.ts                        # Service worker
└── icons/                       # App icons
```

---

## 🧭 Navigation & Sections

### 9 Main Sections
The app has 9 navigable sections managed by `App.tsx` state:

| Section | Key | Icon | Status | Data Source |
|---------|-----|------|--------|-------------|
| **Tableau de bord** | `dashboard` | 🏠 | ✅ Dashboard | Hardcoded stats |
| **Comptabilité** | `comptabilite` | 🧾 | ✅ Journal | Parsing + state |
| **Factures** | `factures` | 📄 | ⏳ Empty State | — |
| **Clients** | `clients` | 👥 | ⏳ Empty State | — |
| **Agenda** | `agenda` | 🗓️ | ⏳ Empty State | — |
| **Documents** | `documents` | 📁 | ✅ Full Featured | ArchiveManager |
| **Rapports** | `rapports` | 📊 | ⏳ Empty State | — |
| **Notifications** | `notifications` | 🔔 | ⏳ Empty State | — |
| **Paramètres** | `parametres` | ⚙️ | ✅ Basic Settings | Hardcoded |

### Navigation Flow
```
App.tsx
├── State: activeSection (SectionKey)
├── Sidebar (navigation menu)
│   └── onClick → onSelectSection(section) → setActiveSection(section)
├── TopBar (header)
│   ├── Shows: sectionLabels[activeSection]
│   ├── Action button: sectionActions[activeSection]
│   └── onClick → setIsModalOpen(true)
└── renderSection() switch statement
    └── Returns JSX based on activeSection
```

---

## 🎨 Component Hierarchy

### Main Layout Components

#### **App.tsx** (Controller Component)
```tsx
<div class="app-shell">
  <Sidebar />
  <div class="app-content">
    <TopBar />
    <main class="main-panel">
      <PageHeader />
      <div class="main-content">
        {renderSection()}  // Dynamic content
      </div>
    </main>
  </div>
  <Sidebar (mobile drawer) />
  {Modal (if isModalOpen)}
</div>
```

**Key State**:
- `activeSection`: Current page
- `isModalOpen`: Generic modal visibility
- `isDrawerOpen`: Mobile sidebar visibility
- `quickText`: Quick entry input
- `appointmentText`: Appointment input

#### **Sidebar.tsx** (Navigation)
- Fixed width: 50% on desktop, mobile overlay
- 9 navigation items with icons
- Active state highlighting
- Branded with "VP" logo + "VPNS Consulting"

#### **TopBar.tsx** (Header)
- Title and subtitle
- Primary action button
- Menu toggle for mobile

#### **PageHeader.tsx** (Section Title)
- Eyebrow text (subtitle)
- Main heading
- Optional description

#### **ConfirmationDialog.tsx** (Modal Template)
- Generic confirmation modal
- Title + description
- Confirm/Cancel buttons
- Backdrop click to close

### Content Components

#### **ArchiveManager.tsx** (FULL FEATURED) ⭐
The only section with complete functionality:
- **Client Selection**: Dropdown from `clients` prop
- **File Upload**: Multi-file with progress bar
- **Categories**: 7 predefined categories (Facture, Devis, Reçu, Contrat, Rapport, Justificatif, Autre)
- **Search**: Real-time name/description search
- **Filtering**: By category
- **Statistics**: Total clients, documents, storage used
- **Display**: Archive list + document list
- **State Management**:
  - `archives`: ClientArchive[]
  - `documents`: ArchivedDocument[]
  - `selectedClient`: string
  - `searchQuery`: string
  - `selectedCategory`: string
  - `uploadProgress`: number
  - `isUploading`: boolean

#### **EmptyState.tsx** (Placeholder)
- Used in all inactive sections
- Title + description
- Placeholder icon (📭)

### UI Components

| Component | Purpose | Props |
|-----------|---------|-------|
| **PrimaryButton** | Action button | `variant`, `children` |
| **FilterBar** | Filter pills | `filters[]`, `selected`, `onChange` |
| **NotificationToast** | Toast message | `message`, `type`, `onClose` |
| **StatisticCard** | Metric display | `title`, `value` |
| **LoadingSkeleton** | Loading state | — |
| **PWAPrompt** | PWA install | — |

---

## 🆕 "New" Buttons & Modal System

### Current Implementation

**CENTRALIZED MODAL PATTERN**:
- One generic modal in `App.tsx`
- `isModalOpen` boolean state
- Same modal for all 9 sections
- Title generated from: `sectionActions[activeSection]`
- Generic form fields: Description + Amount

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

// TopBar triggers modal
<PrimaryButton onClick={onAction}>{actionLabel}</PrimaryButton>
```

### Modal Structure
```tsx
{isModalOpen && (
  <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
    <div className="modal-card">
      <div className="modal-header">
        <h3>{sectionActions[activeSection]}</h3>
        <button className="modal-close">×</button>
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
          <button className="secondary-btn" onClick={() => setIsModalOpen(false)}>
            Annuler
          </button>
          <button className="primary-btn" onClick={() => setIsModalOpen(false)}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

### Issues with Current Modal
1. **Generic Form**: Same fields for all sections (not ideal)
2. **No Validation**: Inputs aren't validated
3. **No Persistence**: Data isn't saved (no API calls)
4. **No Feedback**: Clicking "Enregistrer" closes modal without confirmation
5. **Not Accessible**: No specialized UX per section

---

## 📦 Data Models & Services

### Type Definitions

#### **ClientArchive** (archiveManager.ts)
```typescript
interface ClientArchive {
  clientId: string;           // Unique: "eec-1719756234abc"
  clientName: string;         // "EEC", "BGFI", etc.
  folderPath: string;         // "/archives/{clientId}"
  createdDate: string;        // ISO 8601
  lastModified: string;       // ISO 8601
  documentCount: number;      // 0+
}
```

#### **ArchivedDocument** (archiveManager.ts)
```typescript
interface ArchivedDocument {
  id: string;                 // "doc-{timestamp}-{random}"
  clientId: string;           // FK to ClientArchive
  fileName: string;           // "facture-001.pdf"
  fileSize: number;           // bytes
  fileType: string;           // MIME type
  uploadDate: string;         // ISO 8601
  category: string;           // Facture|Devis|Reçu|Contrat|Rapport|Justificatif|Autre
  description?: string;       // Optional notes
  tags?: string[];            // Optional labels
}
```

#### **ArchiveStats** (archiveManager.ts)
```typescript
interface ArchiveStats {
  totalClients: number;
  totalDocuments: number;
  totalStorageUsed: number;   // bytes
  documentsPerClient: Record<string, number>;
}
```

### Utility Functions

#### **archiveManager.ts** (Business Logic)
```typescript
export function createClientFolder(clientName: string): ClientArchive
export function addDocumentToArchive(
  clientId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  category: string,
  description?: string,
  tags?: string[]
): ArchivedDocument
export function searchDocuments(documents: ArchivedDocument[], query: string): ArchivedDocument[]
export function filterDocumentsByCategory(documents: ArchivedDocument[], category: string): ArchivedDocument[]
export function filterDocumentsByTags(documents: ArchivedDocument[], tags: string[]): ArchivedDocument[]
export function generateArchiveStats(archives: ClientArchive[], allDocuments: ArchivedDocument[]): ArchiveStats
export function formatFileSize(bytes: number): string
```

#### **helpers.ts** (OHADA Parsing)
```typescript
export function parseQuickEntry(text: string): ParsedEntry
  // Extracts: amount, category (OHADA codes), account, type, vendor
  // Examples: "payer EEC 53390" → { amount: 53390, category: 'Énergie', ... }

export function parseAppointmentText(text: string): ParsedAppointment
  // Extracts: title, date (français), time, contact
```

### Services

#### **fileService.ts** (File Operations)
```typescript
class FileService {
  static validateFile(file: File): FileValidation
    // Returns: { isValid, errors[], warnings[] }
  
  static async hashFile(file: File): Promise<string>
    // SHA-256 hash for deduplication
  
  static formatFileSize(bytes: number): string
  
  static getFileIcon(mimeType: string): string
  
  static async createPreview(file: File): Promise<string | null>
  
  static downloadFile(blob: Blob, filename: string): void
  
  static exportToCsv(data: any[], filename: string): void
}
```

**File Validation Rules**:
- Max size: 50 MB
- Allowed MIME types: PDF, Images, Office docs, Text/CSV
- Allowed extensions: pdf, jpg, jpeg, png, gif, webp, doc, docx, xls, xlsx, txt, csv

#### **authService.ts** (Authentication)
```typescript
class AuthService {
  static async signup(email, password, name): Promise<AuthResponse>
  static async signin(email, password): Promise<AuthResponse>
  static async logout(): Promise<void>
}
```
Uses Supabase with JWT.

#### **securityService.ts** (Audit & Validation)
```typescript
class SecurityService {
  static isValidEmail(email: string): boolean
  static logAudit(action: string, status: string, metadata?: any): void
  static sanitizeInput(input: string): string
}
```

### API Client

#### **archiveApiClient.ts** (REST Wrapper)
```typescript
class ArchiveApiClient {
  static async createArchive(clientId, clientName): Promise<ClientArchive>
  static async getArchives(): Promise<ClientArchive[]>
  static async updateArchive(clientId, data): Promise<ClientArchive>
  static async uploadDocument(clientId, file, category, description?, tags?, uploadedBy?): Promise<ArchivedDocument>
  static async uploadMultipleDocuments(clientId, files, category, uploadedBy?): Promise<ArchivedDocument[]>
  static async getClientDocuments(clientId, filters?): Promise<ArchivedDocument[]>
  static async getDocument(clientId, docId): Promise<ArchivedDocument>
  static async downloadDocument(clientId, docId, fileName): void
  static async deleteDocument(clientId, docId): Promise<void>
}
```

**Base URL**: `${VITE_API_URL}/api` or `http://localhost:5000/api`

---

## 🎯 ArchiveManager Component (DETAILED)

This is the only fully implemented feature. Understanding its architecture is key for implementing other features.

### Component Flow
```tsx
<ArchiveManager clients={[{id, name}, ...]} />
  ├── useEffect() → Initialize archives from clients prop
  ├── State:
  │   ├── archives: ClientArchive[]
  │   ├── documents: ArchivedDocument[]
  │   ├── selectedClient: string
  │   ├── searchQuery: string
  │   ├── selectedCategory: string
  │   ├── uploadProgress: number
  │   └── isUploading: boolean
  │
  ├── Render Archive Toolbar
  │   ├── Title: "Archivage intelligent"
  │   └── Subtitle + "Compatible OHADA" chip
  │
  ├── Render Statistics Cards
  │   ├── Total clients
  │   ├── Total documents
  │   └── Storage used (formatted)
  │
  ├── Render Upload Form
  │   ├── Client dropdown (required)
  │   ├── File input (multiple, disabled if no client)
  │   └── Upload progress (if uploading)
  │
  ├── Render Archive List
  │   └── Clickable client cards
  │       └── onClick → setSelectedClient(clientId)
  │
  └── Render Selected Client Documents
      ├── Search input (real-time)
      ├── Category filter dropdown
      └── Document list
          ├── Empty state OR
          └── Document items (name, category, size, date)
```

### Upload Flow
1. User selects client from dropdown
2. User clicks file input
3. FileService validates each file
4. Files are processed with 300ms delay (simulated upload)
5. Upload progress bar updates
6. `documents` state updated
7. `archives` state updated (document count, lastModified)
8. Success alert shown

### Search & Filter Flow
1. `searchQuery` state changes → re-render
2. `selectedCategory` state changes → re-render
3. Both filters applied simultaneously:
   ```typescript
   let result = documents.filter((doc) => !selectedClient || doc.clientId === selectedClient);
   if (selectedCategory) result = filterDocumentsByCategory(result, selectedCategory);
   if (searchQuery) result = searchDocuments(result, searchQuery);
   ```

---

## 🎨 Styling Architecture

### CSS Organization
All styles in `src/styles.css` using:
- **Utility classes** (`.topbar`, `.sidebar`, `.modal-card`, etc.)
- **Grid layouts** (responsive grid-template-columns)
- **Flexbox** for component alignment
- **CSS variables** for theming (`:root`)

### Layout Grid
```
Desktop (>920px):
┌─────────────────────────┐
│  Sidebar (50%)          │ Main Panel (50%)       │
│  - Fixed width          │ - TopBar                │
│  - Scrollable           │ - PageHeader            │
│  - Dark theme           │ - Main content          │
└─────────────────────────┴────────────────────────┘

Mobile (<920px):
┌───────────────────┐
│ TopBar            │
├───────────────────┤
│ Main content      │
├───────────────────┤
│ Sidebar (overlay) │
└───────────────────┘
```

### Color Scheme
- **Dark Sidebar**: `#0f172a` (dark blue)
- **Light Background**: `#f4f6fb` (light blue)
- **Primary Color**: `#4f46e5` (indigo)
- **Secondary**: `#e2e8f0` (light gray)
- **Text**: `#111827` (dark gray)

### Responsive Breakpoints
```css
@media (max-width: 920px) { /* Sidebar stacks, mobile drawer */ }
@media (max-width: 640px) { /* Full-width mobile layout */ }
```

---

## 📊 State Management Pattern

### Global State Flow (in App.tsx)
```
App State:
├── activeSection: SectionKey
│   └── Controlled by Sidebar clicks
│   └── Used by TopBar, PageHeader, renderSection()
│
├── isModalOpen: boolean
│   └── Triggered by TopBar action button
│   └── Closed by modal cancel/close/backdrop
│
├── isDrawerOpen: boolean
│   └── Triggered by mobile menu toggle
│   └── Closed by drawer overlay click
│
├── quickText: string
│   └── From modal input
│   └── Passed to parseQuickEntry()
│
└── appointmentText: string
    └── From modal input (comptabilité section)
    └── Passed to parseAppointmentText()
```

### Local Component State (ArchiveManager)
```
ArchiveManager maintains separate state:
├── archives: ClientArchive[]
├── documents: ArchivedDocument[]
├── selectedClient: string
├── searchQuery: string
├── selectedCategory: string
├── uploadProgress: number
└── isUploading: boolean
```

**Note**: Currently **no global state management** (Redux/Context). Each component manages its own state.

---

## 🔌 Backend API Integration

### Express Server (optional)

**Location**: `server/archiveServer.ts`

**Endpoints**:
```
POST   /api/archives              → Create new archive
GET    /api/archives              → List all archives
PATCH  /api/archives/:clientId    → Update archive
POST   /api/archives/:clientId/documents      → Upload document
GET    /api/archives/:clientId/documents      → Get client documents
GET    /api/archives/:clientId/documents/:docId → Download document
DELETE /api/archives/:clientId/documents/:docId → Delete document
```

**File Upload**:
- Multer middleware for file handling
- Files stored in: `uploads/archives/{clientId}/`
- Max file size: 50 MB
- Allowed MIME types enforced

**Database**:
- MongoDB schemas for:
  - ClientArchive collection
  - ArchivedDocument collection
- Automatic timestamps and indexing

---

## 🚀 Features Already Implemented

### ✅ Fully Implemented
1. **Document Archiving** (ArchiveManager)
   - Create client archives
   - Upload files
   - Search documents
   - Filter by category
   - Display statistics
   
2. **Navigation System**
   - 9 main sections
   - Sidebar with icons
   - Mobile drawer
   - Active state highlighting

3. **Accounting Entry Parsing** (Dashboard + Comptabilité)
   - Parse OHADA accounting entries
   - Extract amount, category, account, type
   - Real-time parsing with visual feedback

4. **Authentication UI** (LoginComponent)
   - Email/password form
   - Password visibility toggle
   - Validation
   - Error messaging
   - Integration with Supabase

5. **File Validation & Security**
   - MIME type checking
   - File extension validation
   - File size limits
   - Input sanitization
   - Audit logging

6. **PWA Features**
   - Service Worker caching
   - Offline mode support
   - Install prompt
   - App manifest

### ⏳ Not Yet Implemented (Empty States)
1. **Factures** - Need form, data persistence, list view
2. **Clients** - Need CRUD operations, client cards
3. **Agenda** - Need calendar view, event scheduling
4. **Rapports** - Need data aggregation, chart generation
5. **Notifications** - Need notification system, history

---

## 🔄 Data Flow Examples

### Example 1: Upload a Document
```
User Action:
1. Selects client from dropdown
2. Clicks file input
3. Selects multiple PDF files
4. onClick → handleFileUpload()

Data Flow:
handleFileUpload(event: ChangeEvent<HTMLInputElement>)
  ├── Get files from event.target.files
  ├── Validate: selectedClient must be set
  ├── Loop through files with 300ms delay
  │   └── addDocumentToArchive() → Create ArchivedDocument object
  │   └── setDocuments(prev => [...prev, newDocument])
  │   └── setArchives(prev => update documentCount and lastModified)
  │   └── Update uploadProgress state
  └── Show success alert

State Updates:
documents: [...prev, { id, clientId, fileName, fileSize, ... }]
archives: [{ ..., documentCount: +1, lastModified: now() }]
uploadProgress: percentage
isUploading: false (when complete)
```

### Example 2: Filter Documents
```
User Action:
1. Enters search text in search input
2. onChange → setSearchQuery(value)

Component Re-render:
const filteredDocuments = (() => {
  let result = documents.filter((doc) => !selectedClient || doc.clientId === selectedClient);
  if (selectedCategory) result = filterDocumentsByCategory(result, selectedCategory);
  if (searchQuery) result = searchDocuments(result, searchQuery);
  return result;
})();

Result: Filtered list displayed in real-time
```

### Example 3: Create Entry (Comptabilité)
```
User Action:
1. Types "payer EEC 53390" in quick entry input
2. onChange → setQuickText(value)
3. useMemo hooks re-compute parseQuickEntry()

Parsed Output:
{
  amount: 53390,
  category: "Énergie",
  account: "6061",
  type: "debit",
  description: "payer EEC 53390",
  vendor: "EEC"
}

Display:
- Montant: 53,390 FCFA
- Catégorie: Énergie
- Compte: 6061
- Type: Débit
```

---

## 🎯 Key Architectural Patterns

### 1. Section-Based Routing
- No React Router; section routing via useState
- All sections rendered conditionally in renderSection() switch
- Fast switching, no page reloads

### 2. Centralized Modal
- One modal for all sections
- Title comes from `sectionActions` map
- Generic form fields
- **Issue**: Not scalable for different form requirements

### 3. Composition Over Configuration
- Components accept children and props
- Sidebar, TopBar, etc. are reusable
- Layout components are separate from content

### 4. Utility Functions Over Classes
- archiveManager uses pure functions
- fileService uses static methods
- Easy to test and compose

### 5. Responsive Sidebar
- Sidebar: 50% on desktop, overlay on mobile
- Drawer overlay for mobile navigation
- CSS media queries for breakpoints

---

## 📝 Changes Needed for Different "New" Button Functionalities

### Current Problem
The generic modal with only "Description" and "Montant" fields doesn't work well for all sections:
- **Factures**: Needs invoice number, date, amount, client, items
- **Clients**: Needs company name, email, phone, address
- **Agenda**: Needs event name, date/time, participant
- **Rapports**: Needs report type, period, scope
- **Notifications**: Needs title, message, priority, type

### Recommended Solutions

#### Option A: Multiple Specialized Modals
```tsx
if (activeSection === 'factures') <InvoiceModal />
else if (activeSection === 'clients') <ClientModal />
else if (activeSection === 'agenda') <EventModal />
// etc.
```

#### Option B: Dynamic Modal Based on Section
```tsx
const ModalComponent = modalComponents[activeSection];
return <ModalComponent isOpen={isModalOpen} onClose={closeModal} />;
```

#### Option C: Modal Context + Custom Hooks
```tsx
const { showModal } = useModal();
// In each component:
showModal({
  type: 'invoice',
  fields: [/* custom fields */],
  onSubmit: (data) => { /* persist */ }
});
```

---

## 🔍 Summary: Where Changes Need to Be Made

| Section | Component | Changes Needed |
|---------|-----------|-----------------|
| **App.tsx** | Main controller | Add specialized modal logic or modal routing |
| **Modal System** | Generic modal | Replace with section-specific modals OR dynamic routing |
| **Factures** | New component | Invoice form + list view + API integration |
| **Clients** | New component | Client form + contact list + CRUD operations |
| **Agenda** | New component | Calendar view + event form + date handling |
| **Rapports** | New component | Report generator + charts + data aggregation |
| **Notifications** | New component | Notification center + notification service |
| **ArchiveManager** | Existing | Already complete - use as reference |

---

## ✨ Conclusion

VPNS is well-architected for the document archiving feature. The main challenge moving forward is:

1. **Creating specialized forms** for each section's "New" button
2. **Scaling the modal system** beyond generic inputs
3. **Adding data persistence** via API/Supabase
4. **Implementing section-specific UX** (not generic placeholders)

The ArchiveManager component serves as a excellent example of what a "complete" section should look like with:
- Input validation
- Real-time filtering
- Progress feedback
- State management
- User feedback (alerts, empty states)

Use ArchiveManager as the template for implementing the other sections.

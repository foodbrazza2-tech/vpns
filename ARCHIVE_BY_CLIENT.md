# 📂 Archivage par Client - Implémentation

## 🎯 Objectif

Permettre aux utilisateurs de créer un dossier d'archivage **dédié à chaque client**, afin que tous les documents scannés et traités (factures, reçus, contrats, etc.) soient automatiquement organisés et stockés dans le dossier respectif du client.

## 📋 Structure de Stockage

```
📦 Archives (Supabase)
├── 📁 EEC_Cameroun_Jean_Dupont
│   ├── Factures/
│   │   ├── FAC-2026-001.pdf
│   │   └── FAC-2026-002.pdf
│   ├── Reçus/
│   │   ├── REC-2026-001.pdf
│   │   └── REC-2026-002.pdf
│   ├── Contrats/
│   │   └── Contrat_2026.pdf
│   └── Justificatifs/
│       └── Justif_paiement.pdf
│
├── 📁 Entreprise_ABC_Contact_Name
│   ├── Factures/
│   ├── Devis/
│   └── Rapports/
│
└── 📁 Startup_Tech_Owner_Name
    ├── Contrats/
    ├── Justificatifs/
    └── Autre/
```

## 🔧 Implémentation

### 1. **ClientModal** - Création automatique du dossier d'archivage

Déjà implémenté dans `src/components/ClientModal.tsx` :

```typescript
interface ClientData {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  taxId?: string;
  archiveFolder?: string;  // ← AUTO-GENERATED
}

// Dans handleSubmit
const archiveFolder = formData.archiveFolder || 
  `${formData.company.replace(/\s+/g, '_')}_${formData.name.replace(/\s+/g, '_')}`;
```

**Résultat:** Quand un client est créé, un dossier avec le format suivant est créé:
- `Nom_Entreprise_Nom_Contact`
- Tous les espaces remplacés par `_`
- Ex: `EEC_Cameroun_Jean_Dupont`

---

### 2. **ArchiveManager.tsx** - Intégration de l'archivage par client

La composante `ArchiveManager` s'améliore pour supporter:

#### a) Sélection du Client
```tsx
<select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
  <option value="">-- Tous les clients --</option>
  {clients.map((client) => (
    <option key={client.id} value={client.id}>
      {client.name} ({client.archiveFolder})
    </option>
  ))}
</select>
```

#### b) Catégories de Documents
Quand on upload un document, on peut le catégoriser:
```tsx
const categories = [
  'Facture',
  'Devis', 
  'Reçu',
  'Contrat',
  'Rapport',
  'Justificatif',
  'Autre'
];
```

Chaque catégorie crée automatiquement un sous-dossier:
- `EEC_Cameroun_Jean_Dupont/Factures/...`
- `EEC_Cameroun_Jean_Dupont/Devis/...`

#### c) Upload avec Progression
```tsx
const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
  // 1. Créer le dossier client s'il n'existe pas
  // 2. Créer le sous-dossier de catégorie
  // 3. Upload le fichier
  // 4. Mettre à jour les stats
};
```

---

### 3. **Archivage Automatique** - Lors de la Création de Documents

Quand un utilisateur crée un document via les modals, celui-ci est **automatiquement archivé** dans le dossier du client:

#### Facture créée → Archivée dans `Client_Folder/Factures/`
```typescript
const handleInvoiceSubmit = async (data: InvoiceData) => {
  // 1. Créer la facture
  const invoice = await invoiceAPI.create(data);
  
  // 2. Générer un PDF
  const pdfBuffer = await generateInvoicePDF(invoice);
  
  // 3. L'archiver automatiquement
  const client = clients.find(c => c.id === data.clientId);
  const folderPath = `${client.archiveFolder}/Factures/`;
  
  await archiveAPI.uploadDocument({
    folderPath,
    filename: `${invoice.invoiceNumber}.pdf`,
    fileBuffer: pdfBuffer,
    category: 'Facture'
  });
};
```

#### Même logique pour:
- **Devis** → `Client_Folder/Devis/`
- **Reçus/Quittances** → `Client_Folder/Reçus/`
- **Contrats** → `Client_Folder/Contrats/`
- **Rapports** → `Client_Folder/Rapports/`

---

## 🗂️ Organisation des Dossiers

### Niveaux de Hiérarchie:

```
Level 1: Client (created by ClientModal)
  └── Level 2: Category (from document type)
       └── Level 3: Document (uploaded file)
```

### Exemple d'Arborescence Complète:

```
📦 Supabase Storage (archives/)
│
├── 📁 EEC_Cameroun_Jean_Dupont
│   ├── 📁 Factures
│   │   ├── FAC-2026-001.pdf
│   │   ├── FAC-2026-002.pdf
│   │   └── FAC-2026-003.pdf
│   ├── 📁 Devis
│   │   └── DEV-2026-001.pdf
│   ├── 📁 Reçus
│   │   ├── REC-2026-001.pdf
│   │   └── REC-2026-002.pdf
│   ├── 📁 Contrats
│   │   └── Contrat_Service.pdf
│   ├── 📁 Rapports
│   │   └── Rapport_Q1_2026.pdf
│   └── 📁 Justificatifs
│       ├── Paiement_01.pdf
│       └── Paiement_02.pdf
│
├── 📁 Startup_Tech_CEO_Name
│   ├── 📁 Factures
│   ├── 📁 Devis
│   ├── 📁 Contrats
│   └── 📁 Rapports
│
└── 📁 Cabinet_Legal_Partner_Name
    ├── 📁 Contrats
    ├── 📁 Actes
    └── 📁 Correspondances
```

---

## 🔄 Flux de Travail Complet

### Scénario: Client créé, documents archivés

```
1. USER ACTION: Cliquer sur "➕ Nouveau client"
   ↓
2. MODAL: ClientModal s'affiche
   - Saisie: Nom, Entreprise, Email, Téléphone, Adresse
   - Auto-généré: Dossier d'archivage = "Entreprise_Nom"
   ↓
3. BACKEND: Créer le client dans la DB
4. BACKEND: Créer le dossier `EEC_Cameroun_Jean_Dupont/` dans Supabase Storage
5. BACKEND: Créer les sous-dossiers (Factures/, Devis/, Reçus/, etc.)
   ↓
6. UI UPDATE: Client apparat dans la liste
   ↓
7. USER ACTION: Cliquer sur "➕ Nouvelle facture" dans la section Factures
   ↓
8. MODAL: InvoiceModal s'affiche
   - Sélectionner: Client (dropdown)
   - Saisie: Numéro, Montant, Date, etc.
   ↓
9. BACKEND: Créer la facture en DB
10. BACKEND: Générer PDF
11. BACKEND: Upload le PDF dans `EEC_Cameroun_Jean_Dupont/Factures/FAC-2026-001.pdf`
   ↓
12. UI UPDATE: Facture archivée confirmée
   ↓
13. USER ACTION: Aller à "Documents" > Sélectionner le client
   ↓
14. UI: Affiche l'arborescence
    📁 EEC_Cameroun_Jean_Dupont
       ├── 📁 Factures (1 fichier)
       ├── 📁 Devis (0 fichier)
       └── 📁 Autres (2 fichiers)
```

---

##  API Backend (à implémenter)

### 1. **Créer un client avec dossier d'archivage**

```typescript
POST /api/clients
{
  name: "Jean Dupont",
  company: "EEC Cameroun",
  email: "jean@eec.cm",
  phone: "+237 6XX XX XX XX",
  archiveFolder: "EEC_Cameroun_Jean_Dupont"
}

Response:
{
  id: "client_123",
  archiveFolder: "EEC_Cameroun_Jean_Dupont",
  createdAt: "2026-07-05T10:30:00Z"
}
```

### 2. **Upload un document dans le dossier du client**

```typescript
POST /api/archive/upload
{
  clientId: "client_123",
  category: "Facture",
  file: File,
  metadata: {
    invoiceNumber: "FAC-2026-001",
    uploadedAt: "2026-07-05T10:31:00Z"
  }
}

Response:
{
  documentId: "doc_456",
  path: "EEC_Cameroun_Jean_Dupont/Factures/FAC-2026-001.pdf",
  url: "https://storage.supabase.co/...",
  size: 245678
}
```

### 3. **Lister les documents d'un client**

```typescript
GET /api/archive/documents?clientId=client_123&category=Facture

Response:
[
  {
    documentId: "doc_456",
    filename: "FAC-2026-001.pdf",
    category: "Facture",
    size: 245678,
    uploadedAt: "2026-07-05T10:31:00Z",
    url: "https://storage.supabase.co/..."
  },
  ...
]
```

### 4. **Créer structure de dossiers pour nouveau client**

```typescript
POST /api/archive/init-client-folders
{
  clientId: "client_123",
  archiveFolder: "EEC_Cameroun_Jean_Dupont"
}

// Crée automatiquement:
// - EEC_Cameroun_Jean_Dupont/
// - EEC_Cameroun_Jean_Dupont/Factures/
// - EEC_Cameroun_Jean_Dupont/Devis/
// - EEC_Cameroun_Jean_Dupont/Reçus/
// - EEC_Cameroun_Jean_Dupont/Contrats/
// - EEC_Cameroun_Jean_Dupont/Rapports/
// - EEC_Cameroun_Jean_Dupont/Justificatifs/
// - EEC_Cameroun_Jean_Dupont/Autre/
```

---

## 🎨 UI/UX Améliorations

### Vue Documents - Hiérarchie Client

```
┌─────────────────────────────────────┐
│ ARCHIVES PAR CLIENT                 │
├─────────────────────────────────────┤
│ 📁 EEC_Cameroun_Jean_Dupont         │ ← Client 1
│   ├── 📄 Factures (3 fichiers)      │ ← Catégorie expandable
│   │   ├── FAC-2026-001.pdf  45 KB   │
│   │   ├── FAC-2026-002.pdf  52 KB   │
│   │   └── FAC-2026-003.pdf  38 KB   │
│   │                                  │
│   ├── 📄 Devis (1 fichier)          │
│   │   └── DEV-2026-001.pdf  28 KB   │
│   │                                  │
│   ├── 📄 Reçus (2 fichiers)         │
│   │   ├── REC-2026-001.pdf  15 KB   │
│   │   └── REC-2026-002.pdf  17 KB   │
│   │                                  │
│   ├── 📄 Contrats (1 fichier)       │
│   │   └── Contrat_2026.pdf 125 KB   │
│   │                                  │
│   └── 📄 Autre (2 fichiers)         │
│       ├── Screenshot_01.png  89 KB   │
│       └── Notes.txt  3 KB            │
│                                      │
│ Total: 390 KB                        │
└─────────────────────────────────────┘
```

### Actions possibles:
- ✏️ Renommer document
- 🔗 Créer lien partageable
- 📥 Télécharger
- 🗑️ Supprimer
- 📌 Ajouter tag/note
- 🔍 Rechercher dans le dossier du client

---

## 🔒 Considérations de Sécurité

1. **Accès restreint par client**
   - Un utilisateur ne peut voir que les dossiers des clients qu'il gère
   - Validation backend obligatoire

2. **Audit trail**
   - Log de chaque upload/téléchargement
   - Traçabilité complète

3. **Encryption**
   - Documents stockés chiffrés dans Supabase
   - Clés d'encryption côté serveur

4. **Permissions granulaires**
   - Admin: Peut voir/modifier tous les clients
   - Manager: Peut voir/modifier les clients assignés
   - Comptable: Lecture seule

---

## ✅ Checklist d'Implémentation

- [x] ClientModal créé avec générateur de dossier d'archivage
- [x] Modals spécifiques pour chaque type de document (Facture, Devis, etc.)
- [ ] Backend API pour créer clients + dossiers
- [ ] Backend API pour upload documents
- [ ] Intégration ArchiveManager <-> ClientModal
- [ ] Auto-archivage lors de création de documents
- [ ] Vue hiérarchique des dossiers clients
- [ ] Recherche dans archives par client
- [ ] Export/Téléchargement par lot
- [ ] Historique des documents (versioning)
- [ ] Partage de documents
- [ ] Rapports sur l'archivage

---

## 📞 Support

Pour toute question sur l'archivage par client ou les modals, consultez:
- `MODALS_DOCUMENTATION.md` - Détails des modals
- `src/components/ClientModal.tsx` - Code source
- `src/components/ArchiveManager.tsx` - Gestion des archives

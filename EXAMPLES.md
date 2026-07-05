# 📖 EXEMPLES D'UTILISATION - Archivage par Client

## 🎬 Exemple 1 : Créer une archive pour un nouveau client

```typescript
import { createClientFolder } from './utils/archiveManager';

// Créer une archive pour le client "EEC"
const archive = createClientFolder('EEC');

console.log(archive);
// {
//   clientId: "eec-1719756234abc",
//   clientName: "EEC",
//   folderPath: "/archives/eec-1719756234abc",
//   createdDate: "2026-06-30T12:34:56.789Z",
//   lastModified: "2026-06-30T12:34:56.789Z",
//   documentCount: 0
// }
```

---

## 📄 Exemple 2 : Ajouter des documents à l'archive

```typescript
import { addDocumentToArchive } from './utils/archiveManager';

// Ajouter une facture PDF
const document1 = addDocumentToArchive(
  'eec-1719756234abc',           // clientId
  'facture-001.pdf',              // fileName
  102400,                          // fileSize (bytes)
  'application/pdf',              // fileType
  'Facture',                      // category
  'Facture du mois de juin 2026',  // description
  ['important', 'client-eec']     // tags
);

console.log(document1);
// {
//   id: "doc-1719756234789-abc123",
//   clientId: "eec-1719756234abc",
//   fileName: "facture-001.pdf",
//   fileSize: 102400,
//   fileType: "application/pdf",
//   uploadDate: "2026-06-30T12:35:00.000Z",
//   category: "Facture",
//   description: "Facture du mois de juin 2026",
//   tags: ["important", "client-eec"]
// }

// Ajouter un devis
const document2 = addDocumentToArchive(
  'eec-1719756234abc',
  'devis-2026-001.pdf',
  89342,
  'application/pdf',
  'Devis',
  'Devis pour prestation IT',
  ['non-signé']
);
```

---

## 🔍 Exemple 3 : Rechercher des documents

```typescript
import { searchDocuments } from './utils/archiveManager';

const documents = [
  { id: '1', fileName: 'facture-001.pdf', description: 'Facture importante', tags: ['urgent'] },
  { id: '2', fileName: 'rapport-janvier.pdf', description: 'Rapport mensuel', tags: [] },
  { id: '3', fileName: 'contrat-eec.pdf', description: 'Contrat avec EEC', tags: ['eec'] },
];

// Rechercher "facture"
const results1 = searchDocuments(documents, 'facture');
// Retourne: [facture-001.pdf]

// Rechercher "urgent" (dans les tags)
const results2 = searchDocuments(documents, 'urgent');
// Retourne: [facture-001.pdf]

// Rechercher "contrat"
const results3 = searchDocuments(documents, 'contrat');
// Retourne: [contrat-eec.pdf]
```

---

## 🏷️ Exemple 4 : Filtrer par catégorie

```typescript
import { filterDocumentsByCategory } from './utils/archiveManager';

const documents = [
  { id: '1', fileName: 'facture-001.pdf', category: 'Facture' },
  { id: '2', fileName: 'devis-001.pdf', category: 'Devis' },
  { id: '3', fileName: 'facture-002.pdf', category: 'Facture' },
  { id: '4', fileName: 'reçu-001.pdf', category: 'Reçu' },
];

// Récupérer toutes les factures
const factures = filterDocumentsByCategory(documents, 'Facture');
// Retourne: [facture-001.pdf, facture-002.pdf]

// Récupérer tous les devis
const devis = filterDocumentsByCategory(documents, 'Devis');
// Retourne: [devis-001.pdf]
```

---

## 🏷️ Exemple 5 : Filtrer par tags

```typescript
import { filterDocumentsByTags } from './utils/archiveManager';

const documents = [
  { id: '1', fileName: 'doc1.pdf', tags: ['urgent', 'client-a'] },
  { id: '2', fileName: 'doc2.pdf', tags: ['client-b'] },
  { id: '3', fileName: 'doc3.pdf', tags: ['urgent', 'client-c'] },
];

// Récupérer les documents "urgent"
const urgent = filterDocumentsByTags(documents, ['urgent']);
// Retourne: [doc1.pdf, doc3.pdf]

// Récupérer les documents avec le tag "client-a"
const clientA = filterDocumentsByTags(documents, ['client-a']);
// Retourne: [doc1.pdf]

// Récupérer les documents "urgent" OU "client-b"
const combined = filterDocumentsByTags(documents, ['urgent', 'client-b']);
// Retourne: [doc1.pdf, doc2.pdf, doc3.pdf]
```

---

## 📊 Exemple 6 : Générer des statistiques

```typescript
import { generateArchiveStats } from './utils/archiveManager';

const archives = [
  { clientId: 'eec-123', clientName: 'EEC' },
  { clientId: 'airtel-456', clientName: 'Airtel' },
  { clientId: 'cnss-789', clientName: 'CNSS' },
];

const documents = [
  { clientId: 'eec-123', fileSize: 102400 },
  { clientId: 'eec-123', fileSize: 204800 },
  { clientId: 'airtel-456', fileSize: 51200 },
  { clientId: 'cnss-789', fileSize: 307200 },
];

const stats = generateArchiveStats(archives, documents);

console.log(stats);
// {
//   totalClients: 3,
//   totalDocuments: 4,
//   totalStorageUsed: 665600,
//   documentsPerClient: {
//     "eec-123": 2,
//     "airtel-456": 1,
//     "cnss-789": 1
//   }
// }
```

---

## 💾 Exemple 7 : Utiliser le composant React

```typescript
import { ArchiveManager } from './components/ArchiveManager';

export function App() {
  const clients = [
    { id: 'eec', name: 'EEC' },
    { id: 'airtel', name: 'Airtel' },
    { id: 'cnss', name: 'CNSS' },
  ];

  return (
    <div>
      <h1>Gestion d'entreprise</h1>
      
      {/* Intégrer le gestionnaire d'archivage */}
      <ArchiveManager clients={clients} />
    </div>
  );
}
```

**Résultat** : Une interface complète avec :
- Sélecteur de clients
- Upload de fichiers
- Recherche
- Filtrage
- Statistiques

---

## 🔗 Exemple 8 : Utiliser l'API Client (avec serveur)

```typescript
import { ArchiveApiClient } from './api/archiveApiClient';

// Créer une archive sur le serveur
async function initializeClientArchive() {
  const archive = await ArchiveApiClient.createArchive(
    'eec-123',
    'EEC'
  );
  console.log('Archive créée:', archive);
}

// Uploader un document
async function uploadClientDocument() {
  const file = new File(['content'], 'facture.pdf', { type: 'application/pdf' });
  
  const document = await ArchiveApiClient.uploadDocument(
    'eec-123',
    file,
    'Facture',
    'Facture du mois',
    ['important'],
    'user@example.com'
  );
  
  console.log('Document uploadé:', document);
}

// Récupérer les documents
async function loadDocuments() {
  const documents = await ArchiveApiClient.getClientDocuments('eec-123', {
    category: 'Facture',
    search: 'juin'
  });
  
  console.log('Documents trouvés:', documents);
}

// Télécharger un document
async function downloadDocument() {
  await ArchiveApiClient.downloadDocument(
    'eec-123',
    'doc-123',
    'facture.pdf'
  );
}

// Supprimer un document
async function removeDocument() {
  await ArchiveApiClient.deleteDocument('eec-123', 'doc-123');
}

// Récupérer les statistiques
async function getStats() {
  const stats = await ArchiveApiClient.getArchiveStats();
  console.log('Statistiques:', stats);
}
```

---

## 🎣 Exemple 9 : Utiliser le hook React

```typescript
import { useArchiveApi } from './api/archiveApiClient';

function ArchiveComponent() {
  const {
    archives,
    documents,
    loading,
    error,
    loadArchives,
    loadClientDocuments,
    uploadFile,
    deleteDoc,
  } = useArchiveApi();

  // Charger les documents d'un client
  const handleSelectClient = async (clientId: string) => {
    await loadClientDocuments(clientId);
  };

  // Uploader un fichier
  const handleFileUpload = async (file: File, category: string) => {
    try {
      await uploadFile('eec-123', file, category);
      alert('Fichier uploadé !');
    } catch (err) {
      alert('Erreur: ' + (err as Error).message);
    }
  };

  // Supprimer un document
  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDoc('eec-123', docId);
      alert('Document supprimé !');
    } catch (err) {
      alert('Erreur: ' + (err as Error).message);
    }
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div>
      <h2>Archives</h2>
      {archives.length > 0 ? (
        <ul>
          {archives.map((archive) => (
            <li key={archive.clientId}>
              {archive.clientName}
              <button onClick={() => handleSelectClient(archive.clientId)}>
                Voir documents
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Aucune archive</p>
      )}

      <div>
        <h3>Documents</h3>
        {documents.length > 0 ? (
          <ul>
            {documents.map((doc) => (
              <li key={doc.id}>
                {doc.fileName}
                <button onClick={() => handleDeleteDocument(doc.id)}>
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>Aucun document</p>
        )}
      </div>
    </div>
  );
}
```

---

## 📈 Exemple 10 : Cas d'usage complet

```typescript
// Scénario: Un nouveau client arrive
// 1. Créer son dossier d'archive
// 2. Uploader sa documentation
// 3. Organiser avec des catégories et tags
// 4. Pouvoir retrouver facilement ses documents

async function onboardNewClient(clientName: string, documents: File[]) {
  try {
    // 1. Créer l'archive
    const archive = createClientFolder(clientName);
    console.log(`✓ Archive créée pour ${clientName}`);

    // 2. Ajouter les documents
    for (const file of documents) {
      const doc = addDocumentToArchive(
        archive.clientId,
        file.name,
        file.size,
        file.type,
        determinateCategory(file.name),
        `Document initial pour ${clientName}`,
        [clientName.toLowerCase(), 'onboarding']
      );
      console.log(`✓ Document ajouté: ${doc.fileName}`);
    }

    console.log('✓ Onboarding terminé!');
    return archive;
  } catch (error) {
    console.error('✗ Erreur:', error);
  }
}

function determinateCategory(fileName: string): string {
  if (fileName.includes('contrat')) return 'Contrat';
  if (fileName.includes('facture')) return 'Facture';
  if (fileName.includes('devis')) return 'Devis';
  if (fileName.includes('reçu')) return 'Reçu';
  return 'Autre';
}

// Utilisation
const files = [
  new File(['...'], 'contrat-client.pdf'),
  new File(['...'], 'facture-initiale.pdf'),
  new File(['...'], 'devis.pdf'),
];

await onboardNewClient('Nouveau Client Inc.', files);
```

---

## 🎯 Bonus : Formatage automatique de taille

```typescript
import { formatFileSize } from './utils/archiveManager';

console.log(formatFileSize(0));           // "0 Bytes"
console.log(formatFileSize(512));         // "0.5 KB"
console.log(formatFileSize(1024));        // "1 KB"
console.log(formatFileSize(1024 * 1024)); // "1 MB"
console.log(formatFileSize(50 * 1024 * 1024)); // "50 MB"
```

---

**Ces exemples couvrent 90% des cas d'usage ! 🎉**

Pour plus de détails, consultez ARCHIVAGE.md

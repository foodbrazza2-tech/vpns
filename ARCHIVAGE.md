# 📁 Système d'Archivage par Client

## Vue d'ensemble

Le système d'archivage permet de gérer les documents scannés et les fichiers associés à chaque client de manière organisée et structurée. Chaque client dispose d'un dossier dédié où tous ses documents sont centralisés.

## Fonctionnalités principales

### 1. **Création automatique de dossiers clients**
- Un dossier est créé automatiquement pour chaque client
- Format du dossier: `/archives/{client-id}/`
- Chaque dossier est identifié par un ID unique et immuable

### 2. **Upload de documents**
- Support de plusieurs formats de fichiers (PDF, images, documents Office, etc.)
- Upload en masse (plusieurs fichiers simultanément)
- Affichage de la barre de progression
- Stockage automatique dans le dossier du client sélectionné

### 3. **Organisation des documents**
- **Catégorisation** : Facture, Devis, Reçu, Contrat, Rapport, Justificatif, Autre
- **Tags personnalisés** : Ajoutez des étiquettes pour un tri rapide
- **Descriptions** : Ajoutez des notes descriptives à chaque document

### 4. **Recherche et filtrage**
- **Recherche par nom** : Trouve les documents par leur nom de fichier
- **Filtrage par catégorie** : Affiche uniquement les documents d'une catégorie
- **Filtrage par tags** : Recherche par étiquettes personnalisées

### 5. **Statistiques**
- **Total des clients** : Nombre de clients avec archives
- **Total des documents** : Nombre total de fichiers archivés
- **Stockage utilisé** : Taille totale des documents
- **Documents par client** : Répartition des documents

## Structure de données

### ClientArchive
```typescript
{
  clientId: string;              // Identifiant unique (ex: "eec-1719756234abc")
  clientName: string;            // Nom du client
  folderPath: string;            // Chemin du dossier (ex: "/archives/eec-1719756234abc")
  createdDate: string;           // Date de création (ISO 8601)
  lastModified: string;          // Dernière modification (ISO 8601)
  documentCount: number;         // Nombre de documents archivés
}
```

### ArchivedDocument
```typescript
{
  id: string;                    // Identifiant unique du document
  clientId: string;              // ID du client propriétaire
  fileName: string;              // Nom du fichier
  fileSize: number;              // Taille en bytes
  fileType: string;              // Type MIME du fichier
  uploadDate: string;            // Date d'upload (ISO 8601)
  category: string;              // Catégorie (Facture, Devis, etc.)
  description?: string;          // Description optionnelle
  tags?: string[];               // Étiquettes personnalisées
}
```

## Utilisation

### Intégration dans l'application
Le composant `ArchiveManager` est intégré dans la section "Documents" de l'application principale.

```tsx
import { ArchiveManager } from './components/ArchiveManager';

// Dans votre composant parent
<ArchiveManager
  clients={clients.map((client) => ({
    id: client.id,
    name: client.name,
  }))}
/>
```

### Flux d'utilisation

1. **Sélectionner un client**
   - Choisissez un client dans le dropdown "Ajouter des Documents"
   - Ou cliquez sur une carte client dans la section "Archives des Clients"

2. **Ajouter des documents**
   - Cliquez sur "📤 Sélectionner des fichiers"
   - Sélectionnez un ou plusieurs fichiers
   - Les fichiers sont automatiquement uploadés et rangés

3. **Consulter les archives**
   - Les documents du client sélectionné s'affichent automatiquement
   - Utilisez la barre de recherche pour retrouver un document
   - Filtrez par catégorie pour affiner votre recherche

4. **Gérer les documents**
   - Consultez les infos du document (taille, date, catégorie)
   - Utilisez les tags pour mieux organiser

## Fonctions utilitaires

### `archiveManager.ts`

#### `createClientFolder(clientName: string): ClientArchive`
Crée une structure de dossier pour un nouveau client.

```typescript
const archive = createClientFolder('EEC');
// Résultat: 
// {
//   clientId: 'eec-1719756234abc',
//   clientName: 'EEC',
//   folderPath: '/archives/eec-1719756234abc',
//   createdDate: '2026-06-30T...',
//   lastModified: '2026-06-30T...',
//   documentCount: 0
// }
```

#### `addDocumentToArchive(clientId, fileName, fileSize, fileType, category, description?, tags?): ArchivedDocument`
Ajoute un document à l'archive d'un client.

```typescript
const doc = addDocumentToArchive(
  'eec-1719756234abc',
  'facture-001.pdf',
  102400,
  'application/pdf',
  'Facture',
  'Facture du mois de juin',
  ['important', 'client-eec']
);
```

#### `formatFileSize(bytes: number): string`
Convertit une taille de fichier en format lisible.

```typescript
formatFileSize(1024 * 1024); // "1 MB"
formatFileSize(512);         // "0.5 KB"
```

#### `filterDocumentsByCategory(documents, category): ArchivedDocument[]`
Filtre les documents par catégorie.

```typescript
const factures = filterDocumentsByCategory(documents, 'Facture');
```

#### `filterDocumentsByTags(documents, tags): ArchivedDocument[]`
Filtre les documents par tags.

```typescript
const important = filterDocumentsByTags(documents, ['important']);
```

#### `searchDocuments(documents, query): ArchivedDocument[]`
Recherche des documents par nom, description ou tags.

```typescript
const results = searchDocuments(documents, 'facture');
```

#### `generateArchiveStats(archives, documents): ArchiveStats`
Génère des statistiques sur les archives.

```typescript
const stats = generateArchiveStats(archives, documents);
// {
//   totalClients: 3,
//   totalDocuments: 47,
//   totalStorageUsed: 524288000,
//   documentsPerClient: { 'eec-...': 15, 'airtel-...': 12, ... }
// }
```

## Tests

Les tests du système d'archivage sont dans `archiveManager.test.ts`. Pour exécuter les tests :

```bash
npm test
```

Les tests couvrent :
- ✅ Création de dossiers clients
- ✅ Ajout de documents
- ✅ Formatage des tailles de fichier
- ✅ Filtrage par catégorie et tags
- ✅ Recherche de documents
- ✅ Génération de statistiques

## Architecture et persistance

### État actuel (Frontend)
Les archives et documents sont stockés en mémoire (React State). Ils sont perdus au rechargement de la page.

### Pour la production
Pour persister les données, vous devrez :

1. **Intégrer une base de données** (MongoDB, PostgreSQL, etc.)
2. **Créer une API backend** pour gérer les opérations
3. **Implémenter l'upload de fichiers** vers un serveur de stockage (S3, etc.)

Exemple d'API à créer :
- `POST /api/archives/{clientId}/documents` - Upload un document
- `GET /api/archives/{clientId}/documents` - Récupère les documents du client
- `DELETE /api/archives/{clientId}/documents/{docId}` - Supprime un document
- `GET /api/archives/stats` - Récupère les statistiques

## Exemple d'intégration avec un backend

```typescript
// archiveManager.ts - côté serveur
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/api/archives/:clientId/documents', upload.single('file'), (req, res) => {
  const { clientId } = req.params;
  const archiveDir = path.join(__dirname, 'archives', clientId);
  
  // Créer le dossier s'il n'existe pas
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }
  
  // Déplacer le fichier
  const filePath = path.join(archiveDir, req.file.originalname);
  fs.renameSync(req.file.path, filePath);
  
  // Enregistrer en base de données
  // ...
  
  res.json({ success: true, file: req.file });
});
```

## Catégories par défaut

- **Facture** : Factures émises ou reçues
- **Devis** : Devis et propositions commerciales
- **Reçu** : Reçus de paiement
- **Contrat** : Contrats et accords
- **Rapport** : Rapports et analyses
- **Justificatif** : Pièces justificatives
- **Autre** : Documents divers

## Bonnes pratiques

1. ✅ **Organisez avec les tags** : Utilisez des tags cohérents (ex: "2026-Q2", "urgent", "eec")
2. ✅ **Utilisez les descriptions** : Ajoutez une note pour les documents importants
3. ✅ **Catégorisez correctement** : Facilitez la recherche future avec une bonne catégorie
4. ✅ **Nettoyez régulièrement** : Supprimez les documents obsolètes
5. ✅ **Sauvegardez** : Faites des sauvegardes régulières de vos archives

## Limitations actuelles

- 📝 Upload limité à la mémoire (à implémenter côté serveur)
- 📝 Pas de suppression de documents (à ajouter)
- 📝 Pas de versioning des documents
- 📝 Pas de permissions d'accès par utilisateur
- 📝 Pas de signature numérique

## Évolutions futures

- [ ] Supprimer des documents
- [ ] Télécharger les archives en ZIP
- [ ] Partage sécurisé de documents
- [ ] Historique des modifications
- [ ] OCR et indexation de contenu
- [ ] Archivage automatique (date limite)
- [ ] Notifications pour documents importants

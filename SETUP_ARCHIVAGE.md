# 📁 Système d'Archivage par Client - Documentation Complète

## 🎯 Vue d'ensemble

Vous avez maintenant un **système d'archivage complet et structuré** qui permet à chaque client d'avoir son propre dossier pour ranger tous les documents scannés et fichiers associés.

## 📦 Ce qui a été créé

### 1. **Système de gestion d'archives (Frontend)**
- **Fichier** : `src/utils/archiveManager.ts`
- **Contient** : 
  - Gestion des dossiers clients
  - Ajout de documents à l'archive
  - Recherche et filtrage de documents
  - Statistiques d'archives
  - Tests unitaires dans `src/utils/archiveManager.test.ts`

### 2. **Interface utilisateur (Composant React)**
- **Fichier** : `src/components/ArchiveManager.tsx`
- **Fonctionnalités** :
  - ✅ Sélection d'un client
  - ✅ Upload de documents (simple ou multiple)
  - ✅ Barre de progression
  - ✅ Recherche de documents
  - ✅ Filtrage par catégorie
  - ✅ Affichage des statistiques
  - ✅ Gestion des tags et descriptions

### 3. **API Backend (Express.js)**
- **Fichier** : `server/archiveServer.ts`
- **Points de terminaison** :
  - `POST /api/archives` - Créer une archive client
  - `POST /api/archives/:clientId/documents` - Uploader un document
  - `GET /api/archives/:clientId/documents` - Récupérer les documents
  - `GET /api/archives/:clientId/documents/:docId` - Récupérer un document
  - `DELETE /api/archives/:clientId/documents/:docId` - Supprimer un document
  - `GET /api/archives/stats` - Récupérer les statistiques
  - `PATCH /api/archives/:clientId` - Mettre à jour une archive

### 4. **Client API (Communication serveur)**
- **Fichier** : `src/api/archiveApiClient.ts`
- **Contient** :
  - Classe `ArchiveApiClient` pour les appels API
  - Hook React `useArchiveApi` pour la gestion d'état

### 5. **Documentation**
- **Fichier** : `ARCHIVAGE.md` - Guide complet du système

## 🚀 Installation et Setup

### Phase 1 : Frontend (Actuellement opérationnel)

Le système fonctionne déjà côté frontend ! Vous pouvez l'utiliser immédiatement dans votre application.

```bash
# Démarrer l'application
npm run dev
```

Accédez à l'onglet **"Documents"** pour accéder au gestionnaire d'archivage.

### Phase 2 : Backend (Optionnel - Pour la persistance)

Si vous voulez sauvegarder les documents sur un serveur :

#### 2.1 Installer les dépendances
```bash
cd server
npm install express multer mongoose dotenv cors
npm install --save-dev typescript @types/express @types/node
```

#### 2.2 Configurer les variables d'environnement
Créer un fichier `.env` dans le dossier `server/` :

```env
MONGODB_URI=mongodb://localhost:27017/vpns-archives
PORT=5000
NODE_ENV=development
```

#### 2.3 Installer MongoDB
- Télécharger et installer [MongoDB Community](https://www.mongodb.com/try/download/community)
- Ou utiliser [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) pour le cloud

#### 2.4 Démarrer le serveur
```bash
# En mode développement
npm run dev

# En mode production
npm start
```

## 📋 Structure des dossiers créés

```
VPNS/
├── src/
│   ├── components/
│   │   └── ArchiveManager.tsx           ✨ Nouveau
│   ├── api/
│   │   └── archiveApiClient.ts          ✨ Nouveau
│   └── utils/
│       ├── archiveManager.ts            ✨ Nouveau
│       └── archiveManager.test.ts       ✨ Nouveau (Tests)
│
├── server/
│   └── archiveServer.ts                 ✨ Nouveau (Backend)
│
└── ARCHIVAGE.md                         ✨ Nouveau (Documentation)
```

## 🔄 Architecture globale

```
┌─────────────────────────────────────┐
│     Interface Utilisateur (React)   │
│     - ArchiveManager.tsx            │
│     - Sélection client              │
│     - Upload de fichiers            │
│     - Recherche/Filtrage            │
└──────────────┬──────────────────────┘
               │
               │ Communication API
               ▼
┌─────────────────────────────────────┐
│   Client API (archiveApiClient.ts)  │
│   - ArchiveApiClient class          │
│   - useArchiveApi hook              │
└──────────────┬──────────────────────┘
               │
               │ HTTP Requests
               ▼
┌─────────────────────────────────────┐
│   Backend API (Express.js)          │
│   - archiveServer.ts                │
│   - Gestion des fichiers            │
│   - MongoDB persistence             │
└──────────────┬──────────────────────┘
               │
               │
               ▼
     ┌──────────────────────┐
     │    MongoDB Database  │
     │  + Système Fichiers  │
     └──────────────────────┘
```

## 💾 Cas d'utilisation

### Scénario 1 : Utilisateur crée un nouveau client

```javascript
// Frontend
const archive = createClientFolder('EEC');
// Résultat: Archive créée avec ID unique "eec-1719756234abc"
// Dossier créé: /archives/eec-1719756234abc/
```

### Scénario 2 : Utilisateur scanne et archive un document

```javascript
// Utilisateur upload une facture PDF
// 1. Sélectionne le client "EEC" dans le dropdown
// 2. Clique sur "📤 Sélectionner des fichiers"
// 3. Choisit "facture-001.pdf"
// 4. Le système crée automatiquement:
//    - Document ID unique
//    - Enregistrement en base de données
//    - Stockage du fichier dans /uploads/archives/eec-1719756234abc/
```

### Scénario 3 : Utilisateur retrouve un document

```javascript
// Utilisateur search "facture"
// Système filtre et affiche tous les documents contenant "facture"
// Peut télécharger, supprimer, ou voir les détails
```

## 🔐 Sécurité

### Recommandations pour la production

1. **Authentification** : Ajouter JWT ou OAuth
2. **Autorisation** : Vérifier que l'utilisateur a accès au client
3. **HTTPS** : Utiliser SSL/TLS
4. **Limite de taille** : Configuration (actuellement 50 MB)
5. **Antivirus** : Scanner les fichiers uploadés
6. **Chiffrement** : Chiffrer les données sensibles
7. **Audit** : Logger tous les accès

## 📊 Statistiques disponibles

Le système génère automatiquement :
- ✅ Nombre total de clients avec archives
- ✅ Nombre total de documents archivés
- ✅ Stockage total utilisé
- ✅ Distribution des documents par client
- ✅ Nombre de téléchargements par document

## 🧪 Tests

Exécuter les tests unitaires :

```bash
npm test
```

Tests couverts :
- ✅ Création de dossiers clients
- ✅ Ajout de documents
- ✅ Formatage des tailles
- ✅ Recherche et filtrage
- ✅ Statistiques

## 🎨 Personnalisation

### Ajouter une nouvelle catégorie

Éditer `ArchiveManager.tsx` :

```typescript
const categories = [
  'Facture',
  'Devis',
  'Reçu',
  'Contrat',
  'Rapport',
  'Justificatif',
  'Autre',
  '👉 VOTRE_CATEGORIE_ICI 👈'
];
```

### Modifier les couleurs/styles

Les styles sont définis à la fin de `ArchiveManager.tsx` :

```typescript
const styles: Record<string, React.CSSProperties> = {
  container: { /* votre CSS */ },
  // ... autres styles
};
```

## 🐛 Dépannage

### Problème : Les documents disparaissent après rechargement

**Cause** : Vous utilisez le mode frontend uniquement (state React)
**Solution** : Mettre en place le backend avec MongoDB pour la persistance

### Problème : Les fichiers ne s'uploadent pas

**Causes possibles** :
- Client non sélectionné → Sélectionner un client d'abord
- Fichier trop volumineux → Vérifier la limite (50 MB)
- Type de fichier non accepté → Utiliser PDF, images, documents Office
- Serveur backend non lancé → Démarrer le serveur API

### Problème : Connexion MongoDB refusée

**Solution** :
```bash
# Vérifier que MongoDB est en cours d'exécution
mongod

# Ou vérifier la connexion MongoDB Atlas
# Vérifier la chaîne de connexion dans .env
```

## 📈 Évolutions futures

- [ ] Supprimer des documents avec confirmation
- [ ] Télécharger toutes les archives en ZIP
- [ ] Partage sécurisé avec permissions
- [ ] Historique des modifications
- [ ] OCR et recherche dans les PDFs
- [ ] Archivage automatique (vieux documents)
- [ ] Notifications pour documents importants
- [ ] Sauvegarde cloud (AWS S3, Google Cloud)
- [ ] Versioning des documents
- [ ] Workflow d'approbation
- [ ] Signatures numériques
- [ ] Audit trail complet

## 📚 Ressources

- [Documentation complète](./ARCHIVAGE.md)
- [API Reference](./server/archiveServer.ts)
- [Tests unitaires](./src/utils/archiveManager.test.ts)

## 💬 Support

Pour plus d'informations ou pour des personnalisations spécifiques, consultez :
- La documentation détaillée dans `ARCHIVAGE.md`
- Les commentaires du code source
- Les exemples d'intégration API

## ✨ Résumé

Vous avez maintenant :
- ✅ Un système d'archivage par client opérationnel
- ✅ Interface utilisateur complète et intuitive
- ✅ API backend prête pour la production
- ✅ Recherche et filtrage avancés
- ✅ Statistiques en temps réel
- ✅ Tests unitaires complets
- ✅ Documentation complète

**Félicitations ! 🎉**

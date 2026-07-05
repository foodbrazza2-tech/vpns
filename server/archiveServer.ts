/**
 * Backend API Server - Gestion de l'archivage avec Express.js
 * 
 * Installation dépendances:
 * npm install express multer mongoose dotenv cors
 */

import express, { Express, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();

// Configuration middleware
app.use(cors());
app.use(express.json());

// Configuration multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const clientId = req.params.clientId;
    const uploadDir = path.join(process.cwd(), 'uploads', 'archives', clientId);

    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique avec timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
  fileFilter: (req, file, cb) => {
    // Accepter les types de fichiers courants
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non accepté: ${file.mimetype}`));
    }
  },
});

// Connexion MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vpns-archives';

mongoose
  .connect(mongoUri)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch((err) => console.error('❌ Erreur MongoDB:', err));

// Schémas MongoDB

// Schéma Client Archive
const clientArchiveSchema = new mongoose.Schema({
  clientId: { type: String, unique: true, required: true },
  clientName: { type: String, required: true },
  folderPath: { type: String, required: true },
  createdDate: { type: Date, default: Date.now },
  lastModified: { type: Date, default: Date.now },
  documentCount: { type: Number, default: 0 },
  metadata: {
    description: String,
    tags: [String],
  },
});

// Schéma Archived Document
const archivedDocumentSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  clientId: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  fileStoragePath: { type: String, required: true }, // Chemin physique sur le serveur
  uploadDate: { type: Date, default: Date.now },
  category: { type: String, enum: ['Facture', 'Devis', 'Reçu', 'Contrat', 'Rapport', 'Justificatif', 'Autre'] },
  description: String,
  tags: [String],
  uploadedBy: String, // Email ou ID de l'utilisateur
  downloadCount: { type: Number, default: 0 },
});

const ClientArchive = mongoose.model('ClientArchive', clientArchiveSchema);
const ArchivedDocument = mongoose.model('ArchivedDocument', archivedDocumentSchema);

// Routes API

/**
 * Créer une archive pour un nouveau client
 * POST /api/archives
 */
app.post('/api/archives', async (req: Request, res: Response) => {
  try {
    const { clientId, clientName } = req.body;

    const archiveDir = path.join(process.cwd(), 'uploads', 'archives', clientId);
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const archive = new ClientArchive({
      clientId,
      clientName,
      folderPath: `/archives/${clientId}`,
    });

    await archive.save();
    res.status(201).json(archive);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * Upload un document
 * POST /api/archives/:clientId/documents
 */
app.post(
  '/api/archives/:clientId/documents',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const { category, description, tags } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier fourni' });
      }

      // Générer un ID unique
      const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const doc = new ArchivedDocument({
        id: documentId,
        clientId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        fileStoragePath: req.file.path,
        category: category || 'Autre',
        description,
        tags: tags ? JSON.parse(tags) : [],
        uploadedBy: req.body.uploadedBy || 'system',
      });

      await doc.save();

      // Mettre à jour le compteur de documents du client
      await ClientArchive.findOneAndUpdate({ clientId }, { $inc: { documentCount: 1 }, lastModified: new Date() });

      res.status(201).json(doc);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
);

/**
 * Récupérer tous les documents d'un client
 * GET /api/archives/:clientId/documents
 */
app.get('/api/archives/:clientId/documents', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { category, search } = req.query;

    let query: any = { clientId };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { fileName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const documents = await ArchivedDocument.find(query).sort({ uploadDate: -1 });
    res.json(documents);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * Récupérer un document spécifique
 * GET /api/archives/:clientId/documents/:docId
 */
app.get('/api/archives/:clientId/documents/:docId', async (req: Request, res: Response) => {
  try {
    const { clientId, docId } = req.params;
    const doc = await ArchivedDocument.findOne({ id: docId, clientId });

    if (!doc) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    // Incrémenter le compteur de téléchargement
    doc.downloadCount += 1;
    await doc.save();

    // Télécharger le fichier
    res.download(doc.fileStoragePath, doc.fileName);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * Supprimer un document
 * DELETE /api/archives/:clientId/documents/:docId
 */
app.delete('/api/archives/:clientId/documents/:docId', async (req: Request, res: Response) => {
  try {
    const { clientId, docId } = req.params;
    const doc = await ArchivedDocument.findOneAndDelete({ id: docId, clientId });

    if (!doc) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    // Supprimer le fichier physique
    if (fs.existsSync(doc.fileStoragePath)) {
      fs.unlinkSync(doc.fileStoragePath);
    }

    // Mettre à jour le compteur de documents du client
    await ClientArchive.findOneAndUpdate({ clientId }, { $inc: { documentCount: -1 }, lastModified: new Date() });

    res.json({ success: true, message: 'Document supprimé' });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * Récupérer les statistiques d'archives
 * GET /api/archives/stats
 */
app.get('/api/archives/stats', async (req: Request, res: Response) => {
  try {
    const totalClients = await ClientArchive.countDocuments();
    const totalDocuments = await ArchivedDocument.countDocuments();
    const allDocs = await ArchivedDocument.find();

    const totalStorageUsed = allDocs.reduce((sum, doc) => sum + doc.fileSize, 0);

    const documentsPerClient: Record<string, number> = {};
    const clients = await ClientArchive.find();

    for (const client of clients) {
      const count = await ArchivedDocument.countDocuments({ clientId: client.clientId });
      documentsPerClient[client.clientId] = count;
    }

    res.json({
      totalClients,
      totalDocuments,
      totalStorageUsed,
      documentsPerClient,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * Récupérer toutes les archives clients
 * GET /api/archives
 */
app.get('/api/archives', async (req: Request, res: Response) => {
  try {
    const archives = await ClientArchive.find().sort({ createdDate: -1 });
    res.json(archives);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * Mettre à jour une archive client
 * PATCH /api/archives/:clientId
 */
app.patch('/api/archives/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const updates = req.body;

    const archive = await ClientArchive.findOneAndUpdate({ clientId }, { ...updates, lastModified: new Date() }, {
      new: true,
    });

    if (!archive) {
      return res.status(404).json({ error: 'Archive non trouvée' });
    }

    res.json(archive);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Gestion des erreurs
app.use((err: any, req: Request, res: Response) => {
  console.error('❌ Erreur:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur',
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Serveur archivage lancé sur http://localhost:${PORT}`);
});

export default app;

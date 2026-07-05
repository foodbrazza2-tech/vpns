import { describe, it, expect } from 'vitest';
import {
  createClientFolder,
  addDocumentToArchive,
  formatFileSize,
  filterDocumentsByCategory,
  filterDocumentsByTags,
  searchDocuments,
  generateArchiveStats,
} from './archiveManager';

describe('Archive Manager', () => {
  describe('createClientFolder', () => {
    it('crée un dossier client avec un ID unique', () => {
      const archive = createClientFolder('EEC');
      expect(archive.clientName).toBe('EEC');
      expect(archive.clientId).toContain('eec');
      expect(archive.folderPath).toContain('/archives/');
      expect(archive.documentCount).toBe(0);
    });

    it('génère des IDs différents pour des clients différents', () => {
      const archive1 = createClientFolder('Client A');
      const archive2 = createClientFolder('Client B');
      expect(archive1.clientId).not.toBe(archive2.clientId);
    });
  });

  describe('addDocumentToArchive', () => {
    it('ajoute un document avec les bonnes propriétés', () => {
      const doc = addDocumentToArchive(
        'client-001',
        'facture.pdf',
        1024,
        'application/pdf',
        'Facture',
        'Facture du mois',
        ['important']
      );

      expect(doc.clientId).toBe('client-001');
      expect(doc.fileName).toBe('facture.pdf');
      expect(doc.fileSize).toBe(1024);
      expect(doc.fileType).toBe('application/pdf');
      expect(doc.category).toBe('Facture');
      expect(doc.description).toBe('Facture du mois');
      expect(doc.tags).toContain('important');
    });

    it('génère un ID unique pour chaque document', () => {
      const doc1 = addDocumentToArchive(
        'client-001',
        'file1.pdf',
        1024,
        'application/pdf',
        'Facture'
      );
      const doc2 = addDocumentToArchive(
        'client-001',
        'file2.pdf',
        2048,
        'application/pdf',
        'Facture'
      );

      expect(doc1.id).not.toBe(doc2.id);
    });
  });

  describe('formatFileSize', () => {
    it('formate les tailles de fichier correctement', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('gère les tailles décimales', () => {
      expect(formatFileSize(512)).toBe('0.5 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('filterDocumentsByCategory', () => {
    it('filtre les documents par catégorie', () => {
      const documents = [
        addDocumentToArchive('c1', 'f1.pdf', 100, 'pdf', 'Facture'),
        addDocumentToArchive('c1', 'f2.pdf', 100, 'pdf', 'Devis'),
        addDocumentToArchive('c1', 'f3.pdf', 100, 'pdf', 'Facture'),
      ];

      const facturesOnly = filterDocumentsByCategory(documents, 'Facture');
      expect(facturesOnly).toHaveLength(2);
      expect(facturesOnly.every((d) => d.category === 'Facture')).toBe(true);
    });

    it('retourne un tableau vide si aucun document ne correspond', () => {
      const documents = [
        addDocumentToArchive('c1', 'f1.pdf', 100, 'pdf', 'Facture'),
      ];

      const result = filterDocumentsByCategory(documents, 'Contrat');
      expect(result).toHaveLength(0);
    });
  });

  describe('filterDocumentsByTags', () => {
    it('filtre les documents par tags', () => {
      const documents = [
        addDocumentToArchive('c1', 'f1.pdf', 100, 'pdf', 'Facture', '', [
          'urgent',
          'client-a',
        ]),
        addDocumentToArchive('c1', 'f2.pdf', 100, 'pdf', 'Facture', '', [
          'client-b',
        ]),
        addDocumentToArchive('c1', 'f3.pdf', 100, 'pdf', 'Facture', '', [
          'urgent',
        ]),
      ];

      const urgentDocs = filterDocumentsByTags(documents, ['urgent']);
      expect(urgentDocs).toHaveLength(2);
    });
  });

  describe('searchDocuments', () => {
    it('recherche des documents par nom', () => {
      const documents = [
        addDocumentToArchive('c1', 'facture-001.pdf', 100, 'pdf', 'Facture'),
        addDocumentToArchive('c1', 'rapport-001.pdf', 100, 'pdf', 'Rapport'),
      ];

      const result = searchDocuments(documents, 'facture');
      expect(result).toHaveLength(1);
      expect(result[0].fileName).toContain('facture');
    });

    it('recherche des documents par description', () => {
      const documents = [
        addDocumentToArchive(
          'c1',
          'doc1.pdf',
          100,
          'pdf',
          'Facture',
          'Facture importante'
        ),
        addDocumentToArchive('c1', 'doc2.pdf', 100, 'pdf', 'Rapport', 'Rapport'),
      ];

      const result = searchDocuments(documents, 'importante');
      expect(result).toHaveLength(1);
    });

    it('recherche des documents par tags', () => {
      const documents = [
        addDocumentToArchive('c1', 'doc1.pdf', 100, 'pdf', 'Facture', '', [
          'client-eec',
        ]),
        addDocumentToArchive('c1', 'doc2.pdf', 100, 'pdf', 'Rapport', ''),
      ];

      const result = searchDocuments(documents, 'eec');
      expect(result).toHaveLength(1);
    });
  });

  describe('generateArchiveStats', () => {
    it('génère des statistiques correctes', () => {
      const archives = [
        createClientFolder('Client A'),
        createClientFolder('Client B'),
      ];

      const documents = [
        addDocumentToArchive(archives[0].clientId, 'f1.pdf', 1000, 'pdf', 'Facture'),
        addDocumentToArchive(archives[0].clientId, 'f2.pdf', 2000, 'pdf', 'Facture'),
        addDocumentToArchive(archives[1].clientId, 'f3.pdf', 3000, 'pdf', 'Facture'),
      ];

      const stats = generateArchiveStats(archives, documents);

      expect(stats.totalClients).toBe(2);
      expect(stats.totalDocuments).toBe(3);
      expect(stats.totalStorageUsed).toBe(6000);
      expect(stats.documentsPerClient[archives[0].clientId]).toBe(2);
      expect(stats.documentsPerClient[archives[1].clientId]).toBe(1);
    });
  });
});

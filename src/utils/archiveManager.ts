/**
 * Archive Manager - Gestion de l'archivage des documents par client
 */

export interface ClientArchive {
  clientId: string;
  clientName: string;
  folderPath: string;
  createdDate: string;
  lastModified: string;
  documentCount: number;
}

export interface ArchivedDocument {
  id: string;
  clientId: string;
  fileName: string;
  fileSize: number; // en bytes
  fileType: string;
  uploadDate: string;
  category: string; // Facture, Devis, Reçu, Contrat, etc.
  description?: string;
  tags?: string[];
}

export interface ArchiveStats {
  totalClients: number;
  totalDocuments: number;
  totalStorageUsed: number; // en bytes
  documentsPerClient: Record<string, number>;
}

/**
 * Crée une structure de dossier pour un nouveau client
 */
export function createClientFolder(clientName: string): ClientArchive {
  const clientId = generateClientId(clientName);
  const folderPath = `/archives/${clientId}`;
  const now = new Date().toISOString();

  return {
    clientId,
    clientName,
    folderPath,
    createdDate: now,
    lastModified: now,
    documentCount: 0,
  };
}

/**
 * Génère un ID unique pour un client
 */
function generateClientId(clientName: string): string {
  const normalized = clientName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
  const timestamp = Date.now().toString(36);
  return `${normalized}-${timestamp}`;
}

/**
 * Ajoute un document à l'archive d'un client
 */
export function addDocumentToArchive(
  clientId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  category: string,
  description?: string,
  tags?: string[]
): ArchivedDocument {
  const documentId = generateDocumentId();
  const now = new Date().toISOString();

  return {
    id: documentId,
    clientId,
    fileName,
    fileSize,
    fileType,
    uploadDate: now,
    category,
    description,
    tags: tags || [],
  };
}

/**
 * Génère un ID unique pour un document
 */
function generateDocumentId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Formate la taille d'un fichier en format lisible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.round(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Filtre les documents par catégorie
 */
export function filterDocumentsByCategory(
  documents: ArchivedDocument[],
  category: string
): ArchivedDocument[] {
  return documents.filter((doc) => doc.category === category);
}

/**
 * Filtre les documents par tags
 */
export function filterDocumentsByTags(
  documents: ArchivedDocument[],
  tags: string[]
): ArchivedDocument[] {
  return documents.filter((doc) =>
    tags.some((tag) => doc.tags?.includes(tag))
  );
}

/**
 * Recherche des documents par nom
 */
export function searchDocuments(
  documents: ArchivedDocument[],
  query: string
): ArchivedDocument[] {
  const lowerQuery = query.toLowerCase();
  return documents.filter((doc) =>
    doc.fileName.toLowerCase().includes(lowerQuery) ||
    doc.description?.toLowerCase().includes(lowerQuery) ||
    doc.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Génère des statistiques d'archive
 */
export function generateArchiveStats(
  archives: ClientArchive[],
  allDocuments: ArchivedDocument[]
): ArchiveStats {
  const totalDocuments = allDocuments.length;
  const totalStorageUsed = allDocuments.reduce((sum, doc) => sum + doc.fileSize, 0);
  const documentsPerClient: Record<string, number> = {};

  archives.forEach((archive) => {
    documentsPerClient[archive.clientId] = allDocuments.filter(
      (doc) => doc.clientId === archive.clientId
    ).length;
  });

  return {
    totalClients: archives.length,
    totalDocuments,
    totalStorageUsed,
    documentsPerClient,
  };
}

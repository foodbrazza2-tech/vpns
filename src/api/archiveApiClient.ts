/**
 * Archive API Client - Communication avec le serveur d'archivage
 */

import React from 'react';
import FileService from '../services/fileService';
import ArchiveSupabaseService from '../services/archiveSupabaseService';
import type { ClientArchive, ArchivedDocument } from '../utils/archiveManager';

export class ArchiveApiClient {
  /**
   * Créer une nouvelle archive pour un client
   */
  static async createArchive(clientId: string, clientName: string): Promise<ClientArchive> {
    return ArchiveSupabaseService.createArchive(clientId, clientName);
  }

  /**
   * Récupérer toutes les archives
   */
  static async getArchives(): Promise<ClientArchive[]> {
    return ArchiveSupabaseService.getArchives();
  }

  /**
   * Mettre à jour une archive
   */
  static async updateArchive(clientId: string, data: Partial<ClientArchive>): Promise<ClientArchive> {
    if (data.clientName) {
      return ArchiveSupabaseService.createArchive(clientId, data.clientName);
    }

    const existing = await ArchiveSupabaseService.getArchives();
    const archive = existing.find((item) => item.clientId === clientId);
    if (!archive) {
      throw new Error('Archive introuvable');
    }
    return archive;
  }

  /**
   * Uploader un document
   */
  static async uploadDocument(
    clientId: string,
    file: File,
    category: string,
    description?: string,
    tags?: string[],
    uploadedBy?: string
  ): Promise<ArchivedDocument> {
    const validation = FileService.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    return ArchiveSupabaseService.uploadDocument(clientId, file, category, description, tags);
  }

  /**
   * Uploader plusieurs documents
   */
  static async uploadMultipleDocuments(
    clientId: string,
    files: File[],
    category: string,
    uploadedBy?: string
  ): Promise<ArchivedDocument[]> {
    const uploadPromises = files.map((file) =>
      this.uploadDocument(clientId, file, category, undefined, undefined, uploadedBy)
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Récupérer tous les documents d'un client
   */
  static async getClientDocuments(clientId: string, filters?: { category?: string; search?: string }): Promise<ArchivedDocument[]> {
    return ArchiveSupabaseService.getClientDocuments(clientId, filters);
  }

  /**
   * Récupérer un document spécifique
   */
  static async getDocument(clientId: string, docId: string): Promise<ArchivedDocument> {
    const docs = await ArchiveSupabaseService.getClientDocuments(clientId);
    const target = docs.find((doc) => doc.id === docId);
    if (!target) {
      throw new Error('Document non trouve');
    }
    return target;
  }

  /**
   * Télécharger un document
   */
  static async downloadDocument(clientId: string, docId: string, fileName: string): Promise<void> {
    const { blob, fileName: sourceFileName } = await ArchiveSupabaseService.downloadDocument(clientId, docId);
    FileService.downloadFile(blob, fileName || sourceFileName);
  }

  /**
   * Supprimer un document
   */
  static async deleteDocument(clientId: string, docId: string): Promise<void> {
    await ArchiveSupabaseService.deleteDocument(clientId, docId);
  }

  /**
   * Récupérer les statistiques d'archives
   */
  static async getArchiveStats(): Promise<{
    totalClients: number;
    totalDocuments: number;
    totalStorageUsed: number;
    documentsPerClient: Record<string, number>;
  }> {
    return ArchiveSupabaseService.getArchiveStats();
  }
}

/**
 * Hook React pour gérer l'état des archives avec le serveur
 */
export function useArchiveApi() {
  const [archives, setArchives] = React.useState<ClientArchive[]>([]);
  const [documents, setDocuments] = React.useState<ArchivedDocument[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadArchives = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ArchiveApiClient.getArchives();
      setArchives(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadClientDocuments = async (clientId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await ArchiveApiClient.getClientDocuments(clientId);
      setDocuments(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (
    clientId: string,
    file: File,
    category: string,
    description?: string,
    tags?: string[]
  ) => {
    try {
      setLoading(true);
      setError(null);
      const doc = await ArchiveApiClient.uploadDocument(clientId, file, category, description, tags);
      setDocuments((prev) => [...prev, doc]);
      return doc;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteDoc = async (clientId: string, docId: string) => {
    try {
      setLoading(true);
      setError(null);
      await ArchiveApiClient.deleteDocument(clientId, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadArchives();
  }, []);

  return {
    archives,
    documents,
    loading,
    error,
    loadArchives,
    loadClientDocuments,
    uploadFile,
    deleteDoc,
  };
}

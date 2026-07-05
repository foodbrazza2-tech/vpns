/**
 * Archive API Client - Communication avec le serveur d'archivage
 */

import type { ClientArchive, ArchivedDocument } from '../utils/archiveManager';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export class ArchiveApiClient {
  /**
   * Créer une nouvelle archive pour un client
   */
  static async createArchive(clientId: string, clientName: string): Promise<ClientArchive> {
    const response = await fetch(`${API_BASE_URL}/archives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientName }),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la création de l\'archive');
    }

    return response.json();
  }

  /**
   * Récupérer toutes les archives
   */
  static async getArchives(): Promise<ClientArchive[]> {
    const response = await fetch(`${API_BASE_URL}/archives`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des archives');
    }

    return response.json();
  }

  /**
   * Mettre à jour une archive
   */
  static async updateArchive(clientId: string, data: Partial<ClientArchive>): Promise<ClientArchive> {
    const response = await fetch(`${API_BASE_URL}/archives/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la mise à jour de l\'archive');
    }

    return response.json();
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
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (description) formData.append('description', description);
    if (tags) formData.append('tags', JSON.stringify(tags));
    if (uploadedBy) formData.append('uploadedBy', uploadedBy);

    const response = await fetch(`${API_BASE_URL}/archives/${clientId}/documents`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Erreur lors de l\'upload du document');
    }

    return response.json();
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
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString();
    const url = `${API_BASE_URL}/archives/${clientId}/documents${query ? '?' + query : ''}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des documents');
    }

    return response.json();
  }

  /**
   * Récupérer un document spécifique
   */
  static async getDocument(clientId: string, docId: string): Promise<ArchivedDocument> {
    const response = await fetch(`${API_BASE_URL}/archives/${clientId}/documents/${docId}`);

    if (!response.ok) {
      throw new Error('Document non trouvé');
    }

    return response.json();
  }

  /**
   * Télécharger un document
   */
  static async downloadDocument(clientId: string, docId: string, fileName: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/archives/${clientId}/documents/${docId}`);

    if (!response.ok) {
      throw new Error('Erreur lors du téléchargement');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Supprimer un document
   */
  static async deleteDocument(clientId: string, docId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/archives/${clientId}/documents/${docId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la suppression du document');
    }
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
    const response = await fetch(`${API_BASE_URL}/archives/stats`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des statistiques');
    }

    return response.json();
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

// Import React pour le hook
import React from 'react';

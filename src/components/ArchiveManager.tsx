import { useState, useEffect, ChangeEvent } from 'react';
import { ArchiveApiClient } from '../api/archiveApiClient';
import {
  ClientArchive,
  ArchivedDocument,
  formatFileSize,
  filterDocumentsByCategory,
  searchDocuments,
  generateArchiveStats,
} from '../utils/archiveManager';

interface ArchiveManagerProps {
  clients: Array<{ id: string; name: string }>;
  onNotify: (message: string, type?: 'success' | 'info' | 'error') => void;
}

// Toutes les erreurs remontent via onNotify (toast), le meme canal que le reste de
// l'app - un seul mecanisme d'affichage d'erreur au lieu de deux (toast + banniere).
export function ArchiveManager({ clients, onNotify: notify }: ArchiveManagerProps) {
  const [archives, setArchives] = useState<ClientArchive[]>([]);
  const [documents, setDocuments] = useState<ArchivedDocument[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newClientName, setNewClientName] = useState('');

  const categories = ['Facture', 'Devis', 'Reçu', 'Contrat', 'Rapport', 'Justificatif', 'Autre'];

  useEffect(() => {
    const loadArchives = async () => {
      try {
        setIsLoading(true);
        const loadedArchives = await ArchiveApiClient.getArchives();
        setArchives(loadedArchives);
      } catch (err) {
        notify((err as Error).message || 'Impossible de charger les archives', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadArchives();
  }, []);

  useEffect(() => {
    const syncClientArchives = async () => {
      if (clients.length === 0) {
        return;
      }

      const existingByName = new Set(archives.map((archive) => archive.clientName));
      const missingClients = clients.filter((client) => !existingByName.has(client.name));

      if (missingClients.length === 0) {
        return;
      }

      try {
        setIsLoading(true);
        await Promise.all(
          missingClients.map((client) => ArchiveApiClient.createArchive(client.id, client.name))
        );
        const refreshed = await ArchiveApiClient.getArchives();
        setArchives(refreshed);
      } catch (err) {
        notify((err as Error).message || 'Impossible de synchroniser les archives clients', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    syncClientArchives();
  }, [clients, archives]);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!selectedClient) {
        setDocuments([]);
        return;
      }

      try {
        setIsLoading(true);
        const loadedDocs = await ArchiveApiClient.getClientDocuments(selectedClient);
        setDocuments(loadedDocs);
      } catch (err) {
        notify((err as Error).message || 'Impossible de charger les documents', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [selectedClient]);

  const createClientId = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .concat(`-${Date.now().toString(36)}`);
  };

  const handleCreateArchive = async () => {
    const normalizedName = newClientName.trim();
    if (!normalizedName) {
      notify('Le nom client est requis', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const archive = await ArchiveApiClient.createArchive(createClientId(normalizedName), normalizedName);
      const refreshed = await ArchiveApiClient.getArchives();
      setArchives(refreshed);
      setSelectedClient(archive.clientId);
      setNewClientName('');
    } catch (err) {
      notify((err as Error).message || 'Impossible de creer ce client', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedClient) {
      notify('Veuillez selectionner un client avant d\'ajouter des fichiers.', 'error');
      return;
    }

    setIsUploading(true);
    const totalFiles = files.length;
    let uploadedFiles = 0;

    try {
      for (const file of Array.from(files)) {
        await ArchiveApiClient.uploadDocument(selectedClient, file, 'Autre');
        uploadedFiles += 1;
        setUploadProgress(Math.round((uploadedFiles / totalFiles) * 100));
      }

      const [updatedDocs, updatedArchives] = await Promise.all([
        ArchiveApiClient.getClientDocuments(selectedClient),
        ArchiveApiClient.getArchives(),
      ]);

      setDocuments(updatedDocs);
      setArchives(updatedArchives);
      notify(`${totalFiles} document(s) archive(s) avec succes.`);
    } catch (err) {
      notify((err as Error).message || 'Echec upload', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const filteredDocuments = (() => {
    let result = documents.filter((doc) => !selectedClient || doc.clientId === selectedClient);

    if (selectedCategory) {
      result = filterDocumentsByCategory(result, selectedCategory);
    }

    if (searchQuery) {
      result = searchDocuments(result, searchQuery);
    }

    return result;
  })();

  const selectedClientData = archives.find((archive) => archive.clientId === selectedClient);
  const stats = generateArchiveStats(archives, documents);

  return (
    <div className="archive-manager">
      <div className="archive-toolbar">
        <div>
          <h3>Archivage intelligent</h3>
          <p>Centralisez les pièces justificatives par client.</p>
        </div>
        <div className="archive-chip">Compatible OHADA</div>
      </div>

      <div className="archive-stats">
        <div className="archive-stat-card">
          <span>Total clients</span>
          <strong>{stats.totalClients}</strong>
        </div>
        <div className="archive-stat-card">
          <span>Total documents</span>
          <strong>{stats.totalDocuments}</strong>
        </div>
        <div className="archive-stat-card">
          <span>Stockage utilisé</span>
          <strong>{formatFileSize(stats.totalStorageUsed)}</strong>
        </div>
      </div>

      <div className="archive-upload-card">
        <div className="archive-form">
          <input
            type="text"
            value={newClientName}
            onChange={(event) => setNewClientName(event.target.value)}
            placeholder="Nom du client a archiver"
          />
          <button type="button" className="archive-file-label" onClick={handleCreateArchive} disabled={isLoading}>
            + Creer dossier client
          </button>

          <select value={selectedClient} onChange={(event) => setSelectedClient(event.target.value)}>
            <option value="">-- Sélectionner un client --</option>
            {archives.map((archive) => (
              <option key={archive.clientId} value={archive.clientId}>
                {archive.clientName}
              </option>
            ))}
          </select>

          <label className="archive-file-label">
            📤 Ajouter des fichiers
            <input className="archive-file-input" type="file" multiple onChange={handleFileUpload} disabled={!selectedClient || isUploading} />
          </label>
        </div>

        {isUploading && <div className="upload-box">Téléversement en cours… {uploadProgress}%</div>}
        {isLoading && <div className="upload-box">Chargement des donnees...</div>}
      </div>

      <div className="archive-section-card">
        <div className="panel-top">
          <h4>Archives des clients</h4>
          <span>{archives.length} dossiers</span>
        </div>
        <div className="archive-list">
          {archives.map((archive) => {
            const clientDocCount = documents.filter((document) => document.clientId === archive.clientId).length;

            return (
              <div key={archive.clientId} className="archive-list-item" onClick={() => setSelectedClient(archive.clientId)}>
                <div>
                  <strong>{archive.clientName}</strong>
                  <span>{clientDocCount} document{clientDocCount > 1 ? 's' : ''}</span>
                </div>
                <span>{new Date(archive.createdDate).toLocaleDateString('fr-FR')}</span>
              </div>
            );
          })}
        </div>
      </div>

      {selectedClientData && (
        <div className="archive-section-card">
          <div className="panel-top">
            <h4>Documents de {selectedClientData.clientName}</h4>
            <span>Recherche rapide</span>
          </div>
          <div className="archive-form">
            <input type="text" placeholder="Rechercher un document" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              <option value="">-- Toutes les catégories --</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          {filteredDocuments.length > 0 ? (
            <div className="archive-list">
              {filteredDocuments.map((document) => (
                <div key={document.id} className="archive-list-item">
                  <div>
                    <strong>{document.fileName}</strong>
                    <span>{document.category} · {formatFileSize(document.fileSize)}</span>
                  </div>
                  <span>{new Date(document.uploadDate).toLocaleDateString('fr-FR')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="archive-empty">Aucun document pour ce client pour le moment.</div>
          )}
        </div>
      )}
    </div>
  );
}

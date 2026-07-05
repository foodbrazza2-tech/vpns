import { useState, useEffect, ChangeEvent } from 'react';
import {
  ClientArchive,
  ArchivedDocument,
  createClientFolder,
  addDocumentToArchive,
  formatFileSize,
  filterDocumentsByCategory,
  searchDocuments,
  generateArchiveStats,
} from '../utils/archiveManager';

interface ArchiveManagerProps {
  clients: Array<{ id: string; name: string }>;
}

export function ArchiveManager({ clients }: ArchiveManagerProps) {
  const [archives, setArchives] = useState<ClientArchive[]>([]);
  const [documents, setDocuments] = useState<ArchivedDocument[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const categories = ['Facture', 'Devis', 'Reçu', 'Contrat', 'Rapport', 'Justificatif', 'Autre'];

  useEffect(() => {
    setArchives((prev) => {
      return clients.map((client) => {
        const existingArchive = prev.find((archive) => archive.clientName === client.name);
        return existingArchive || createClientFolder(client.name);
      });
    });
  }, [clients]);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedClient) {
      window.alert('Veuillez sélectionner un client');
      return;
    }

    setIsUploading(true);
    const totalFiles = files.length;
    let uploadedFiles = 0;

    Array.from(files).forEach((file) => {
      setTimeout(() => {
        const newDocument = addDocumentToArchive(
          selectedClient,
          file.name,
          file.size,
          file.type || 'application/octet-stream',
          'Autre'
        );

        setDocuments((prev) => [...prev, newDocument]);
        setArchives((prev) =>
          prev.map((archive) =>
            archive.clientId === selectedClient
              ? {
                  ...archive,
                  documentCount: archive.documentCount + 1,
                  lastModified: new Date().toISOString(),
                }
              : archive
          )
        );

        uploadedFiles += 1;
        setUploadProgress(Math.round((uploadedFiles / totalFiles) * 100));

        if (uploadedFiles === totalFiles) {
          setIsUploading(false);
          setUploadProgress(0);
          window.alert(`${totalFiles} document(s) archivé(s) avec succès !`);
        }
      }, 300);
    });
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

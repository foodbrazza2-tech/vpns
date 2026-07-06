import { supabase } from './authService';
import type { ClientArchive, ArchivedDocument } from '../utils/archiveManager';

const ARCHIVES_TABLE = 'client_archives';
const DOCUMENTS_TABLE = 'archive_documents';
const ARCHIVE_BUCKET = import.meta.env.VITE_SUPABASE_ARCHIVE_BUCKET || 'archives';

type DbArchiveRow = {
  client_id: string;
  client_name: string;
  folder_path: string;
  created_at: string;
  updated_at: string;
  document_count: number;
};

type DbDocumentRow = {
  id: string;
  client_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  upload_date: string;
  category: string;
  description: string | null;
  tags: string[] | null;
  storage_path: string;
  storage_bucket: string;
  uploaded_by: string | null;
};

function mapArchiveRow(row: DbArchiveRow): ClientArchive {
  return {
    clientId: row.client_id,
    clientName: row.client_name,
    folderPath: row.folder_path,
    createdDate: row.created_at,
    lastModified: row.updated_at,
    documentCount: row.document_count || 0,
  };
}

function mapDocumentRow(row: DbDocumentRow): ArchivedDocument {
  return {
    id: row.id,
    clientId: row.client_id,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileType: row.file_type,
    uploadDate: row.upload_date,
    category: row.category,
    description: row.description || undefined,
    tags: row.tags || [],
  };
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export class ArchiveSupabaseService {
  static async getArchives(): Promise<ClientArchive[]> {
    const { data, error } = await supabase
      .from(ARCHIVES_TABLE)
      .select('client_id, client_name, folder_path, created_at, updated_at, document_count')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erreur de chargement des archives: ${error.message}`);
    }

    return (data || []).map((row) => mapArchiveRow(row as DbArchiveRow));
  }

  static async createArchive(clientId: string, clientName: string): Promise<ClientArchive> {
    const now = new Date().toISOString();
    const folderPath = `/archives/${clientId}`;

    const { data, error } = await supabase
      .from(ARCHIVES_TABLE)
      .upsert(
        {
          client_id: clientId,
          client_name: clientName,
          folder_path: folderPath,
          created_at: now,
          updated_at: now,
          document_count: 0,
        },
        { onConflict: 'client_id' }
      )
      .select('client_id, client_name, folder_path, created_at, updated_at, document_count')
      .single();

    if (error || !data) {
      throw new Error(`Erreur de creation de l'archive: ${error?.message || 'inconnue'}`);
    }

    return mapArchiveRow(data as DbArchiveRow);
  }

  static async getClientDocuments(
    clientId: string,
    filters?: { category?: string; search?: string }
  ): Promise<ArchivedDocument[]> {
    let query = supabase
      .from(DOCUMENTS_TABLE)
      .select('id, client_id, file_name, file_size, file_type, upload_date, category, description, tags, storage_path, storage_bucket, uploaded_by')
      .eq('client_id', clientId)
      .order('upload_date', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.search) {
      query = query.or(`file_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erreur de chargement des documents: ${error.message}`);
    }

    return (data || []).map((row) => mapDocumentRow(row as DbDocumentRow));
  }

  static async uploadDocument(
    clientId: string,
    file: File,
    category: string,
    description?: string,
    tags?: string[]
  ): Promise<ArchivedDocument> {
    const timestamp = Date.now();
    const safeName = sanitizeFileName(file.name);
    const storagePath = `${clientId}/${timestamp}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(ARCHIVE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) {
      throw new Error(`Erreur upload storage: ${uploadError.message}`);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const now = new Date().toISOString();
    const { data: row, error: insertError } = await supabase
      .from(DOCUMENTS_TABLE)
      .insert({
        client_id: clientId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || 'application/octet-stream',
        upload_date: now,
        category,
        description: description || null,
        tags: tags || [],
        storage_path: storagePath,
        storage_bucket: ARCHIVE_BUCKET,
        uploaded_by: user?.id || null,
      })
      .select('id, client_id, file_name, file_size, file_type, upload_date, category, description, tags, storage_path, storage_bucket, uploaded_by')
      .single();

    if (insertError || !row) {
      await supabase.storage.from(ARCHIVE_BUCKET).remove([storagePath]);
      throw new Error(`Erreur insertion metadata document: ${insertError?.message || 'inconnue'}`);
    }

    const { data: archiveRow, error: archiveError } = await supabase
      .from(ARCHIVES_TABLE)
      .select('document_count')
      .eq('client_id', clientId)
      .single();

    if (!archiveError && archiveRow) {
      await supabase
        .from(ARCHIVES_TABLE)
        .update({
          updated_at: now,
          document_count: (archiveRow.document_count || 0) + 1,
        })
        .eq('client_id', clientId);
    }

    return mapDocumentRow(row as DbDocumentRow);
  }

  static async deleteDocument(clientId: string, docId: string): Promise<void> {
    const { data: row, error: findError } = await supabase
      .from(DOCUMENTS_TABLE)
      .select('storage_path')
      .eq('id', docId)
      .eq('client_id', clientId)
      .single();

    if (findError || !row) {
      throw new Error(`Document introuvable: ${findError?.message || 'inconnu'}`);
    }

    const { error: dbDeleteError } = await supabase
      .from(DOCUMENTS_TABLE)
      .delete()
      .eq('id', docId)
      .eq('client_id', clientId);

    if (dbDeleteError) {
      throw new Error(`Erreur suppression metadata: ${dbDeleteError.message}`);
    }

    const { error: storageDeleteError } = await supabase
      .storage
      .from(ARCHIVE_BUCKET)
      .remove([row.storage_path]);

    if (storageDeleteError) {
      console.warn('Suppression storage partielle:', storageDeleteError.message);
    }

    const now = new Date().toISOString();
    const { data: archiveRow } = await supabase
      .from(ARCHIVES_TABLE)
      .select('document_count')
      .eq('client_id', clientId)
      .single();

    if (archiveRow) {
      await supabase
        .from(ARCHIVES_TABLE)
        .update({
          updated_at: now,
          document_count: Math.max(0, (archiveRow.document_count || 0) - 1),
        })
        .eq('client_id', clientId);
    }
  }

  static async downloadDocument(clientId: string, docId: string): Promise<{ blob: Blob; fileName: string }> {
    const { data: row, error } = await supabase
      .from(DOCUMENTS_TABLE)
      .select('file_name, storage_path, storage_bucket')
      .eq('id', docId)
      .eq('client_id', clientId)
      .single();

    if (error || !row) {
      throw new Error(`Document introuvable: ${error?.message || 'inconnu'}`);
    }

    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from(row.storage_bucket || ARCHIVE_BUCKET)
      .download(row.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Erreur de telechargement: ${downloadError?.message || 'inconnue'}`);
    }

    return { blob: fileData, fileName: row.file_name };
  }

  static async getArchiveStats(): Promise<{
    totalClients: number;
    totalDocuments: number;
    totalStorageUsed: number;
    documentsPerClient: Record<string, number>;
  }> {
    const [archives, documents] = await Promise.all([
      this.getArchives(),
      supabase
        .from(DOCUMENTS_TABLE)
        .select('client_id, file_size')
        .then((result) => {
          if (result.error) {
            throw new Error(result.error.message);
          }
          return result.data || [];
        }),
    ]);

    const documentsPerClient: Record<string, number> = {};
    let totalStorageUsed = 0;

    for (const doc of documents) {
      totalStorageUsed += doc.file_size || 0;
      documentsPerClient[doc.client_id] = (documentsPerClient[doc.client_id] || 0) + 1;
    }

    return {
      totalClients: archives.length,
      totalDocuments: documents.length,
      totalStorageUsed,
      documentsPerClient,
    };
  }
}

export default ArchiveSupabaseService;
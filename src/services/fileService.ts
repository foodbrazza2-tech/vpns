/**
 * Service de gestion des fichiers sécurisé
 */

export interface FileValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

const ALLOWED_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'txt',
  'csv',
];

export class FileService {
  /**
   * Valide un fichier
   */
  static validateFile(file: File): FileValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Vérifier la taille
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`Fichier trop volumineux (max 50 MB, ${(file.size / 1024 / 1024).toFixed(1)} MB)`);
    }

    // Vérifier le type MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      errors.push(`Type de fichier non autorisé: ${file.type}`);
    }

    // Vérifier l'extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push(`Extension non autorisée: .${extension}`);
    }

    // Vérifier le nom du fichier
    if (!/^[\w\s\-().]+$/.test(file.name)) {
      warnings.push('Le nom du fichier contient des caractères inhabituels');
    }

    // Avertissement pour les fichiers volumineux
    if (file.size > 10 * 1024 * 1024) {
      warnings.push('Ce fichier est volumineux et peut prendre du temps à uploader');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Génère un hash pour le fichier (pour la déduplication)
   */
  static async hashFile(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Formate une taille de fichier en format lisible
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Obtient l'icône pour un type de fichier
   */
  static getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('text') || mimeType.includes('csv')) return '📋';
    return '📎';
  }

  /**
   * Crée une prévisualisation de fichier (si possible)
   */
  static async createPreview(file: File): Promise<string | null> {
    if (!file.type.startsWith('image/')) {
      return null;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Télécharge un fichier
   */
  static downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Exporte des données en CSV
   */
  static exportToCSV(data: Record<string, any>[], filename: string): void {
    if (data.length === 0) return;

    // Headers
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`;
            }
            return value;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadFile(blob, `${filename}.csv`);
  }

  /**
   * Exporte des données en JSON
   */
  static exportToJSON(data: any, filename: string): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    this.downloadFile(blob, `${filename}.json`);
  }
}

export default FileService;

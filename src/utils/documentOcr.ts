// Extraction de contenu reelle pour les documents importes (image, PDF, texte).
// tesseract.js (OCR) et pdfjs-dist (lecture PDF) sont charges dynamiquement -
// seuls les imports de documents en ont besoin, le reste de l'app ne paie pas
// ce poids au chargement initial.

// Un fichier corrompu, un scan illisible ou un souci reseau (chargement des
// donnees de langue OCR) ne doivent jamais faire planter l'import - on retombe
// alors sur la transcription par nom de fichier, geree par l'appelant.
const OCR_TIMEOUT_MS = 30000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('OCR timeout')), ms)),
  ]);
}

async function ocrImageSource(source: File | HTMLCanvasElement): Promise<string> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await withTimeout(createWorker('fra'), OCR_TIMEOUT_MS);
    try {
      const { data } = await withTimeout(worker.recognize(source), OCR_TIMEOUT_MS);
      return data.text || '';
    } finally {
      await worker.terminate();
    }
  } catch {
    return '';
  }
}

// Extrait le texte d'un PDF. Essaie d'abord le calque texte (rapide, fiable
// pour les PDF generes numeriquement) ; si le PDF est un scan sans texte
// exploitable, on rend la 1ere page en image et on l'OCR.
async function extractPdfContent(file: File): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    let text = '';
    const maxPages = Math.min(pdf.numPages, 5);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => ('str' in item ? item.str : '')).join(' ') + '\n';
    }

    if (text.trim().length > 10) {
      return text;
    }

    // PDF scanne (aucun calque texte) : on rend la 1ere page et on l'OCR.
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return text;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return ocrImageSource(canvas);
  } catch {
    return '';
  }
}

async function readTextFile(file: File): Promise<string> {
  try {
    return await file.text();
  } catch {
    return '';
  }
}

// Point d'entree unique : route chaque type de fichier vers la bonne methode
// d'extraction (OCR image, lecture/OCR PDF, ou lecture texte directe). Ne leve
// jamais d'exception - un echec d'extraction renvoie une chaine vide.
export async function extractDocumentContent(file: File): Promise<string> {
  if (file.type.startsWith('image/')) {
    return ocrImageSource(file);
  }
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    return extractPdfContent(file);
  }
  const readableTypes = ['text/', 'application/json', 'application/csv'];
  const isReadable = readableTypes.some((t) => file.type.startsWith(t)) || /\.(txt|csv|json)$/i.test(file.name);
  return isReadable ? readTextFile(file) : '';
}

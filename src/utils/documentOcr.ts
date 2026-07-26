// Extraction de contenu reelle pour les documents importes (image, PDF, texte).
// tesseract.js (OCR) et pdfjs-dist (lecture PDF) sont charges dynamiquement -
// seuls les imports de documents en ont besoin, le reste de l'app ne paie pas
// ce poids au chargement initial.

// Un fichier corrompu, un scan illisible ou un souci reseau (chargement des
// donnees de langue OCR) ne doivent jamais faire planter l'import - on retombe
// alors sur la transcription par nom de fichier, geree par l'appelant.
// Le chargement du worker (qui telecharge ~6 Mo de donnees de langue la
// premiere fois) a besoin de plus de marge que la reconnaissance elle-meme
// (calcul local, plus rapide) sur une connexion mobile lente.
const WORKER_LOAD_TIMEOUT_MS = 60000;
const RECOGNIZE_TIMEOUT_MS = 30000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('OCR timeout')), ms)),
  ]);
}

// Une photo prise au telephone (eclairage inegal, faible contraste, parfois
// petite resolution) donne une bien moins bonne reconnaissance qu'un scan
// propre. On agrandit les petites images et on convertit en niveaux de gris
// avec un contraste renforce avant l'OCR - une preparation standard qui
// ameliore nettement la lecture de texte sur une photo. En cas d'echec
// (canvas indisponible, image corrompue), on retombe sur le fichier original.
async function preprocessImageForOcr(file: File): Promise<File | HTMLCanvasElement> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const scale = bitmap.width < 1500 ? 1500 / bitmap.width : 1;
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const contrasted = Math.min(255, Math.max(0, (gray - 128) * 1.6 + 128));
      data[i] = data[i + 1] = data[i + 2] = contrasted;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  } catch {
    return file;
  }
}

async function ocrImageSource(source: File | HTMLCanvasElement): Promise<string> {
  try {
    const { createWorker } = await import('tesseract.js');
    // tesseract.js va par defaut chercher son worker, son moteur WASM et ses
    // donnees de langue sur le CDN jsdelivr - or ce CDN s'est avere injoignable
    // dans certains environnements, ce qui faisait echouer l'OCR en silence a
    // chaque import et forcait une saisie manuelle systematique. Les trois sont
    // maintenant auto-heberges sur ce meme domaine (voir public/tessdata).
    const worker = await withTimeout(
      createWorker('fra', undefined, {
        langPath: '/tessdata',
        workerPath: '/tessdata/worker.min.js',
        corePath: '/tessdata/core',
      }),
      WORKER_LOAD_TIMEOUT_MS
    );
    try {
      const target = source instanceof File ? await preprocessImageForOcr(source) : source;
      const { data } = await withTimeout(worker.recognize(target), RECOGNIZE_TIMEOUT_MS);
      return data.text || '';
    } finally {
      await worker.terminate();
    }
  } catch (e) {
    console.error('OCR echec (retombee sur la transcription par nom de fichier):', e);
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

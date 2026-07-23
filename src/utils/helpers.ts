export type ParsedEntry = {
  amount: number | null;
  category: string;
  account: string;
  type: 'debit' | 'credit';
  description: string;
  vendor: string | null;
};

const OHADA_CATEGORIES: Record<string, string> = {
  taxi: 'Transport',
  internet: 'Services',
  eec: 'Énergie',
  mtn: 'Télécommunications',
  airtel: 'Télécommunications',
  cnss: 'Charges sociales',
  dgi: 'Impôts',
  bgfi: 'Banque',
  cappingsa: 'Santé',
};

const OHADA_ACCOUNTS: Record<string, string> = {
  Transport: '6011',
  Services: '6151',
  'Énergie': '6061',
  Télécommunications: '6062',
  'Charges sociales': '6211',
  'Impôts': '6261',
  Banque: '5121',
  Santé: '6181',
  Divers: '6051',
};

export function parseQuickEntry(text: string): ParsedEntry {
  const normalized = text.toLowerCase();
  const amountMatch = normalized.match(/(\d{1,3}(?:[\s.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  const amount = amountMatch ? Number(amountMatch[0].replace(/\s/g, '').replace(',', '.')) : null;

  const vendor = normalized.includes('eec')
    ? 'EEC'
    : normalized.includes('mtn')
      ? 'MTN'
      : normalized.includes('airtel')
        ? 'Airtel'
        : normalized.includes('cnss')
          ? 'CNSS'
          : normalized.includes('dgi')
            ? 'DGI'
            : normalized.includes('bgfi')
              ? 'BGFI'
              : normalized.includes('cappingsa')
                ? 'CAPPINGSA'
                : null;

  let category = 'Divers';
  let account = '6051';

  // Keyword-based overrides (generic)
  if (normalized.includes('taxi')) {
    category = 'Transport';
    account = '6011';
  }
  if (normalized.includes('internet')) {
    // keep generic Services only if no vendor provides a better mapping
    if (!vendor) {
      category = 'Services';
      account = '6151';
    }
  }

  // Vendor-based mapping should take precedence when available
  if (vendor) {
    const vendorKey = vendor.toLowerCase();
    const mappedCategory = OHADA_CATEGORIES[vendorKey];
    if (mappedCategory) {
      category = mappedCategory;
      account = OHADA_ACCOUNTS[mappedCategory] || account;
    }
  }

  const type = normalized.includes('recette') || normalized.includes('vente') || normalized.includes('encaisse') ? 'credit' : 'debit';

  return {
    amount,
    category,
    account,
    type,
    description: text.trim(),
    vendor,
  };
}

export type ImportedInvoiceData = {
  invoiceNumber: string;
  amount: number | null;
  date: string;
  dueDate: string;
  description: string;
  vendorName: string | null;
};

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 1, 'février': 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, 'août': 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, 'décembre': 12, decembre: 12,
};

const pad2 = (n: number) => String(n).padStart(2, '0');

// Extrait une date plausible depuis le contenu du document (formats numeriques
// jj/mm/aaaa, aaaa-mm-jj, ou en toutes lettres "12 juillet 2026"). Retourne
// null si aucune date credible n'est trouvee - l'appelant garde alors la date
// du jour par defaut, mais une date reellement presente sur le document prime
// toujours pour que la facture tombe dans le bon exercice comptable.
export function extractDate(text: string): string | null {
  const numericMatch = text.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b/);
  if (numericMatch) {
    const day = Number(numericMatch[1]);
    const month = Number(numericMatch[2]);
    const year = Number(numericMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  const monthNames = Object.keys(FRENCH_MONTHS).join('|');
  const textMatch = new RegExp(`\\b(\\d{1,2})\\s+(${monthNames})\\s+(\\d{4})\\b`, 'i').exec(text);
  if (textMatch) {
    const day = Number(textMatch[1]);
    const month = FRENCH_MONTHS[textMatch[2].toLowerCase()];
    const year = Number(textMatch[3]);
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  return null;
}

// Extrait un nom de fournisseur/client plausible depuis le contenu (heuristique
// simple : libelle explicite "Fournisseur:", "Client:", etc., ou une ligne
// ressemblant a une raison sociale). Best-effort - sert a pre-remplir, pas a
// rattacher automatiquement une fiche client (les fiches sont des enregistrements
// distincts, un rapprochement exact par nom n'est pas garanti).
export function extractVendorName(text: string): string | null {
  const labelMatch = text.match(/(?:fournisseur|facturé à|facture a|client|émetteur|emetteur)\s*[:\-]\s*([A-ZÀ-Ý][\wÀ-ÿ&.,'\- ]{2,60})/i);
  if (labelMatch) {
    return labelMatch[1].trim().replace(/\s+/g, ' ');
  }
  const companyMatch = text.match(/\b([A-ZÀ-Ý][\wÀ-ÿ&.\- ]{2,50}\s+(?:SARL|SA|SAS|Ets|Etablissements))\b/i);
  if (companyMatch) {
    return companyMatch[1].trim();
  }
  return null;
}

// Extrait les montants plausibles d'un texte. Ecarte les nombres qui ressemblent
// a une annee (1990-2099) sans separateur de milliers, pour ne pas confondre un
// numero de facture "FAC-2025-042" avec un montant.
export function extractAmounts(text: string): number[] {
  const matches = text.match(/\d{1,3}(?:[\s.,]\d{3})+|\d{4,}/g) || [];
  return matches
    .map((m) => ({ raw: m, value: Number(m.replace(/[\s.,]/g, '')) }))
    .filter(({ raw, value }) => {
      if (Number.isNaN(value) || value <= 0) return false;
      // Un nombre de 4 chiffres sans separateur dans la plage des annees est ignore.
      const hasSeparator = /[\s.,]/.test(raw);
      if (!hasSeparator && value >= 1990 && value <= 2099) return false;
      return true;
    })
    .map(({ value }) => value);
}

// Transcription complete d'un document importe : lit reellement le contenu
// (OCR pour une image, calque texte ou OCR pour un PDF scanne, lecture directe
// pour un fichier texte) puis en extrait numero, montant, date et fournisseur.
export async function parseInvoiceFromFile(file: File): Promise<ImportedInvoiceData> {
  const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
  const { extractDocumentContent } = await import('./documentOcr');
  const content = await extractDocumentContent(file);

  const invoiceNumberMatch = `${nameWithoutExt} ${content}`.match(/\b([A-Z]{2,6}-\d{2,4}-\d{2,6})\b/i);
  const invoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[1].toUpperCase() : nameWithoutExt.replace(/\s+/g, '-').slice(0, 24).toUpperCase();

  // On cherche le montant d'abord dans le contenu du document (plus fiable), et on
  // retire le numero de facture du texte pour ne pas capter ses chiffres. Le nom
  // du fichier n'est utilise qu'en dernier recours.
  const invoiceToken = invoiceNumberMatch ? invoiceNumberMatch[1] : '';
  const contentClean = content.split(invoiceToken).join(' ');
  const nameClean = nameWithoutExt.split(invoiceToken).join(' ');

  const contentAmounts = extractAmounts(contentClean);
  const amounts = contentAmounts.length > 0 ? contentAmounts : extractAmounts(nameClean);
  const amount = amounts.length > 0 ? Math.max(...amounts) : null;

  const today = new Date();
  // La date du document prime sur la date du jour quand elle est detectee -
  // essentiel pour que la facture tombe dans le bon exercice comptable.
  const detectedDate = extractDate(contentClean);
  const invoiceDate = detectedDate ? new Date(`${detectedDate}T00:00:00`) : today;
  const due = new Date(invoiceDate);
  due.setDate(due.getDate() + 30);

  return {
    invoiceNumber,
    amount,
    date: invoiceDate.toISOString().split('T')[0],
    dueDate: due.toISOString().split('T')[0],
    description: content ? content.slice(0, 200).replace(/\s+/g, ' ').trim() : `Importe depuis ${file.name}`,
    vendorName: extractVendorName(contentClean),
  };
}

export function parseAppointmentText(text: string) {
  const normalized = text.toLowerCase();
  const titleMatch = text.match(/^(.*?)(?=\b(?:rdv|réunion|appel|meeting)\b)/i);
  const title = (titleMatch?.[1] || 'Rendez-vous').trim() || 'Rendez-vous';
  const date = normalized.includes('demain') ? 'Demain' : normalized.includes('lundi') ? 'Lundi' : normalized.includes('mardi') ? 'Mardi' : normalized.includes('mercredi') ? 'Mercredi' : normalized.includes('jeudi') ? 'Jeudi' : normalized.includes('vendredi') ? 'Vendredi' : normalized.includes('samedi') ? 'Samedi' : normalized.includes('dimanche') ? 'Dimanche' : 'Aujourd’hui';
  const hour = normalized.match(/\b(\d{1,2}h(?:\d{2})?)\b/)?.[1] || '09:00';
  const contact = /client|fournisseur|maria|jean|paul/i.test(normalized) ? 'Contact détecté' : 'À confirmer';

  return { title, date, hour, contact };
}

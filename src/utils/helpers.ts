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
};

async function readFileTextSafe(file: File): Promise<string> {
  const readableTypes = ['text/', 'application/json', 'application/csv'];
  const isReadable = readableTypes.some((t) => file.type.startsWith(t)) || /\.(txt|csv|json)$/i.test(file.name);
  if (!isReadable) return '';

  try {
    return await file.text();
  } catch {
    return '';
  }
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

export async function parseInvoiceFromFile(file: File): Promise<ImportedInvoiceData> {
  const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
  const content = await readFileTextSafe(file);

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
  const due = new Date(today);
  due.setDate(due.getDate() + 30);

  return {
    invoiceNumber,
    amount,
    date: today.toISOString().split('T')[0],
    dueDate: due.toISOString().split('T')[0],
    description: content ? content.slice(0, 200).replace(/\s+/g, ' ').trim() : `Importe depuis ${file.name}`,
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

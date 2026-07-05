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
  const amountMatch = normalized.match(/(\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
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

  const type = normalized.includes('payer') || normalized.includes('depense') ? 'debit' : 'credit';

  return {
    amount,
    category,
    account,
    type,
    description: text.trim(),
    vendor,
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

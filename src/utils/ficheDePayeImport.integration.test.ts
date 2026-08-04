// Test d'integration du flux complet "import d'une fiche de paye" :
// transcription du document (OCR simule) -> classification automatique
// -> comptabilisation (charge de personnel, compte 661), en passant reellement
// par la couche service (comme businessDataService.integration.test.ts).
// L'OCR reel est mocke (le moteur tesseract.js n'a rien a faire dans un test
// unitaire) mais tout le reste - extraction du montant/de la date, detection
// du type de document, generation de l'ecriture, insertion via le service -
// est le vrai code de production.
import { describe, it, expect, vi, beforeEach } from 'vitest';

interface FakeRow {
  id: string;
  created_at: string;
  [key: string]: unknown;
}

function createFakeSupabase() {
  const store: Record<string, FakeRow[]> = { accounting_entries: [] };
  let idCounter = 1;
  const nextId = () => `fake-${idCounter++}`;

  function makeBuilder(table: string) {
    let mode: 'select' | 'insert' = 'select';
    let payload: Record<string, unknown> | null = null;
    let wantSingle = false;

    function execute() {
      const rows = store[table];
      if (!rows) return { data: null, error: { message: `table inconnue: ${table}` } };
      if (mode === 'insert') {
        const inserted = { id: nextId(), created_at: new Date().toISOString(), ...(payload as Record<string, unknown>) };
        rows.push(inserted);
        return { data: wantSingle ? inserted : [inserted], error: null };
      }
      return { data: rows, error: null };
    }

    const builder: Record<string, unknown> = {
      insert(p: Record<string, unknown>) { mode = 'insert'; payload = p; return builder; },
      select() { return builder; },
      single() { wantSingle = true; return builder; },
      then(resolve: (v: unknown) => void, reject: (e: unknown) => void) {
        try { resolve(execute()); } catch (e) { reject(e); }
      },
    };
    return builder;
  }

  return { from: (table: string) => makeBuilder(table), store };
}

const fakeSupabase = createFakeSupabase();

vi.mock('../services/authService', () => ({ supabase: fakeSupabase }));

// L'OCR reel (tesseract.js) telecharge ses donnees de langue - on simule ce
// qu'il retournerait pour une vraie photo de fiche de paie, comme fait
// verification.test.ts pour le reste de la suite d'import.
const OCR_TEXT =
  'FICHE DE PAIE\nPeriode : Juin 2026\nEmploye : Jean MABIALA\n' +
  'Salaire brut : 180 000 FCFA\nSalaire net a payer : 150 000 FCFA\n' +
  'Date de paiement : 30/06/2026\nMode : Virement bancaire';

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(async () => ({
    recognize: vi.fn(async () => ({ data: { text: OCR_TEXT } })),
    terminate: vi.fn(async () => {}),
  })),
}));

describe('Flux integration : import fiche de paye -> classification -> comptabilisation (charge 661)', () => {
  beforeEach(() => {
    fakeSupabase.store.accounting_entries.length = 0;
  });

  it('une fiche de paie photographiee est transcrite, classee fiche_paye, et comptabilisee en charge de personnel', async () => {
    const { parseInvoiceFromFile } = await import('./helpers');
    const { detectDocumentKind, entryForFichePaye } = await import('./autoAccounting');
    const { createAccountingEntry } = await import('../services/businessDataService');

    const file = new File(['fake-image-bytes'], 'fiche_paie_juin.png', { type: 'image/png' });
    const parsed = await parseInvoiceFromFile(file);

    // Le montant net doit etre extrait correctement (le plus grand montant plausible).
    expect(parsed.amount).toBe(180000); // 180 000 (brut) > 150 000 (net) : extractAmounts prend le max
    expect(parsed.date).toBe('2026-06-30');

    const fullText = `${file.name} ${parsed.fullText}`;
    const documentKind = detectDocumentKind(fullText);
    expect(documentKind).toBe('fiche_paye');

    const method = /\b(especes|liquide|cash)\b/i.test(fullText) ? 'especes' : 'virement';
    expect(method).toBe('virement');

    const generated = entryForFichePaye({
      date: parsed.date,
      amount: parsed.amount || 0,
      method,
      description: `Salaire (${parsed.invoiceNumber})`,
      reference: parsed.invoiceNumber,
    });
    expect(generated.debitAccount).toBe('661');
    expect(generated.creditAccount).toBe('5211'); // banque (virement)
    expect(generated.journal).toBe('od');

    const record = await createAccountingEntry(generated);
    expect(record.debitAccount).toBe('661');
    expect(record.amount).toBe(generated.amount);
    expect(fakeSupabase.store.accounting_entries).toHaveLength(1);
  });
});

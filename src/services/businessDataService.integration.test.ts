// Tests d'integration : verifient le flux complet facture -> comptabilisation
// automatique -> etats financiers, en passant reellement par la couche service
// (businessDataService), pas seulement par les fonctions pures d'autoAccounting
// deja testees ailleurs. Le client Supabase est remplace par un magasin en
// memoire qui imite le comportement du query builder (insert/update/select/eq/
// single), pour exercer le vrai code de mapping DB <-> objets metier.
import { describe, it, expect, vi, beforeEach } from 'vitest';

interface FakeRow {
  id: string;
  created_at: string;
  [key: string]: unknown;
}

function createFakeSupabase() {
  const store: Record<string, FakeRow[]> = {
    invoices: [],
    accounting_entries: [],
    invoice_payments: [],
  };
  let idCounter = 1;
  const nextId = () => `fake-${idCounter++}`;

  function makeBuilder(table: string) {
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
    let eqFilter: { col: string; val: unknown } | null = null;
    let wantSingle = false;

    function execute(): { data: unknown; error: { message: string } | null } {
      const rows = store[table];
      if (!rows) return { data: null, error: { message: `table inconnue: ${table}` } };

      if (mode === 'select') {
        return { data: rows, error: null };
      }
      if (mode === 'insert') {
        const items = Array.isArray(payload) ? payload : [payload as Record<string, unknown>];
        const inserted = items.map((item) => ({ id: nextId(), created_at: new Date().toISOString(), ...item }));
        rows.push(...inserted);
        return { data: wantSingle ? inserted[0] : inserted, error: null };
      }
      if (mode === 'update') {
        const idx = rows.findIndex((r) => eqFilter && r[eqFilter.col] === eqFilter.val);
        if (idx === -1) return { data: null, error: { message: 'ligne introuvable' } };
        rows[idx] = { ...rows[idx], ...(payload as Record<string, unknown>) };
        return { data: wantSingle ? rows[idx] : null, error: null };
      }
      if (mode === 'delete') {
        const idx = rows.findIndex((r) => eqFilter && r[eqFilter.col] === eqFilter.val);
        if (idx !== -1) rows.splice(idx, 1);
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }

    const builder: Record<string, unknown> = {
      insert(p: Record<string, unknown> | Record<string, unknown>[]) { mode = 'insert'; payload = p; return builder; },
      update(p: Record<string, unknown>) { mode = 'update'; payload = p; return builder; },
      delete() { mode = 'delete'; return builder; },
      select() { return builder; },
      order() { return builder; },
      eq(col: string, val: unknown) { eqFilter = { col, val }; return builder; },
      single() { wantSingle = true; return builder; },
      then(resolve: (v: unknown) => void, reject: (e: unknown) => void) {
        try {
          resolve(execute());
        } catch (e) {
          reject(e);
        }
      },
    };
    return builder;
  }

  return { from: (table: string) => makeBuilder(table), store };
}

const fakeSupabase = createFakeSupabase();

vi.mock('./authService', () => ({
  supabase: fakeSupabase,
}));

describe('Flux integration : facture -> comptabilisation automatique -> etats financiers', () => {
  beforeEach(() => {
    fakeSupabase.store.invoices.length = 0;
    fakeSupabase.store.accounting_entries.length = 0;
    fakeSupabase.store.invoice_payments.length = 0;
  });

  it('une facture de vente genere 2 ecritures equilibrees (411/706 + 411/4431)', async () => {
    const { createInvoice } = await import('./businessDataService');
    const { invoice, entries } = await createInvoice({
      clientId: 'client-1',
      date: '2026-03-10',
      dueDate: '2026-04-10',
      amountHt: 100000,
      vatRate: 18,
      vatAmount: 18000,
      amount: 118000,
      description: 'Prestation conseil',
      status: 'sent',
      type: 'vente',
    });

    expect(invoice.amount).toBe(118000);
    expect(entries).toHaveLength(2);
    const totalDebit = entries.reduce((s, e) => s + (e.debitAccount === '411' ? e.amount : 0), 0);
    expect(totalDebit).toBe(118000);
    expect(entries.every((e) => e.journal === 'ventes')).toBe(true);
  });

  it('une facture d\'achat genere 2 ecritures equilibrees (605/401 + 4452/401)', async () => {
    const { createInvoice } = await import('./businessDataService');
    const { entries } = await createInvoice({
      clientId: 'fournisseur-1',
      date: '2026-03-12',
      dueDate: '2026-04-12',
      amountHt: 50000,
      vatRate: 18,
      vatAmount: 9000,
      amount: 59000,
      description: 'Achat fournitures',
      status: 'draft',
      type: 'achat',
    });

    expect(entries).toHaveLength(2);
    const totalCredit401 = entries.reduce((s, e) => s + (e.creditAccount === '401' ? e.amount : 0), 0);
    expect(totalCredit401).toBe(59000);
    expect(entries.every((e) => e.journal === 'achats')).toBe(true);
  });

  it('un paiement genere l\'ecriture de tresorerie et le flux complet reste equilibre dans les etats financiers', async () => {
    const { createInvoice, createPayment } = await import('./businessDataService');
    const { calculerBalance, totauxBalance, calculerCompteResultat, calculerGrandLivre } = await import('../utils/comptaReports');

    const vente = await createInvoice({
      clientId: 'client-1', date: '2026-05-01', dueDate: '2026-06-01',
      amountHt: 100000, vatRate: 18, vatAmount: 18000, amount: 118000,
      description: 'Vente A', status: 'sent', type: 'vente',
    });
    const achat = await createInvoice({
      clientId: 'fournisseur-1', date: '2026-05-05', dueDate: '2026-06-05',
      amountHt: 40000, vatRate: 18, vatAmount: 7200, amount: 47200,
      description: 'Achat B', status: 'draft', type: 'achat',
    });
    const { entry: paymentEntry } = await createPayment(vente.invoice, {
      amount: 118000, paymentDate: '2026-05-15', method: 'virement',
    });

    expect(paymentEntry).not.toBeNull();
    expect(paymentEntry!.debitAccount).toBe('5211'); // banque
    expect(paymentEntry!.creditAccount).toBe('411');

    const allEntries = [...vente.entries, ...achat.entries, paymentEntry!];

    // Le systeme comptable dans son ensemble doit rester equilibre (partie double).
    const balance = calculerBalance(allEntries);
    expect(totauxBalance(balance).equilibre).toBe(true);

    // Le compte de resultat doit refleter le produit de la vente et la charge de l'achat.
    const resultat = calculerCompteResultat(allEntries);
    expect(resultat.totalProduits).toBe(100000);
    expect(resultat.totalCharges).toBe(40000);
    expect(resultat.resultat).toBe(60000);

    // Le compte client (411) doit etre solde apres le paiement integral.
    const grandLivre = calculerGrandLivre(allEntries);
    const compteClient = grandLivre.find((c) => c.compte === '411')!;
    expect(compteClient.solde).toBe(0);
  });

  it('la contre-passation d\'une ecriture generee automatiquement l\'annule sans casser l\'equilibre', async () => {
    const { createInvoice, reverseAccountingEntry } = await import('./businessDataService');
    const { calculerBalance, totauxBalance } = await import('../utils/comptaReports');

    const { entries } = await createInvoice({
      clientId: 'client-2', date: '2026-06-01', dueDate: '2026-07-01',
      amountHt: 20000, vatRate: 0, vatAmount: 0, amount: 20000,
      description: 'Vente a annuler', status: 'sent', type: 'vente',
    });

    const { reversal, original } = await reverseAccountingEntry(entries[0]);
    expect(original.reversed).toBe(true);
    expect(reversal.debitAccount).toBe(entries[0].creditAccount);
    expect(reversal.creditAccount).toBe(entries[0].debitAccount);
    expect(reversal.amount).toBe(entries[0].amount);

    const allEntries = [original, reversal];
    expect(totauxBalance(calculerBalance(allEntries)).equilibre).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { entriesForInvoice, entryForPayment, detectInvoiceType, detectDocumentKind, detectTransferDirection, entryForBankTransfer, compteTresorerie } from './autoAccounting';

const vente = {
  type: 'vente' as const,
  invoiceNumber: 'FAC-2026-001',
  date: '2026-03-10',
  amountHt: 100000,
  vatAmount: 18000,
  amount: 118000,
};

const achat = {
  type: 'achat' as const,
  invoiceNumber: 'ACH-2026-001',
  date: '2026-03-12',
  amountHt: 50000,
  vatAmount: 9000,
  amount: 59000,
};

describe('Comptabilisation auto - VENTE (journal ventes)', () => {
  const entries = entriesForInvoice(vente);
  it('genere 411 debit / 706 credit (HT) + 411 debit / 4431 credit (TVA)', () => {
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.journal === 'ventes')).toBe(true);
    expect(entries[0]).toMatchObject({ debitAccount: '411', creditAccount: '706', amount: 100000 });
    expect(entries[1]).toMatchObject({ debitAccount: '411', creditAccount: '4431', amount: 18000 });
  });
  it('411 total debite = TTC ; produit + TVA credites = TTC (equilibre)', () => {
    const debit411 = entries.filter((e) => e.debitAccount === '411').reduce((s, e) => s + e.amount, 0);
    const credits = entries.reduce((s, e) => s + e.amount, 0);
    expect(debit411).toBe(118000);
    expect(credits).toBe(118000);
  });
});

describe('Comptabilisation auto - ACHAT (journal achats)', () => {
  const entries = entriesForInvoice(achat);
  it('genere 605 debit / 401 credit (HT) + 4452 debit / 401 credit (TVA)', () => {
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.journal === 'achats')).toBe(true);
    expect(entries[0]).toMatchObject({ debitAccount: '605', creditAccount: '401', amount: 50000 });
    expect(entries[1]).toMatchObject({ debitAccount: '4452', creditAccount: '401', amount: 9000 });
  });
  it('401 total credite = TTC (equilibre)', () => {
    const credit401 = entries.filter((e) => e.creditAccount === '401').reduce((s, e) => s + e.amount, 0);
    expect(credit401).toBe(59000);
  });
});

describe('Comptabilisation auto - REGLEMENT (journal banque)', () => {
  it('encaissement vente : tresorerie debit / 411 credit', () => {
    const e = entryForPayment(vente, { amount: 118000, method: 'virement', paymentDate: '2026-04-01' });
    expect(e.journal).toBe('banque');
    expect(e.debitAccount).toBe('5211'); // banque
    expect(e.creditAccount).toBe('411');
    expect(e.amount).toBe(118000);
  });
  it('reglement achat : 401 debit / tresorerie credit', () => {
    const e = entryForPayment(achat, { amount: 59000, method: 'especes', paymentDate: '2026-04-02' });
    expect(e.debitAccount).toBe('401');
    expect(e.creditAccount).toBe('5711'); // caisse (especes)
  });
  it('mode de reglement -> compte de tresorerie', () => {
    expect(compteTresorerie('especes')).toBe('5711');
    expect(compteTresorerie('virement')).toBe('5211');
    expect(compteTresorerie('mobile_money')).toBe('5211');
  });
});

describe('Detection vente/achat a l\'import', () => {
  it('detecte un achat', () => {
    expect(detectInvoiceType('Facture d\'achat fournisseur XYZ, a payer')).toBe('achat');
  });
  it('defaut = vente', () => {
    expect(detectInvoiceType('Facture de prestation pour le client')).toBe('vente');
  });
});

describe('Detection du type de document a l\'import (facture vs virement)', () => {
  it('detecte un bordereau de virement bancaire', () => {
    expect(detectDocumentKind('Bordereau de virement bancaire - BGFI Bank')).toBe('virement_bancaire');
  });
  it('detecte un releve bancaire', () => {
    expect(detectDocumentKind('Relevé bancaire du compte IBAN CG...')).toBe('virement_bancaire');
  });
  it('retombe sur vente/achat pour une facture normale', () => {
    expect(detectDocumentKind('Facture de prestation pour le client')).toBe('vente');
    expect(detectDocumentKind('Facture d\'achat fournisseur, a payer')).toBe('achat');
  });
  it('detecte le sens du virement', () => {
    expect(detectTransferDirection('Virement recu de MTN Congo')).toBe('entrant');
    expect(detectTransferDirection('Virement emis au beneficiaire XYZ')).toBe('sortant');
  });
});

describe('Comptabilisation auto - VIREMENT BANCAIRE (compte d\'attente 471)', () => {
  it('virement entrant : tresorerie debit / 471 credit (a reclasser)', () => {
    const e = entryForBankTransfer({ date: '2026-05-01', amount: 75000, method: 'virement', direction: 'entrant', description: 'Virement bancaire - Client X' });
    expect(e.journal).toBe('banque');
    expect(e.debitAccount).toBe('5211');
    expect(e.creditAccount).toBe('471');
    expect(e.amount).toBe(75000);
  });
  it('virement sortant : 471 debit / tresorerie credit (a reclasser)', () => {
    const e = entryForBankTransfer({ date: '2026-05-02', amount: 30000, method: 'virement', direction: 'sortant', description: 'Virement bancaire emis' });
    expect(e.debitAccount).toBe('471');
    expect(e.creditAccount).toBe('5211');
  });
});

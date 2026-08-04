import { describe, it, expect } from 'vitest';
import { entriesForInvoice, entryForPayment, detectInvoiceType, detectDocumentKind, detectTransferDirection, entryForBankTransfer, entryForFichePaye, compteTresorerie } from './autoAccounting';

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
  it('detecte un achat via mots-cles explicites', () => {
    expect(detectInvoiceType('Facture d\'achat fournisseur XYZ, a payer')).toBe('achat');
  });
  it('defaut = achat (un document importe est presque toujours une piece recue)', () => {
    expect(detectInvoiceType('Facture de prestation pour le client')).toBe('achat');
  });
  it('detecte une vente uniquement via les signaux propres au modele VPNS (numero, NIU, RCCM, DOIT)', () => {
    expect(detectInvoiceType('FACTURE N°03/DG/VPNS/2026')).toBe('vente');
    expect(detectInvoiceType('NIU: P2018110005078220')).toBe('vente');
    expect(detectInvoiceType('RCCM: CG /BZV/18 A 23443')).toBe('vente');
    expect(detectInvoiceType('DOIT : Cartouche Market')).toBe('vente');
  });
});

describe('Detection du type de document a l\'import (facture, virement, fiche de paye, releve)', () => {
  it('detecte un bordereau de virement bancaire (mouvement unique)', () => {
    expect(detectDocumentKind('Bordereau de virement bancaire - BGFI Bank')).toBe('virement_bancaire');
  });
  it('detecte un releve bancaire (plusieurs operations, pas un virement unique)', () => {
    expect(detectDocumentKind('Relevé bancaire du compte IBAN CG...')).toBe('releve_bancaire');
    expect(detectDocumentKind('Relevé de compte - periode juin 2026')).toBe('releve_bancaire');
  });
  it('detecte une fiche de paye', () => {
    expect(detectDocumentKind('Fiche de paie - Juin 2026 - Salaire net a payer: 150 000')).toBe('fiche_paye');
    expect(detectDocumentKind('Bulletin de salaire du mois de juin')).toBe('fiche_paye');
  });
  it('retombe sur achat pour une facture recue sans signal VPNS', () => {
    expect(detectDocumentKind('Facture de prestation pour le client')).toBe('achat');
    expect(detectDocumentKind('Facture d\'achat fournisseur, a payer')).toBe('achat');
  });
  it('reconnait une facture emise par VPNS elle-meme comme une vente', () => {
    expect(detectDocumentKind('FACTURE N°03/DG/VPNS/2026 DOIT : Client X')).toBe('vente');
  });
  it('detecte le sens du virement', () => {
    expect(detectTransferDirection('Virement recu de MTN Congo')).toBe('entrant');
    expect(detectTransferDirection('Virement emis au beneficiaire XYZ')).toBe('sortant');
  });
});

describe('Comptabilisation auto - FICHE DE PAYE (charge de personnel, compte 661)', () => {
  it('genere 661 debit / tresorerie credit pour le montant net verse', () => {
    const e = entryForFichePaye({ date: '2026-06-30', amount: 150000, method: 'virement', description: 'Salaire juin 2026' });
    expect(e.debitAccount).toBe('661');
    expect(e.creditAccount).toBe('5211'); // banque (virement)
    expect(e.amount).toBe(150000);
    expect(e.journal).toBe('od');
  });
  it('paye en especes -> credit caisse', () => {
    const e = entryForFichePaye({ date: '2026-06-30', amount: 80000, method: 'especes', description: 'Salaire employe X' });
    expect(e.creditAccount).toBe('5711');
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

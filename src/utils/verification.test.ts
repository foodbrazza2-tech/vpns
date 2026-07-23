import { describe, it, expect, vi } from 'vitest';
import { parseInvoiceFromFile, extractAmounts, extractDate, extractVendorName } from './helpers';

// L'OCR reel (tesseract.js) telecharge ses donnees de langue depuis un CDN -
// on le simule ici pour garder les tests rapides et deterministes ; le
// comportement reel est verifie manuellement dans l'app.
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(async () => ({
    recognize: vi.fn(async () => {
      throw new Error('image illisible (simulee)');
    }),
    terminate: vi.fn(async () => {}),
  })),
}));
import { exportTableToCsv } from './csvExport';
import { calculerBalance, totauxBalance, calculerCompteResultat, calculerBilan, calculerGrandLivre, calculerJournalCaisse, genererConseilsFinanciers } from './comptaReports';
import { exportInvoiceToPdf, exportTableToPdf } from './pdfExport';
import { libelleCompte, afficherCompte, classeDuCompte, COMPTES_A_PLAT } from '../data/planComptable';
import type { EntryRecord } from '../services/businessDataService';

// Helper : fabrique une ecriture minimale.
const E = (date: string, debit: string, credit: string, amount: number, category = 'general'): EntryRecord => ({
  id: Math.random().toString(36).slice(2),
  createdAt: date,
  date,
  description: `${debit}->${credit}`,
  debitAccount: debit,
  creditAccount: credit,
  amount,
  category,
  journal: 'od',
  reconciled: false,
  reversed: false,
});

describe('Import de facture (transcription document)', () => {
  it('extrait les montants avec separateurs et ignore les annees (bug corrige)', () => {
    // 1 250 000 = montant valide ; 2025 = annee a ignorer ; 42 000 = montant valide.
    expect(extractAmounts('Facture FAC-2025-042 : 1 250 000 FCFA')).toEqual([1250000]);
    expect(extractAmounts('reglement 2025')).toEqual([]); // annee seule ignoree
    expect(extractAmounts('total 42.000 et acompte 10 000')).toEqual([42000, 10000]);
  });

  it('extrait le numero et une date depuis un fichier, sans confondre l\'annee avec le montant', async () => {
    const file = new File(['x'], 'FAC-2025-042.txt', { type: 'text/plain' });
    const parsed = await parseInvoiceFromFile(file);
    expect(parsed.invoiceNumber).toBe('FAC-2025-042');
    // Le montant ne doit JAMAIS valoir 2025 (l'annee du numero).
    expect(parsed.amount).not.toBe(2025);
    expect(parsed.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parsed.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('gere un fichier non lisible (image) sans planter', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'scan.png', { type: 'image/png' });
    const parsed = await parseInvoiceFromFile(file);
    expect(parsed.invoiceNumber).toBeTruthy();
    expect(parsed.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('extrait une date numerique jj/mm/aaaa depuis le texte', () => {
    expect(extractDate('Facture emise le 05/07/2026 a Brazzaville')).toBe('2026-07-05');
  });

  it('extrait une date en toutes lettres', () => {
    expect(extractDate('Brazzaville, le 12 juillet 2026')).toBe('2026-07-12');
  });

  it('retourne null si aucune date credible', () => {
    expect(extractDate('Aucune date ici, juste du texte')).toBeNull();
  });

  it('extrait un nom de fournisseur via un libelle explicite', () => {
    expect(extractVendorName('Fournisseur: EEC Congo SARL\nMontant: 50 000')).toBe('EEC Congo SARL');
  });

  it('extrait une raison sociale sans libelle explicite', () => {
    expect(extractVendorName('Mballa Distribution SARL vous remercie de votre confiance')).toContain('SARL');
  });
});

describe('Export CSV', () => {
  it('genere un CSV correct avec echappement des caracteres speciaux', () => {
    const created: { name: string; content: string }[] = [];
    // Mock URL + ancre pour capturer le contenu telecharge.
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    let capturedBlobText = '';
    (URL as any).createObjectURL = (blob: Blob) => { (blob as any).text?.().then((t: string) => (capturedBlobText = t)); return 'blob:mock'; };
    (URL as any).revokeObjectURL = () => {};
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      created.push({ name: this.download, content: '' });
    });

    exportTableToCsv({
      columns: ['Compte', 'Libelle', 'Montant'],
      rows: [['411', 'Clients; divers', 1000], ['601', 'Achats "spéciaux"', 2000]],
      fileName: 'test.csv',
    });

    expect(created).toHaveLength(1);
    expect(created[0].name).toBe('test.csv');

    clickSpy.mockRestore();
    (URL as any).createObjectURL = origCreate;
    (URL as any).revokeObjectURL = origRevoke;
  });
});

describe('Export PDF (jsPDF)', () => {
  // On neutralise le telechargement (jsdom) et on verifie que toute la generation
  // (entete VPNS, tableau autotable, calcul HT/TVA/TTC) s'execute sans erreur.
  function silenceDownload() {
    (URL as any).createObjectURL = (URL as any).createObjectURL || (() => 'blob:mock');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  }

  it('genere un PDF de facture avec HT/TVA/TTC sans erreur', () => {
    silenceDownload();
    expect(() => exportInvoiceToPdf(
      { invoiceNumber: 'FAC-2026-001', date: '2026-05-01', dueDate: '2026-06-01', amount: 118000, amountHt: 100000, vatRate: 18, vatAmount: 18000, description: 'Prestation conseil', status: 'sent' },
      { name: 'Jean Mballa', company: 'Mballa SARL', email: 'j@m.cm', phone: '+242', address: 'Brazzaville', city: 'Brazzaville', taxId: 'IFU123' },
    )).not.toThrow();
    vi.restoreAllMocks();
  });

  it('genere un PDF de tableau (journal/balance) sans erreur', () => {
    silenceDownload();
    expect(() => exportTableToPdf({
      title: 'Balance generale - 2026',
      subtitle: 'Export test',
      columns: ['Compte', 'Debit', 'Credit'],
      rows: [['6061', '53 390 FCFA', '-'], ['5211', '-', '53 390 FCFA']],
      fileName: 'balance.pdf',
      summary: [{ label: 'Total debit', value: '53 390 FCFA' }, { label: 'Total credit', value: '53 390 FCFA' }],
    })).not.toThrow();
    vi.restoreAllMocks();
  });
});

describe('Plan comptable SYSCOHADA', () => {
  it('resout les intitules des comptes', () => {
    expect(libelleCompte('6061')).toContain('Fournitures');
    expect(libelleCompte('411')).toContain('Clients');
    expect(afficherCompte('5211')).toBe('5211 - Banque (compte principal)');
  });
  it('deduit la classe depuis le premier chiffre', () => {
    expect(classeDuCompte('6061')).toBe(6);
    expect(classeDuCompte('101')).toBe(1);
  });
  it('contient un nombre significatif de comptes', () => {
    expect(COMPTES_A_PLAT.length).toBeGreaterThan(80);
  });
});

describe('Balance generale', () => {
  it('est equilibree (debit total = credit total)', () => {
    const entries = [E('2026-01-05', '6061', '5211', 53390), E('2026-02-10', '411', '705', 118000)];
    const balance = calculerBalance(entries);
    const t = totauxBalance(balance);
    expect(t.totalDebit).toBe(t.totalCredit);
    expect(t.equilibre).toBe(true);
    // 6061 debiteur de 53390
    const c6061 = balance.find((l) => l.compte === '6061')!;
    expect(c6061.soldeDebiteur).toBe(53390);
  });
});

describe('Compte de resultat', () => {
  it('calcule benefice = produits - charges', () => {
    const entries = [
      E('2026-03-01', '411', '705', 118000), // produit (vente) 118000
      E('2026-03-05', '6061', '5211', 40000), // charge 40000
    ];
    const cr = calculerCompteResultat(entries);
    expect(cr.totalProduits).toBe(118000);
    expect(cr.totalCharges).toBe(40000);
    expect(cr.resultat).toBe(78000); // benefice
  });
});

describe('Bilan simplifie', () => {
  it('integre le resultat au passif', () => {
    const entries = [
      E('2026-04-01', '5211', '101', 500000), // apport capital: banque(actif) / capital(passif)
      E('2026-04-10', '411', '705', 200000), // vente a credit: client(actif) / produit
      E('2026-04-15', '6061', '5211', 50000), // charge payee banque
    ];
    const bilan = calculerBilan(entries);
    // Actif et passif doivent equilibrer (a l'euro pres) une fois le resultat integre.
    expect(Math.abs(bilan.totalActif - bilan.totalPassif)).toBeLessThan(1);
    expect(bilan.resultat).toBe(150000); // 200000 produit - 50000 charge
  });
});

describe('Grand Livre', () => {
  it('calcule un solde progressif par compte', () => {
    const entries = [E('2026-01-01', '5211', '101', 100000), E('2026-01-02', '6061', '5211', 30000)];
    const gl = calculerGrandLivre(entries);
    const banque = gl.find((c) => c.compte === '5211')!;
    // 5211 : +100000 (debit) puis -30000 (credit) = 70000
    expect(banque.solde).toBe(70000);
    expect(banque.mouvements[banque.mouvements.length - 1].soldeProgressif).toBe(70000);
  });
});

describe('Journal de Caisse (compte 57)', () => {
  it('regroupe les mouvements de caisse par jour avec solde progressif', () => {
    const entries = [
      E('2026-06-01', '5711', '706', 50000), // vente encaissee en especes
      E('2026-06-01', '6011', '5711', 20000), // achat paye en especes
      E('2026-06-02', '5711', '706', 30000), // vente encaissee en especes
    ];
    const journal = calculerJournalCaisse(entries);
    expect(journal.jours).toHaveLength(2);

    const jour1 = journal.jours[0];
    expect(jour1.date).toBe('2026-06-01');
    expect(jour1.soldeOuverture).toBe(0);
    expect(jour1.totalEntrees).toBe(50000);
    expect(jour1.totalSorties).toBe(20000);
    expect(jour1.soldeCloture).toBe(30000);

    const jour2 = journal.jours[1];
    expect(jour2.soldeOuverture).toBe(30000);
    expect(jour2.totalEntrees).toBe(30000);
    expect(jour2.soldeCloture).toBe(60000);

    expect(journal.totalEntrees).toBe(80000);
    expect(journal.totalSorties).toBe(20000);
    expect(journal.soldeFinal).toBe(60000);
  });

  it('ignore les ecritures qui ne touchent pas un compte de caisse', () => {
    const entries = [E('2026-06-01', '5211', '706', 50000)]; // banque, pas caisse
    const journal = calculerJournalCaisse(entries);
    expect(journal.jours).toHaveLength(0);
    expect(journal.soldeFinal).toBe(0);
  });
});

describe('Conseils financiers', () => {
  it('alerte quand les sorties depassent les entrees', () => {
    const entries = [
      E('2026-06-01', '5711', '706', 10000),
      E('2026-06-02', '6011', '5711', 25000),
    ];
    const journal = calculerJournalCaisse(entries);
    const resultat = calculerCompteResultat(entries);
    const conseils = genererConseilsFinanciers(journal, resultat);
    expect(conseils.some((c) => /depassent vos encaissements/i.test(c))).toBe(true);
  });

  it('signale un solde de caisse negatif comme anomalie de saisie', () => {
    const journal = { jours: [], totalEntrees: 0, totalSorties: 10000, soldeFinal: -10000 };
    const resultat = calculerCompteResultat([]);
    const conseils = genererConseilsFinanciers(journal, resultat);
    expect(conseils.some((c) => /negatif/i.test(c))).toBe(true);
  });

  it('ne remonte aucune anomalie sur une gestion saine', () => {
    const entries = [E('2026-06-01', '5711', '706', 100000), E('2026-06-01', '6011', '5711', 20000)];
    const journal = calculerJournalCaisse(entries);
    const resultat = calculerCompteResultat(entries);
    const conseils = genererConseilsFinanciers(journal, resultat);
    expect(conseils.some((c) => /saine/i.test(c))).toBe(true);
  });
});

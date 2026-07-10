import type { EntryRecord } from '../services/businessDataService';
import { libelleCompte, classeDuCompte } from '../data/planComptable';

// ═══════════════════════════════════════════
// BALANCE GENERALE
// Pour chaque compte : total debit, total credit, solde.
// ═══════════════════════════════════════════
export interface LigneBalance {
  compte: string;
  libelle: string;
  totalDebit: number;
  totalCredit: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
}

export function calculerBalance(entries: EntryRecord[]): LigneBalance[] {
  const totaux = new Map<string, { debit: number; credit: number }>();

  for (const e of entries) {
    const d = totaux.get(e.debitAccount) || { debit: 0, credit: 0 };
    d.debit += e.amount;
    totaux.set(e.debitAccount, d);

    const c = totaux.get(e.creditAccount) || { debit: 0, credit: 0 };
    c.credit += e.amount;
    totaux.set(e.creditAccount, c);
  }

  return Array.from(totaux.entries())
    .map(([compte, { debit, credit }]) => {
      const solde = debit - credit;
      return {
        compte,
        libelle: libelleCompte(compte),
        totalDebit: debit,
        totalCredit: credit,
        soldeDebiteur: solde > 0 ? solde : 0,
        soldeCrediteur: solde < 0 ? -solde : 0,
      };
    })
    .sort((a, b) => a.compte.localeCompare(b.compte));
}

export interface TotauxBalance {
  totalDebit: number;
  totalCredit: number;
  totalSoldeDebiteur: number;
  totalSoldeCrediteur: number;
  equilibre: boolean;
}

export function totauxBalance(lignes: LigneBalance[]): TotauxBalance {
  const totalDebit = lignes.reduce((s, l) => s + l.totalDebit, 0);
  const totalCredit = lignes.reduce((s, l) => s + l.totalCredit, 0);
  const totalSoldeDebiteur = lignes.reduce((s, l) => s + l.soldeDebiteur, 0);
  const totalSoldeCrediteur = lignes.reduce((s, l) => s + l.soldeCrediteur, 0);
  return {
    totalDebit,
    totalCredit,
    totalSoldeDebiteur,
    totalSoldeCrediteur,
    // Tolerance d'un franc pour les arrondis.
    equilibre: Math.abs(totalDebit - totalCredit) < 1 && Math.abs(totalSoldeDebiteur - totalSoldeCrediteur) < 1,
  };
}

// ═══════════════════════════════════════════
// GRAND LIVRE
// Pour chaque compte : liste chronologique des mouvements avec solde progressif.
// ═══════════════════════════════════════════
export interface MouvementGrandLivre {
  date: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  soldeProgressif: number;
}

export interface CompteGrandLivre {
  compte: string;
  libelle: string;
  mouvements: MouvementGrandLivre[];
  totalDebit: number;
  totalCredit: number;
  solde: number;
}

export function calculerGrandLivre(entries: EntryRecord[]): CompteGrandLivre[] {
  const parCompte = new Map<string, EntryRecord[]>();

  for (const e of entries) {
    if (!parCompte.has(e.debitAccount)) parCompte.set(e.debitAccount, []);
    if (!parCompte.has(e.creditAccount)) parCompte.set(e.creditAccount, []);
    parCompte.get(e.debitAccount)!.push(e);
    parCompte.get(e.creditAccount)!.push(e);
  }

  return Array.from(parCompte.entries())
    .map(([compte, ecritures]) => {
      const triees = [...ecritures].sort((a, b) => a.date.localeCompare(b.date));
      let solde = 0;
      let totalDebit = 0;
      let totalCredit = 0;
      const mouvements: MouvementGrandLivre[] = triees.map((e) => {
        const estDebit = e.debitAccount === compte;
        const debit = estDebit ? e.amount : 0;
        const credit = estDebit ? 0 : e.amount;
        solde += debit - credit;
        totalDebit += debit;
        totalCredit += credit;
        return { date: e.date, description: e.description, reference: e.reference, debit, credit, soldeProgressif: solde };
      });
      return { compte, libelle: libelleCompte(compte), mouvements, totalDebit, totalCredit, solde };
    })
    .sort((a, b) => a.compte.localeCompare(b.compte));
}

// ═══════════════════════════════════════════
// COMPTE DE RESULTAT (classes 6 et 7, + 8 HAO)
// ═══════════════════════════════════════════
export interface CompteResultat {
  produits: { compte: string; libelle: string; montant: number }[];
  charges: { compte: string; libelle: string; montant: number }[];
  totalProduits: number;
  totalCharges: number;
  resultat: number; // > 0 benefice, < 0 perte
}

export function calculerCompteResultat(entries: EntryRecord[]): CompteResultat {
  const balance = calculerBalance(entries);

  const produits = balance
    .filter((l) => classeDuCompte(l.compte) === 7 || (classeDuCompte(l.compte) === 8 && l.soldeCrediteur > 0))
    .map((l) => ({ compte: l.compte, libelle: l.libelle, montant: l.soldeCrediteur - l.soldeDebiteur }))
    .filter((p) => p.montant !== 0);

  const charges = balance
    .filter((l) => classeDuCompte(l.compte) === 6 || (classeDuCompte(l.compte) === 8 && l.soldeDebiteur > 0))
    .map((l) => ({ compte: l.compte, libelle: l.libelle, montant: l.soldeDebiteur - l.soldeCrediteur }))
    .filter((c) => c.montant !== 0);

  const totalProduits = produits.reduce((s, p) => s + p.montant, 0);
  const totalCharges = charges.reduce((s, c) => s + c.montant, 0);

  return { produits, charges, totalProduits, totalCharges, resultat: totalProduits - totalCharges };
}

// ═══════════════════════════════════════════
// BILAN SIMPLIFIE (classes 1-5)
// Actif = soldes debiteurs des classes 2,3,4,5 ; Passif = soldes crediteurs des
// classes 1,4,5 + resultat de l'exercice. Presentation simplifiee adaptee TPE/PME.
// ═══════════════════════════════════════════
export interface Bilan {
  actif: { compte: string; libelle: string; montant: number }[];
  passif: { compte: string; libelle: string; montant: number }[];
  totalActif: number;
  totalPassif: number;
  resultat: number;
}

export function calculerBilan(entries: EntryRecord[]): Bilan {
  const balance = calculerBalance(entries);
  const { resultat } = calculerCompteResultat(entries);

  const actif = balance
    .filter((l) => [2, 3, 4, 5].includes(classeDuCompte(l.compte)) && l.soldeDebiteur > 0)
    .map((l) => ({ compte: l.compte, libelle: l.libelle, montant: l.soldeDebiteur }));

  const passif = balance
    .filter((l) => [1, 4, 5].includes(classeDuCompte(l.compte)) && l.soldeCrediteur > 0)
    .map((l) => ({ compte: l.compte, libelle: l.libelle, montant: l.soldeCrediteur }));

  // Le resultat de l'exercice figure au passif (benefice augmente les capitaux).
  const passifAvecResultat = [...passif];
  if (resultat !== 0) {
    passifAvecResultat.push({
      compte: resultat >= 0 ? '120' : '129',
      libelle: resultat >= 0 ? 'Resultat de l\'exercice (benefice)' : 'Resultat de l\'exercice (perte)',
      montant: resultat,
    });
  }

  const totalActif = actif.reduce((s, a) => s + a.montant, 0);
  const totalPassif = passifAvecResultat.reduce((s, p) => s + p.montant, 0);

  return { actif, passif: passifAvecResultat, totalActif, totalPassif, resultat };
}

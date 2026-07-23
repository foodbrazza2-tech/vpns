// Comptabilisation automatique SYSCOHADA.
// A partir d'une facture (vente ou achat) ou d'un paiement, genere les ecritures
// en partie double, classees dans le bon journal (ventes, achats, banque, od).
// Chaque ecriture reste equilibree (un compte debite, un compte credite).

export type JournalType = 'ventes' | 'achats' | 'banque' | 'od';

export interface GeneratedEntry {
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  category: string;
  journal: JournalType;
  reference?: string;
}

// Comptes SYSCOHADA par defaut.
export const COMPTE = {
  CLIENT: '411', // Clients
  FOURNISSEUR: '401', // Fournisseurs
  TVA_COLLECTEE: '4431', // Etat, TVA facturee (vente)
  TVA_DEDUCTIBLE: '4452', // Etat, TVA recuperable sur achats
  VENTE_DEFAUT: '706', // Services vendus
  ACHAT_DEFAUT: '605', // Autres achats
  BANQUE: '5211', // Banque (compte principal)
  CAISSE: '5711', // Caisse
  ATTENTE: '471', // Comptes d'attente (mouvement bancaire a reclasser)
};

// Compte de tresorerie selon le mode de reglement.
export function compteTresorerie(method: string): string {
  switch (method) {
    case 'especes':
      return COMPTE.CAISSE;
    case 'virement':
    case 'cheque':
    case 'mobile_money':
    default:
      return COMPTE.BANQUE;
  }
}

interface InvoiceLike {
  type?: 'vente' | 'achat';
  invoiceNumber: string;
  date: string;
  amountHt: number;
  vatAmount: number;
  amount: number; // TTC
  counterpartAccount?: string; // compte de produit (vente) ou de charge (achat)
}

// Ecritures de la facture : vente => journal ventes ; achat => journal achats.
export function entriesForInvoice(inv: InvoiceLike): GeneratedEntry[] {
  const type = inv.type || 'vente';
  const ref = inv.invoiceNumber;
  const ht = round2(inv.amountHt);
  const tva = round2(inv.vatAmount);
  const entries: GeneratedEntry[] = [];

  if (type === 'vente') {
    const produit = inv.counterpartAccount || COMPTE.VENTE_DEFAUT;
    // 411 Client (debit TTC) / 706 Vente (credit HT) / 4431 TVA (credit TVA)
    entries.push({
      date: inv.date,
      description: `Vente ${ref}`,
      debitAccount: COMPTE.CLIENT,
      creditAccount: produit,
      amount: ht,
      category: 'vente',
      journal: 'ventes',
      reference: ref,
    });
    if (tva > 0) {
      entries.push({
        date: inv.date,
        description: `TVA collectee ${ref}`,
        debitAccount: COMPTE.CLIENT,
        creditAccount: COMPTE.TVA_COLLECTEE,
        amount: tva,
        category: 'vente',
        journal: 'ventes',
        reference: ref,
      });
    }
  } else {
    const charge = inv.counterpartAccount || COMPTE.ACHAT_DEFAUT;
    // 60x Achat (debit HT) / 4452 TVA deductible (debit TVA) / 401 Fournisseur (credit TTC)
    entries.push({
      date: inv.date,
      description: `Achat ${ref}`,
      debitAccount: charge,
      creditAccount: COMPTE.FOURNISSEUR,
      amount: ht,
      category: 'achat',
      journal: 'achats',
      reference: ref,
    });
    if (tva > 0) {
      entries.push({
        date: inv.date,
        description: `TVA deductible ${ref}`,
        debitAccount: COMPTE.TVA_DEDUCTIBLE,
        creditAccount: COMPTE.FOURNISSEUR,
        amount: tva,
        category: 'achat',
        journal: 'achats',
        reference: ref,
      });
    }
  }

  return entries;
}

interface PaymentLike {
  amount: number;
  method: string;
  paymentDate: string;
}

// Ecriture du reglement : journal banque/caisse.
// Vente encaissee : tresorerie (debit) / 411 client (credit).
// Achat regle : 401 fournisseur (debit) / tresorerie (credit).
export function entryForPayment(inv: InvoiceLike, payment: PaymentLike): GeneratedEntry {
  const type = inv.type || 'vente';
  const tres = compteTresorerie(payment.method);
  const montant = round2(payment.amount);
  if (type === 'vente') {
    return {
      date: payment.paymentDate,
      description: `Encaissement ${inv.invoiceNumber}`,
      debitAccount: tres,
      creditAccount: COMPTE.CLIENT,
      amount: montant,
      category: 'tresorerie',
      journal: 'banque',
      reference: inv.invoiceNumber,
    };
  }
  return {
    date: payment.paymentDate,
    description: `Reglement ${inv.invoiceNumber}`,
    debitAccount: COMPTE.FOURNISSEUR,
    creditAccount: tres,
    amount: montant,
    category: 'tresorerie',
    journal: 'banque',
    reference: inv.invoiceNumber,
  };
}

// Detecte si un document importe est une vente ou un achat (heuristique simple).
export function detectInvoiceType(text: string): 'vente' | 'achat' {
  const t = text.toLowerCase();
  if (/\b(facture d'achat|bon de commande|fournisseur|achat|nous vous devons|a payer)\b/.test(t)) {
    return 'achat';
  }
  return 'vente';
}

export type DocumentKind = 'vente' | 'achat' | 'virement_bancaire' | 'versement' | 'retrait';

// Classification plus large pour l'import de documents : un bordereau de
// virement/versement/retrait/releve bancaire n'est pas une facture et doit
// etre comptabilise directement en tresorerie plutot que force dans le
// circuit facture. Versement/retrait sont verifies avant le cas general
// "virement" (mots distincts, mais on privilegie la classification la plus
// precise quand plusieurs mots-cles apparaissent sur le meme document).
export function detectDocumentKind(text: string): DocumentKind {
  const t = text.toLowerCase();
  if (/\b(bordereau de versement|versement especes|depot especes|depot de fonds)\b/.test(t)) {
    return 'versement';
  }
  if (/\b(bordereau de retrait|retrait especes|retrait de fonds)\b/.test(t)) {
    return 'retrait';
  }
  if (/\b(bordereau de virement|virement bancaire|ordre de virement|releve bancaire|relev[ée] de compte|swift|iban)\b/.test(t)) {
    return 'virement_bancaire';
  }
  return detectInvoiceType(text);
}

// Sens du mouvement pour un bordereau de virement : entrant (le compte est
// credite) ou sortant (le compte est debite). Par defaut on suppose entrant
// (encaissement), le cas le plus frequent pour un virement recu d'un client.
export function detectTransferDirection(text: string): 'entrant' | 'sortant' {
  const t = text.toLowerCase();
  if (/\b(virement emis|debit|paiement envoye|ordre de paiement|beneficiaire)\b/.test(t)) {
    return 'sortant';
  }
  return 'entrant';
}

// Ecriture pour un bordereau de virement bancaire importe sans facture liee.
// Le contre-compte est le compte d'attente (471) : une ecriture bancaire sans
// piece justificative rattachable ne doit jamais etre affectee directement a
// un compte definitif - c'est a l'utilisateur de la reclasser ensuite, ce qui
// est la pratique standard face a un mouvement bancaire non identifie.
export function entryForBankTransfer(data: { date: string; amount: number; method: string; direction: 'entrant' | 'sortant'; description: string; reference?: string }): GeneratedEntry {
  const tres = compteTresorerie(data.method);
  const montant = round2(data.amount);
  if (data.direction === 'entrant') {
    return {
      date: data.date,
      description: data.description,
      debitAccount: tres,
      creditAccount: COMPTE.ATTENTE,
      amount: montant,
      category: 'tresorerie',
      journal: 'banque',
      reference: data.reference,
    };
  }
  return {
    date: data.date,
    description: data.description,
    debitAccount: COMPTE.ATTENTE,
    creditAccount: tres,
    amount: montant,
    category: 'tresorerie',
    journal: 'banque',
    reference: data.reference,
  };
}

// Bordereau de versement (especes -> banque) ou de retrait (banque -> especes) :
// mouvement interne entierement determine des deux cotes, contrairement a un
// virement externe - donc aucun compte d'attente necessaire ici.
export function entryForCaisseBanqueTransfer(
  kind: 'versement' | 'retrait',
  data: { date: string; amount: number; description: string; reference?: string }
): GeneratedEntry {
  const montant = round2(data.amount);
  if (kind === 'versement') {
    return {
      date: data.date,
      description: data.description,
      debitAccount: COMPTE.BANQUE,
      creditAccount: COMPTE.CAISSE,
      amount: montant,
      category: 'tresorerie',
      journal: 'banque',
      reference: data.reference,
    };
  }
  return {
    date: data.date,
    description: data.description,
    debitAccount: COMPTE.CAISSE,
    creditAccount: COMPTE.BANQUE,
    amount: montant,
    category: 'tresorerie',
    journal: 'banque',
    reference: data.reference,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

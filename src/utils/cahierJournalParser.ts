// Analyse d'une photo de cahier journal papier : contrairement a l'import d'un
// document unique (une facture = une operation), une page de cahier contient
// PLUSIEURS operations (une par ligne). On decoupe le texte OCR ligne par
// ligne et on essaie d'en extraire une date, un montant et un sens
// (entree/sortie) pour chacune. Le resultat est TOUJOURS presente a
// l'utilisateur pour verification avant enregistrement (l'OCR sur une
// ecriture manuscrite reste faillible) - jamais poste directement en base.
import { extractAmounts, extractDate } from './helpers';

export interface CandidateCaisseOperation {
  lineRaw: string;
  date: string;
  description: string;
  amount: number;
  sens: 'entree' | 'sortie' | 'inconnu';
}

const MOTS_ENTREE = /\b(recu|reçu|encaisse|encaissé|vente|versement|recette|encaissement|depot)\b/i;
const MOTS_SORTIE = /\b(paye|payé|sorti|achat|depense|dépense|decaissement|décaissement|regle|réglé|retrait|charge)\b/i;

function detecterSens(ligne: string): 'entree' | 'sortie' | 'inconnu' {
  if (MOTS_SORTIE.test(ligne)) return 'sortie';
  if (MOTS_ENTREE.test(ligne)) return 'entree';
  return 'inconnu';
}

// Retire de la ligne le token de date et le plus gros montant detecte, pour
// ne garder que le libelle descriptif.
function nettoyerDescription(ligne: string, montant: number | null): string {
  let cleaned = ligne;
  if (montant !== null) {
    // Retire la premiere occurrence du montant (avec ou sans separateurs).
    const montantStr = montant.toLocaleString('fr-FR').replace(/ | /g, ' ');
    cleaned = cleaned.replace(montantStr, ' ');
    cleaned = cleaned.replace(new RegExp(`\\b${montant}\\b`), ' ');
  }
  cleaned = cleaned.replace(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b/, ' ');
  return cleaned.replace(/\s+/g, ' ').trim() || 'Operation de caisse';
}

// Decoupe le texte OCR d'une page de cahier journal en operations candidates.
// La date est reportee d'une ligne a l'autre quand une ligne n'en contient pas
// (pratique courante : la date n'est ecrite qu'une fois par jour dans un cahier).
export function parseCahierJournalLines(text: string, fallbackDate: string): CandidateCaisseOperation[] {
  const lignes = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const candidates: CandidateCaisseOperation[] = [];
  let currentDate = fallbackDate;

  for (const ligne of lignes) {
    const dateDetectee = extractDate(ligne);
    if (dateDetectee) currentDate = dateDetectee;

    const amounts = extractAmounts(ligne);
    if (amounts.length === 0) continue; // ligne sans montant : probablement du bruit/entete

    const amount = Math.max(...amounts);
    candidates.push({
      lineRaw: ligne,
      date: currentDate,
      description: nettoyerDescription(ligne, amount),
      amount,
      sens: detecterSens(ligne),
    });
  }

  return candidates;
}

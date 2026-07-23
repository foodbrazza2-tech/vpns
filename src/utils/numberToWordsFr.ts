// Conversion d'un montant en toutes lettres (francais), pour la mention legale
// "Arretee la presente facture a la somme de : ..." sur les factures PDF.
import { formatNumberFr } from './format';

const UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const TEENS = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', '', 'quatre-vingt', ''];

function convertTwoDigits(n: number): string {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  const tenIdx = Math.floor(n / 10);
  const unit = n % 10;

  // Familles 70-79 et 90-99 : construites sur soixante/quatre-vingt + un nombre de 10-19.
  if (tenIdx === 7 || tenIdx === 9) {
    const base = tenIdx === 7 ? 'soixante' : 'quatre-vingt';
    if (unit === 1 && tenIdx === 7) return `${base} et onze`; // 71 est la seule exception avec "et"
    return `${base}-${TEENS[unit]}`;
  }
  if (unit === 0) return tenIdx === 8 ? 'quatre-vingts' : TENS[tenIdx]; // "s" uniquement sur 80 rond
  if (unit === 1 && tenIdx !== 8) return `${TENS[tenIdx]} et un`; // 21,31,41,51,61 (pas 81)
  return `${TENS[tenIdx]}-${UNITS[unit]}`;
}

// suppressCentPlural : "cent" perd son "s" quand il est multiplicateur d'un
// groupe mille/million/milliard qui suit (ex: "cinq cent mille", jamais
// "cinq cents mille") - seul le groupe final (non suivi d'un multiplicateur)
// garde le "s" de "cents" quand applicable.
function convertHundreds(n: number, suppressCentPlural = false): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let result = '';
  if (h > 0) {
    result = h === 1 ? 'cent' : `${UNITS[h]} cent`;
    if (rest === 0 && h > 1 && !suppressCentPlural) result += 's'; // "deux cents" mais "deux cent un"
  }
  if (rest > 0) {
    result += (result ? ' ' : '') + convertTwoDigits(rest);
  }
  return result;
}

// Convertit un entier positif en toutes lettres francaises (jusqu'au milliard).
export function numberToFrenchWords(n: number): string {
  const value = Math.round(Math.abs(n));
  if (value === 0) return 'zero';

  const milliard = Math.floor(value / 1_000_000_000);
  const million = Math.floor((value % 1_000_000_000) / 1_000_000);
  const mille = Math.floor((value % 1_000_000) / 1000);
  const reste = value % 1000;

  const parts: string[] = [];
  if (milliard > 0) {
    parts.push(`${milliard === 1 ? 'un' : convertHundreds(milliard, true)} milliard${milliard > 1 ? 's' : ''}`);
  }
  if (million > 0) {
    parts.push(`${million === 1 ? 'un' : convertHundreds(million, true)} million${million > 1 ? 's' : ''}`);
  }
  if (mille > 0) {
    parts.push(mille === 1 ? 'mille' : `${convertHundreds(mille, true)} mille`);
  }
  if (reste > 0) {
    parts.push(convertHundreds(reste));
  }
  return parts.join(' ');
}

// Mention legale complete pour une facture en FCFA, ex: "Cinquante mille francs (50 000) CFA".
export function montantEnLettresFcfa(amount: number): string {
  const rounded = Math.round(amount);
  const words = numberToFrenchWords(rounded);
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  return `${capitalized} francs (${formatNumberFr(rounded)}) CFA`;
}

import { describe, it, expect } from 'vitest';
import { numberToFrenchWords, montantEnLettresFcfa } from './numberToWordsFr';

describe('numberToFrenchWords', () => {
  it('convertit zero et les unites simples', () => {
    expect(numberToFrenchWords(0)).toBe('zero');
    expect(numberToFrenchWords(7)).toBe('sept');
  });

  it('convertit les nombres de 10 a 19', () => {
    expect(numberToFrenchWords(11)).toBe('onze');
    expect(numberToFrenchWords(17)).toBe('dix-sept');
  });

  it('gere les exceptions 70-79 (soixante...)', () => {
    expect(numberToFrenchWords(70)).toBe('soixante-dix');
    expect(numberToFrenchWords(71)).toBe('soixante et onze');
    expect(numberToFrenchWords(72)).toBe('soixante-douze');
    expect(numberToFrenchWords(79)).toBe('soixante-dix-neuf');
  });

  it('gere les exceptions 80-99 (quatre-vingt...)', () => {
    expect(numberToFrenchWords(80)).toBe('quatre-vingts');
    expect(numberToFrenchWords(81)).toBe('quatre-vingt-un'); // pas de "et"
    expect(numberToFrenchWords(90)).toBe('quatre-vingt-dix');
    expect(numberToFrenchWords(91)).toBe('quatre-vingt-onze'); // pas de "et"
    expect(numberToFrenchWords(99)).toBe('quatre-vingt-dix-neuf');
  });

  it('gere le et un pour 21, 31, 41, 51, 61', () => {
    expect(numberToFrenchWords(21)).toBe('vingt et un');
    expect(numberToFrenchWords(61)).toBe('soixante et un');
  });

  it('gere les centaines avec et sans s', () => {
    expect(numberToFrenchWords(100)).toBe('cent');
    expect(numberToFrenchWords(200)).toBe('deux cents');
    expect(numberToFrenchWords(201)).toBe('deux cent un'); // pas de s si suivi d'un chiffre
  });

  it('gere mille invariable', () => {
    expect(numberToFrenchWords(1000)).toBe('mille'); // jamais un mille
    expect(numberToFrenchWords(2000)).toBe('deux mille'); // jamais deux milles
  });

  it('convertit 50000 comme sur la facture de reference', () => {
    expect(numberToFrenchWords(50000)).toBe('cinquante mille');
  });

  it('convertit un nombre compose complexe', () => {
    expect(numberToFrenchWords(125430)).toBe('cent vingt-cinq mille quatre cent trente');
  });

  it('convertit les millions', () => {
    expect(numberToFrenchWords(1000000)).toBe('un million');
    expect(numberToFrenchWords(2500000)).toBe('deux millions cinq cent mille');
  });
});

const normalizeSpaces = (s: string) => s.replace(/\s+/g, ' ');

describe('montantEnLettresFcfa', () => {
  it('produit la mention legale complete comme sur la facture de reference', () => {
    expect(normalizeSpaces(montantEnLettresFcfa(50000))).toBe('Cinquante mille francs (50 000) CFA');
  });

  it('arrondit et met en forme les grands montants', () => {
    expect(normalizeSpaces(montantEnLettresFcfa(1234567))).toBe(
      'Un million deux cent trente-quatre mille cinq cent soixante-sept francs (1 234 567) CFA'
    );
  });
});

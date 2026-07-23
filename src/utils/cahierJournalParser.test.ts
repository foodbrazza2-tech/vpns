import { describe, it, expect } from 'vitest';
import { parseCahierJournalLines } from './cahierJournalParser';

describe('Analyse du cahier journal (photo multi-operations)', () => {
  it('extrait plusieurs operations depuis un texte multi-lignes', () => {
    const texte = [
      'Cahier journal - 10/07/2026',
      'Vente marchandise recu 50 000',
      'Achat fournitures paye 15 000',
      'Ligne sans montant a ignorer',
      'Retrait especes 20 000',
    ].join('\n');

    const candidates = parseCahierJournalLines(texte, '2026-01-01');
    // La ligne d'entete ("10/07/2026" seul, sans montant) ne genere pas de candidat,
    // mais fixe la date pour les lignes suivantes.
    expect(candidates).toHaveLength(3);
    expect(candidates.every((c) => c.date === '2026-07-10')).toBe(true);
    expect(candidates[0].amount).toBe(50000);
    expect(candidates[0].sens).toBe('entree');
    expect(candidates[1].amount).toBe(15000);
    expect(candidates[1].sens).toBe('sortie');
    expect(candidates[2].sens).toBe('sortie'); // "retrait" = sortie de caisse
  });

  it('reporte la derniere date connue quand une ligne n\'en contient pas', () => {
    const texte = 'Journee du 05/07/2026\nVente 1 - encaisse 10 000\nVente 2 - encaisse 20 000';
    const candidates = parseCahierJournalLines(texte, '2026-01-01');
    expect(candidates).toHaveLength(2);
    expect(candidates[0].date).toBe('2026-07-05');
    expect(candidates[1].date).toBe('2026-07-05');
  });

  it('utilise la date de secours si aucune date n\'est detectee du tout', () => {
    const texte = 'Vente recu 30 000';
    const candidates = parseCahierJournalLines(texte, '2026-03-15');
    expect(candidates[0].date).toBe('2026-03-15');
  });

  it('ignore les lignes sans montant plausible', () => {
    const texte = 'Titre du cahier\nRemarques diverses\nAchat fournitures paye 12 000';
    const candidates = parseCahierJournalLines(texte, '2026-01-01');
    expect(candidates).toHaveLength(1);
    expect(candidates[0].amount).toBe(12000);
  });

  it('marque "inconnu" quand le sens ne peut pas etre determine', () => {
    const texte = 'Operation diverse 5 000';
    const candidates = parseCahierJournalLines(texte, '2026-01-01');
    expect(candidates[0].sens).toBe('inconnu');
  });
});

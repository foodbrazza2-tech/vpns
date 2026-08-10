// Verifie la tolerance aux pannes et le mapping de searchAll (voir le
// commentaire en tete du fichier source) : la migration schema_v8 (colonnes
// search_vector) peut ne pas avoir encore ete executee - dans ce cas
// l'assistant doit repondre "aucun resultat" plutot que de planter.
import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeChainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    textSearch: () => builder,
    limit: () => builder,
    then: (onFulfilled: (v: unknown) => void, onRejected: (e: unknown) => void) => {
      try {
        onFulfilled(result);
      } catch (e) {
        onRejected(e);
      }
    },
  };
  return builder;
}

const state: { from: ReturnType<typeof vi.fn> } = { from: vi.fn() };

vi.mock('./authService', () => ({
  supabase: { from: (table: string) => state.from(table) },
}));

describe('searchService - recherche plein-texte', () => {
  beforeEach(() => {
    state.from.mockReset();
  });

  it('renvoie des resultats vides pour une requete vide, sans appeler Supabase', async () => {
    const { searchAll } = await import('./searchService');
    expect(await searchAll('   ')).toEqual({ clients: [], invoices: [], entries: [] });
    expect(state.from).not.toHaveBeenCalled();
  });

  it('renvoie des resultats vides si la colonne search_vector n\'existe pas encore (migration non executee)', async () => {
    state.from.mockReturnValue(makeChainable({ data: null, error: { message: 'column "search_vector" does not exist' } }));
    const { searchAll } = await import('./searchService');
    expect(await searchAll('Cartouche Market')).toEqual({ clients: [], invoices: [], entries: [] });
  });

  it('renvoie des resultats vides si la requete leve une exception', async () => {
    state.from.mockImplementation(() => {
      throw new Error('reseau indisponible');
    });
    const { searchAll } = await import('./searchService');
    expect(await searchAll('Cartouche Market')).toEqual({ clients: [], invoices: [], entries: [] });
  });

  it('mappe correctement les lignes de chaque table (snake_case DB -> camelCase app)', async () => {
    state.from.mockImplementation((table: string) => {
      if (table === 'clients') return makeChainable({ data: [{ id: 'c1', name: 'Cartouche Market', company: 'Cartouche Market SARL' }], error: null });
      if (table === 'invoices') {
        return makeChainable({
          data: [{ id: 'i1', invoice_number: '03/DG/VPNS/2026', description: 'Conseil', amount: 118000, invoice_date: '2026-07-23', status: 'sent', type: 'vente' }],
          error: null,
        });
      }
      if (table === 'accounting_entries') {
        return makeChainable({ data: [{ id: 'e1', description: 'Electricite EEC', amount: 25000, entry_date: '2026-07-10', category: 'Energie' }], error: null });
      }
      return makeChainable({ data: [], error: null });
    });

    const { searchAll } = await import('./searchService');
    const result = await searchAll('test');

    expect(result.clients).toEqual([{ id: 'c1', name: 'Cartouche Market', company: 'Cartouche Market SARL' }]);
    expect(result.invoices).toEqual([
      { id: 'i1', invoiceNumber: '03/DG/VPNS/2026', description: 'Conseil', amount: 118000, date: '2026-07-23', status: 'sent', type: 'vente' },
    ]);
    expect(result.entries).toEqual([{ id: 'e1', description: 'Electricite EEC', amount: 25000, date: '2026-07-10', category: 'Energie' }]);
  });
});

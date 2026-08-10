// Verifie la tolerance aux pannes de assistantMemoryService (voir le
// commentaire en tete du fichier source) : la migration schema_v7 peut ne
// pas avoir encore ete executee, ou une requete peut echouer pour une autre
// raison - dans tous les cas, la conversation ne doit jamais planter, juste
// perdre la memoire persistante pour ce tour.
import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeChainable(result: { data: unknown; error: unknown } | (() => { data: unknown; error: unknown })) {
  const resolve = () => (typeof result === 'function' ? result() : result);
  const builder: Record<string, unknown> = {
    select: () => builder,
    order: () => builder,
    limit: () => builder,
    insert: () => builder,
    delete: () => builder,
    not: () => builder,
    then: (onFulfilled: (v: unknown) => void, onRejected: (e: unknown) => void) => {
      try {
        onFulfilled(resolve());
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

describe('assistantMemoryService - tolerance aux pannes', () => {
  beforeEach(() => {
    state.from.mockReset();
  });

  it('listAssistantMessages renvoie [] si la table assistant_messages n\'existe pas encore (migration non executee)', async () => {
    state.from.mockReturnValue(makeChainable({ data: null, error: { message: 'relation "assistant_messages" does not exist' } }));
    const { listAssistantMessages } = await import('./assistantMemoryService');
    expect(await listAssistantMessages()).toEqual([]);
  });

  it('listAssistantMessages renvoie [] si la requete leve une exception', async () => {
    state.from.mockImplementation(() => {
      throw new Error('reseau indisponible');
    });
    const { listAssistantMessages } = await import('./assistantMemoryService');
    expect(await listAssistantMessages()).toEqual([]);
  });

  it('listAssistantMessages remet les messages en ordre chronologique (la requete les recupere du plus recent au plus ancien)', async () => {
    state.from.mockReturnValue(
      makeChainable({
        data: [
          { role: 'model', content: 'Facture creee.', created_at: '2026-08-07T10:02:00Z' },
          { role: 'user', content: 'Facture Cartouche Market 100000', created_at: '2026-08-07T10:01:00Z' },
        ],
        error: null,
      })
    );
    const { listAssistantMessages } = await import('./assistantMemoryService');
    const result = await listAssistantMessages();
    expect(result).toEqual([
      { role: 'user', content: 'Facture Cartouche Market 100000' },
      { role: 'model', content: 'Facture creee.' },
    ]);
  });

  it('saveAssistantMessage ne leve jamais, meme si insert echoue', async () => {
    state.from.mockImplementation(() => {
      throw new Error('table manquante');
    });
    const { saveAssistantMessage } = await import('./assistantMemoryService');
    await expect(saveAssistantMessage('user', 'test')).resolves.toBeUndefined();
  });

  it('clearAssistantMessages ne leve jamais, meme si delete echoue', async () => {
    state.from.mockImplementation(() => {
      throw new Error('table manquante');
    });
    const { clearAssistantMessages } = await import('./assistantMemoryService');
    await expect(clearAssistantMessages()).resolves.toBeUndefined();
  });
});

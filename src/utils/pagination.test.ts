import { describe, it, expect } from 'vitest';
import { paginate } from './pagination';

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it('decoupe la premiere page correctement', () => {
    const result = paginate(items, 1, 10);
    expect(result.items).toEqual(Array.from({ length: 10 }, (_, i) => i + 1));
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(1);
  });

  it('decoupe la derniere page (partielle)', () => {
    const result = paginate(items, 3, 10);
    expect(result.items).toEqual([21, 22, 23, 24, 25]);
    expect(result.page).toBe(3);
  });

  it('ramene une page demandee hors bornes a la derniere page valide', () => {
    const result = paginate(items, 99, 10);
    expect(result.page).toBe(3);
    expect(result.items).toEqual([21, 22, 23, 24, 25]);
  });

  it('ramene une page a 0 ou negative a la page 1', () => {
    expect(paginate(items, 0, 10).page).toBe(1);
    expect(paginate(items, -5, 10).page).toBe(1);
  });

  it('gere une liste vide sans planter', () => {
    const result = paginate([], 1, 10);
    expect(result.items).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
  });
});

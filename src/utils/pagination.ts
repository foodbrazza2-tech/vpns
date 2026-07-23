// Pagination generique pour les listes de l'app (clients, factures, ecritures,
// evenements, rapports, notifications). Pure et testable independamment du rendu.

export const DEFAULT_PAGE_SIZE = 10;

export interface PaginationResult<T> {
  items: T[];
  totalPages: number;
  page: number;
}

// Renvoie la page demandee, mais jamais au-dela du nombre de pages reel (evite
// une page vide affichee quand la liste retrecit apres un filtre/suppression).
export function paginate<T>(items: T[], page: number, pageSize: number): PaginationResult<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    totalPages,
    page: safePage,
  };
}

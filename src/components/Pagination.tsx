interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination-bar">
      <button type="button" className="ghost-btn small-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Precedent
      </button>
      <span>Page {page} / {totalPages}</span>
      <button type="button" className="ghost-btn small-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Suivant
      </button>
    </div>
  );
}

export default Pagination;

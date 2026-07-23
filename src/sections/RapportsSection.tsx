import { useState } from 'react';
import EmptyState from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { exportTableToCsv } from '../utils/csvExport';
import { formatDate } from '../utils/format';
import { paginate, DEFAULT_PAGE_SIZE } from '../utils/pagination';
import type { ReportRecord } from '../services/businessDataService';

interface CategoryBreakdownRow {
  category: string;
  amount: number;
  pct: number;
}

interface RapportsSectionProps {
  selectedExercise: number;
  availableExercises: number[];
  onExerciseChange: (year: number) => void;
  categoryBreakdown: CategoryBreakdownRow[];
  reports: ReportRecord[];
  onEdit: (report: ReportRecord) => void;
  onDelete: (report: ReportRecord) => void;
}

export function RapportsSection({
  selectedExercise,
  availableExercises,
  onExerciseChange,
  categoryBreakdown,
  reports,
  onEdit,
  onDelete,
}: RapportsSectionProps) {
  const [page, setPage] = useState(1);
  const { items: pageItems, totalPages, page: currentPage } = paginate(reports, page, DEFAULT_PAGE_SIZE);

  return (
    <section className="section-stack">
      <div className="exercise-bar">
        <span>Exercice comptable (1er janvier - 31 decembre)</span>
        <select value={selectedExercise} onChange={(e) => onExerciseChange(Number(e.target.value))}>
          {availableExercises.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <article className="panel-card">
        <div className="panel-top">
          <h4>Repartition par categorie - Exercice {selectedExercise}</h4>
          <span>Comptabilite</span>
        </div>
        {categoryBreakdown.length === 0 ? (
          <p className="chart-empty-hint">Aucune donnee a visualiser pour le moment. Ajoutez des ecritures comptables.</p>
        ) : (
          <div className="cat-breakdown">
            {categoryBreakdown.map((row) => (
              <div className="cat-row" key={row.category}>
                <span>{row.category}</span>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${row.pct}%`, background: 'var(--primary)' }} />
                </div>
                <span className="cat-pct">{row.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="panel-card">
        <div className="panel-top">
          <h4>Rapports generes</h4>
          <div className="panel-top-actions">
            <span>{reports.length} rapport(s)</span>
            {reports.length > 0 && (
              <>
                <button
                  type="button"
                  className="ghost-btn small-btn"
                  onClick={() => exportTableToCsv({
                    columns: ['Titre', 'Type', 'Periode', 'Debut', 'Fin'],
                    rows: reports.map((r) => [r.title, r.type, r.period, formatDate(r.startDate), formatDate(r.endDate)]),
                    fileName: 'rapports-vpns.csv',
                  })}
                >
                  CSV
                </button>
                <button
                  type="button"
                  className="ghost-btn small-btn"
                  onClick={async () => {
                    const { exportTableToPdf } = await import('../utils/pdfExport');
                    exportTableToPdf({
                      title: 'Rapports generes',
                      subtitle: `Export du ${new Date().toLocaleDateString('fr-FR')} - ${reports.length} rapport(s)`,
                      columns: ['Titre', 'Type', 'Periode', 'Debut', 'Fin'],
                      rows: reports.map((r) => [r.title, r.type, r.period, formatDate(r.startDate), formatDate(r.endDate)]),
                      fileName: 'rapports-vpns.pdf',
                    });
                  }}
                >
                  Exporter PDF
                </button>
              </>
            )}
          </div>
        </div>
        {reports.length === 0 ? (
          <EmptyState
            title="Aucun rapport"
            description="Generez votre premier rapport pour analyser votre activite."
          />
        ) : (
          <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Titre</th>
                <th>Type</th>
                <th>Periode</th>
                <th>Debut</th>
                <th>Fin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((report) => (
                <tr key={report.id}>
                  <td>{report.title}</td>
                  <td>{report.type}</td>
                  <td>{report.period}</td>
                  <td>{formatDate(report.startDate)}</td>
                  <td>{formatDate(report.endDate)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="ghost-btn small-btn" onClick={() => onEdit(report)}>Modifier</button>
                      <button type="button" className="ghost-btn small-btn" onClick={() => onDelete(report)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </article>
    </section>
  );
}

export default RapportsSection;

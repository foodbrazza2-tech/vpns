import { useState } from 'react';
import EmptyState from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { exportTableToCsv } from '../utils/csvExport';
import { paginate, DEFAULT_PAGE_SIZE } from '../utils/pagination';
import type { ClientRecord } from '../services/businessDataService';

interface ClientsSectionProps {
  clientsList: ClientRecord[];
  onEdit: (client: ClientRecord) => void;
  onDelete: (client: ClientRecord) => void;
}

export function ClientsSection({ clientsList, onEdit, onDelete }: ClientsSectionProps) {
  const [page, setPage] = useState(1);
  const { items: pageItems, totalPages, page: currentPage } = paginate(clientsList, page, DEFAULT_PAGE_SIZE);

  return (
    <section className="section-stack">
      <article className="panel-card">
        <div className="panel-top">
          <h4>Clients</h4>
          <div className="panel-top-actions">
            <span>{clientsList.length} client(s)</span>
            {clientsList.length > 0 && (
              <>
                <button
                  type="button"
                  className="ghost-btn small-btn"
                  onClick={() => exportTableToCsv({
                    columns: ['Contact', 'Entreprise', 'Email', 'Telephone', 'Ville', 'Dossier archive'],
                    rows: clientsList.map((c) => [c.name, c.company, c.email, c.phone, c.city || '-', c.archiveFolder || '-']),
                    fileName: 'clients-vpns.csv',
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
                      title: 'Clients',
                      subtitle: `Export du ${new Date().toLocaleDateString('fr-FR')} - ${clientsList.length} client(s)`,
                      columns: ['Contact', 'Entreprise', 'Email', 'Telephone', 'Ville', 'Dossier archive'],
                      rows: clientsList.map((c) => [c.name, c.company, c.email, c.phone, c.city || '-', c.archiveFolder || '-']),
                      fileName: 'clients-vpns.pdf',
                    });
                  }}
                >
                  Exporter PDF
                </button>
              </>
            )}
          </div>
        </div>
        {clientsList.length === 0 ? (
          <EmptyState
            title="Aucun client"
            description="Ajoutez votre premier client pour commencer l'archivage et la facturation."
          />
        ) : (
          <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Contact</th>
                <th>Entreprise</th>
                <th>Email</th>
                <th>Telephone</th>
                <th>Ville</th>
                <th>Dossier archive</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((client) => (
                <tr key={client.id}>
                  <td>{client.name}</td>
                  <td>{client.company}</td>
                  <td>{client.email}</td>
                  <td>{client.phone}</td>
                  <td>{client.city || '-'}</td>
                  <td>{client.archiveFolder}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="ghost-btn small-btn" onClick={() => onEdit(client)}>Modifier</button>
                      <button type="button" className="ghost-btn small-btn" onClick={() => onDelete(client)}>Supprimer</button>
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

export default ClientsSection;

import { useState } from 'react';
import EmptyState from '../components/EmptyState';
import { MiniCalendar } from '../components/MiniCalendar';
import { Pagination } from '../components/Pagination';
import { formatDate } from '../utils/format';
import { paginate, DEFAULT_PAGE_SIZE } from '../utils/pagination';
import type { EventRecord } from '../services/businessDataService';

interface ParsedAppointment {
  title: string;
  date: string;
  hour: string;
}

interface AgendaSectionProps {
  events: EventRecord[];
  appointmentText: string;
  onAppointmentTextChange: (value: string) => void;
  parsedAppointment: ParsedAppointment;
  onEdit: (event: EventRecord) => void;
  onDelete: (event: EventRecord) => void;
}

export function AgendaSection({ events, appointmentText, onAppointmentTextChange, parsedAppointment, onEdit, onDelete }: AgendaSectionProps) {
  const [page, setPage] = useState(1);
  const { items: pageItems, totalPages, page: currentPage } = paginate(events, page, DEFAULT_PAGE_SIZE);

  return (
    <section className="section-stack">
      <div className="content-grid">
        <article className="panel-card">
          <div className="panel-top">
            <h4>Evenements a venir</h4>
            <span>{events.length} evenement(s)</span>
          </div>
          {events.length === 0 ? (
            <EmptyState
              title="Aucun evenement"
              description="Planifiez votre premier rendez-vous ou rappel."
            />
          ) : (
            <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Type</th>
                  <th>Lieu</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((event) => (
                  <tr key={event.id}>
                    <td>{event.title}</td>
                    <td>{formatDate(event.date)}</td>
                    <td>{event.time}</td>
                    <td>{event.type}</td>
                    <td>{event.location || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="ghost-btn small-btn" onClick={() => onEdit(event)}>Modifier</button>
                        <button type="button" className="ghost-btn small-btn" onClick={() => onDelete(event)}>Supprimer</button>
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
        <article className="panel-card">
          <div className="panel-top">
            <h4>Calendrier</h4>
            <span>Mois en cours</span>
          </div>
          <MiniCalendar highlightDates={events.map((e) => e.date)} />
        </article>
      </div>

      <article className="panel-card">
        <div className="panel-top">
          <h4>Agenda rapide</h4>
          <span>Assistant</span>
        </div>
        <input
          value={appointmentText}
          onChange={(e) => onAppointmentTextChange(e.target.value)}
          placeholder="Ex: demain 14h reunion client"
        />
        <div className="parsed-box">
          <p><strong>Titre :</strong> {parsedAppointment.title || 'A definir'}</p>
          <p><strong>Date :</strong> {parsedAppointment.date || 'Non detectee'}</p>
          <p><strong>Heure :</strong> {parsedAppointment.hour || 'Non detectee'}</p>
        </div>
      </article>
    </section>
  );
}

export default AgendaSection;

import { useState } from 'react';
import EmptyState from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { formatDate } from '../utils/format';
import { paginate, DEFAULT_PAGE_SIZE } from '../utils/pagination';
import type { NotificationRecord } from '../services/businessDataService';
import type { NotificationData } from '../components/NotificationModal';

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  tone: 'orange' | 'red' | 'blue';
}

const notificationDotColors: Record<NotificationData['type'], string> = {
  reminder: 'orange',
  alert: 'red',
  success: 'green',
  info: 'blue',
};

interface NotificationsSectionProps {
  systemNotifications: SystemNotification[];
  notifications: NotificationRecord[];
  onEdit: (notif: NotificationRecord) => void;
  onDelete: (notif: NotificationRecord) => void;
}

export function NotificationsSection({ systemNotifications, notifications, onEdit, onDelete }: NotificationsSectionProps) {
  const [page, setPage] = useState(1);
  const { items: pageItems, totalPages, page: currentPage } = paginate(notifications, page, DEFAULT_PAGE_SIZE);

  return (
    <section className="section-stack">
      {systemNotifications.length > 0 && (
        <article className="panel-card">
          <div className="panel-top">
            <h4>Alertes automatiques</h4>
            <span>{systemNotifications.length} alerte(s)</span>
          </div>
          <div className="notif-types">
            {systemNotifications.map((notif) => (
              <div className="notif-type-row" key={notif.id}>
                <span className={`notif-dot ${notif.tone}`} />
                <span>{notif.title} - {notif.message}</span>
                <strong className="chip neutral">Systeme</strong>
              </div>
            ))}
          </div>
        </article>
      )}

      <article className="panel-card">
        <div className="panel-top">
          <h4>Notifications et relances</h4>
          <span>{notifications.length} notification(s)</span>
        </div>
        {notifications.length === 0 ? (
          <EmptyState
            title="Aucune notification"
            description="Programmez une relance ou une alerte pour vos clients."
          />
        ) : (
          <div className="notif-types">
            {pageItems.map((notif) => (
              <div className="notif-type-row" key={notif.id}>
                <span className={`notif-dot ${notificationDotColors[notif.type]}`} />
                <span>{notif.title} - {notif.message}</span>
                <strong>{formatDate(notif.sendDate)} {notif.sendTime}</strong>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="ghost-btn small-btn" onClick={() => onEdit(notif)}>Modifier</button>
                  <button type="button" className="ghost-btn small-btn" onClick={() => onDelete(notif)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </article>
    </section>
  );
}

export default NotificationsSection;

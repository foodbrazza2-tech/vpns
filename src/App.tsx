import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import PageHeader from './components/PageHeader';
import EmptyState from './components/EmptyState';
import { ArchiveManager } from './components/ArchiveManager';
import { AccountingEntryModal, AccountingEntryData } from './components/AccountingEntryModal';
import { ClientModal, ClientData } from './components/ClientModal';
import { InvoiceModal, InvoiceData } from './components/InvoiceModal';
import { EventModal, EventData } from './components/EventModal';
import { ReportModal, ReportData } from './components/ReportModal';
import { NotificationModal, NotificationData } from './components/NotificationModal';
import { LoginComponent } from './components/LoginComponent';
import NotificationToast from './components/NotificationToast';
import AuthService from './services/authService';
import { parseAppointmentText, parseQuickEntry, parseInvoiceFromFile } from './utils/helpers';
import { exportTableToCsv } from './utils/csvExport';
import {
  type EntryRecord,
  type ClientRecord,
  type InvoiceRecord,
  type EventRecord,
  type ReportRecord,
  type NotificationRecord,
  listClients,
  createClient,
  listInvoices,
  createInvoice,
  listAccountingEntries,
  createAccountingEntry,
  listEvents,
  createEvent,
  listReports,
  createReport,
  listNotifications,
  createNotification,
} from './services/businessDataService';

type SectionKey = 'dashboard' | 'comptabilite' | 'factures' | 'clients' | 'agenda' | 'documents' | 'rapports' | 'notifications' | 'parametres';

const sectionLabels: Record<SectionKey, string> = {
  dashboard: 'Tableau de bord',
  comptabilite: 'Comptabilite',
  factures: 'Factures',
  clients: 'Clients',
  agenda: 'Agenda',
  documents: 'Documents',
  rapports: 'Rapports',
  notifications: 'Notifications',
  parametres: 'Parametres',
};

const sectionActions: Partial<Record<SectionKey, string>> = {
  dashboard: 'Nouvelle ecriture comptable',
  comptabilite: 'Nouvelle ecriture comptable',
  factures: 'Nouvelle facture',
  clients: 'Nouveau client',
  agenda: 'Nouvel evenement',
  rapports: 'Nouveau rapport',
  notifications: 'Nouvelle notification',
};

const invoiceStatusLabels: Record<InvoiceData['status'], string> = {
  draft: 'Brouillon',
  sent: 'Envoyee',
  paid: 'Payee',
  overdue: 'Impayee',
};

const invoiceStatusColors: Record<InvoiceData['status'], string> = {
  draft: 'neutral',
  sent: 'blue',
  paid: 'green',
  overdue: 'red',
};

const notificationDotColors: Record<NotificationData['type'], string> = {
  reminder: 'orange',
  alert: 'red',
  success: 'green',
  info: 'blue',
};

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const formatFcfa = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;
const formatDate = (value: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('fr-FR');
};

function MiniCalendar({ highlightDates }: { highlightDates: string[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // lundi = 0
  const cells: Array<number | null> = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const highlightSet = new Set(
    highlightDates
      .map((d) => d.split('-').map(Number))
      .filter(([y, m]) => y === year && m - 1 === month)
      .map(([, , day]) => day)
  );

  return (
    <div className="mini-cal">
      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
        <div className="cal-day-head" key={`${d}-${i}`}>{d}</div>
      ))}
      {cells.map((day, i) => (
        <div
          key={i}
          className={`cal-day ${day === null ? 'empty' : ''} ${day === today.getDate() ? 'today' : ''} ${day && highlightSet.has(day) && day !== today.getDate() ? 'has-event' : ''}`.trim()}
        >
          {day || ''}
        </div>
      ))}
    </div>
  );
}

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);

  const [activeSection, setActiveSection] = useState<SectionKey>('dashboard');
  const [quickText, setQuickText] = useState('');
  const [appointmentText, setAppointmentText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [clientsList, setClientsList] = useState<ClientRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'info' | 'error' }>>([]);
  const [invoiceInitialData, setInvoiceInitialData] = useState<Partial<InvoiceData> | undefined>(undefined);
  const [invoiceModalKey, setInvoiceModalKey] = useState(0);
  const [isImportingInvoice, setIsImportingInvoice] = useState(false);

  const parsedEntry = useMemo(() => parseQuickEntry(quickText), [quickText]);
  const parsedAppointment = useMemo(() => parseAppointmentText(appointmentText), [appointmentText]);

  useEffect(() => {
    let active = true;
    AuthService.getSession().then((session) => {
      if (!active) return;
      if (session?.user) {
        setCurrentUser({
          name: (session.user.user_metadata as { name?: string } | undefined)?.name || 'Edson',
          email: session.user.email || AuthService.getAllowedEmail(),
        });
      }
      setAuthChecked(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const clientsForSelect = useMemo(
    () => clientsList.map((c) => ({ id: c.id, name: `${c.name} - ${c.company}` })),
    [clientsList]
  );

  const findClientLabel = (clientId?: string) => {
    if (!clientId) return 'Non specifie';
    const match = clientsList.find((c) => c.id === clientId);
    return match ? `${match.name} (${match.company})` : 'Client supprime';
  };

  const findClient = (clientId?: string) => clientsList.find((c) => c.id === clientId);

  const pushToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = makeId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  };

  useEffect(() => {
    if (!currentUser) return;
    let active = true;

    const loadAll = async () => {
      setIsDataLoading(true);
      const results = await Promise.allSettled([
        listClients(),
        listInvoices(),
        listAccountingEntries(),
        listEvents(),
        listReports(),
        listNotifications(),
      ]);
      if (!active) return;

      const [clientsRes, invoicesRes, entriesRes, eventsRes, reportsRes, notificationsRes] = results;
      if (clientsRes.status === 'fulfilled') setClientsList(clientsRes.value);
      if (invoicesRes.status === 'fulfilled') setInvoices(invoicesRes.value);
      if (entriesRes.status === 'fulfilled') setEntries(entriesRes.value);
      if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value);
      if (reportsRes.status === 'fulfilled') setReports(reportsRes.value);
      if (notificationsRes.status === 'fulfilled') setNotifications(notificationsRes.value);

      const failed = results.some((r) => r.status === 'rejected');
      if (failed) {
        pushToast("Certaines donnees n'ont pas pu etre chargees depuis la base (tables Supabase pas encore creees ?).", 'error');
      }

      setIsDataLoading(false);
    };

    loadAll();
    return () => {
      active = false;
    };
  }, [currentUser]);

  const openInvoiceModal = (initial?: Partial<InvoiceData>) => {
    setInvoiceInitialData(initial);
    setInvoiceModalKey((k) => k + 1);
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    if (activeSection === 'factures') {
      openInvoiceModal(undefined);
      return;
    }
    setIsModalOpen(true);
  };

  const handleImportInvoiceFile = async (file: File) => {
    setIsImportingInvoice(true);
    try {
      const parsed = await parseInvoiceFromFile(file);
      openInvoiceModal({
        amount: parsed.amount || undefined,
        date: parsed.date,
        dueDate: parsed.dueDate,
        description: parsed.description,
      });
      pushToast(`Facture importee depuis "${file.name}". Verifiez les champs avant d'enregistrer.`, 'info');
    } catch {
      pushToast("Impossible d'analyser ce fichier automatiquement.", 'error');
    } finally {
      setIsImportingInvoice(false);
    }
  };

  const handleLoginSuccess = async () => {
    const session = await AuthService.getSession();
    setCurrentUser({
      name: (session?.user?.user_metadata as { name?: string } | undefined)?.name || 'Edson',
      email: session?.user?.email || AuthService.getAllowedEmail(),
    });
  };

  const handleLogout = async () => {
    await AuthService.signout();
    setCurrentUser(null);
  };

  const handleAddEntry = async (data: AccountingEntryData) => {
    try {
      const record = await createAccountingEntry(data);
      setEntries((prev) => [record, ...prev]);
      setIsModalOpen(false);
      pushToast(`Ecriture "${data.description}" enregistree.`);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  const handleAddClient = async (data: ClientData) => {
    try {
      const record = await createClient(data);
      setClientsList((prev) => [record, ...prev]);
      setIsModalOpen(false);
      pushToast(`Client ${data.name} ajoute.`);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  const handleAddInvoice = async (data: InvoiceData) => {
    try {
      const record = await createInvoice(data);
      setInvoices((prev) => [record, ...prev]);
      setIsModalOpen(false);
      setInvoiceInitialData(undefined);
      pushToast(`Facture ${record.invoiceNumber} creee.`);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  const handleAddEvent = async (data: EventData) => {
    try {
      const record = await createEvent(data);
      setEvents((prev) => [record, ...prev]);
      setIsModalOpen(false);
      pushToast(`Evenement "${data.title}" planifie.`);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  const handleAddReport = async (data: ReportData) => {
    try {
      const record = await createReport(data);
      setReports((prev) => [record, ...prev]);
      setIsModalOpen(false);
      pushToast(`Rapport "${data.title}" genere.`);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  const handleAddNotification = async (data: NotificationData) => {
    try {
      const record = await createNotification(data);
      setNotifications((prev) => [record, ...prev]);
      setIsModalOpen(false);
      pushToast(`Notification "${data.title}" programmee.`);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  const totalMovements = entries.reduce((sum, e) => sum + e.amount, 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalOverdue = invoices.filter((i) => i.status === 'overdue').length;

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    entries.forEach((e) => {
      totals.set(e.category, (totals.get(e.category) || 0) + e.amount);
    });
    const grandTotal = Array.from(totals.values()).reduce((a, b) => a + b, 0);
    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount, pct: grandTotal ? Math.round((amount / grandTotal) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries]);

  const systemNotifications = useMemo(() => {
    const list: Array<{ id: string; title: string; message: string; date: string; tone: 'orange' | 'red' | 'blue' }> = [];
    const now = new Date();

    invoices.forEach((invoice) => {
      if (invoice.status === 'paid' || !invoice.dueDate) return;
      const due = new Date(invoice.dueDate);
      if (Number.isNaN(due.getTime())) return;
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
      if (diffDays < 0) {
        list.push({
          id: `inv-overdue-${invoice.id}`,
          title: 'Facture en retard',
          message: `${invoice.invoiceNumber} (${findClientLabel(invoice.clientId)}) - echeance depassee de ${Math.abs(diffDays)} jour(s)`,
          date: invoice.dueDate,
          tone: 'red',
        });
      } else if (diffDays <= 3) {
        list.push({
          id: `inv-duesoon-${invoice.id}`,
          title: 'Echeance proche',
          message: `${invoice.invoiceNumber} (${findClientLabel(invoice.clientId)}) arrive a echeance dans ${diffDays} jour(s)`,
          date: invoice.dueDate,
          tone: 'orange',
        });
      }
    });

    events.forEach((event) => {
      const eventDate = new Date(`${event.date}T${event.time || '00:00'}`);
      if (Number.isNaN(eventDate.getTime())) return;
      const diffHours = (eventDate.getTime() - now.getTime()) / 3600000;
      if (diffHours >= -1 && diffHours <= 24) {
        list.push({
          id: `event-soon-${event.id}`,
          title: 'Evenement imminent',
          message: `${event.title} - ${formatDate(event.date)} a ${event.time}`,
          date: event.date,
          tone: 'blue',
        });
      }
    });

    return list;
  }, [invoices, events, clientsList]);

  const totalActiveAlerts = notifications.length + systemNotifications.length;

  const renderSection = () => {
    switch (activeSection) {
      case 'comptabilite':
        return (
          <section className="section-stack">
            <div className="skpi-row">
              <div className="skpi-card">
                <span className="skpi-icon" style={{ background: 'rgba(79,70,229,0.14)' }}>Σ</span>
                <div><p>Total mouvemente</p><strong>{formatFcfa(totalMovements)}</strong></div>
              </div>
              <div className="skpi-card">
                <span className="skpi-icon" style={{ background: 'rgba(16,185,129,0.14)' }}>#</span>
                <div><p>Ecritures</p><strong>{entries.length}</strong></div>
              </div>
              <div className="skpi-card">
                <span className="skpi-icon" style={{ background: 'rgba(6,182,212,0.14)' }}>✓</span>
                <div><p>Equilibre debit/credit</p><strong>Garanti</strong></div>
              </div>
            </div>

            <article className="panel-card">
              <div className="panel-top">
                <h4>Journal comptable OHADA</h4>
                <div className="panel-top-actions">
                  <span>Partie double - ecritures reelles</span>
                  {entries.length > 0 && (
                    <>
                      <button
                        type="button"
                        className="ghost-btn small-btn"
                        onClick={() => exportTableToCsv({
                          columns: ['Date', 'Libelle', 'Compte debite', 'Compte credite', 'Categorie', 'Montant'],
                          rows: entries.map((e) => [formatDate(e.date), e.description, e.debitAccount, e.creditAccount, e.category, e.amount]),
                          fileName: 'journal-comptable-vpns.csv',
                        })}
                      >
                        CSV
                      </button>
                      <button
                        type="button"
                        className="ghost-btn small-btn"
                        onClick={async () => {
                          const { exportTableToPdf } = await import('./utils/pdfExport');
                          exportTableToPdf({
                            title: 'Journal comptable OHADA',
                            subtitle: `Export du ${new Date().toLocaleDateString('fr-FR')} - ${entries.length} ecriture(s)`,
                            columns: ['Date', 'Libelle', 'Debit', 'Credit', 'Categorie', 'Montant'],
                            rows: entries.map((e) => [formatDate(e.date), e.description, e.debitAccount, e.creditAccount, e.category, formatFcfa(e.amount)]),
                            fileName: 'journal-comptable-vpns.pdf',
                            summary: [
                              { label: 'Total mouvemente', value: formatFcfa(totalMovements) },
                              { label: 'Ecritures', value: String(entries.length) },
                            ],
                          });
                        }}
                      >
                        Exporter PDF
                      </button>
                    </>
                  )}
                </div>
              </div>
              {entries.length === 0 ? (
                <EmptyState
                  title="Aucune ecriture comptable"
                  description="Ajoutez votre premiere ecriture pour demarrer le suivi OHADA."
                />
              ) : (
                <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Libelle</th>
                      <th>Compte debite</th>
                      <th>Compte credite</th>
                      <th>Categorie</th>
                      <th>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.date)}</td>
                        <td>{entry.description}</td>
                        <td>{entry.debitAccount}</td>
                        <td>{entry.creditAccount}</td>
                        <td>{entry.category}</td>
                        <td>{formatFcfa(entry.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </article>

            <article className="panel-card">
              <div className="panel-top">
                <h4>Saisie rapide intelligente</h4>
                <span>Analyse du texte libre</span>
              </div>
              <input
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder="Ex: payer EEC 53390"
              />
              <div className="parsed-box">
                <p><strong>Montant :</strong> {parsedEntry.amount ? formatFcfa(parsedEntry.amount) : 'Non detecte'}</p>
                <p><strong>Categorie :</strong> {parsedEntry.category}</p>
                <p><strong>Compte :</strong> {parsedEntry.account}</p>
                <p><strong>Type :</strong> {parsedEntry.type}</p>
              </div>
            </article>
          </section>
        );

      case 'factures':
        return (
          <section className="section-stack">
            <div className="skpi-row">
              <div className="skpi-card">
                <span className="skpi-icon" style={{ background: 'rgba(79,70,229,0.14)' }}>Σ</span>
                <div><p>Total facture</p><strong>{formatFcfa(totalInvoiced)}</strong></div>
              </div>
              <div className="skpi-card">
                <span className="skpi-icon" style={{ background: 'rgba(16,185,129,0.14)' }}>✓</span>
                <div><p>Encaisse</p><strong>{formatFcfa(totalPaid)}</strong></div>
              </div>
              <div className="skpi-card">
                <span className="skpi-icon" style={{ background: 'rgba(239,68,68,0.14)' }}>!</span>
                <div><p>Impayees</p><strong>{totalOverdue}</strong></div>
              </div>
            </div>

            <article className="panel-card">
              <div className="panel-top">
                <h4>Factures</h4>
                <div className="panel-top-actions">
                  <span>{invoices.length} facture(s)</span>
                  <label className="file-import-label">
                    {isImportingInvoice ? 'Analyse...' : 'Importer une facture'}
                    <input
                      type="file"
                      className="file-import-input"
                      accept=".txt,.csv,.json,.pdf,.png,.jpg,.jpeg"
                      disabled={isImportingInvoice}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImportInvoiceFile(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {invoices.length > 0 && (
                    <>
                      <button
                        type="button"
                        className="ghost-btn small-btn"
                        onClick={() => exportTableToCsv({
                          columns: ['Numero', 'Client', 'Date', 'Echeance', 'Montant', 'Statut'],
                          rows: invoices.map((inv) => [inv.invoiceNumber, findClientLabel(inv.clientId), formatDate(inv.date), formatDate(inv.dueDate), inv.amount, invoiceStatusLabels[inv.status]]),
                          fileName: 'factures-vpns.csv',
                        })}
                      >
                        CSV
                      </button>
                      <button
                        type="button"
                        className="ghost-btn small-btn"
                        onClick={async () => {
                          const { exportTableToPdf } = await import('./utils/pdfExport');
                          exportTableToPdf({
                            title: 'Factures',
                            subtitle: `Export du ${new Date().toLocaleDateString('fr-FR')} - ${invoices.length} facture(s)`,
                            columns: ['Numero', 'Client', 'Date', 'Echeance', 'Montant', 'Statut'],
                            rows: invoices.map((inv) => [inv.invoiceNumber, findClientLabel(inv.clientId), formatDate(inv.date), formatDate(inv.dueDate), formatFcfa(inv.amount), invoiceStatusLabels[inv.status]]),
                            fileName: 'factures-vpns.pdf',
                            summary: [
                              { label: 'Total facture', value: formatFcfa(totalInvoiced) },
                              { label: 'Encaisse', value: formatFcfa(totalPaid) },
                              { label: 'Impayees', value: String(totalOverdue) },
                            ],
                          });
                        }}
                      >
                        Exporter PDF
                      </button>
                    </>
                  )}
                </div>
              </div>
              {invoices.length === 0 ? (
                <EmptyState
                  title="Aucune facture"
                  description="Creez votre premiere facture pour suivre vos ventes, ou importez-en une existante."
                />
              ) : (
                <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Numero</th>
                      <th>Client</th>
                      <th>Date</th>
                      <th>Echeance</th>
                      <th>Montant</th>
                      <th>Statut</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoice.invoiceNumber}</td>
                        <td>{findClientLabel(invoice.clientId)}</td>
                        <td>{formatDate(invoice.date)}</td>
                        <td>{formatDate(invoice.dueDate)}</td>
                        <td>{formatFcfa(invoice.amount)}</td>
                        <td><span className={`chip ${invoiceStatusColors[invoice.status]}`}>{invoiceStatusLabels[invoice.status]}</span></td>
                        <td>
                          <button
                            type="button"
                            className="ghost-btn small-btn"
                            onClick={async () => {
                              const { exportInvoiceToPdf } = await import('./utils/pdfExport');
                              exportInvoiceToPdf(invoice, findClient(invoice.clientId));
                            }}
                          >
                            PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </article>
          </section>
        );

      case 'clients':
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
                          const { exportTableToPdf } = await import('./utils/pdfExport');
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
                    </tr>
                  </thead>
                  <tbody>
                    {clientsList.map((client) => (
                      <tr key={client.id}>
                        <td>{client.name}</td>
                        <td>{client.company}</td>
                        <td>{client.email}</td>
                        <td>{client.phone}</td>
                        <td>{client.city || '-'}</td>
                        <td>{client.archiveFolder}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </article>
          </section>
        );

      case 'agenda':
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
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => (
                        <tr key={event.id}>
                          <td>{event.title}</td>
                          <td>{formatDate(event.date)}</td>
                          <td>{event.time}</td>
                          <td>{event.type}</td>
                          <td>{event.location || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
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
                onChange={(e) => setAppointmentText(e.target.value)}
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

      case 'documents':
        return (
          <section className="section-stack">
            <article className="panel-card">
              <div className="panel-top">
                <h4>Documents</h4>
                <span>Archives et pieces jointes</span>
              </div>
              <ArchiveManager clients={clientsList.map((c) => ({ id: c.id, name: c.name }))} onNotify={pushToast} />
            </article>
          </section>
        );

      case 'rapports':
        return (
          <section className="section-stack">
            <article className="panel-card">
              <div className="panel-top">
                <h4>Repartition par categorie</h4>
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
                          const { exportTableToPdf } = await import('./utils/pdfExport');
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
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id}>
                        <td>{report.title}</td>
                        <td>{report.type}</td>
                        <td>{report.period}</td>
                        <td>{formatDate(report.startDate)}</td>
                        <td>{formatDate(report.endDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </article>
          </section>
        );

      case 'notifications':
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
                  {notifications.map((notif) => (
                    <div className="notif-type-row" key={notif.id}>
                      <span className={`notif-dot ${notificationDotColors[notif.type]}`} />
                      <span>{notif.title} - {notif.message}</span>
                      <strong>{formatDate(notif.sendDate)} {notif.sendTime}</strong>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        );

      case 'parametres':
        return (
          <section className="section-stack">
            <article className="panel-card">
              <div className="panel-top">
                <h4>Parametres</h4>
                <span>Compte et preferences</span>
              </div>
              <div className="setting-grid">
                <div className="setting-item">
                  <div className="setting-icon" style={{ background: 'rgba(79,70,229,0.12)' }}>👤</div>
                  <strong>Compte</strong>
                  <p>{currentUser?.email}</p>
                  <span>Administrateur</span>
                </div>
                <div className="setting-item">
                  <div className="setting-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>🔒</div>
                  <strong>Securite</strong>
                  <p>Authentification par identifiant unique</p>
                  <span>Active</span>
                </div>
                <div className="setting-item">
                  <div className="setting-icon" style={{ background: 'rgba(217,119,6,0.12)' }}>🔔</div>
                  <strong>Notifications</strong>
                  <p>{notifications.length} notification(s) programmee(s)</p>
                  <span>Configure</span>
                </div>
                <div className="setting-item">
                  <div className="setting-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>💾</div>
                  <strong>Donnees</strong>
                  <p>{clientsList.length} clients - {invoices.length} factures - {entries.length} ecritures</p>
                  <span>A jour</span>
                </div>
                <div className="setting-item">
                  <div className="setting-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>🚪</div>
                  <strong>Session</strong>
                  <p>Se deconnecter de VPNS Consulting</p>
                  <button type="button" className="secondary-btn" onClick={handleLogout}>Se deconnecter</button>
                </div>
              </div>
            </article>
          </section>
        );

      default:
        return (
          <>
            <section className="hero-banner">
              <div className="hero-banner-left">
                <p className="eyebrow">Tableau de bord</p>
                <h3 className="hero-title">Un logiciel de gestion OHADA moderne et fiable</h3>
                <p className="hero-sub">Commencez avec une base propre : ajoutez vos clients, factures et ecritures reelles.</p>
                <div className="hero-badge-row">
                  <span className="status-badge green">● Instance active</span>
                  <span className="status-badge blue">OHADA</span>
                  <span className="status-badge purple">Multi-clients</span>
                </div>
              </div>
              <div className="hero-score-block">
                <div className="score-ring">
                  <span className="score-pct">{clientsList.length + invoices.length + entries.length}</span>
                  <span className="score-lbl">Elements</span>
                </div>
              </div>
            </section>

            <section className="kpi-grid">
              <div className="kpi-card" style={{ '--kpi-color': '#4f46e5', '--kpi-bg': 'rgba(79,70,229,0.06)' } as CSSProperties}>
                <span className="kpi-icon">👥</span>
                <div className="kpi-body">
                  <p className="kpi-label">Clients</p>
                  <span className="kpi-value">{clientsList.length}</span>
                </div>
              </div>
              <div className="kpi-card" style={{ '--kpi-color': '#10b981', '--kpi-bg': 'rgba(16,185,129,0.06)' } as CSSProperties}>
                <span className="kpi-icon">📄</span>
                <div className="kpi-body">
                  <p className="kpi-label">Factures</p>
                  <span className="kpi-value">{invoices.length}</span>
                </div>
              </div>
              <div className="kpi-card" style={{ '--kpi-color': '#f59e0b', '--kpi-bg': 'rgba(245,158,11,0.06)' } as CSSProperties}>
                <span className="kpi-icon">🧾</span>
                <div className="kpi-body">
                  <p className="kpi-label">Ecritures</p>
                  <span className="kpi-value">{entries.length}</span>
                </div>
              </div>
              <div className="kpi-card" style={{ '--kpi-color': '#8b5cf6', '--kpi-bg': 'rgba(139,92,246,0.06)' } as CSSProperties}>
                <span className="kpi-icon">🗓️</span>
                <div className="kpi-body">
                  <p className="kpi-label">Evenements</p>
                  <span className="kpi-value">{events.length}</span>
                </div>
              </div>
            </section>

            <section className="content-grid">
              <article className="panel-card">
                <div className="panel-top">
                  <h4>Prise en main</h4>
                  <span>Base propre</span>
                </div>
                <p>Votre instance est prete. Ajoutez un client, une facture ou une ecriture pour commencer l'analyse.</p>
              </article>
              <article className="panel-card">
                <div className="panel-top">
                  <h4>Agenda rapide</h4>
                  <span>Assistant</span>
                </div>
                <input
                  value={appointmentText}
                  onChange={(e) => setAppointmentText(e.target.value)}
                  placeholder="Ex: demain 14h reunion client"
                />
                <div className="parsed-box">
                  <p><strong>Titre :</strong> {parsedAppointment.title || 'A definir'}</p>
                  <p><strong>Date :</strong> {parsedAppointment.date || 'Non detectee'}</p>
                  <p><strong>Heure :</strong> {parsedAppointment.hour || 'Non detectee'}</p>
                </div>
              </article>
            </section>
          </>
        );
    }
  };

  const handleNavigate = (section: SectionKey) => {
    setActiveSection(section);
    setIsDrawerOpen(false);
  };

  if (!authChecked) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Chargement de VPNS Consulting...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginComponent onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={handleNavigate}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        userName={currentUser.name}
        onLogout={handleLogout}
        notificationCount={totalActiveAlerts}
      />

      <div className="app-content">
        <TopBar
          title={sectionLabels[activeSection]}
          subtitle="VPNS Consulting - Logiciel professionnel OHADA"
          actionLabel={sectionActions[activeSection]}
          onAction={sectionActions[activeSection] ? handleOpenCreateModal : undefined}
          onMenuToggle={() => setIsDrawerOpen(true)}
        />

        <main className="main-panel">
          <PageHeader
            title={sectionLabels[activeSection]}
            subtitle="Gestion complete"
            description="Utilisez les fonctionnalites du module pour piloter votre activite avec rigueur."
          />
          <div className="main-content">
            {isDataLoading ? (
              <div className="loading-inline">
                <div className="loading-spinner" />
                <p>Chargement de vos donnees...</p>
              </div>
            ) : (
              renderSection()
            )}
          </div>
        </main>
      </div>

      <div className={`drawer-overlay ${isDrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)} />

      {(activeSection === 'dashboard' || activeSection === 'comptabilite') && (
        <AccountingEntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddEntry} />
      )}
      {activeSection === 'factures' && (
        <InvoiceModal
          key={invoiceModalKey}
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setInvoiceInitialData(undefined); }}
          onSubmit={handleAddInvoice}
          clients={clientsForSelect}
          initialData={invoiceInitialData}
        />
      )}
      {activeSection === 'clients' && (
        <ClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddClient} />
      )}
      {activeSection === 'agenda' && (
        <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddEvent} clients={clientsForSelect} />
      )}
      {activeSection === 'rapports' && (
        <ReportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddReport} clients={clientsForSelect} />
      )}
      {activeSection === 'notifications' && (
        <NotificationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddNotification} clients={clientsForSelect} />
      )}

      <div className="toast-stack">
        {toasts.map((toast) => (
          <NotificationToast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          />
        ))}
      </div>
    </div>
  );
}

export default App;

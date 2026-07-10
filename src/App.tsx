import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import PageHeader from './components/PageHeader';
import EmptyState from './components/EmptyState';
import { ArchiveManager } from './components/ArchiveManager';
import { AccountingEntryModal, AccountingEntryData } from './components/AccountingEntryModal';
import { ClientModal, ClientData } from './components/ClientModal';
import { InvoiceModal, InvoiceData } from './components/InvoiceModal';
import PrimaryButton from './components/PrimaryButton';
import { EventModal, EventData } from './components/EventModal';
import { ReportModal, ReportData } from './components/ReportModal';
import { NotificationModal, NotificationData } from './components/NotificationModal';
import { LoginComponent } from './components/LoginComponent';
import NotificationToast from './components/NotificationToast';
import AuthService from './services/authService';
import { parseAppointmentText, parseQuickEntry, parseInvoiceFromFile } from './utils/helpers';
import { exportTableToCsv } from './utils/csvExport';
import { afficherCompte, classeDuCompte } from './data/planComptable';
import {
  calculerBalance,
  totauxBalance,
  calculerGrandLivre,
  calculerCompteResultat,
  calculerBilan,
} from './utils/comptaReports';
import {
  type EntryRecord,
  type ClientRecord,
  type InvoiceRecord,
  type EventRecord,
  type ReportRecord,
  type NotificationRecord,
  type PaymentRecord,
  listClients,
  createClient,
  listInvoices,
  createInvoice,
  listAccountingEntries,
  createAccountingEntry,
  reverseAccountingEntry,
  setEntryReconciled,
  listPayments,
  createPayment,
  updateInvoiceStatus,
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
// Extrait l'annee depuis une chaine yyyy-mm-dd sans passer par Date() (evite les
// decalages de fuseau horaire pres du 1er janvier).
const yearOf = (value: string) => Number(value.slice(0, 4));

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
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<number>(new Date().getFullYear());
  const [comptaTab, setComptaTab] = useState<'journal' | 'grandlivre' | 'balance' | 'etats'>('journal');
  const [paymentForInvoice, setPaymentForInvoice] = useState<InvoiceRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('especes');

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
        listPayments(),
      ]);
      if (!active) return;

      const [clientsRes, invoicesRes, entriesRes, eventsRes, reportsRes, notificationsRes, paymentsRes] = results;
      if (clientsRes.status === 'fulfilled') setClientsList(clientsRes.value);
      if (invoicesRes.status === 'fulfilled') setInvoices(invoicesRes.value);
      if (entriesRes.status === 'fulfilled') setEntries(entriesRes.value);
      if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value);
      if (reportsRes.status === 'fulfilled') setReports(reportsRes.value);
      if (notificationsRes.status === 'fulfilled') setNotifications(notificationsRes.value);
      if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value);

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

  // Contre-passation d'une ecriture (au lieu de suppression, conforme aux regles comptables).
  const handleReverseEntry = async (entry: EntryRecord) => {
    try {
      const { reversal, original } = await reverseAccountingEntry(entry);
      setEntries((prev) => [reversal, ...prev.map((e) => (e.id === original.id ? original : e))]);
      pushToast(`Ecriture "${entry.description}" contre-passee.`);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  // Rapprochement bancaire : basculer l'etat rapproche d'une ecriture de tresorerie.
  const handleToggleReconcile = async (entry: EntryRecord) => {
    try {
      const updated = await setEntryReconciled(entry.id, !entry.reconciled);
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  // Solde du restant d'une facture = TTC - somme des paiements enregistres.
  const paidForInvoice = (invoiceId: string) => payments.filter((p) => p.invoiceId === invoiceId).reduce((s, p) => s + p.amount, 0);

  const handleRecordPayment = async () => {
    if (!paymentForInvoice) return;
    const amt = parseFloat(paymentAmount);
    if (Number.isNaN(amt) || amt <= 0) {
      pushToast('Montant de paiement invalide.', 'error');
      return;
    }
    try {
      const payment = await createPayment({
        invoiceId: paymentForInvoice.id,
        amount: amt,
        paymentDate: new Date().toISOString().split('T')[0],
        method: paymentMethod,
      });
      const newPayments = [payment, ...payments];
      setPayments(newPayments);

      // Statut automatique : solde nul => payee ; partiel => envoyee (en cours).
      const totalPaid = newPayments.filter((p) => p.invoiceId === paymentForInvoice.id).reduce((s, p) => s + p.amount, 0);
      let newStatus = paymentForInvoice.status;
      if (totalPaid >= paymentForInvoice.amount) newStatus = 'paid';
      else if (totalPaid > 0 && paymentForInvoice.status !== 'overdue') newStatus = 'sent';
      if (newStatus !== paymentForInvoice.status) {
        await updateInvoiceStatus(paymentForInvoice.id, newStatus);
        setInvoices((prev) => prev.map((i) => (i.id === paymentForInvoice.id ? { ...i, status: newStatus } : i)));
      }

      pushToast(`Paiement de ${amt.toLocaleString('fr-FR')} FCFA enregistre.`);
      setPaymentForInvoice(null);
      setPaymentAmount('');
      setPaymentMethod('especes');
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  // Exercice comptable SYSCOHADA/OHADA : annee civile (1er janvier - 31 decembre).
  // Les ecritures et factures sont filtrees par exercice selectionne pour que la
  // comptabilite, les factures et les rapports restent cloisonnes annee par annee.
  // Le selecteur propose toujours l'annee en cours et les 3 precedentes (ex: 2023 a
  // 2026), meme sans aucune donnee dedans, pour permettre la saisie retroactive -
  // plus, le cas echeant, toute autre annee ou des ecritures/factures existent deja.
  const availableExercises = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>([currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);
    entries.forEach((e) => years.add(yearOf(e.date)));
    invoices.forEach((i) => years.add(yearOf(i.date)));
    return Array.from(years).sort((a, b) => b - a);
  }, [entries, invoices]);

  const entriesForExercise = useMemo(
    () => entries.filter((e) => yearOf(e.date) === selectedExercise),
    [entries, selectedExercise]
  );

  const invoicesForExercise = useMemo(
    () => invoices.filter((i) => yearOf(i.date) === selectedExercise),
    [invoices, selectedExercise]
  );

  const totalMovements = entriesForExercise.reduce((sum, e) => sum + e.amount, 0);
  const totalInvoiced = invoicesForExercise.reduce((sum, i) => sum + i.amount, 0);
  const totalVatCollected = invoicesForExercise.reduce((sum, i) => sum + i.vatAmount, 0);
  const invoiceIdsForExercise = useMemo(() => new Set(invoicesForExercise.map((i) => i.id)), [invoicesForExercise]);
  const totalEncaisse = payments.filter((p) => invoiceIdsForExercise.has(p.invoiceId)).reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = Math.max(0, totalInvoiced - totalEncaisse);

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    entriesForExercise.forEach((e) => {
      totals.set(e.category, (totals.get(e.category) || 0) + e.amount);
    });
    const grandTotal = Array.from(totals.values()).reduce((a, b) => a + b, 0);
    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount, pct: grandTotal ? Math.round((amount / grandTotal) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [entriesForExercise]);

  // Etats comptables SYSCOHADA calcules sur l'exercice selectionne.
  const balance = useMemo(() => calculerBalance(entriesForExercise), [entriesForExercise]);
  const balanceTotals = useMemo(() => totauxBalance(balance), [balance]);
  const grandLivre = useMemo(() => calculerGrandLivre(entriesForExercise), [entriesForExercise]);
  const compteResultat = useMemo(() => calculerCompteResultat(entriesForExercise), [entriesForExercise]);
  const bilan = useMemo(() => calculerBilan(entriesForExercise), [entriesForExercise]);
  // Comptes de tresorerie (classe 5) pour le rapprochement bancaire.
  const treasuryEntries = useMemo(
    () => entriesForExercise.filter((e) => classeDuCompte(e.debitAccount) === 5 || classeDuCompte(e.creditAccount) === 5),
    [entriesForExercise]
  );

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
            <div className="exercise-bar">
              <span>Exercice comptable (1er janvier - 31 decembre)</span>
              <select value={selectedExercise} onChange={(e) => setSelectedExercise(Number(e.target.value))}>
                {availableExercises.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="tab-bar">
              <button type="button" className={`tab-btn ${comptaTab === 'journal' ? 'active' : ''}`} onClick={() => setComptaTab('journal')}>Journal</button>
              <button type="button" className={`tab-btn ${comptaTab === 'grandlivre' ? 'active' : ''}`} onClick={() => setComptaTab('grandlivre')}>Grand Livre</button>
              <button type="button" className={`tab-btn ${comptaTab === 'balance' ? 'active' : ''}`} onClick={() => setComptaTab('balance')}>Balance</button>
              <button type="button" className={`tab-btn ${comptaTab === 'etats' ? 'active' : ''}`} onClick={() => setComptaTab('etats')}>Bilan & Resultat</button>
            </div>

            {comptaTab === 'journal' && (
              <>
                <div className="skpi-row">
                  <div className="skpi-card">
                    <span className="skpi-icon" style={{ background: 'rgba(79,70,229,0.14)' }}>Σ</span>
                    <div><p>Total mouvemente</p><strong>{formatFcfa(totalMovements)}</strong></div>
                  </div>
                  <div className="skpi-card">
                    <span className="skpi-icon" style={{ background: 'rgba(16,185,129,0.14)' }}>#</span>
                    <div><p>Ecritures {selectedExercise}</p><strong>{entriesForExercise.length}</strong></div>
                  </div>
                  <div className="skpi-card">
                    <span className="skpi-icon" style={{ background: balanceTotals.equilibre ? 'rgba(6,182,212,0.14)' : 'rgba(239,68,68,0.14)' }}>✓</span>
                    <div><p>Equilibre debit/credit</p><strong>{balanceTotals.equilibre ? 'Equilibre' : 'A verifier'}</strong></div>
                  </div>
                </div>

                <article className="panel-card">
                  <div className="panel-top">
                    <h4>Journal comptable OHADA - Exercice {selectedExercise}</h4>
                    <div className="panel-top-actions">
                      <span>Partie double</span>
                      {entriesForExercise.length > 0 && (
                        <>
                          <button type="button" className="ghost-btn small-btn" onClick={() => exportTableToCsv({
                            columns: ['Date', 'Libelle', 'Compte debite', 'Compte credite', 'Categorie', 'Montant'],
                            rows: entriesForExercise.map((e) => [formatDate(e.date), e.description, afficherCompte(e.debitAccount), afficherCompte(e.creditAccount), e.category, e.amount]),
                            fileName: `journal-comptable-vpns-${selectedExercise}.csv`,
                          })}>CSV</button>
                          <button type="button" className="ghost-btn small-btn" onClick={async () => {
                            const { exportTableToPdf } = await import('./utils/pdfExport');
                            exportTableToPdf({
                              title: `Journal comptable OHADA - Exercice ${selectedExercise}`,
                              subtitle: `Export du ${new Date().toLocaleDateString('fr-FR')} - ${entriesForExercise.length} ecriture(s)`,
                              columns: ['Date', 'Libelle', 'Debit', 'Credit', 'Montant'],
                              rows: entriesForExercise.map((e) => [formatDate(e.date), e.description, afficherCompte(e.debitAccount), afficherCompte(e.creditAccount), formatFcfa(e.amount)]),
                              fileName: `journal-comptable-vpns-${selectedExercise}.pdf`,
                              summary: [{ label: 'Total mouvemente', value: formatFcfa(totalMovements) }, { label: 'Ecritures', value: String(entriesForExercise.length) }],
                            });
                          }}>Exporter PDF</button>
                        </>
                      )}
                    </div>
                  </div>
                  {entriesForExercise.length === 0 ? (
                    <EmptyState title={`Aucune ecriture sur l'exercice ${selectedExercise}`} description="Ajoutez une ecriture ou changez d'exercice comptable ci-dessus." />
                  ) : (
                    <div className="table-scroll">
                    <table>
                      <thead>
                        <tr><th>Date</th><th>Libelle</th><th>Compte debite</th><th>Compte credite</th><th>Montant</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {entriesForExercise.map((entry) => (
                          <tr key={entry.id} className={entry.reversed ? 'row-reversed' : ''}>
                            <td>{formatDate(entry.date)}</td>
                            <td>{entry.description}{entry.reversed && <span className="chip red" style={{ marginLeft: 6 }}>Contre-passee</span>}{entry.reversesEntryId && <span className="chip orange" style={{ marginLeft: 6 }}>Annulation</span>}</td>
                            <td title={afficherCompte(entry.debitAccount)}>{afficherCompte(entry.debitAccount)}</td>
                            <td title={afficherCompte(entry.creditAccount)}>{afficherCompte(entry.creditAccount)}</td>
                            <td>{formatFcfa(entry.amount)}</td>
                            <td>
                              {!entry.reversed && !entry.reversesEntryId && (
                                <button type="button" className="ghost-btn small-btn" onClick={() => handleReverseEntry(entry)}>Contre-passer</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </article>

                <article className="panel-card">
                  <div className="panel-top"><h4>Rapprochement bancaire</h4><span>Comptes de tresorerie (classe 5)</span></div>
                  {treasuryEntries.length === 0 ? (
                    <p className="chart-empty-hint">Aucun mouvement de tresorerie sur cet exercice. Les ecritures touchant un compte de banque ou de caisse apparaitront ici pour pointage.</p>
                  ) : (
                    <div className="table-scroll">
                    <table>
                      <thead><tr><th>Date</th><th>Libelle</th><th>Montant</th><th>Rapproche</th></tr></thead>
                      <tbody>
                        {treasuryEntries.map((entry) => (
                          <tr key={entry.id}>
                            <td>{formatDate(entry.date)}</td>
                            <td>{entry.description}</td>
                            <td>{formatFcfa(entry.amount)}</td>
                            <td>
                              <label className="reconcile-check">
                                <input type="checkbox" checked={entry.reconciled} onChange={() => handleToggleReconcile(entry)} />
                                <span>{entry.reconciled ? 'Pointe' : 'A pointer'}</span>
                              </label>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </article>

                <article className="panel-card">
                  <div className="panel-top"><h4>Saisie rapide intelligente</h4><span>Analyse du texte libre</span></div>
                  <input value={quickText} onChange={(e) => setQuickText(e.target.value)} placeholder="Ex: payer EEC 53390" />
                  <div className="parsed-box">
                    <p><strong>Montant :</strong> {parsedEntry.amount ? formatFcfa(parsedEntry.amount) : 'Non detecte'}</p>
                    <p><strong>Categorie :</strong> {parsedEntry.category}</p>
                    <p><strong>Compte suggere :</strong> {afficherCompte(parsedEntry.account)}</p>
                  </div>
                </article>
              </>
            )}

            {comptaTab === 'grandlivre' && (
              <article className="panel-card">
                <div className="panel-top">
                  <h4>Grand Livre - Exercice {selectedExercise}</h4>
                  <span>{grandLivre.length} compte(s) mouvemente(s)</span>
                </div>
                {grandLivre.length === 0 ? (
                  <p className="chart-empty-hint">Aucun mouvement a afficher. Saisissez des ecritures dans le journal.</p>
                ) : (
                  grandLivre.map((cpt) => (
                    <div key={cpt.compte} className="grandlivre-compte">
                      <div className="grandlivre-head">
                        <strong>{afficherCompte(cpt.compte)}</strong>
                        <span>Solde : {formatFcfa(cpt.solde)}</span>
                      </div>
                      <div className="table-scroll">
                      <table>
                        <thead><tr><th>Date</th><th>Libelle</th><th>Debit</th><th>Credit</th><th>Solde</th></tr></thead>
                        <tbody>
                          {cpt.mouvements.map((m, i) => (
                            <tr key={i}>
                              <td>{formatDate(m.date)}</td>
                              <td>{m.description}</td>
                              <td>{m.debit ? formatFcfa(m.debit) : '-'}</td>
                              <td>{m.credit ? formatFcfa(m.credit) : '-'}</td>
                              <td>{formatFcfa(m.soldeProgressif)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  ))
                )}
              </article>
            )}

            {comptaTab === 'balance' && (
              <article className="panel-card">
                <div className="panel-top">
                  <h4>Balance generale - Exercice {selectedExercise}</h4>
                  <div className="panel-top-actions">
                    <span className={balanceTotals.equilibre ? 'chip green' : 'chip red'}>{balanceTotals.equilibre ? 'Equilibree' : 'Desequilibree'}</span>
                    {balance.length > 0 && (
                      <button type="button" className="ghost-btn small-btn" onClick={() => exportTableToCsv({
                        columns: ['Compte', 'Libelle', 'Total debit', 'Total credit', 'Solde debiteur', 'Solde crediteur'],
                        rows: balance.map((l) => [l.compte, l.libelle, l.totalDebit, l.totalCredit, l.soldeDebiteur, l.soldeCrediteur]),
                        fileName: `balance-vpns-${selectedExercise}.csv`,
                      })}>CSV</button>
                    )}
                  </div>
                </div>
                {balance.length === 0 ? (
                  <p className="chart-empty-hint">Aucun compte mouvemente sur cet exercice.</p>
                ) : (
                  <div className="table-scroll">
                  <table>
                    <thead><tr><th>Compte</th><th>Total debit</th><th>Total credit</th><th>Solde debiteur</th><th>Solde crediteur</th></tr></thead>
                    <tbody>
                      {balance.map((l) => (
                        <tr key={l.compte}>
                          <td title={l.libelle}>{afficherCompte(l.compte)}</td>
                          <td>{formatFcfa(l.totalDebit)}</td>
                          <td>{formatFcfa(l.totalCredit)}</td>
                          <td>{l.soldeDebiteur ? formatFcfa(l.soldeDebiteur) : '-'}</td>
                          <td>{l.soldeCrediteur ? formatFcfa(l.soldeCrediteur) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td><strong>TOTAUX</strong></td>
                        <td><strong>{formatFcfa(balanceTotals.totalDebit)}</strong></td>
                        <td><strong>{formatFcfa(balanceTotals.totalCredit)}</strong></td>
                        <td><strong>{formatFcfa(balanceTotals.totalSoldeDebiteur)}</strong></td>
                        <td><strong>{formatFcfa(balanceTotals.totalSoldeCrediteur)}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                  </div>
                )}
              </article>
            )}

            {comptaTab === 'etats' && (
              <>
                <article className="panel-card">
                  <div className="panel-top">
                    <h4>Compte de resultat - Exercice {selectedExercise}</h4>
                    <span className={compteResultat.resultat >= 0 ? 'chip green' : 'chip red'}>
                      {compteResultat.resultat >= 0 ? 'Benefice' : 'Perte'} : {formatFcfa(Math.abs(compteResultat.resultat))}
                    </span>
                  </div>
                  <div className="etats-grid">
                    <div>
                      <h5 className="etats-col-title">Produits (classe 7)</h5>
                      {compteResultat.produits.length === 0 ? <p className="chart-empty-hint">Aucun produit.</p> : compteResultat.produits.map((p) => (
                        <div className="etats-row" key={p.compte}><span title={p.libelle}>{afficherCompte(p.compte)}</span><strong>{formatFcfa(p.montant)}</strong></div>
                      ))}
                      <div className="etats-row total"><span>Total produits</span><strong>{formatFcfa(compteResultat.totalProduits)}</strong></div>
                    </div>
                    <div>
                      <h5 className="etats-col-title">Charges (classe 6)</h5>
                      {compteResultat.charges.length === 0 ? <p className="chart-empty-hint">Aucune charge.</p> : compteResultat.charges.map((c) => (
                        <div className="etats-row" key={c.compte}><span title={c.libelle}>{afficherCompte(c.compte)}</span><strong>{formatFcfa(c.montant)}</strong></div>
                      ))}
                      <div className="etats-row total"><span>Total charges</span><strong>{formatFcfa(compteResultat.totalCharges)}</strong></div>
                    </div>
                  </div>
                  <div className="etats-resultat">
                    Resultat de l'exercice : <strong>{formatFcfa(compteResultat.resultat)}</strong>
                  </div>
                </article>

                <article className="panel-card">
                  <div className="panel-top">
                    <h4>Bilan simplifie - Exercice {selectedExercise}</h4>
                    <span className={Math.abs(bilan.totalActif - bilan.totalPassif) < 1 ? 'chip green' : 'chip orange'}>
                      {Math.abs(bilan.totalActif - bilan.totalPassif) < 1 ? 'Equilibre' : 'A verifier'}
                    </span>
                  </div>
                  <div className="etats-grid">
                    <div>
                      <h5 className="etats-col-title">ACTIF (ce que l'entreprise possede)</h5>
                      {bilan.actif.length === 0 ? <p className="chart-empty-hint">Aucun element d'actif.</p> : bilan.actif.map((a) => (
                        <div className="etats-row" key={a.compte}><span title={a.libelle}>{afficherCompte(a.compte)}</span><strong>{formatFcfa(a.montant)}</strong></div>
                      ))}
                      <div className="etats-row total"><span>Total actif</span><strong>{formatFcfa(bilan.totalActif)}</strong></div>
                    </div>
                    <div>
                      <h5 className="etats-col-title">PASSIF (ressources et dettes)</h5>
                      {bilan.passif.length === 0 ? <p className="chart-empty-hint">Aucun element de passif.</p> : bilan.passif.map((p, i) => (
                        <div className="etats-row" key={`${p.compte}-${i}`}><span title={p.libelle}>{afficherCompte(p.compte)}</span><strong>{formatFcfa(p.montant)}</strong></div>
                      ))}
                      <div className="etats-row total"><span>Total passif</span><strong>{formatFcfa(bilan.totalPassif)}</strong></div>
                    </div>
                  </div>
                  <p className="chart-empty-hint" style={{ marginTop: 10 }}>Presentation simplifiee adaptee TPE/PME. Le resultat de l'exercice figure au passif.</p>
                </article>
              </>
            )}
          </section>
        );

      case 'factures':
        return (
          <section className="section-stack">
            <div className="exercise-bar">
              <span>Exercice comptable (1er janvier - 31 decembre)</span>
              <select value={selectedExercise} onChange={(e) => setSelectedExercise(Number(e.target.value))}>
                {availableExercises.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="skpi-row">
              <div className="skpi-card">
                <span className="skpi-icon" style={{ background: 'rgba(79,70,229,0.14)' }}>Σ</span>
                <div><p>Total TTC facture</p><strong>{formatFcfa(totalInvoiced)}</strong></div>
              </div>
              <div className="skpi-card">
                <span className="skpi-icon" style={{ background: 'rgba(16,185,129,0.14)' }}>✓</span>
                <div><p>Encaisse (paiements)</p><strong>{formatFcfa(totalEncaisse)}</strong></div>
              </div>
              <div className="skpi-card">
                <span className="skpi-icon" style={{ background: 'rgba(217,119,6,0.14)' }}>%</span>
                <div><p>TVA collectee</p><strong>{formatFcfa(totalVatCollected)}</strong></div>
              </div>
              <div className="skpi-card">
                <span className="skpi-icon" style={{ background: 'rgba(239,68,68,0.14)' }}>!</span>
                <div><p>Reste a encaisser</p><strong>{formatFcfa(totalOutstanding)}</strong></div>
              </div>
            </div>

            <article className="panel-card">
              <div className="panel-top">
                <h4>Factures - Exercice {selectedExercise}</h4>
                <div className="panel-top-actions">
                  <span>{invoicesForExercise.length} facture(s)</span>
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
                  {invoicesForExercise.length > 0 && (
                    <>
                      <button
                        type="button"
                        className="ghost-btn small-btn"
                        onClick={() => exportTableToCsv({
                          columns: ['Numero', 'Client', 'Date', 'Echeance', 'HT', 'TVA', 'TTC', 'Regle', 'Solde', 'Statut'],
                          rows: invoicesForExercise.map((inv) => {
                            const paid = paidForInvoice(inv.id);
                            return [inv.invoiceNumber, findClientLabel(inv.clientId), formatDate(inv.date), formatDate(inv.dueDate), inv.amountHt, inv.vatAmount, inv.amount, paid, inv.amount - paid, invoiceStatusLabels[inv.status]];
                          }),
                          fileName: `factures-vpns-${selectedExercise}.csv`,
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
                            title: `Factures - Exercice ${selectedExercise}`,
                            subtitle: `Export du ${new Date().toLocaleDateString('fr-FR')} - ${invoicesForExercise.length} facture(s)`,
                            columns: ['Numero', 'Client', 'Date', 'HT', 'TVA', 'TTC', 'Solde', 'Statut'],
                            rows: invoicesForExercise.map((inv) => {
                              const paid = paidForInvoice(inv.id);
                              return [inv.invoiceNumber, findClientLabel(inv.clientId), formatDate(inv.date), formatFcfa(inv.amountHt), formatFcfa(inv.vatAmount), formatFcfa(inv.amount), formatFcfa(inv.amount - paid), invoiceStatusLabels[inv.status]];
                            }),
                            fileName: `factures-vpns-${selectedExercise}.pdf`,
                            summary: [
                              { label: 'Total TTC', value: formatFcfa(totalInvoiced) },
                              { label: 'TVA collectee', value: formatFcfa(totalVatCollected) },
                              { label: 'Reste a encaisser', value: formatFcfa(totalOutstanding) },
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
              {invoicesForExercise.length === 0 ? (
                <EmptyState
                  title={`Aucune facture sur l'exercice ${selectedExercise}`}
                  description="Creez une facture, importez-en une existante, ou changez d'exercice comptable ci-dessus."
                />
              ) : (
                <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Numero</th>
                      <th>Client</th>
                      <th>Date</th>
                      <th>HT</th>
                      <th>TVA</th>
                      <th>TTC</th>
                      <th>Solde du</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoicesForExercise.map((invoice) => {
                      const paid = paidForInvoice(invoice.id);
                      const solde = invoice.amount - paid;
                      return (
                      <tr key={invoice.id}>
                        <td>{invoice.invoiceNumber}</td>
                        <td>{findClientLabel(invoice.clientId)}</td>
                        <td>{formatDate(invoice.date)}</td>
                        <td>{formatFcfa(invoice.amountHt)}</td>
                        <td>{formatFcfa(invoice.vatAmount)} <span className="chip neutral" style={{ marginLeft: 4 }}>{invoice.vatRate}%</span></td>
                        <td>{formatFcfa(invoice.amount)}</td>
                        <td>{solde > 0 ? <strong style={{ color: '#dc2626' }}>{formatFcfa(solde)}</strong> : <span className="chip green">Solde</span>}</td>
                        <td><span className={`chip ${invoiceStatusColors[invoice.status]}`}>{invoiceStatusLabels[invoice.status]}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {solde > 0 && (
                              <button type="button" className="ghost-btn small-btn" onClick={() => { setPaymentForInvoice(invoice); setPaymentAmount(String(solde)); }}>Payer</button>
                            )}
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
                          </div>
                        </td>
                      </tr>
                      );
                    })}
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
            <div className="exercise-bar">
              <span>Exercice comptable (1er janvier - 31 decembre)</span>
              <select value={selectedExercise} onChange={(e) => setSelectedExercise(Number(e.target.value))}>
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

      {paymentForInvoice && (
        <div className="modal-backdrop" onClick={() => setPaymentForInvoice(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Reglement de facture</p>
                <h3>Paiement {paymentForInvoice.invoiceNumber}</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setPaymentForInvoice(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="parsed-box">
                <p><strong>Client :</strong> {findClientLabel(paymentForInvoice.clientId)}</p>
                <p><strong>Total TTC :</strong> {formatFcfa(paymentForInvoice.amount)}</p>
                <p><strong>Deja regle :</strong> {formatFcfa(paidForInvoice(paymentForInvoice.id))}</p>
                <p><strong>Solde du :</strong> {formatFcfa(paymentForInvoice.amount - paidForInvoice(paymentForInvoice.id))}</p>
              </div>
              <label>
                Montant du paiement (FCFA) *
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} step="100" placeholder="Ex: 50000" />
              </label>
              <label>
                Mode de paiement
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="especes">Especes</option>
                  <option value="virement">Virement bancaire</option>
                  <option value="cheque">Cheque</option>
                  <option value="mobile_money">Mobile Money (MTN/Airtel)</option>
                </select>
              </label>
              <p className="chart-empty-hint">Un paiement egal au solde passe automatiquement la facture en "Payee". Un paiement partiel la garde en cours.</p>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setPaymentForInvoice(null)}>Annuler</button>
                <PrimaryButton onClick={handleRecordPayment}>Enregistrer le paiement</PrimaryButton>
              </div>
            </div>
          </div>
        </div>
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

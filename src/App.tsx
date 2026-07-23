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
import { detectDocumentKind, detectTransferDirection, entryForBankTransfer, entryForCaisseBanqueTransfer } from './utils/autoAccounting';
import { makeId, formatFcfa, formatDate, yearOf } from './utils/format';
import { paginate, DEFAULT_PAGE_SIZE } from './utils/pagination';
import { Pagination } from './components/Pagination';
import { ClientsSection } from './sections/ClientsSection';
import { AgendaSection } from './sections/AgendaSection';
import { RapportsSection } from './sections/RapportsSection';
import { NotificationsSection } from './sections/NotificationsSection';
import { ParametresSection } from './sections/ParametresSection';
import { CaisseJournalPanel } from './sections/CaisseJournalPanel';
import { CahierJournalReviewModal, type ConfirmedCaisseOperation } from './components/CahierJournalReviewModal';
import { parseCahierJournalLines, type CandidateCaisseOperation } from './utils/cahierJournalParser';
import { COMPTE } from './utils/autoAccounting';
import {
  calculerBalance,
  totauxBalance,
  calculerGrandLivre,
  calculerCompteResultat,
  calculerBilan,
  calculerJournalCaisse,
  genererConseilsFinanciers,
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
  updateClient,
  deleteClient,
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
  updateEvent,
  deleteEvent,
  listReports,
  createReport,
  updateReport,
  deleteReport,
  listNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
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
  cancelled: 'Annulee',
};

const invoiceStatusColors: Record<InvoiceData['status'], string> = {
  draft: 'neutral',
  sent: 'blue',
  paid: 'green',
  overdue: 'red',
  cancelled: 'neutral',
};

const journalLabels: Record<string, string> = {
  ventes: 'Ventes',
  achats: 'Achats',
  banque: 'Banque',
  od: 'Op. diverses',
};

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
  const [comptaTab, setComptaTab] = useState<'journal' | 'grandlivre' | 'balance' | 'etats' | 'caisse'>('journal');
  const [journalFilter, setJournalFilter] = useState<'tous' | 'ventes' | 'achats' | 'banque' | 'od'>('tous');
  const [journalPage, setJournalPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [paymentForInvoice, setPaymentForInvoice] = useState<InvoiceRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('especes');

  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'info' | 'error' }>>([]);
  const [invoiceInitialData, setInvoiceInitialData] = useState<Partial<InvoiceData> | undefined>(undefined);
  const [invoiceModalKey, setInvoiceModalKey] = useState(0);
  const [isImportingInvoice, setIsImportingInvoice] = useState(false);

  // Import d'une photo de cahier journal : operations detectees en attente de
  // validation par l'utilisateur avant enregistrement dans le journal de caisse.
  const [isImportingCahier, setIsImportingCahier] = useState(false);
  const [isSubmittingCahier, setIsSubmittingCahier] = useState(false);
  const [cahierCandidates, setCahierCandidates] = useState<CandidateCaisseOperation[] | null>(null);

  // Edition : quand une de ces valeurs est non-nulle, le modal correspondant s'ouvre
  // pre-rempli et la soumission met a jour l'enregistrement au lieu d'en creer un.
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
  const [editingReport, setEditingReport] = useState<ReportRecord | null>(null);
  const [editingNotification, setEditingNotification] = useState<NotificationRecord | null>(null);

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
    setEditingClient(null);
    setEditingEvent(null);
    setEditingReport(null);
    setEditingNotification(null);
    setIsModalOpen(true);
  };

  // Cherche un client existant dont le nom ou l'entreprise correspond au
  // fournisseur/client detecte dans le document (rapprochement approximatif,
  // best-effort - ne bloque jamais l'import si aucun match n'est trouve).
  const matchClientByName = (vendorName: string | null): string => {
    if (!vendorName) return '';
    const needle = vendorName.trim().toLowerCase();
    if (needle.length < 3) return '';
    const match = clientsList.find(
      (c) => c.name.toLowerCase().includes(needle) || c.company.toLowerCase().includes(needle) ||
        needle.includes(c.name.toLowerCase()) || needle.includes(c.company.toLowerCase())
    );
    return match?.id || '';
  };

  // Import / numerisation : transcription complete du document (OCR image,
  // lecture/OCR PDF, ou texte direct), puis comptabilisation automatique sans
  // intervention - dans le journal des Ventes/Achats pour une facture/recu, ou
  // directement en tresorerie (journal Banque) pour un bordereau de virement.
  const handleImportInvoiceFile = async (file: File) => {
    setIsImportingInvoice(true);
    try {
      const parsed = await parseInvoiceFromFile(file);
      const fullText = `${file.name} ${parsed.description}`;
      const documentKind = detectDocumentKind(fullText);
      const ht = parsed.amount || 0;

      if (documentKind === 'virement_bancaire' || documentKind === 'versement' || documentKind === 'retrait') {
        if (ht <= 0) {
          pushToast('Piece de tresorerie importee mais montant illisible. Saisissez le mouvement manuellement.', 'info');
          return;
        }
        if (documentKind === 'virement_bancaire') {
          const direction = detectTransferDirection(fullText);
          const generated = entryForBankTransfer({
            date: parsed.date,
            amount: ht,
            method: 'virement',
            direction,
            description: parsed.vendorName ? `Virement bancaire - ${parsed.vendorName}` : `Virement bancaire (${parsed.invoiceNumber})`,
            reference: parsed.invoiceNumber,
          });
          const record = await createAccountingEntry(generated);
          setEntries((prev) => [record, ...prev]);
          pushToast(`Bordereau de virement importe et comptabilise en compte d'attente (471) - a reclasser dans le journal Banque.`);
          return;
        }
        const generated = entryForCaisseBanqueTransfer(documentKind, {
          date: parsed.date,
          amount: ht,
          description: documentKind === 'versement' ? `Versement especes en banque (${parsed.invoiceNumber})` : `Retrait especes de la banque (${parsed.invoiceNumber})`,
          reference: parsed.invoiceNumber,
        });
        const record = await createAccountingEntry(generated);
        setEntries((prev) => [record, ...prev]);
        pushToast(`Bordereau de ${documentKind === 'versement' ? 'versement' : 'retrait'} importe et comptabilise (Caisse <-> Banque).`);
        return;
      }

      if (ht <= 0) {
        // Montant illisible : on ouvre le formulaire pre-rempli pour saisie manuelle.
        openInvoiceModal({
          type: documentKind,
          date: parsed.date,
          dueDate: parsed.dueDate,
          description: parsed.vendorName ? `${parsed.description} (${parsed.vendorName})` : parsed.description,
          clientId: matchClientByName(parsed.vendorName) || undefined,
        });
        pushToast(`Document importe mais montant illisible. Completez la facture.`, 'info');
        return;
      }
      const vatRate = 18;
      const vatAmount = Math.round(ht * (vatRate / 100) * 100) / 100;
      const matchedClientId = matchClientByName(parsed.vendorName);
      const data: InvoiceData = {
        clientId: matchedClientId,
        date: parsed.date,
        dueDate: parsed.dueDate,
        amountHt: ht,
        vatRate,
        vatAmount,
        amount: Math.round((ht + vatAmount) * 100) / 100,
        description: matchedClientId || !parsed.vendorName ? parsed.description : `${parsed.description} (${parsed.vendorName})`,
        status: documentKind === 'vente' ? 'sent' : 'draft',
        type: documentKind,
      };
      const { invoice, entries: generated } = await createInvoice(data);
      setInvoices((prev) => [invoice, ...prev]);
      setEntries((prev) => [...generated, ...prev]);
      pushToast(`Facture ${invoice.invoiceNumber} importee et comptabilisee automatiquement (journal ${documentKind === 'vente' ? 'Ventes' : 'Achats'}).`);
    } catch (err) {
      pushToast((err as Error).message || "Impossible d'analyser ce fichier.", 'error');
    } finally {
      setIsImportingInvoice(false);
    }
  };

  // Photo d'un cahier journal papier : OCR de la page entiere puis decoupage en
  // plusieurs operations candidates. Ne poste jamais directement - l'utilisateur
  // valide/corrige chaque ligne dans la modale de revue avant enregistrement.
  const handleImportCahierJournal = async (file: File) => {
    setIsImportingCahier(true);
    try {
      const { extractDocumentContent } = await import('./utils/documentOcr');
      const text = await extractDocumentContent(file);
      const candidates = parseCahierJournalLines(text, new Date().toISOString().split('T')[0]);
      if (candidates.length === 0) {
        pushToast("Aucune operation avec montant n'a ete detectee sur cette photo. Verifiez la qualite de l'image.", 'info');
        return;
      }
      setCahierCandidates(candidates);
    } catch (err) {
      pushToast((err as Error).message || "Impossible d'analyser cette photo.", 'error');
    } finally {
      setIsImportingCahier(false);
    }
  };

  // Enregistre les operations validees par l'utilisateur : chaque entree est
  // comptabilisee comme une vente encaissee (debit Caisse / credit Vente), chaque
  // sortie comme une depense (debit compte de charge suggere / credit Caisse).
  const handleConfirmCahierJournal = async (operations: ConfirmedCaisseOperation[]) => {
    setIsSubmittingCahier(true);
    try {
      const created: EntryRecord[] = [];
      for (const op of operations) {
        const isEntree = op.sens === 'entree';
        const suggestion = isEntree ? null : parseQuickEntry(op.description);
        const data: AccountingEntryData = {
          date: op.date,
          description: op.description,
          debitAccount: isEntree ? COMPTE.CAISSE : (suggestion?.account || '6051'),
          creditAccount: isEntree ? COMPTE.VENTE_DEFAUT : COMPTE.CAISSE,
          amount: op.amount,
          category: isEntree ? 'vente' : (suggestion?.category || 'Divers'),
          journal: isEntree ? 'ventes' : 'achats',
        };
        const record = await createAccountingEntry(data);
        created.push(record);
      }
      setEntries((prev) => [...created, ...prev]);
      pushToast(`${created.length} operation(s) du cahier journal enregistree(s) dans le journal de caisse.`);
      setCahierCandidates(null);
    } catch (err) {
      pushToast((err as Error).message || "Impossible d'enregistrer certaines operations.", 'error');
    } finally {
      setIsSubmittingCahier(false);
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
      if (editingClient) {
        const record = await updateClient(editingClient.id, data);
        setClientsList((prev) => prev.map((c) => (c.id === record.id ? record : c)));
        pushToast(`Client ${data.name} modifie.`);
      } else {
        const record = await createClient(data);
        setClientsList((prev) => [record, ...prev]);
        pushToast(`Client ${data.name} ajoute.`);
      }
      setIsModalOpen(false);
      setEditingClient(null);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  const handleDeleteClient = async (client: ClientRecord) => {
    if (!window.confirm(`Supprimer le client "${client.name}" (${client.company}) ? Cette action est irreversible.`)) return;
    try {
      await deleteClient(client.id);
      setClientsList((prev) => prev.filter((c) => c.id !== client.id));
      pushToast(`Client ${client.name} supprime.`);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  const handleAddInvoice = async (data: InvoiceData) => {
    try {
      const { invoice, entries: generated } = await createInvoice(data);
      setInvoices((prev) => [invoice, ...prev]);
      setEntries((prev) => [...generated, ...prev]);
      setIsModalOpen(false);
      setInvoiceInitialData(undefined);
      pushToast(`Facture ${invoice.invoiceNumber} creee et comptabilisee (journal ${data.type === 'vente' ? 'Ventes' : 'Achats'}).`);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  const handleAddEvent = async (data: EventData) => {
    try {
      if (editingEvent) {
        const record = await updateEvent(editingEvent.id, data);
        setEvents((prev) => prev.map((e) => (e.id === record.id ? record : e)));
        pushToast(`Evenement "${data.title}" modifie.`);
      } else {
        const record = await createEvent(data);
        setEvents((prev) => [record, ...prev]);
        pushToast(`Evenement "${data.title}" planifie.`);
      }
      setIsModalOpen(false);
      setEditingEvent(null);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  const handleDeleteEvent = async (event: EventRecord) => {
    if (!window.confirm(`Supprimer l'evenement "${event.title}" ?`)) return;
    try {
      await deleteEvent(event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      pushToast(`Evenement "${event.title}" supprime.`);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  const handleAddReport = async (data: ReportData) => {
    try {
      if (editingReport) {
        const record = await updateReport(editingReport.id, data);
        setReports((prev) => prev.map((r) => (r.id === record.id ? record : r)));
        pushToast(`Rapport "${data.title}" modifie.`);
      } else {
        const record = await createReport(data);
        setReports((prev) => [record, ...prev]);
        pushToast(`Rapport "${data.title}" genere.`);
      }
      setIsModalOpen(false);
      setEditingReport(null);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  const handleDeleteReport = async (report: ReportRecord) => {
    if (!window.confirm(`Supprimer le rapport "${report.title}" ?`)) return;
    try {
      await deleteReport(report.id);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      pushToast(`Rapport "${report.title}" supprime.`);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  const handleAddNotification = async (data: NotificationData) => {
    try {
      if (editingNotification) {
        const record = await updateNotification(editingNotification.id, data);
        setNotifications((prev) => prev.map((n) => (n.id === record.id ? record : n)));
        pushToast(`Notification "${data.title}" modifiee.`);
      } else {
        const record = await createNotification(data);
        setNotifications((prev) => [record, ...prev]);
        pushToast(`Notification "${data.title}" programmee.`);
      }
      setIsModalOpen(false);
      setEditingNotification(null);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  const handleDeleteNotification = async (notif: NotificationRecord) => {
    if (!window.confirm(`Supprimer la notification "${notif.title}" ?`)) return;
    try {
      await deleteNotification(notif.id);
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      pushToast(`Notification "${notif.title}" supprimee.`);
    } catch (err) {
      pushToast((err as Error).message, 'error');
    }
  };

  const openEditClient = (client: ClientRecord) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const openEditEvent = (event: EventRecord) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const openEditReport = (report: ReportRecord) => {
    setEditingReport(report);
    setIsModalOpen(true);
  };

  const openEditNotification = (notif: NotificationRecord) => {
    setEditingNotification(notif);
    setIsModalOpen(true);
  };

  // Annulation de facture (au lieu de suppression) : contre-passe chaque ecriture
  // generee automatiquement pour cette facture, puis marque la facture "annulee".
  // Bloquee si un paiement existe deja (il faudrait d'abord annuler le reglement).
  const handleCancelInvoice = async (invoice: InvoiceRecord) => {
    if (paidForInvoice(invoice.id) > 0) {
      pushToast('Impossible d\'annuler : un paiement est deja enregistre sur cette facture.', 'error');
      return;
    }
    if (!window.confirm(`Annuler la facture ${invoice.invoiceNumber} ? Les ecritures comptables associees seront contre-passees.`)) return;
    try {
      const linkedEntries = entries.filter((e) => e.sourceType === 'invoice' && e.sourceId === invoice.id && !e.reversed);
      for (const entry of linkedEntries) {
        const { reversal, original } = await reverseAccountingEntry(entry);
        setEntries((prev) => [reversal, ...prev.map((e) => (e.id === original.id ? original : e))]);
      }
      await updateInvoiceStatus(invoice.id, 'cancelled');
      setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? { ...i, status: 'cancelled' } : i)));
      pushToast(`Facture ${invoice.invoiceNumber} annulee et ecritures contre-passees.`);
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
      const { payment, entry } = await createPayment(paymentForInvoice, {
        amount: amt,
        paymentDate: new Date().toISOString().split('T')[0],
        method: paymentMethod,
      });
      const newPayments = [payment, ...payments];
      setPayments(newPayments);
      if (entry) setEntries((prev) => [entry, ...prev]);

      // Statut automatique : solde nul => payee ; partiel => envoyee (en cours).
      const totalPaid = newPayments.filter((p) => p.invoiceId === paymentForInvoice.id).reduce((s, p) => s + p.amount, 0);
      let newStatus = paymentForInvoice.status;
      if (totalPaid >= paymentForInvoice.amount) newStatus = 'paid';
      else if (totalPaid > 0 && paymentForInvoice.status !== 'overdue') newStatus = 'sent';
      if (newStatus !== paymentForInvoice.status) {
        await updateInvoiceStatus(paymentForInvoice.id, newStatus);
        setInvoices((prev) => prev.map((i) => (i.id === paymentForInvoice.id ? { ...i, status: newStatus } : i)));
      }

      pushToast(`Paiement de ${amt.toLocaleString('fr-FR')} FCFA enregistre et comptabilise (journal Banque).`);
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

  const journalEntries = useMemo(
    () => (journalFilter === 'tous' ? entriesForExercise : entriesForExercise.filter((e) => (e.journal || 'od') === journalFilter)),
    [entriesForExercise, journalFilter]
  );

  const invoicesForExercise = useMemo(
    () => invoices.filter((i) => yearOf(i.date) === selectedExercise),
    [invoices, selectedExercise]
  );

  // Pagination du journal comptable et des factures (les exports CSV/PDF portent
  // toujours sur la liste complete, seul l'affichage a l'ecran est paginee).
  const journalPagination = paginate(journalEntries, journalPage, DEFAULT_PAGE_SIZE);
  const invoicesPagination = paginate(invoicesForExercise, invoicesPage, DEFAULT_PAGE_SIZE);
  useEffect(() => setJournalPage(1), [journalFilter, selectedExercise]);
  useEffect(() => setInvoicesPage(1), [selectedExercise]);

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
  // Journal de caisse (compte 57 uniquement) + analyse financiere automatique.
  const journalCaisse = useMemo(() => calculerJournalCaisse(entriesForExercise), [entriesForExercise]);
  const conseilsFinanciers = useMemo(() => genererConseilsFinanciers(journalCaisse, compteResultat), [journalCaisse, compteResultat]);

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
              <button type="button" className={`tab-btn ${comptaTab === 'caisse' ? 'active' : ''}`} onClick={() => setComptaTab('caisse')}>Journal de Caisse</button>
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
                      <select className="journal-filter" value={journalFilter} onChange={(e) => setJournalFilter(e.target.value as typeof journalFilter)}>
                        <option value="tous">Tous les journaux</option>
                        <option value="ventes">Journal des Ventes</option>
                        <option value="achats">Journal des Achats</option>
                        <option value="banque">Journal de Banque</option>
                        <option value="od">Operations diverses</option>
                      </select>
                      {journalEntries.length > 0 && (
                        <>
                          <button type="button" className="ghost-btn small-btn" onClick={() => exportTableToCsv({
                            columns: ['Date', 'Journal', 'Libelle', 'Compte debite', 'Compte credite', 'Montant'],
                            rows: journalEntries.map((e) => [formatDate(e.date), journalLabels[e.journal || 'od'], e.description, afficherCompte(e.debitAccount), afficherCompte(e.creditAccount), e.amount]),
                            fileName: `journal-comptable-vpns-${selectedExercise}.csv`,
                          })}>CSV</button>
                          <button type="button" className="ghost-btn small-btn" onClick={async () => {
                            const { exportTableToPdf } = await import('./utils/pdfExport');
                            exportTableToPdf({
                              title: `Journal comptable OHADA - Exercice ${selectedExercise}`,
                              subtitle: `Export du ${new Date().toLocaleDateString('fr-FR')} - ${journalEntries.length} ecriture(s)`,
                              columns: ['Date', 'Journal', 'Libelle', 'Debit', 'Credit', 'Montant'],
                              rows: journalEntries.map((e) => [formatDate(e.date), journalLabels[e.journal || 'od'], e.description, afficherCompte(e.debitAccount), afficherCompte(e.creditAccount), formatFcfa(e.amount)]),
                              fileName: `journal-comptable-vpns-${selectedExercise}.pdf`,
                              summary: [{ label: 'Total mouvemente', value: formatFcfa(totalMovements) }, { label: 'Ecritures', value: String(journalEntries.length) }],
                            });
                          }}>Exporter PDF</button>
                        </>
                      )}
                    </div>
                  </div>
                  {journalEntries.length === 0 ? (
                    <EmptyState title={`Aucune ecriture ${journalFilter !== 'tous' ? '(' + journalLabels[journalFilter] + ') ' : ''}sur l'exercice ${selectedExercise}`} description="Creez une facture ou une ecriture : la comptabilisation est automatique." />
                  ) : (
                    <div className="table-scroll">
                    <table>
                      <thead>
                        <tr><th>Date</th><th>Journal</th><th>Libelle</th><th>Compte debite</th><th>Compte credite</th><th>Montant</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {journalPagination.items.map((entry) => (
                          <tr key={entry.id} className={entry.reversed ? 'row-reversed' : ''}>
                            <td>{formatDate(entry.date)}</td>
                            <td><span className="chip neutral">{journalLabels[entry.journal || 'od']}</span></td>
                            <td>{entry.description}{entry.reversed && <span className="chip red" style={{ marginLeft: 6 }}>Contre-passee</span>}{entry.reversesEntryId && <span className="chip orange" style={{ marginLeft: 6 }}>Annulation</span>}{entry.sourceType && entry.sourceType !== 'manual' && <span className="chip green" style={{ marginLeft: 6 }}>Auto</span>}</td>
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
                  <Pagination page={journalPagination.page} totalPages={journalPagination.totalPages} onPageChange={setJournalPage} />
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

            {comptaTab === 'caisse' && (
              <CaisseJournalPanel
                selectedExercise={selectedExercise}
                availableExercises={availableExercises}
                onExerciseChange={setSelectedExercise}
                journal={journalCaisse}
                conseils={conseilsFinanciers}
                isImportingCahier={isImportingCahier}
                onImportCahier={handleImportCahierJournal}
              />
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
                  <label className="file-import-label" title="Facture, recu ou bordereau de virement bancaire (image, PDF ou texte) - transcription et comptabilisation automatiques">
                    {isImportingInvoice ? 'Analyse OCR en cours...' : 'Importer un document'}
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
                    {invoicesPagination.items.map((invoice) => {
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
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {solde > 0 && invoice.status !== 'cancelled' && (
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
                            {invoice.status !== 'cancelled' && (
                              <button type="button" className="ghost-btn small-btn" onClick={() => handleCancelInvoice(invoice)}>Annuler</button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
              <Pagination page={invoicesPagination.page} totalPages={invoicesPagination.totalPages} onPageChange={setInvoicesPage} />
            </article>
          </section>
        );

      case 'clients':
        return <ClientsSection clientsList={clientsList} onEdit={openEditClient} onDelete={handleDeleteClient} />;

      case 'agenda':
        return (
          <AgendaSection
            events={events}
            appointmentText={appointmentText}
            onAppointmentTextChange={setAppointmentText}
            parsedAppointment={parsedAppointment}
            onEdit={openEditEvent}
            onDelete={handleDeleteEvent}
          />
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
          <RapportsSection
            selectedExercise={selectedExercise}
            availableExercises={availableExercises}
            onExerciseChange={setSelectedExercise}
            categoryBreakdown={categoryBreakdown}
            reports={reports}
            onEdit={openEditReport}
            onDelete={handleDeleteReport}
          />
        );

      case 'notifications':
        return (
          <NotificationsSection
            systemNotifications={systemNotifications}
            notifications={notifications}
            onEdit={openEditNotification}
            onDelete={handleDeleteNotification}
          />
        );

      case 'parametres':
        return (
          <ParametresSection
            userEmail={currentUser?.email}
            notificationsCount={notifications.length}
            clientsCount={clientsList.length}
            invoicesCount={invoices.length}
            entriesCount={entries.length}
            onLogout={handleLogout}
          />
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
        <ClientModal
          key={editingClient?.id || 'new'}
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingClient(null); }}
          onSubmit={handleAddClient}
          initialData={editingClient ?? undefined}
        />
      )}
      {activeSection === 'agenda' && (
        <EventModal
          key={editingEvent?.id || 'new'}
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingEvent(null); }}
          onSubmit={handleAddEvent}
          clients={clientsForSelect}
          initialData={editingEvent ?? undefined}
        />
      )}
      {activeSection === 'rapports' && (
        <ReportModal
          key={editingReport?.id || 'new'}
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingReport(null); }}
          onSubmit={handleAddReport}
          clients={clientsForSelect}
          initialData={editingReport ?? undefined}
        />
      )}
      {activeSection === 'notifications' && (
        <NotificationModal
          key={editingNotification?.id || 'new'}
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingNotification(null); }}
          onSubmit={handleAddNotification}
          clients={clientsForSelect}
          initialData={editingNotification ?? undefined}
        />
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

      <CahierJournalReviewModal
        isOpen={cahierCandidates !== null}
        onClose={() => setCahierCandidates(null)}
        candidates={cahierCandidates || []}
        onConfirm={handleConfirmCahierJournal}
        isSubmitting={isSubmittingCahier}
      />

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

import { useEffect, useRef, useState } from 'react';
import type { ClientRecord, InvoiceRecord, EntryRecord, EventRecord, NotificationRecord } from '../services/businessDataService';
import type { ClientData } from './ClientModal';
import type { InvoiceData } from './InvoiceModal';
import type { AccountingEntryData } from './AccountingEntryModal';
import type { EventData } from './EventModal';
import type { NotificationData } from './NotificationModal';
import { askAssistant, type AssistantChatTurn } from '../services/assistantService';
import { listAssistantMessages, saveAssistantMessage, clearAssistantMessages } from '../services/assistantMemoryService';
import { searchAll } from '../services/searchService';
import { parseQuickEntry } from '../utils/helpers';
import { COMPTE, entryForFichePaye } from '../utils/autoAccounting';
import { formatFcfa, todayIso, addDaysIso } from '../utils/format';
import type { CandidateCaisseOperation } from '../utils/cahierJournalParser';

interface AssistantPanelProps {
  clients: ClientRecord[];
  invoices: InvoiceRecord[];
  entries: EntryRecord[];
  events: EventRecord[];
  onCreateClient: (data: ClientData) => Promise<ClientRecord>;
  onUpdateClient: (id: string, data: ClientData) => Promise<ClientRecord>;
  onDeleteClient: (id: string) => Promise<void>;
  onCreateInvoice: (data: InvoiceData) => Promise<InvoiceRecord>;
  onRecordExpense: (data: AccountingEntryData) => Promise<EntryRecord>;
  onCreateAppointment: (data: EventData) => Promise<EventRecord>;
  onUpdateAppointment: (id: string, data: EventData) => Promise<EventRecord>;
  onCancelAppointment: (id: string) => Promise<void>;
  onImportBankStatement: (candidates: CandidateCaisseOperation[]) => void;
  onCreateReminder: (data: NotificationData) => Promise<NotificationRecord>;
  onRecordPayment: (invoice: InvoiceRecord, amount: number, method: string, paymentDate: string) => Promise<{ newStatus: string }>;
  onCancelInvoice: (invoice: InvoiceRecord) => Promise<void>;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'model' | 'error' | 'action';
  text: string;
}

interface PendingAttachment {
  name: string;
  mimeType: string;
  data: string; // base64, sans le prefixe data:...;base64,
}

const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024; // limite du corps de requete Vercel
const ACCEPTED_ATTACHMENT_TYPES = ['image/', 'application/pdf'];

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
    reader.onerror = () => reject(new Error('Lecture audio impossible.'));
    reader.readAsDataURL(blob);
  });
}

// Le premier format supporte par le navigateur pour MediaRecorder - Gemini
// comprend l'audio nativement (transcription + comprehension en un seul appel),
// bien plus fiable que la reconnaissance vocale du navigateur (SpeechRecognition)
// utilisee avant, qui captait mal le vocabulaire metier (noms de clients, FCFA...).
function pickRecordingMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || '';
}

function matchClient(query: string | undefined, clients: ClientRecord[]): ClientRecord | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  if (!q) return undefined;
  return clients.find(
    (c) => c.name.toLowerCase().includes(q) || (c.company && c.company.toLowerCase().includes(q)) || q.includes(c.name.toLowerCase())
  );
}

// Retrouve une facture par numero (partiel) ou, a defaut, la plus ancienne
// facture de vente impayee du client cite - c'est la plus probable quand
// Edson dit juste "la facture de tel client" sans donner le numero.
function matchInvoice(invoiceNumber: string | undefined, clientName: string | undefined, invoices: InvoiceRecord[], clients: ClientRecord[]): InvoiceRecord | undefined {
  const num = (invoiceNumber || '').toLowerCase().trim();
  if (num) {
    const found = invoices.find((i) => i.invoiceNumber.toLowerCase().includes(num));
    if (found) return found;
  }
  const client = matchClient(clientName, clients);
  if (client) {
    const unpaid = invoices
      .filter((i) => i.clientId === client.id && i.type === 'vente' && i.status !== 'cancelled')
      .sort((a, b) => (a.status === 'paid' ? 1 : 0) - (b.status === 'paid' ? 1 : 0) || a.date.localeCompare(b.date));
    if (unpaid.length > 0) return unpaid[0];
  }
  return undefined;
}

// Retrouve un rendez-vous par titre (recherche approximative) - priorite aux
// rendez-vous a venir, plus probables que ce dont Edson parle.
function matchEvent(query: string | undefined, events: EventRecord[]): EventRecord | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  if (!q) return undefined;
  const matches = events.filter((e) => e.title.toLowerCase().includes(q) || q.includes(e.title.toLowerCase()));
  if (matches.length === 0) return undefined;
  const today = todayIso();
  const upcoming = matches.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return upcoming[0] || matches[0];
}

// Contexte compact envoye a chaque message : assez pour que l'assistant
// connaisse deja les clients, l'etat des factures et les prochains
// rendez-vous, sans repasser par une requete DB dediee ni gonfler le payload
// envoye au modele.
function buildContext(clients: ClientRecord[], invoices: InvoiceRecord[], events: EventRecord[]): string {
  const clientLines =
    clients
      .slice(0, 50)
      .map((c) => `- ${c.name}${c.company ? ` (${c.company})` : ''}`)
      .join('\n') || 'Aucun client enregistre pour le moment.';

  const recentInvoices =
    invoices
      .slice(0, 15)
      .map((i) => {
        const client = clients.find((c) => c.id === i.clientId);
        return `- ${i.invoiceNumber} : ${i.type} ${formatFcfa(i.amount)} - ${client?.name || 'sans client'} - ${i.status} - ${i.date}`;
      })
      .join('\n') || 'Aucune facture enregistree pour le moment.';

  const impayes = invoices.filter((i) => i.type === 'vente' && i.status !== 'paid' && i.status !== 'cancelled');
  const totalImpaye = impayes.reduce((s, i) => s + i.amount, 0);

  const today = todayIso();
  const upcomingEvents = events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 10)
    .map((e) => `- ${e.title} - ${e.date} ${e.time}${e.location ? ` (${e.location})` : ''}`)
    .join('\n') || 'Aucun rendez-vous a venir.';

  return `CLIENTS (${clients.length} au total, ${clients.length > 50 ? '50 premiers affiches' : 'tous affiches'}) :\n${clientLines}\n\nFACTURES RECENTES :\n${recentInvoices}\n\nCREANCES CLIENTS IMPAYEES : ${formatFcfa(totalImpaye)} sur ${impayes.length} facture(s).\n\nPROCHAINS RENDEZ-VOUS :\n${upcomingEvents}`;
}

export function AssistantPanel({
  clients,
  invoices,
  events,
  onCreateClient,
  onUpdateClient,
  onDeleteClient,
  onCreateInvoice,
  onRecordExpense,
  onCreateAppointment,
  onUpdateAppointment,
  onCancelAppointment,
  onImportBankStatement,
  onCreateReminder,
  onRecordPayment,
  onCancelInvoice,
}: AssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<AssistantChatTurn[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    };
  }, []);

  // Charge la conversation persistee au demarrage - sans ca, l'assistant
  // "oublierait" tout a chaque rechargement de page, ce qui ne colle pas a
  // l'idee d'un assistant de poche qui se souvient. Echoue silencieusement
  // si la table n'existe pas encore (migration pas encore executee) : la
  // conversation demarre simplement vide, comme avant.
  useEffect(() => {
    listAssistantMessages().then((persisted) => {
      if (persisted.length === 0) return;
      setMessages(
        persisted.map((m, i) => ({ id: `hist-${i}`, role: m.role, text: m.content }))
      );
      historyRef.current = persisted.map((m) => ({ role: m.role, text: m.content })).slice(-16);
    });
  }, []);

  const addMessage = (role: DisplayMessage['role'], text: string) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role, text }]);
  };

  const handleNewConversation = () => {
    setMessages([]);
    historyRef.current = [];
    clearAssistantMessages();
  };

  async function executeAction(name: string, args: Record<string, unknown>): Promise<string> {
    const str = (v: unknown) => (typeof v === 'string' ? v : v != null ? String(v) : '');
    const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);

    switch (name) {
      case 'create_client': {
        const record = await onCreateClient({
          name: str(args.name),
          email: str(args.email),
          phone: str(args.phone),
          company: str(args.company),
          address: str(args.address),
          city: str(args.city),
          taxId: str(args.taxId) || undefined,
        });
        return `Client "${record.name}" cree.`;
      }
      case 'create_invoice': {
        const client = matchClient(str(args.clientName), clients);
        const vatRate = args.vatRate != null ? num(args.vatRate) : 18;
        // Edson pense parfois en HT, parfois en TTC selon comment il le dit -
        // le tool accepte les deux plutot que de forcer une seule convention.
        let amountHt: number;
        let vatAmount: number;
        let amount: number;
        if (args.amountTtc != null && args.amountHt == null) {
          amount = num(args.amountTtc);
          amountHt = Math.round(amount / (1 + vatRate / 100));
          vatAmount = amount - amountHt;
        } else {
          amountHt = num(args.amountHt);
          vatAmount = Math.round(amountHt * (vatRate / 100));
          amount = amountHt + vatAmount;
        }
        const date = str(args.date) || todayIso();
        const type = args.type === 'achat' ? 'achat' : 'vente';
        const invoice = await onCreateInvoice({
          clientId: client?.id || '',
          date,
          dueDate: addDaysIso(date, 30),
          amountHt,
          vatRate,
          vatAmount,
          amount,
          description: str(args.description),
          status: 'sent',
          type,
        });
        const clientLabel = str(args.clientName);
        const clientNote = client ? '' : clientLabel ? ` (client "${clientLabel}" introuvable - facture creee sans fiche client liee, a rattacher manuellement)` : '';

        // "il l'a fait et me l'envoie" : le PDF part tout de suite, meme
        // template que le reste de l'app - un echec de generation ne doit
        // pas remettre en cause la facture, deja bien enregistree.
        let pdfNote = '';
        try {
          const { exportInvoiceToPdf } = await import('../utils/pdfExport');
          exportInvoiceToPdf(invoice, client);
          pdfNote = ' Le PDF vient de partir en telechargement.';
        } catch {
          pdfNote = ' (le PDF n\'a pas pu etre genere automatiquement - utilise le bouton telecharger dans Factures).';
        }

        return `Facture ${invoice.invoiceNumber} creee et comptabilisee : ${formatFcfa(amount)} TTC${clientNote}.${pdfNote}`;
      }
      case 'record_payslip': {
        const amount = num(args.amount);
        const method = args.method === 'virement' ? 'virement' : 'especes';
        const description = str(args.description) || 'Salaire';
        const generated = entryForFichePaye({
          date: str(args.date) || todayIso(),
          amount,
          method,
          description,
        });
        const entry = await onRecordExpense(generated);
        return `Fiche de paye enregistree en charge de personnel (661) : ${formatFcfa(amount)} (${entry.description}).`;
      }
      case 'record_expense': {
        const amount = num(args.amount);
        const description = str(args.description) || 'Depense';
        const suggestion = parseQuickEntry(description);
        const method = args.method === 'virement' ? 'virement' : 'especes';
        const entry = await onRecordExpense({
          date: str(args.date) || todayIso(),
          description,
          debitAccount: suggestion.account || '6051',
          creditAccount: method === 'virement' ? COMPTE.BANQUE : COMPTE.CAISSE,
          amount,
          category: suggestion.category || 'Divers',
          journal: 'achats',
        });
        return `Depense enregistree : ${formatFcfa(amount)} (${entry.description}).`;
      }
      case 'import_bank_statement': {
        const rawTransactions = Array.isArray(args.transactions) ? args.transactions : [];
        const candidates: CandidateCaisseOperation[] = rawTransactions
          .map((t): CandidateCaisseOperation | null => {
            const tx = t as Record<string, unknown>;
            const amount = num(tx.amount);
            if (amount <= 0) return null;
            const description = str(tx.description) || 'Operation bancaire';
            return {
              lineRaw: description,
              date: str(tx.date) || todayIso(),
              description,
              amount,
              sens: tx.sens === 'sortie' ? 'sortie' : tx.sens === 'entree' ? 'entree' : 'inconnu',
            };
          })
          .filter((c): c is CandidateCaisseOperation => c !== null);

        if (candidates.length === 0) {
          return "Aucune operation exploitable n'a ete trouvee sur ce releve - la photo est peut-etre trop floue.";
        }
        onImportBankStatement(candidates);
        return `${candidates.length} operation(s) detectee(s) sur le releve - verifie-les dans la fenetre qui vient de s'ouvrir avant de les enregistrer (journal Banque).`;
      }
      case 'create_appointment': {
        const client = matchClient(str(args.clientName), clients);
        const validTypes = ['meeting', 'call', 'reminder', 'followup'];
        const type = validTypes.includes(str(args.type)) ? (args.type as EventData['type']) : 'meeting';
        const event = await onCreateAppointment({
          title: str(args.title) || 'Rendez-vous',
          description: '',
          date: str(args.date) || todayIso(),
          time: str(args.time) || '09:00',
          duration: 30,
          clientId: client?.id,
          type,
        });
        return `Rendez-vous "${event.title}" planifie le ${event.date} a ${event.time}.`;
      }
      case 'create_client_reminder': {
        const client = matchClient(str(args.clientName), clients);
        const priority = ['low', 'medium', 'high'].includes(str(args.priority)) ? (args.priority as 'low' | 'medium' | 'high') : 'high';
        const record = await onCreateReminder({
          title: `Relance - ${str(args.clientName) || client?.name || 'Client'}`,
          message: str(args.message) || 'Relance de paiement.',
          type: 'reminder',
          priority,
          sendDate: str(args.sendDate) || todayIso(),
          sendTime: '09:00',
          clientId: client?.id,
          recurring: false,
        });
        const clientLabel = str(args.clientName);
        const clientNote = client ? '' : clientLabel ? ` (client "${clientLabel}" introuvable - relance creee sans fiche liee)` : '';
        return `Relance "${record.title}" planifiee le ${record.sendDate}${clientNote}.`;
      }
      case 'search_records': {
        const query = str(args.query);
        if (!query) return "Je n'ai pas compris ce qu'il faut chercher.";
        const results = await searchAll(query);
        const lines: string[] = [];
        if (results.clients.length > 0) {
          lines.push(`Clients :\n${results.clients.map((c) => `- ${c.name}${c.company ? ` (${c.company})` : ''}`).join('\n')}`);
        }
        if (results.invoices.length > 0) {
          lines.push(
            `Factures :\n${results.invoices.map((i) => `- ${i.invoiceNumber} : ${i.type} ${formatFcfa(i.amount)} - ${i.status} - ${i.date}${i.description ? ` (${i.description})` : ''}`).join('\n')}`
          );
        }
        if (results.entries.length > 0) {
          lines.push(`Ecritures :\n${results.entries.map((e) => `- ${e.description} : ${formatFcfa(e.amount)} - ${e.date} (${e.category})`).join('\n')}`);
        }
        if (lines.length === 0) return `Aucun resultat pour "${query}".`;
        return `Resultats pour "${query}" :\n\n${lines.join('\n\n')}`;
      }
      case 'record_payment': {
        const invoice = matchInvoice(str(args.invoiceNumber), str(args.clientName), invoices, clients);
        if (!invoice) return "Je n'ai pas trouve la facture correspondante - precise le numero ou le nom du client.";
        const amount = num(args.amount) || invoice.amount;
        const validMethods = ['especes', 'virement', 'cheque', 'mobile_money'];
        const method = validMethods.includes(str(args.method)) ? str(args.method) : 'especes';
        try {
          const { newStatus } = await onRecordPayment(invoice, amount, method, str(args.date) || todayIso());
          return `Paiement de ${formatFcfa(amount)} enregistre sur la facture ${invoice.invoiceNumber}${newStatus === 'paid' ? ' - facture soldee.' : ' (paiement partiel, facture toujours en cours).'}`;
        } catch (err) {
          return `Echec de l'enregistrement du paiement : ${(err as Error).message}`;
        }
      }
      case 'cancel_invoice': {
        const invoice = matchInvoice(str(args.invoiceNumber), str(args.clientName), invoices, clients);
        if (!invoice) return "Je n'ai pas trouve la facture a annuler - precise le numero ou le nom du client.";
        try {
          await onCancelInvoice(invoice);
          return `Facture ${invoice.invoiceNumber} annulee et ecritures comptables contre-passees.`;
        } catch (err) {
          return `Impossible d'annuler : ${(err as Error).message}`;
        }
      }
      case 'update_client': {
        const client = matchClient(str(args.clientName), clients);
        if (!client) return `Client "${str(args.clientName)}" introuvable.`;
        const record = await onUpdateClient(client.id, {
          name: str(args.name) || client.name,
          email: str(args.email) || client.email,
          phone: str(args.phone) || client.phone,
          company: str(args.company) || client.company,
          address: str(args.address) || client.address,
          city: str(args.city) || client.city,
          taxId: str(args.taxId) || client.taxId,
          archiveFolder: client.archiveFolder,
        });
        return `Fiche de "${record.name}" mise a jour.`;
      }
      case 'delete_client': {
        const client = matchClient(str(args.clientName), clients);
        if (!client) return `Client "${str(args.clientName)}" introuvable.`;
        await onDeleteClient(client.id);
        return `Client "${client.name}" supprime (ses factures et ecritures passees restent intactes, juste sans fiche liee).`;
      }
      case 'update_appointment': {
        const event = matchEvent(str(args.title), events);
        if (!event) return `Rendez-vous "${str(args.title)}" introuvable.`;
        const validTypes = ['meeting', 'call', 'reminder', 'followup'];
        const record = await onUpdateAppointment(event.id, {
          title: str(args.newTitle) || event.title,
          description: event.description,
          date: str(args.date) || event.date,
          time: str(args.time) || event.time,
          duration: event.duration,
          clientId: event.clientId,
          location: event.location,
          type: validTypes.includes(str(args.type)) ? (args.type as EventData['type']) : event.type,
        });
        return `Rendez-vous "${record.title}" deplace au ${record.date} a ${record.time}.`;
      }
      case 'cancel_appointment': {
        const event = matchEvent(str(args.title), events);
        if (!event) return `Rendez-vous "${str(args.title)}" introuvable.`;
        await onCancelAppointment(event.id);
        return `Rendez-vous "${event.title}" du ${event.date} annule.`;
      }
      default:
        return `Action non reconnue : ${name}.`;
    }
  }

  const handleAttachFile = async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_ATTACHMENT_TYPES.some((t) => file.type.startsWith(t))) {
      addMessage('error', 'Seules les images et les PDF sont acceptes.');
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      addMessage('error', `"${file.name}" est trop volumineux (max 4 Mo).`);
      return;
    }
    try {
      const data = await readFileAsBase64(file);
      setAttachment({ name: file.name, mimeType: file.type, data });
    } catch {
      addMessage('error', `Impossible de lire "${file.name}".`);
    }
  };

  const handleSend = async (textOverride?: string, attachmentOverride?: PendingAttachment) => {
    const currentAttachment = attachmentOverride ?? attachment;
    const text = (textOverride ?? inputText).trim();
    if ((!text && !currentAttachment) || isSending) return;

    const isVoice = currentAttachment?.mimeType.startsWith('audio/');
    const displayText = text || (isVoice ? '🎤 Message vocal' : `📎 ${currentAttachment!.name}`);
    addMessage('user', displayText);
    historyRef.current = [...historyRef.current, { role: 'user' as const, text: displayText }].slice(-16);
    saveAssistantMessage('user', displayText);
    setInputText('');
    setAttachment(null);
    setIsSending(true);

    try {
      const context = buildContext(clients, invoices, events);
      const defaultText = isVoice ? 'Message vocal - ecoute et agis en consequence.' : 'Voici un document a analyser.';
      const response = await askAssistant(
        text || defaultText,
        historyRef.current.slice(0, -1),
        context,
        currentAttachment ? { mimeType: currentAttachment.mimeType, data: currentAttachment.data } : undefined
      );

      if (response.type === 'error') {
        addMessage('error', response.error);
      } else if (response.type === 'action') {
        // Edson peut demander plusieurs choses dans le meme message ("change
        // le telephone de X et deplace mon rendez-vous avec Y") - Gemini
        // renvoie alors plusieurs actions, executees ici dans l'ordre.
        for (const action of response.actions) {
          try {
            const summary = await executeAction(action.name, action.args);
            // search_records est une lecture, pas une creation - pas la bulle
            // verte "succes" utilisee pour les vraies actions.
            addMessage(action.name === 'search_records' ? 'model' : 'action', summary);
            historyRef.current = [...historyRef.current, { role: 'model' as const, text: summary }].slice(-16);
            saveAssistantMessage('model', summary);
          } catch (err) {
            addMessage('error', `Echec de l'action : ${(err as Error).message}`);
          }
        }
      } else {
        addMessage('model', response.text);
        historyRef.current = [...historyRef.current, { role: 'model' as const, text: response.text }].slice(-16);
        saveAssistantMessage('model', response.text);
      }
    } finally {
      setIsSending(false);
    }
  };

  // Enregistre un message vocal et l'envoie directement a Gemini comme piece
  // jointe audio - le modele transcrit et comprend en un seul appel, bien
  // plus fiable que la reconnaissance vocale du navigateur (qui captait mal
  // les noms de clients, montants en FCFA, vocabulaire comptable...).
  const handleMicToggle = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return; // le onstop ci-dessous termine l'envoi
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      addMessage('error', "L'enregistrement vocal n'est pas disponible sur ce navigateur - utilise le texte.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
        if (blob.size < 800) {
          addMessage('error', "Aucun son detecte - reessaie en parlant plus pres du micro.");
          return;
        }
        try {
          const data = await blobToBase64(blob);
          await handleSend(undefined, { name: 'message-vocal', mimeType: blob.type || 'audio/webm', data });
        } catch {
          addMessage('error', "Impossible d'envoyer le message vocal.");
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      addMessage('error', "Microphone indisponible ou permission refusee.");
    }
  };

  if (!isOpen) {
    return (
      <button type="button" className="assistant-fab" onClick={() => setIsOpen(true)} title="Assistant comptable" aria-label="Ouvrir l'assistant comptable">
        💬
      </button>
    );
  }

  return (
    <div className="assistant-panel">
      <div className="assistant-header">
        <div>
          <h4>Assistant comptable</h4>
          <p>Connait tes clients et tes factures</p>
        </div>
        <div className="assistant-header-actions">
          {messages.length > 0 && (
            <button type="button" className="assistant-close" onClick={handleNewConversation} title="Nouvelle conversation" aria-label="Nouvelle conversation">🗑</button>
          )}
          <button type="button" className="assistant-close" onClick={() => setIsOpen(false)} aria-label="Fermer">×</button>
        </div>
      </div>

      <div className="assistant-messages">
        {messages.length === 0 && (
          <div className="assistant-empty">
            Demande-moi de rediger une facture, d'enregistrer un paiement ou une depense, d'ajouter un client, de prendre un rendez-vous, de relancer un client en retard de paiement, ou pose-moi une question sur ta compta. Tu peux aussi joindre une photo ou un PDF (facture reçue, ticket, fiche de paye, releve bancaire), ou m'envoyer un message vocal directement - je comprends tout ça sans rien retaper.
            <div className="assistant-suggestions">
              {['Qui me doit de l\'argent ?', 'Resume du mois', 'Relance les impayes'].map((q) => (
                <button key={q} type="button" onClick={() => handleSend(q)} disabled={isSending}>{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`assistant-message ${m.role}`}>{m.text}</div>
        ))}
        {isSending && (
          <div className="assistant-typing">
            <span className="typing-dots"><span /><span /><span /></span>
            L'assistant reflechit…
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {attachment && (
        <div className="assistant-attachment-chip">
          <span>📎 {attachment.name}</span>
          <button type="button" onClick={() => setAttachment(null)} aria-label="Retirer la piece jointe">×</button>
        </div>
      )}

      <div className="assistant-input-row">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            handleAttachFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="assistant-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          title="Joindre une photo ou un PDF"
          aria-label="Joindre une photo ou un PDF"
        >
          📎
        </button>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ecris ta demande, ou appuie sur le micro…"
          rows={1}
          disabled={isSending}
        />
        <button
          type="button"
          className={`assistant-mic-btn${isRecording ? ' listening' : ''}`}
          onClick={handleMicToggle}
          disabled={isSending}
          title={isRecording ? 'Arreter et envoyer' : 'Message vocal'}
          aria-label={isRecording ? 'Arreter et envoyer' : 'Message vocal'}
        >
          {isRecording ? '⏹' : '🎤'}
        </button>
        <button type="button" className="assistant-send-btn" onClick={() => handleSend()} disabled={isSending || (!inputText.trim() && !attachment)} title="Envoyer" aria-label="Envoyer">
          ➤
        </button>
      </div>
    </div>
  );
}

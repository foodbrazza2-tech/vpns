import { useEffect, useRef, useState } from 'react';
import type { ClientRecord, InvoiceRecord, EntryRecord, EventRecord } from '../services/businessDataService';
import type { ClientData } from './ClientModal';
import type { InvoiceData } from './InvoiceModal';
import type { AccountingEntryData } from './AccountingEntryModal';
import type { EventData } from './EventModal';
import { askAssistant, type AssistantChatTurn } from '../services/assistantService';
import { parseQuickEntry } from '../utils/helpers';
import { COMPTE, entryForFichePaye } from '../utils/autoAccounting';
import { formatFcfa, todayIso, addDaysIso } from '../utils/format';

interface AssistantPanelProps {
  clients: ClientRecord[];
  invoices: InvoiceRecord[];
  entries: EntryRecord[];
  onCreateClient: (data: ClientData) => Promise<ClientRecord>;
  onCreateInvoice: (data: InvoiceData) => Promise<InvoiceRecord>;
  onRecordExpense: (data: AccountingEntryData) => Promise<EntryRecord>;
  onCreateAppointment: (data: EventData) => Promise<EventRecord>;
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

// Speech recognition n'est pas dans le lib DOM standard de TypeScript - type
// minimal pour l'API vocale du navigateur (Chrome/Edge : webkitSpeechRecognition).
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function matchClient(query: string | undefined, clients: ClientRecord[]): ClientRecord | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  if (!q) return undefined;
  return clients.find(
    (c) => c.name.toLowerCase().includes(q) || (c.company && c.company.toLowerCase().includes(q)) || q.includes(c.name.toLowerCase())
  );
}

// Contexte compact envoye a chaque message : assez pour que l'assistant
// connaisse deja les clients et l'etat des factures, sans repasser par une
// requete DB dediee ni gonfler le payload envoye au modele.
function buildContext(clients: ClientRecord[], invoices: InvoiceRecord[]): string {
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

  return `CLIENTS (${clients.length} au total, ${clients.length > 50 ? '50 premiers affiches' : 'tous affiches'}) :\n${clientLines}\n\nFACTURES RECENTES :\n${recentInvoices}\n\nCREANCES CLIENTS IMPAYEES : ${formatFcfa(totalImpaye)} sur ${impayes.length} facture(s).`;
}

export function AssistantPanel({ clients, invoices, onCreateClient, onCreateInvoice, onRecordExpense, onCreateAppointment }: AssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<AssistantChatTurn[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  const addMessage = (role: DisplayMessage['role'], text: string) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role, text }]);
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
        const amountHt = num(args.amountHt);
        const vatRate = args.vatRate != null ? num(args.vatRate) : 18;
        const vatAmount = Math.round(amountHt * (vatRate / 100));
        const amount = amountHt + vatAmount;
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

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride ?? inputText).trim();
    const currentAttachment = attachment;
    if ((!text && !currentAttachment) || isSending) return;

    const displayText = text || `📎 ${currentAttachment!.name}`;
    addMessage('user', displayText);
    historyRef.current = [...historyRef.current, { role: 'user' as const, text: displayText }].slice(-16);
    setInputText('');
    setAttachment(null);
    setIsSending(true);

    try {
      const context = buildContext(clients, invoices);
      const response = await askAssistant(
        text || 'Voici un document a analyser.',
        historyRef.current.slice(0, -1),
        context,
        currentAttachment ? { mimeType: currentAttachment.mimeType, data: currentAttachment.data } : undefined
      );

      if (response.type === 'error') {
        addMessage('error', response.error);
      } else if (response.type === 'action') {
        try {
          const summary = await executeAction(response.name, response.args);
          addMessage('action', summary);
          historyRef.current = [...historyRef.current, { role: 'model' as const, text: summary }].slice(-16);
        } catch (err) {
          addMessage('error', `Echec de l'action : ${(err as Error).message}`);
        }
      } else {
        addMessage('model', response.text);
        historyRef.current = [...historyRef.current, { role: 'model' as const, text: response.text }].slice(-16);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleMicToggle = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      addMessage('error', "La dictee vocale n'est pas disponible sur ce navigateur - utilise le texte.");
      return;
    }
    const recognition = new Ctor();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setInputText(transcript);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
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
        <button type="button" className="assistant-close" onClick={() => setIsOpen(false)} aria-label="Fermer">×</button>
      </div>

      <div className="assistant-messages">
        {messages.length === 0 && (
          <div className="assistant-empty">
            Demande-moi de rediger une facture, d'enregistrer une depense, d'ajouter un client, de prendre un rendez-vous, ou pose-moi une question sur ta compta. Tu peux aussi joindre une photo ou un PDF (facture reçue, ticket, fiche de paye) - je le lis directement.
            <br /><br />
            Ex : « Facture Cartouche Market, 150 000 FCFA HT, prestation conseil » ou « Combien me doivent mes clients ? »
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`assistant-message ${m.role}`}>{m.text}</div>
        ))}
        {isSending && <div className="assistant-typing">L'assistant reflechit…</div>}
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
          placeholder="Ecris ou dicte ta demande…"
          rows={1}
          disabled={isSending}
        />
        <button
          type="button"
          className={`assistant-mic-btn${isListening ? ' listening' : ''}`}
          onClick={handleMicToggle}
          disabled={isSending}
          title="Dicter vocalement"
          aria-label="Dicter vocalement"
        >
          {isListening ? '⏹' : '🎤'}
        </button>
        <button type="button" className="assistant-send-btn" onClick={() => handleSend()} disabled={isSending || (!inputText.trim() && !attachment)} title="Envoyer" aria-label="Envoyer">
          ➤
        </button>
      </div>
    </div>
  );
}

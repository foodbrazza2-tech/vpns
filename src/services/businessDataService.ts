import { supabase } from './authService';
import type { ClientData } from '../components/ClientModal';
import type { InvoiceData } from '../components/InvoiceModal';
import type { AccountingEntryData } from '../components/AccountingEntryModal';
import type { EventData } from '../components/EventModal';
import type { ReportData } from '../components/ReportModal';
import type { NotificationData } from '../components/NotificationModal';
import { entriesForInvoice, entryForPayment, type GeneratedEntry } from '../utils/autoAccounting';

export type WithId<T> = T & { id: string; createdAt: string };
export type ClientRecord = WithId<ClientData>;
export type InvoiceRecord = WithId<InvoiceData> & { invoiceNumber: string };
export type EntryRecord = WithId<AccountingEntryData> & { reconciled: boolean; reversed: boolean; reversesEntryId?: string; sourceType?: string; sourceId?: string };
export type EventRecord = WithId<EventData>;
export type ReportRecord = WithId<ReportData>;
export type NotificationRecord = WithId<NotificationData>;

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  method: string;
  note?: string;
  createdAt: string;
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, action: string): T {
  if (result.error) {
    throw new Error(`${action}: ${result.error.message}`);
  }
  if (result.data === null) {
    throw new Error(`${action}: aucune donnee retournee`);
  }
  return result.data;
}

// ═══════════════════════════════════════════
// CLIENTS
// ═══════════════════════════════════════════
export async function listClients(): Promise<ClientRecord[]> {
  const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Chargement des clients: ${error.message}`);
  return (data || []).map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    address: row.address || '',
    city: row.city || '',
    taxId: row.tax_id || '',
    archiveFolder: row.archive_folder || '',
  }));
}

export async function createClient(data: ClientData): Promise<ClientRecord> {
  const result = await supabase
    .from('clients')
    .insert({
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      address: data.address || null,
      city: data.city || null,
      tax_id: data.taxId || null,
      archive_folder: data.archiveFolder || null,
    })
    .select('*')
    .single();
  const row: any = unwrap(result, 'Creation du client');
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    address: row.address || '',
    city: row.city || '',
    taxId: row.tax_id || '',
    archiveFolder: row.archive_folder || '',
  };
}

// ═══════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════
function mapInvoiceRow(row: any): InvoiceRecord {
  const amount = Number(row.amount);
  const amountHt = row.amount_ht != null ? Number(row.amount_ht) : Math.round((amount / 1.18) * 100) / 100;
  const vatRate = row.vat_rate != null ? Number(row.vat_rate) : 18;
  const vatAmount = row.vat_amount != null ? Number(row.vat_amount) : Math.round((amount - amountHt) * 100) / 100;
  return {
    id: row.id,
    createdAt: row.created_at,
    invoiceNumber: row.invoice_number,
    clientId: row.client_id || '',
    date: row.invoice_date,
    dueDate: row.due_date,
    amountHt,
    vatRate,
    vatAmount,
    amount,
    description: row.description || '',
    status: row.status,
    type: row.type === 'achat' ? 'achat' : 'vente',
    counterpartAccount: row.counterpart_account || undefined,
  };
}

export async function listInvoices(): Promise<InvoiceRecord[]> {
  const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Chargement des factures: ${error.message}`);
  return (data || []).map(mapInvoiceRow);
}

// Cree la facture ET genere automatiquement les ecritures comptables dans le bon
// journal (ventes ou achats). Retourne la facture + les ecritures generees.
export async function createInvoice(data: InvoiceData): Promise<{ invoice: InvoiceRecord; entries: EntryRecord[] }> {
  const result = await supabase
    .from('invoices')
    .insert({
      client_id: data.clientId || null,
      invoice_date: data.date,
      due_date: data.dueDate,
      amount_ht: data.amountHt,
      vat_rate: data.vatRate,
      vat_amount: data.vatAmount,
      amount: data.amount,
      description: data.description || null,
      status: data.status,
      type: data.type,
      counterpart_account: data.counterpartAccount || null,
    })
    .select('*')
    .single();
  const row: any = unwrap(result, 'Creation de la facture');
  const invoice = mapInvoiceRow(row);

  const generated = entriesForInvoice({
    type: invoice.type,
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.date,
    amountHt: invoice.amountHt,
    vatAmount: invoice.vatAmount,
    amount: invoice.amount,
    counterpartAccount: invoice.counterpartAccount,
  });
  const entries = await persistGeneratedEntries(generated, 'invoice', invoice.id);

  return { invoice, entries };
}

// Persiste des ecritures generees automatiquement (comptabilisation auto).
async function persistGeneratedEntries(generated: GeneratedEntry[], sourceType: string, sourceId: string): Promise<EntryRecord[]> {
  if (generated.length === 0) return [];
  const rows = generated.map((g) => ({
    entry_date: g.date,
    description: g.description,
    debit_account: g.debitAccount,
    credit_account: g.creditAccount,
    amount: g.amount,
    category: g.category,
    reference: g.reference || null,
    journal: g.journal,
    source_type: sourceType,
    source_id: sourceId,
  }));
  const { data, error } = await supabase.from('accounting_entries').insert(rows).select('*');
  if (error) throw new Error(`Comptabilisation automatique: ${error.message}`);
  return (data || []).map(mapEntryRow);
}

// ═══════════════════════════════════════════
// ACCOUNTING ENTRIES
// ═══════════════════════════════════════════
function mapEntryRow(row: any): EntryRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    date: row.entry_date,
    description: row.description,
    debitAccount: row.debit_account,
    creditAccount: row.credit_account,
    amount: Number(row.amount),
    category: row.category,
    reference: row.reference || undefined,
    journal: (row.journal as EntryRecord['journal']) || 'od',
    reconciled: row.reconciled ?? false,
    reversed: row.reversed ?? false,
    reversesEntryId: row.reverses_entry_id || undefined,
    sourceType: row.source_type || undefined,
    sourceId: row.source_id || undefined,
  };
}

export async function listAccountingEntries(): Promise<EntryRecord[]> {
  const { data, error } = await supabase.from('accounting_entries').select('*').order('entry_date', { ascending: false });
  if (error) throw new Error(`Chargement du journal comptable: ${error.message}`);
  return (data || []).map(mapEntryRow);
}

export async function createAccountingEntry(data: AccountingEntryData): Promise<EntryRecord> {
  const result = await supabase
    .from('accounting_entries')
    .insert({
      entry_date: data.date,
      description: data.description,
      debit_account: data.debitAccount,
      credit_account: data.creditAccount,
      amount: data.amount,
      category: data.category,
      reference: data.reference || null,
      journal: data.journal || 'od',
      source_type: 'manual',
    })
    .select('*')
    .single();
  const row: any = unwrap(result, 'Creation de l\'ecriture comptable');
  return mapEntryRow(row);
}

// Contre-passation : cree une ecriture d'annulation (debit/credit inverses) et
// marque l'originale comme contre-passee. On ne supprime jamais une ecriture.
export async function reverseAccountingEntry(entry: EntryRecord): Promise<{ reversal: EntryRecord; original: EntryRecord }> {
  const reversalResult = await supabase
    .from('accounting_entries')
    .insert({
      entry_date: new Date().toISOString().split('T')[0],
      description: `Contre-passation : ${entry.description}`,
      debit_account: entry.creditAccount,
      credit_account: entry.debitAccount,
      amount: entry.amount,
      category: entry.category,
      reference: entry.reference || null,
      journal: entry.journal || 'od',
      source_type: 'manual',
      reverses_entry_id: entry.id,
    })
    .select('*')
    .single();
  const reversalRow: any = unwrap(reversalResult, 'Contre-passation');

  const updateResult = await supabase
    .from('accounting_entries')
    .update({ reversed: true })
    .eq('id', entry.id)
    .select('*')
    .single();
  const originalRow: any = unwrap(updateResult, 'Marquage de l\'ecriture contre-passee');

  return { reversal: mapEntryRow(reversalRow), original: mapEntryRow(originalRow) };
}

// Rapprochement bancaire : bascule l'etat "rapproche" d'une ecriture de tresorerie.
export async function setEntryReconciled(entryId: string, reconciled: boolean): Promise<EntryRecord> {
  const result = await supabase
    .from('accounting_entries')
    .update({ reconciled })
    .eq('id', entryId)
    .select('*')
    .single();
  const row: any = unwrap(result, 'Rapprochement bancaire');
  return mapEntryRow(row);
}

// ═══════════════════════════════════════════
// PAIEMENTS DE FACTURES (reglements partiels)
// ═══════════════════════════════════════════
function mapPaymentRow(row: any): PaymentRecord {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    amount: Number(row.amount),
    paymentDate: row.payment_date,
    method: row.method,
    note: row.note || undefined,
    createdAt: row.created_at,
  };
}

export async function listPayments(): Promise<PaymentRecord[]> {
  const { data, error } = await supabase.from('invoice_payments').select('*').order('payment_date', { ascending: false });
  if (error) throw new Error(`Chargement des paiements: ${error.message}`);
  return (data || []).map(mapPaymentRow);
}

// Enregistre le paiement ET genere automatiquement l'ecriture de tresorerie
// (journal banque). Retourne le paiement + l'ecriture generee.
export async function createPayment(
  invoice: InvoiceRecord,
  input: { amount: number; paymentDate: string; method: string; note?: string }
): Promise<{ payment: PaymentRecord; entry: EntryRecord | null }> {
  const result = await supabase
    .from('invoice_payments')
    .insert({
      invoice_id: invoice.id,
      amount: input.amount,
      payment_date: input.paymentDate,
      method: input.method,
      note: input.note || null,
    })
    .select('*')
    .single();
  const row: any = unwrap(result, 'Enregistrement du paiement');
  const payment = mapPaymentRow(row);

  const generated = entryForPayment(
    { type: invoice.type, invoiceNumber: invoice.invoiceNumber, date: invoice.date, amountHt: invoice.amountHt, vatAmount: invoice.vatAmount, amount: invoice.amount, counterpartAccount: invoice.counterpartAccount },
    { amount: payment.amount, method: payment.method, paymentDate: payment.paymentDate }
  );
  const entries = await persistGeneratedEntries([generated], 'payment', payment.id);

  return { payment, entry: entries[0] || null };
}

// Met a jour le statut d'une facture (ex: passage a "paid" quand solde nul).
export async function updateInvoiceStatus(invoiceId: string, status: InvoiceData['status']): Promise<void> {
  const { error } = await supabase.from('invoices').update({ status }).eq('id', invoiceId);
  if (error) throw new Error(`Mise a jour du statut de la facture: ${error.message}`);
}

// ═══════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════
export async function listEvents(): Promise<EventRecord[]> {
  const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true });
  if (error) throw new Error(`Chargement de l'agenda: ${error.message}`);
  return (data || []).map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    description: row.description || '',
    date: row.event_date,
    time: row.event_time,
    duration: row.duration,
    clientId: row.client_id || undefined,
    location: row.location || '',
    type: row.type,
  }));
}

export async function createEvent(data: EventData): Promise<EventRecord> {
  const result = await supabase
    .from('events')
    .insert({
      title: data.title,
      description: data.description || null,
      event_date: data.date,
      event_time: data.time,
      duration: data.duration,
      client_id: data.clientId || null,
      location: data.location || null,
      type: data.type,
    })
    .select('*')
    .single();
  const row: any = unwrap(result, 'Creation de l\'evenement');
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    description: row.description || '',
    date: row.event_date,
    time: row.event_time,
    duration: row.duration,
    clientId: row.client_id || undefined,
    location: row.location || '',
    type: row.type,
  };
}

// ═══════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════
export async function listReports(): Promise<ReportRecord[]> {
  const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Chargement des rapports: ${error.message}`);
  return (data || []).map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    type: row.type,
    period: row.period,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description || '',
    includeGraphs: row.include_graphs,
    clientId: row.client_id || undefined,
  }));
}

export async function createReport(data: ReportData): Promise<ReportRecord> {
  const result = await supabase
    .from('reports')
    .insert({
      title: data.title,
      type: data.type,
      period: data.period,
      start_date: data.startDate,
      end_date: data.endDate,
      description: data.description || null,
      include_graphs: data.includeGraphs,
      client_id: data.clientId || null,
    })
    .select('*')
    .single();
  const row: any = unwrap(result, 'Creation du rapport');
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    type: row.type,
    period: row.period,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description || '',
    includeGraphs: row.include_graphs,
    clientId: row.client_id || undefined,
  };
}

// ═══════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════
export async function listNotifications(): Promise<NotificationRecord[]> {
  const { data, error } = await supabase.from('notifications').select('*').order('send_date', { ascending: false });
  if (error) throw new Error(`Chargement des notifications: ${error.message}`);
  return (data || []).map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    message: row.message,
    type: row.type,
    priority: row.priority,
    sendDate: row.send_date,
    sendTime: row.send_time,
    clientId: row.client_id || undefined,
    recurring: row.recurring,
    recurringDays: row.recurring_days || undefined,
  }));
}

export async function createNotification(data: NotificationData): Promise<NotificationRecord> {
  const result = await supabase
    .from('notifications')
    .insert({
      title: data.title,
      message: data.message,
      type: data.type,
      priority: data.priority,
      send_date: data.sendDate,
      send_time: data.sendTime,
      client_id: data.clientId || null,
      recurring: data.recurring,
      recurring_days: data.recurringDays || null,
    })
    .select('*')
    .single();
  const row: any = unwrap(result, 'Creation de la notification');
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    message: row.message,
    type: row.type,
    priority: row.priority,
    sendDate: row.send_date,
    sendTime: row.send_time,
    clientId: row.client_id || undefined,
    recurring: row.recurring,
    recurringDays: row.recurring_days || undefined,
  };
}

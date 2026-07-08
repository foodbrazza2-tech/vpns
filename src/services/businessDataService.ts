import { supabase } from './authService';
import type { ClientData } from '../components/ClientModal';
import type { InvoiceData } from '../components/InvoiceModal';
import type { AccountingEntryData } from '../components/AccountingEntryModal';
import type { EventData } from '../components/EventModal';
import type { ReportData } from '../components/ReportModal';
import type { NotificationData } from '../components/NotificationModal';

export type WithId<T> = T & { id: string; createdAt: string };
export type ClientRecord = WithId<ClientData>;
export type InvoiceRecord = WithId<InvoiceData> & { invoiceNumber: string };
export type EntryRecord = WithId<AccountingEntryData>;
export type EventRecord = WithId<EventData>;
export type ReportRecord = WithId<ReportData>;
export type NotificationRecord = WithId<NotificationData>;

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
export async function listInvoices(): Promise<InvoiceRecord[]> {
  const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Chargement des factures: ${error.message}`);
  return (data || []).map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    invoiceNumber: row.invoice_number,
    clientId: row.client_id || '',
    date: row.invoice_date,
    dueDate: row.due_date,
    amount: Number(row.amount),
    description: row.description || '',
    status: row.status,
  }));
}

export async function createInvoice(data: InvoiceData): Promise<InvoiceRecord> {
  const result = await supabase
    .from('invoices')
    .insert({
      client_id: data.clientId || null,
      invoice_date: data.date,
      due_date: data.dueDate,
      amount: data.amount,
      description: data.description || null,
      status: data.status,
    })
    .select('*')
    .single();
  const row: any = unwrap(result, 'Creation de la facture');
  return {
    id: row.id,
    createdAt: row.created_at,
    invoiceNumber: row.invoice_number,
    clientId: row.client_id || '',
    date: row.invoice_date,
    dueDate: row.due_date,
    amount: Number(row.amount),
    description: row.description || '',
    status: row.status,
  };
}

// ═══════════════════════════════════════════
// ACCOUNTING ENTRIES
// ═══════════════════════════════════════════
export async function listAccountingEntries(): Promise<EntryRecord[]> {
  const { data, error } = await supabase.from('accounting_entries').select('*').order('entry_date', { ascending: false });
  if (error) throw new Error(`Chargement du journal comptable: ${error.message}`);
  return (data || []).map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    date: row.entry_date,
    description: row.description,
    debitAccount: row.debit_account,
    creditAccount: row.credit_account,
    amount: Number(row.amount),
    category: row.category,
    reference: row.reference || undefined,
  }));
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
    })
    .select('*')
    .single();
  const row: any = unwrap(result, 'Creation de l\'ecriture comptable');
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
  };
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

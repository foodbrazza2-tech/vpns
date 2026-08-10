// Recherche plein-texte (memoire long-terme de l'assistant) : au-dela des
// quelques clients/factures recents deja envoyes dans le contexte de chaque
// message, l'assistant peut chercher dans TOUT l'historique via ce service.
// Repose sur les colonnes search_vector generees en base (voir
// supabase/schema_v8_recherche_plein_texte.sql) - aucun appel d'embedding,
// aucun service externe, RLS deja applique par les politiques existantes.
import { supabase } from './authService';

export interface SearchResults {
  clients: Array<{ id: string; name: string; company: string }>;
  invoices: Array<{ id: string; invoiceNumber: string; description: string; amount: number; date: string; status: string; type: string }>;
  entries: Array<{ id: string; description: string; amount: number; date: string; category: string }>;
}

const EMPTY_RESULTS: SearchResults = { clients: [], invoices: [], entries: [] };

export async function searchAll(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (!q) return EMPTY_RESULTS;

  try {
    const [clientsRes, invoicesRes, entriesRes] = await Promise.all([
      supabase.from('clients').select('id, name, company').textSearch('search_vector', q, { type: 'websearch', config: 'french' }).limit(8),
      supabase.from('invoices').select('id, invoice_number, description, amount, invoice_date, status, type').textSearch('search_vector', q, { type: 'websearch', config: 'french' }).limit(8),
      supabase.from('accounting_entries').select('id, description, amount, entry_date, category').textSearch('search_vector', q, { type: 'websearch', config: 'french' }).limit(8),
    ]);

    return {
      clients: (clientsRes.data || []).map((r: any) => ({ id: r.id, name: r.name, company: r.company })),
      invoices: (invoicesRes.data || []).map((r: any) => ({
        id: r.id,
        invoiceNumber: r.invoice_number,
        description: r.description || '',
        amount: Number(r.amount),
        date: r.invoice_date,
        status: r.status,
        type: r.type,
      })),
      entries: (entriesRes.data || []).map((r: any) => ({
        id: r.id,
        description: r.description,
        amount: Number(r.amount),
        date: r.entry_date,
        category: r.category,
      })),
    };
  } catch {
    return EMPTY_RESULTS;
  }
}

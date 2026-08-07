// Persistance de la conversation avec l'assistant comptable (table
// assistant_messages, RLS scopee par utilisateur comme le reste de l'app -
// voir supabase/schema_v7_assistant_memory.sql). Sans ca, l'assistant "oublie"
// tout a chaque rechargement de page, ce qui ne colle pas a l'idee d'un
// assistant de poche qui se souvient de ce qui a ete dit.
//
// Tolerant aux pannes par design : si la table n'existe pas encore (migration
// pas encore executee par Edson) ou si l'ecriture echoue, on n'interrompt
// jamais la conversation en cours - le pire cas degrade est "pas de memoire
// persistante", jamais "le chat plante".
import { supabase } from './authService';

export interface PersistedMessage {
  role: 'user' | 'model';
  content: string;
}

const HISTORY_LIMIT = 60;

export async function listAssistantMessages(): Promise<PersistedMessage[]> {
  try {
    const { data, error } = await supabase
      .from('assistant_messages')
      .select('role, content, created_at')
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT);
    if (error || !data) return [];
    return data
      .slice()
      .reverse()
      .map((row: any) => ({ role: row.role === 'model' ? 'model' : 'user', content: row.content }));
  } catch {
    return [];
  }
}

export async function saveAssistantMessage(role: 'user' | 'model', content: string): Promise<void> {
  try {
    await supabase.from('assistant_messages').insert({ role, content });
  } catch {
    // Best-effort : ne jamais casser la conversation pour un echec de sauvegarde.
  }
}

export async function clearAssistantMessages(): Promise<void> {
  try {
    await supabase.from('assistant_messages').delete().not('id', 'is', null);
  } catch {
    // idem
  }
}
